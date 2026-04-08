import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Geometry, Camera, Transform, Triangle } from 'ogl';
import { canRunWebGL, prefersReducedMotion } from '../lib/motion';

/**
 * Persistent fullscreen constellation field rendered behind every section.
 *
 * Mounted once at the layout level (BaseLayout), positioned `fixed` with
 * `z-index: -1` so it sits between the body background and the in-flow page
 * content. Sections without their own opaque background let the field show
 * through, giving the whole site a "floating in space" feel.
 *
 * Composition (three additive passes in this draw order):
 *   1. Drifting blueprint grid undertone — barely-visible HUD layer
 *   2. Constellation lines — KNN-precomputed edges between nearby far/mid
 *      particles, distance-faded each frame
 *   3. Particles — 2500 dots in three implicit depth layers (continuous
 *      `aDepth ∈ [0,1]`), 5% near-white "hero stars" that twinkle, all
 *      reactive to the cursor (brighten + push)
 *
 * The vertex shader applies the same drift + scroll-parallax wraparound +
 * cursor push to BOTH points and line vertices, so endpoints of every
 * constellation line stay visually attached to their parent dots regardless
 * of motion. The wraparound is a `mod()` in clip-space-Y that's invisible
 * because the field is uniform random.
 *
 * Constellation lines are restricted to particles where `aDepth < 0.5` (far
 * and mid layers only). Foreground/near particles parallax fast on long
 * scrolls, and connecting them would produce ugly long edges crossing the
 * screen as endpoints wrap independently.
 *
 * Lifecycle: gated on `canRunWebGL()` inside the effect. The single
 * `teardown()` function is called from React cleanup, the `webgl-disable`
 * watchdog event, and `webglcontextlost`. Idempotent via the `disposed`
 * flag — safe to call multiple times.
 */

// ---- tuning constants ---------------------------------------------------

// Color palette (RGB, converted from oklch design tokens)
const ACCENT: [number, number, number] = [0.357, 0.553, 0.937]; // #5B8DEF, signature blue
const HERO_COLOR: [number, number, number] = [0.92, 0.96, 1.0]; // near-white w/ blue tint
const GRID_COLOR: [number, number, number] = [0.357, 0.553, 0.937];

// Particle counts
const PARTICLE_COUNT = 2500;
const HERO_STAR_RATIO = 0.05; // ~125 dots are bright near-white twinklers

// KNN constellation edges
const KNN_K = 3; // edges per particle (asymmetric, then deduped)
const MAX_EDGES = 4000; // hard cap after dedupe (longest edges dropped)
const EDGE_MAX_WORLD_DIST = 1.55; // base-position distance threshold (world units)
const EDGE_MAX_NDC_DIST = 0.18; // screen-space distance threshold for alpha falloff
const LINE_BASE_ALPHA = 0.18; // additive blend, max alpha at zero distance

// Distribution box (world space, before camera at z=0 looking at -z)
// Visible at z=−10 with 45° fov ≈ 8.28 units high. We pick a slightly tighter
// Y range so wraparound is dense (every wrap brings a particle back into view
// without leaving a gap). X range is wider than the widest sane aspect.
const HALF_W = 9.0;
const HALF_H = 4.5;
const HALF_D = 3.5;
const Z_OFFSET = -10.0;

// Drift (sinusoidal, per-particle phase from `aSeed`)
const DRIFT_AMP = 0.06;
const DRIFT_FREQ_X = 0.32;
const DRIFT_FREQ_Y = 0.28;

// Per-depth scroll parallax (world units of Y shift per pixel of scrollY)
const PARALLAX_FAR = 0.0003;
const PARALLAX_NEAR = 0.0014;

// Cursor reactivity
const CURSOR_RADIUS_NDC = 0.28; // ~28% of half-viewport in NDC
const CURSOR_PUSH = 0.045; // NDC units of repulsion at center of cursor field
const CURSOR_BRIGHTEN = 0.7; // additive brightness multiplier inside radius
const CURSOR_LERP = 0.08; // mouse smoothing factor per frame

// Particle rendering
const BASE_SIZE = 3.4;

// Hero-section boost — particles are brighter and slightly bigger while the
// hero is in view, then fade to the subtle "rest of page" level by the time
// you've scrolled one viewport height. Uses smoothstep so the transition is
// imperceptible. uHeroBoost ∈ [0, 1] is computed on the CPU each frame.
const HERO_BOOST_FADE_START_VH = 0.25; // start fading after 25% of a viewport
const HERO_BOOST_FADE_END_VH = 1.0; // fully subtle after one viewport
const HERO_BOOST_SIZE_GAIN = 0.45; // +45% point size at full boost
const HERO_BOOST_BRIGHTNESS_GAIN = 1.6; // particle color × (1 + 1.6) at full boost
const HERO_BOOST_LINE_GAIN = 1.4; // line alpha × (1 + 1.4) at full boost

// Grid undertone — squint test, must be barely visible at normal viewing
const GRID_DENSITY = 22.0; // cells per UV unit (after aspect correction)
const GRID_ALPHA = 0.045;

// ---- shared GLSL snippets via uniform-driven math -----------------------
// Both the particle and line vertex shaders apply the same drift + parallax
// wrap + cursor push. The math constants are passed as uniforms so there's a
// single source of truth (the JS constants above) — never template numbers
// into GLSL.

const particleVertex = /* glsl */ `
attribute vec3 position;
attribute float aSeed;
attribute float aDepth;
attribute float aIsHero;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float uTime;
uniform float uScrollY;
uniform vec2 uMouseNDC;
uniform float uCursorRadius;
uniform float uCursorPush;
uniform float uCursorBrighten;
uniform float uDriftAmp;
uniform float uDriftFreqX;
uniform float uDriftFreqY;
uniform float uHalfH;
uniform float uParallaxFar;
uniform float uParallaxNear;
uniform float uBaseSize;
uniform float uDpr;
uniform float uHeroSizeMul;
uniform float uHeroBrightMul;
varying float vBright;
varying float vIsHero;

void main() {
  vec3 p = position;

  // Per-particle sinusoidal drift
  p.x += sin(uTime * uDriftFreqX + aSeed * 6.2831) * uDriftAmp;
  p.y += cos(uTime * uDriftFreqY + aSeed * 6.2831) * uDriftAmp;

  // Scroll parallax — near layers move more than far layers
  float parallax = mix(uParallaxFar, uParallaxNear, aDepth);
  p.y -= uScrollY * parallax;

  // Y wraparound — invisible because the field is uniform random
  float wrapRange = 2.0 * uHalfH;
  p.y = mod(p.y + uHalfH, wrapRange) - uHalfH;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;

  // Cursor push in NDC space — depth/parallax-correct because it operates
  // on the post-projection clip coords directly
  vec2 ndc = clip.xy / clip.w;
  vec2 toMouse = ndc - uMouseNDC;
  float distToMouse = length(toMouse);
  // Mask = 1 at cursor center, 0 at uCursorRadius. smoothstep edges must
  // be ascending; we invert the result.
  float cursorMask = 1.0 - smoothstep(0.0, uCursorRadius, distToMouse);
  // Add tiny epsilon to avoid normalize(0) NaN
  vec2 pushDir = toMouse / max(distToMouse, 0.0001);
  ndc += pushDir * cursorMask * uCursorPush;
  clip.xy = ndc * clip.w;

  // Per-hero-star twinkle (no-op for non-heroes)
  float twinkle = mix(1.0, 0.55 + 0.45 * sin(uTime * 1.4 + aSeed * 12.566), aIsHero);

  // Hero-section boost is applied on top of the base brightness so it
  // multiplies cursor + twinkle + everything together. uHeroBrightMul is
  // computed on the CPU as (1 + heroBoost × HERO_BOOST_BRIGHTNESS_GAIN).
  vBright = (1.0 + cursorMask * uCursorBrighten) * twinkle * uHeroBrightMul;
  vIsHero = aIsHero;

  gl_Position = clip;

  // Size scales with depth (near = bigger), with cursor boost; hero stars
  // are slightly larger so they read as distinct foreground beacons. The
  // hero-section boost (uHeroSizeMul) is a global multiplier driven by
  // scrollY — full at the top, 1.0 past one viewport.
  float sizeBase = mix(0.55, 1.55, aDepth);
  float sizeMul = sizeBase * (1.0 + cursorMask * 0.6) * mix(1.0, 1.45, aIsHero);
  sizeMul *= uHeroSizeMul;
  gl_PointSize = sizeMul * uBaseSize * uDpr / max(-mv.z, 0.01);
}
`;

const particleFragment = /* glsl */ `
precision highp float;
uniform vec3 uColorBlue;
uniform vec3 uColorHero;
varying float vBright;
varying float vIsHero;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  // Soft round dot via smoothstep on radial distance
  float a = smoothstep(0.5, 0.0, d);
  vec3 color = mix(uColorBlue, uColorHero, vIsHero) * vBright;
  gl_FragColor = vec4(color, a);
}
`;

// Line vertex shader — same world-space transform as particles, but no
// gl_PointSize and an interpolated per-vertex alpha for distance fade.
const lineVertex = /* glsl */ `
attribute vec3 position;
attribute float aSeed;
attribute float aDepth;
attribute float aAlpha;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float uTime;
uniform float uScrollY;
uniform vec2 uMouseNDC;
uniform float uCursorRadius;
uniform float uCursorPush;
uniform float uDriftAmp;
uniform float uDriftFreqX;
uniform float uDriftFreqY;
uniform float uHalfH;
uniform float uParallaxFar;
uniform float uParallaxNear;
varying float vAlpha;

void main() {
  vec3 p = position;

  p.x += sin(uTime * uDriftFreqX + aSeed * 6.2831) * uDriftAmp;
  p.y += cos(uTime * uDriftFreqY + aSeed * 6.2831) * uDriftAmp;

  float parallax = mix(uParallaxFar, uParallaxNear, aDepth);
  p.y -= uScrollY * parallax;

  float wrapRange = 2.0 * uHalfH;
  p.y = mod(p.y + uHalfH, wrapRange) - uHalfH;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;

  vec2 ndc = clip.xy / clip.w;
  vec2 toMouse = ndc - uMouseNDC;
  float distToMouse = length(toMouse);
  // Mask = 1 at cursor center, 0 at uCursorRadius. smoothstep edges must
  // be ascending; we invert the result.
  float cursorMask = 1.0 - smoothstep(0.0, uCursorRadius, distToMouse);
  vec2 pushDir = toMouse / max(distToMouse, 0.0001);
  ndc += pushDir * cursorMask * uCursorPush;
  clip.xy = ndc * clip.w;

  gl_Position = clip;
  vAlpha = aAlpha;
}
`;

const lineFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uHeroLineMul;
varying float vAlpha;
void main() {
  // Hero-section boost — uHeroLineMul is computed on the CPU each frame as
  // (1 + heroBoost × HERO_BOOST_LINE_GAIN). Lines are nearly invisible at
  // the subtle baseline (LINE_BASE_ALPHA = 0.18); the boost makes the
  // constellation map clearly readable behind the hero before fading.
  gl_FragColor = vec4(uColor, vAlpha * uHeroLineMul);
}
`;

// Grid undertone — single fullscreen triangle, procedural orthogonal grid
// with anti-aliased lines via fwidth. Drifts slowly with time + scroll for
// the holographic-HUD register.
const gridVertex = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const gridFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uDensity;
uniform vec2 uResolution;
uniform float uTime;
uniform float uScrollY;
varying vec2 vUv;

void main() {
  // Aspect-correct UV so cells are square regardless of viewport ratio
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 uv = vUv * aspect;

  // Slow drift — time + scroll
  uv.y -= uScrollY * 0.00018 + uTime * 0.005;
  uv.x += uTime * 0.004;

  // Procedural grid — derivative-free for WebGL1/WebGL2 compatibility.
  // g = distance from nearest line in normalized cell space [0, 0.5]; lines
  // sit at the cell edges (g≈0.5).
  vec2 g = abs(fract(uv * uDensity) - 0.5);
  // Constant-width line mask using smoothstep against fixed thickness in
  // cell-units. Slightly aliased at glancing angles but invisible at the
  // alpha we use.
  float thick = 0.46;
  vec2 line = smoothstep(thick, 0.5, g);
  float lineMask = max(line.x, line.y);

  // Center vignette so the grid only reads in the middle of the page,
  // fading to invisible at the edges and corners
  float r = length((vUv - 0.5) * 2.0);
  float vignette = 1.0 - smoothstep(0.45, 1.25, r);

  gl_FragColor = vec4(uColor, lineMask * uAlpha * vignette);
}
`;

// ---- particle generator -------------------------------------------------

interface ParticleData {
  positions: Float32Array;
  seeds: Float32Array;
  depths: Float32Array;
  heros: Float32Array;
}

const buildParticles = (): ParticleData => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const seeds = new Float32Array(PARTICLE_COUNT);
  const depths = new Float32Array(PARTICLE_COUNT);
  const heros = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() * 2 - 1) * HALF_W;
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * HALF_H;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * HALF_D + Z_OFFSET;
    seeds[i] = Math.random();
    depths[i] = Math.random();
    heros[i] = Math.random() < HERO_STAR_RATIO ? 1.0 : 0.0;
  }
  return { positions, seeds, depths, heros };
};

// ---- KNN constellation edge builder -------------------------------------
// Spatial-hash O(n) k-nearest-neighbors. Computed once at init in
// *static base position* space, never re-evaluated. Drift is small enough
// (DRIFT_AMP) that neighbors stay neighbors throughout the page lifetime.
//
// Restricted to particles with depth < 0.5 (far + mid layers only). Near
// particles parallax fast on long scrolls — connecting them would produce
// long edges that visibly stretch across the screen as endpoints wrap.

const buildKnnEdges = (data: ParticleData): Uint16Array => {
  const cellSize = EDGE_MAX_WORLD_DIST;
  const minX = -HALF_W;
  const minY = -HALF_H;
  const minZ = Z_OFFSET - HALF_D;
  const cellsX = Math.ceil((HALF_W * 2) / cellSize) + 1;
  const cellsY = Math.ceil((HALF_H * 2) / cellSize) + 1;
  const cellsZ = Math.ceil((HALF_D * 2) / cellSize) + 1;

  // Build spatial grid: cell index -> list of particle indices (only the
  // ones eligible for edges, i.e. depth < 0.5)
  const grid = new Map<number, number[]>();
  const cellKey = (cx: number, cy: number, cz: number) =>
    cx + cy * cellsX + cz * cellsX * cellsY;

  const eligible: number[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    if (data.depths[i] >= 0.5) continue;
    eligible.push(i);
    const x = data.positions[i * 3 + 0];
    const y = data.positions[i * 3 + 1];
    const z = data.positions[i * 3 + 2];
    const cx = Math.floor((x - minX) / cellSize);
    const cy = Math.floor((y - minY) / cellSize);
    const cz = Math.floor((z - minZ) / cellSize);
    const key = cellKey(cx, cy, cz);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(i);
  }

  // For each eligible particle, find k closest neighbors within threshold
  const edgeSet = new Set<number>();
  // Reusable neighbor scratch — avoid per-iteration allocations
  const neighbors: { idx: number; dist: number }[] = [];

  const threshSq = EDGE_MAX_WORLD_DIST * EDGE_MAX_WORLD_DIST;

  for (const i of eligible) {
    const xi = data.positions[i * 3 + 0];
    const yi = data.positions[i * 3 + 1];
    const zi = data.positions[i * 3 + 2];
    const cxi = Math.floor((xi - minX) / cellSize);
    const cyi = Math.floor((yi - minY) / cellSize);
    const czi = Math.floor((zi - minZ) / cellSize);

    neighbors.length = 0;

    // Check this cell + 26 neighbor cells
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const bucket = grid.get(cellKey(cxi + dx, cyi + dy, czi + dz));
          if (!bucket) continue;
          for (const j of bucket) {
            if (j === i) continue;
            const dxw = data.positions[j * 3 + 0] - xi;
            const dyw = data.positions[j * 3 + 1] - yi;
            const dzw = data.positions[j * 3 + 2] - zi;
            const distSq = dxw * dxw + dyw * dyw + dzw * dzw;
            if (distSq > threshSq) continue;
            neighbors.push({ idx: j, dist: distSq });
          }
        }
      }
    }

    // Sort ascending by distance, take K closest
    neighbors.sort((a, b) => a.dist - b.dist);
    const take = Math.min(KNN_K, neighbors.length);
    for (let n = 0; n < take; n++) {
      const j = neighbors[n].idx;
      const lo = Math.min(i, j);
      const hi = Math.max(i, j);
      edgeSet.add(lo * PARTICLE_COUNT + hi);
    }
  }

  // Convert set to flat edge list, then cap at MAX_EDGES (drop the longest)
  let edges: { i: number; j: number; distSq: number }[] = [];
  for (const key of edgeSet) {
    const lo = Math.floor(key / PARTICLE_COUNT);
    const hi = key - lo * PARTICLE_COUNT;
    const dxw = data.positions[hi * 3 + 0] - data.positions[lo * 3 + 0];
    const dyw = data.positions[hi * 3 + 1] - data.positions[lo * 3 + 1];
    const dzw = data.positions[hi * 3 + 2] - data.positions[lo * 3 + 2];
    edges.push({ i: lo, j: hi, distSq: dxw * dxw + dyw * dyw + dzw * dzw });
  }
  if (edges.length > MAX_EDGES) {
    edges.sort((a, b) => a.distSq - b.distSq);
    edges = edges.slice(0, MAX_EDGES);
  }

  const out = new Uint16Array(edges.length * 2);
  for (let e = 0; e < edges.length; e++) {
    out[e * 2 + 0] = edges[e].i;
    out[e * 2 + 1] = edges[e].j;
  }
  return out;
};

// ---- per-frame CPU projection -------------------------------------------
// Mirror the vertex shader's drift + parallax + wrap math to compute each
// particle's NDC position. Used by the line alpha pass to fade edges by
// screen-space distance. Cursor push is intentionally NOT mirrored — the
// GPU applies it to the actual line endpoints, so visual correctness is
// preserved; the only thing it slightly desyncs is alpha falloff near the
// cursor, which is imperceptible at our cursor radius.

// OGL's Program constructor only console.warns on shader compile/link
// failure rather than throwing — leaving you with an invalid program that
// crashes at first draw. Validate explicitly so we fail loudly with the
// GLSL log instead of a downstream forEach-on-undefined error.
const validateProgram = (
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  program: { program: WebGLProgram },
  label: string,
) => {
  const linked = gl.getProgramParameter(program.program, gl.LINK_STATUS);
  if (!linked) {
    const log = gl.getProgramInfoLog(program.program) ?? '(no info log)';
    throw new Error(`[SpaceStarfield] Program "${label}" failed to link: ${log}`);
  }
};

const projectParticle = (
  data: ParticleData,
  i: number,
  scrollY: number,
  time: number,
  projXScale: number, // m[0] = f / aspect
  projYScale: number, // m[5] = f
  out: Float32Array,
) => {
  const seed = data.seeds[i];
  const depth = data.depths[i];

  let x = data.positions[i * 3 + 0];
  let y = data.positions[i * 3 + 1];
  const z = data.positions[i * 3 + 2];

  // Drift — must match shader exactly
  x += Math.sin(time * DRIFT_FREQ_X + seed * 6.2831) * DRIFT_AMP;
  y += Math.cos(time * DRIFT_FREQ_Y + seed * 6.2831) * DRIFT_AMP;

  // Parallax + wrap
  const parallax = PARALLAX_FAR + (PARALLAX_NEAR - PARALLAX_FAR) * depth;
  y -= scrollY * parallax;
  const wrapRange = 2 * HALF_H;
  y = ((y + HALF_H) % wrapRange + wrapRange) % wrapRange - HALF_H;

  // Perspective projection (camera at origin, view = identity)
  // clip.x = (f/a)*x, clip.y = f*y, clip.w = -z, NDC = clip / clip.w
  const invNegZ = 1 / -z;
  out[i * 2 + 0] = projXScale * x * invNegZ;
  out[i * 2 + 1] = projYScale * y * invNegZ;
};

// ---- component ----------------------------------------------------------

export default function SpaceStarfield() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      console.warn('[SpaceStarfield] no host ref');
      return;
    }
    if (!canRunWebGL()) {
      console.warn('[SpaceStarfield] canRunWebGL=false — gated off');
      return;
    }

    console.log('[SpaceStarfield] init starting');

    const host = ref.current;
    const reduced = prefersReducedMotion();
    let disposed = false;
    let raf = 0;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
        alpha: true,
        antialias: false,
      });
    } catch (err) {
      console.error('[SpaceStarfield] Renderer creation failed', err);
      return;
    }
    const gl = renderer.gl;
    const dpr = renderer.dpr;

    host.appendChild(gl.canvas);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.display = 'block';
    gl.canvas.style.position = 'absolute';
    gl.canvas.style.inset = '0';
    gl.canvas.style.opacity = '0';
    gl.canvas.style.transition = 'opacity 800ms ease-out';

    // Fully transparent — body bg shows through, all draws are additive
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 45, near: 0.1, far: 40 });
    camera.position.z = 0;

    const scene = new Transform();

    // ---- particle data + KNN edges (built once) ----
    const particles = buildParticles();
    const edges = buildKnnEdges(particles);
    const edgeCount = edges.length / 2;

    // Pre-allocated per-frame work buffers — never reallocated in tick
    const screenPositions = new Float32Array(PARTICLE_COUNT * 2);
    const lineAlphas = new Float32Array(edgeCount * 2);

    // ---- grid undertone (Pass 1) ----
    const gridGeo = new Triangle(gl);
    const gridProgram = new Program(gl, {
      vertex: gridVertex,
      fragment: gridFragment,
      uniforms: {
        uColor: { value: GRID_COLOR },
        uAlpha: { value: GRID_ALPHA },
        uDensity: { value: GRID_DENSITY },
        uResolution: { value: [1, 1] },
        uTime: { value: 0 },
        uScrollY: { value: 0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
    });
    gridProgram.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
    validateProgram(gl, gridProgram, 'grid');
    const gridMesh = new Mesh(gl, { geometry: gridGeo, program: gridProgram });
    gridMesh.frustumCulled = false;
    gridMesh.renderOrder = 0;
    gridMesh.setParent(scene);

    // ---- constellation lines (Pass 2) ----
    // Per edge: 2 vertices, each carries the source particle's static base
    // position + seed + depth. Alpha is dynamic, updated each frame based on
    // CPU-computed NDC distance between endpoints.
    const linePositions = new Float32Array(edgeCount * 2 * 3);
    const lineSeeds = new Float32Array(edgeCount * 2);
    const lineDepths = new Float32Array(edgeCount * 2);
    for (let e = 0; e < edgeCount; e++) {
      const i = edges[e * 2 + 0];
      const j = edges[e * 2 + 1];
      // vertex 0 = particle i
      linePositions[e * 6 + 0] = particles.positions[i * 3 + 0];
      linePositions[e * 6 + 1] = particles.positions[i * 3 + 1];
      linePositions[e * 6 + 2] = particles.positions[i * 3 + 2];
      // vertex 1 = particle j
      linePositions[e * 6 + 3] = particles.positions[j * 3 + 0];
      linePositions[e * 6 + 4] = particles.positions[j * 3 + 1];
      linePositions[e * 6 + 5] = particles.positions[j * 3 + 2];
      lineSeeds[e * 2 + 0] = particles.seeds[i];
      lineSeeds[e * 2 + 1] = particles.seeds[j];
      lineDepths[e * 2 + 0] = particles.depths[i];
      lineDepths[e * 2 + 1] = particles.depths[j];
    }

    const lineGeo = new Geometry(gl, {
      position: { size: 3, data: linePositions },
      aSeed: { size: 1, data: lineSeeds },
      aDepth: { size: 1, data: lineDepths },
      // Mark alpha as DYNAMIC_DRAW — re-uploaded every frame. STATIC_DRAW
      // (the OGL default) triggers driver warnings on Intel/AMD when written
      // every frame.
      aAlpha: { size: 1, data: lineAlphas, usage: gl.DYNAMIC_DRAW },
    });

    const lineProgram = new Program(gl, {
      vertex: lineVertex,
      fragment: lineFragment,
      uniforms: {
        uColor: { value: ACCENT },
        uTime: { value: 0 },
        uScrollY: { value: 0 },
        uMouseNDC: { value: [0, 0] },
        uCursorRadius: { value: CURSOR_RADIUS_NDC },
        uCursorPush: { value: CURSOR_PUSH },
        uDriftAmp: { value: DRIFT_AMP },
        uDriftFreqX: { value: DRIFT_FREQ_X },
        uDriftFreqY: { value: DRIFT_FREQ_Y },
        uHalfH: { value: HALF_H },
        uParallaxFar: { value: PARALLAX_FAR },
        uParallaxNear: { value: PARALLAX_NEAR },
        uHeroLineMul: { value: 1 + HERO_BOOST_LINE_GAIN },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
    });
    lineProgram.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
    validateProgram(gl, lineProgram, 'lines');

    const linesMesh = new Mesh(gl, {
      geometry: lineGeo,
      program: lineProgram,
      mode: gl.LINES,
    });
    // Base positions in linePositions already include Z_OFFSET (copied
    // verbatim from particles.positions). Mesh transform stays at origin.
    linesMesh.frustumCulled = false;
    linesMesh.renderOrder = 1;
    linesMesh.setParent(scene);

    // ---- particles (Pass 3) ----
    const particleGeo = new Geometry(gl, {
      position: { size: 3, data: particles.positions },
      aSeed: { size: 1, data: particles.seeds },
      aDepth: { size: 1, data: particles.depths },
      aIsHero: { size: 1, data: particles.heros },
    });

    const particleProgram = new Program(gl, {
      vertex: particleVertex,
      fragment: particleFragment,
      uniforms: {
        uColorBlue: { value: ACCENT },
        uColorHero: { value: HERO_COLOR },
        uTime: { value: 0 },
        uScrollY: { value: 0 },
        uMouseNDC: { value: [0, 0] },
        uCursorRadius: { value: CURSOR_RADIUS_NDC },
        uCursorPush: { value: CURSOR_PUSH },
        uCursorBrighten: { value: CURSOR_BRIGHTEN },
        uDriftAmp: { value: DRIFT_AMP },
        uDriftFreqX: { value: DRIFT_FREQ_X },
        uDriftFreqY: { value: DRIFT_FREQ_Y },
        uHalfH: { value: HALF_H },
        uParallaxFar: { value: PARALLAX_FAR },
        uParallaxNear: { value: PARALLAX_NEAR },
        uBaseSize: { value: BASE_SIZE },
        uDpr: { value: dpr },
        uHeroSizeMul: { value: 1 + HERO_BOOST_SIZE_GAIN },
        uHeroBrightMul: { value: 1 + HERO_BOOST_BRIGHTNESS_GAIN },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
    });
    particleProgram.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
    validateProgram(gl, particleProgram, 'particles');

    const particleMesh = new Mesh(gl, {
      geometry: particleGeo,
      program: particleProgram,
      mode: gl.POINTS,
    });
    // Particles are already positioned in world space at z = Z_OFFSET ± HALF_D
    particleMesh.frustumCulled = false;
    particleMesh.renderOrder = 2;
    particleMesh.setParent(scene);

    // ---- camera projection scalars (cached at resize) ----
    // Used by the CPU projection routine. Recomputed every resize when
    // perspective() rebuilds the projection matrix.
    let projXScale = 1;
    let projYScale = 1;

    // ---- resize ----
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.perspective({ aspect: w / Math.max(h, 1) });
      // OGL Mat4 is column-major: m[0] = f/aspect, m[5] = f
      projXScale = camera.projectionMatrix[0];
      projYScale = camera.projectionMatrix[5];
      gridProgram.uniforms.uResolution.value = [w * dpr, h * dpr];
    };
    resize();

    // ---- scroll source ----
    let scrollY = window.scrollY;
    const onScroll = () => {
      scrollY = window.scrollY;
    };

    // ---- mouse target (NDC), smoothed each frame ----
    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let mouseSmoothedX = 0;
    let mouseSmoothedY = 0;
    // Stable array — mutated in place each frame, never reallocated. The
    // particle and line programs share this same reference via their uniform.
    const mouseNDCArr: [number, number] = [0, 0];
    lineProgram.uniforms.uMouseNDC.value = mouseNDCArr;
    particleProgram.uniforms.uMouseNDC.value = mouseNDCArr;
    const onMouseMove = (e: MouseEvent) => {
      // Canvas is position:fixed inset:0, so its pixel space IS the viewport
      const w = window.innerWidth;
      const h = window.innerHeight;
      mouseTargetX = (e.clientX / w) * 2 - 1;
      mouseTargetY = -((e.clientY / h) * 2 - 1);
    };

    // ---- single teardown — idempotent, called from React cleanup,
    // ---- webgl-disable watchdog, and webglcontextlost ----
    const teardown = () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('webgl-disable', onDisable);
      gl.canvas.removeEventListener('webglcontextlost', onContextLost);
      try {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        /* noop */
      }
      gl.canvas.remove();
    };

    const onDisable = () => teardown();
    const onContextLost = (e: Event) => {
      e.preventDefault();
      teardown();
    };

    window.addEventListener('resize', resize);
    // Scroll + mouse listeners only matter when we're animating per-frame.
    // Under reduce-motion we render exactly one static frame, so they'd just
    // mutate state that never gets re-rendered.
    if (!reduced) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('mousemove', onMouseMove, { passive: true });
    }
    window.addEventListener('webgl-disable', onDisable);
    gl.canvas.addEventListener('webglcontextlost', onContextLost as EventListener);

    // ---- tick loop ----
    // Under reduce-motion we call tick() exactly once and don't reschedule —
    // the user gets a static snapshot of the starfield instead of an animated
    // one. The render path inside tick is identical, just frozen at t=0.
    const tick = (now: number) => {
      if (disposed) return;
      if (!reduced) raf = requestAnimationFrame(tick);

      const tSec = now * 0.001;

      // Smooth mouse toward target
      mouseSmoothedX += (mouseTargetX - mouseSmoothedX) * CURSOR_LERP;
      mouseSmoothedY += (mouseTargetY - mouseSmoothedY) * CURSOR_LERP;

      // Update uniforms (mutate in place — OGL uniforms are { value })
      gridProgram.uniforms.uTime.value = tSec;
      gridProgram.uniforms.uScrollY.value = scrollY;

      // Mutate the shared mouse array in place — both programs read it
      mouseNDCArr[0] = mouseSmoothedX;
      mouseNDCArr[1] = mouseSmoothedY;

      // Hero-section boost — full at scrollY=0, fades to 0 by one viewport.
      // Smoothstep gives a soft falloff so the transition is imperceptible.
      const vh = window.innerHeight;
      const fadeStart = HERO_BOOST_FADE_START_VH * vh;
      const fadeEnd = HERO_BOOST_FADE_END_VH * vh;
      let heroT = (scrollY - fadeStart) / Math.max(fadeEnd - fadeStart, 1);
      if (heroT < 0) heroT = 0;
      else if (heroT > 1) heroT = 1;
      // Hermite smoothstep — heroBoost ∈ [0, 1], 1 = full hero, 0 = subtle
      const heroBoost = 1 - heroT * heroT * (3 - 2 * heroT);

      lineProgram.uniforms.uTime.value = tSec;
      lineProgram.uniforms.uScrollY.value = scrollY;
      lineProgram.uniforms.uHeroLineMul.value = 1 + heroBoost * HERO_BOOST_LINE_GAIN;

      particleProgram.uniforms.uTime.value = tSec;
      particleProgram.uniforms.uScrollY.value = scrollY;
      particleProgram.uniforms.uHeroSizeMul.value = 1 + heroBoost * HERO_BOOST_SIZE_GAIN;
      particleProgram.uniforms.uHeroBrightMul.value = 1 + heroBoost * HERO_BOOST_BRIGHTNESS_GAIN;

      // Project all "edge-eligible" particles (depth < 0.5) to NDC. We
      // technically project all 2500 here for simplicity — the overhead is
      // negligible (~25k arithmetic ops) and it lets us stay branch-free in
      // the edge loop below.
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        projectParticle(particles, i, scrollY, tSec, projXScale, projYScale, screenPositions);
      }

      // Compute per-edge alpha from screen-space distance between endpoints
      const threshold = EDGE_MAX_NDC_DIST;
      for (let e = 0; e < edgeCount; e++) {
        const i = edges[e * 2 + 0];
        const j = edges[e * 2 + 1];
        const xi = screenPositions[i * 2 + 0];
        const yi = screenPositions[i * 2 + 1];
        const xj = screenPositions[j * 2 + 0];
        const yj = screenPositions[j * 2 + 1];
        const dx = xi - xj;
        const dy = yi - yj;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let t = 1 - dist / threshold;
        if (t < 0) t = 0;
        const alpha = t * t * LINE_BASE_ALPHA;
        lineAlphas[e * 2 + 0] = alpha;
        lineAlphas[e * 2 + 1] = alpha;
      }
      // Mark alpha buffer dirty — OGL re-uploads via bufferSubData on next bind
      const aAlphaAttr = lineGeo.attributes.aAlpha;
      if (aAlphaAttr) aAlphaAttr.needsUpdate = true;

      renderer.render({ scene, camera });
    };
    if (reduced) {
      // One-shot static frame: tick(0) runs the full render pipeline once
      // (with t=0, scrollY=0, mouse-at-center) and then exits without
      // scheduling another frame.
      tick(0);
    } else {
      raf = requestAnimationFrame(tick);
    }

    // Kick the fade-in on the next frame so at least one render has queued
    requestAnimationFrame(() => {
      if (!disposed) gl.canvas.style.opacity = '1';
    });

    console.log('[SpaceStarfield] init complete', {
      particleCount: PARTICLE_COUNT,
      edgeCount,
      canvasSize: [gl.canvas.width, gl.canvas.height],
      glVersion: gl.getParameter(gl.VERSION),
    });

    return teardown;
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
