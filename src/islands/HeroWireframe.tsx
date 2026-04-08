import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Geometry, Camera, Transform, Triangle } from 'ogl';
import { canRunWebGL } from '../lib/motion';
import { ScrollTrigger } from '../lib/gsap';

// ---- tuning constants ---------------------------------------------------
const ACCENT: [number, number, number] = [0.36, 0.55, 0.94]; // ≈ --accent #5B8DEF
const CHROMA_CYAN: [number, number, number] = [0.15, 0.85, 1.0];
const CHROMA_WARM: [number, number, number] = [1.0, 0.42, 0.55];

const ICO_SCALE = 1.45;
const ICO_POS_Z = -4.0;
const ICO_ROT_X_PER_FRAME = 0.0028;
const ICO_ROT_Y_PER_FRAME = 0.0042;
const CHROMA_OFFSET_PX = 1.6; // pixel-space NDC offset magnitude per chroma pass

const PARTICLE_COUNT = 1200;
const PARTICLE_RADIUS = 3.6;
const PARTICLE_BASE_SIZE = 3.4;
const PARTICLE_DRIFT_AMP = 0.085;

const STREAK_DURATION_S = 0.95;
const STREAK_PER_FRAME_SPAWN = 0.0035; // tuned so avg gap ≈ 4–7s at 60fps
const STREAK_SLOTS = 2;

// ---- icosahedron geometry data (built once at module load) --------------
const buildIcosahedron = () => {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw: Array<[number, number, number]> = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  const positions = new Float32Array(12 * 3);
  for (let i = 0; i < 12; i++) {
    const [x, y, z] = raw[i];
    const len = Math.sqrt(x * x + y * y + z * z);
    positions[i * 3 + 0] = x / len;
    positions[i * 3 + 1] = y / len;
    positions[i * 3 + 2] = z / len;
  }

  const faces: Array<[number, number, number]> = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  const seen = new Set<number>();
  const edges: number[] = [];
  const addEdge = (a: number, b: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = lo * 12 + hi;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(lo, hi);
  };
  for (const [a, b, c] of faces) {
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }
  return { positions, indices: new Uint16Array(edges) };
};

const ICO = buildIcosahedron();

// ---- shaders ------------------------------------------------------------

const wireVertex = /* glsl */ `
attribute vec3 position;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec2 uChromaOffset; // NDC pixel-space offset for chromatic aberration
varying float vDepth;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip = projectionMatrix * mv;
  // Apply chroma offset in NDC space (post-projection, pre-divide)
  clip.xy += uChromaOffset * clip.w;
  vDepth = -mv.z;
  gl_Position = clip;
}
`;

const wireFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uGlobalAlpha;
varying float vDepth;
void main() {
  // Subtle distance fade so the back of the icosahedron softens
  float fade = smoothstep(8.0, 2.5, vDepth);
  gl_FragColor = vec4(uColor * fade, uAlpha * fade * uGlobalAlpha);
}
`;

const particleVertex = /* glsl */ `
attribute vec3 position;
attribute float aSeed;
attribute float aSize;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float uTime;
uniform float uBaseSize;
uniform float uDriftAmp;
varying float vFade;
void main() {
  vec3 p = position;
  // Per-particle sinusoidal drift
  p.x += sin(uTime * 0.4 + aSeed * 6.2831) * uDriftAmp;
  p.y += cos(uTime * 0.35 + aSeed * 6.2831) * uDriftAmp;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  // Distance attenuation: -mv.z is positive going into the scene
  gl_PointSize = aSize * uBaseSize / max(-mv.z, 0.01);
  vFade = smoothstep(8.0, 1.5, -mv.z);
}
`;

const particleFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uGlobalAlpha;
varying float vFade;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d) * 0.65 * vFade * uGlobalAlpha;
  gl_FragColor = vec4(uColor, a);
}
`;

const streakVertex = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const streakFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform vec2 uResolution;
uniform vec3 uStreakA; // x = active(0/1), y = progress 0..1, z = y position NDC
uniform vec3 uStreakB;
uniform float uGlobalAlpha;

float beam(vec3 streak, vec2 uv) {
  if (streak.x < 0.5) return 0.0;
  float progress = streak.y;
  float yPos = streak.z;
  // Vertical Gaussian falloff — narrow horizontal beam
  float vert = exp(-pow((uv.y - yPos) * 95.0, 2.0));
  // Horizontal moving head
  float headX = mix(-1.4, 1.4, progress);
  float horiz = exp(-pow((uv.x - headX) * 2.6, 2.0));
  // Fade out at edges of progress 0..1
  float lifeFade = sin(progress * 3.14159);
  return vert * horiz * lifeFade;
}

void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float intensity = beam(uStreakA, uv) + beam(uStreakB, uv);
  gl_FragColor = vec4(uColor, intensity * 0.85 * uGlobalAlpha);
}
`;

// ---- particle geometry generator ----------------------------------------
const buildParticles = () => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const seeds = new Float32Array(PARTICLE_COUNT);
  const sizes = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Rejection-sample inside unit sphere, then scale
    let x = 0, y = 0, z = 0;
    while (true) {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
      if (x * x + y * y + z * z <= 1) break;
    }
    positions[i * 3 + 0] = x * PARTICLE_RADIUS;
    positions[i * 3 + 1] = y * PARTICLE_RADIUS;
    positions[i * 3 + 2] = z * PARTICLE_RADIUS;
    seeds[i] = Math.random();
    sizes[i] = 0.6 + Math.random() * 0.8;
  }
  return { positions, seeds, sizes };
};

// ---- component ----------------------------------------------------------
export default function HeroWireframe() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!canRunWebGL()) return;

    const host = ref.current;
    const heroEl = host.closest<HTMLElement>('.hero');
    let disposed = false;

    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      alpha: true,
      antialias: false,
    });
    const gl = renderer.gl;
    host.appendChild(gl.canvas);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.display = 'block';
    gl.canvas.style.position = 'absolute';
    gl.canvas.style.inset = '0';
    gl.canvas.style.opacity = '0';
    gl.canvas.style.transition = 'opacity 800ms ease-out';

    // Fully transparent so the global SpaceStarfield (mounted in BaseLayout
    // at z-index: -1) shows through the hero region too.
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 45, near: 0.1, far: 30 });
    camera.position.z = 0;

    // Root scene contains particles + streaks. The wireframe is drawn manually
    // 3 times per frame OUTSIDE the scene render to handle chromatic aberration,
    // so it has no parent in the scene graph.
    const scene = new Transform();

    // ---- icosahedron wireframe ----
    const icoGeo = new Geometry(gl, {
      position: { size: 3, data: ICO.positions },
      index: { data: ICO.indices },
    });

    const wireProgram = new Program(gl, {
      vertex: wireVertex,
      fragment: wireFragment,
      uniforms: {
        uChromaOffset: { value: [0, 0] },
        uColor: { value: ACCENT },
        uAlpha: { value: 1.0 },
        uGlobalAlpha: { value: 1.0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
    });
    wireProgram.setBlendFunc(gl.SRC_ALPHA, gl.ONE); // additive

    const wireMesh = new Mesh(gl, {
      geometry: icoGeo,
      program: wireProgram,
      mode: gl.LINES,
    });
    wireMesh.position.set(0, 0, ICO_POS_Z);
    wireMesh.scale.set(ICO_SCALE, ICO_SCALE, ICO_SCALE);
    wireMesh.frustumCulled = false;

    // ---- particle dust field ----
    const particles = buildParticles();
    const particleGeo = new Geometry(gl, {
      position: { size: 3, data: particles.positions },
      aSeed: { size: 1, data: particles.seeds },
      aSize: { size: 1, data: particles.sizes },
    });

    const particleProgram = new Program(gl, {
      vertex: particleVertex,
      fragment: particleFragment,
      uniforms: {
        uTime: { value: 0 },
        uBaseSize: { value: PARTICLE_BASE_SIZE },
        uDriftAmp: { value: PARTICLE_DRIFT_AMP },
        uColor: { value: [ACCENT[0] * 1.05, ACCENT[1] * 1.05, ACCENT[2] * 1.1] },
        uGlobalAlpha: { value: 1.0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
    });
    particleProgram.setBlendFunc(gl.SRC_ALPHA, gl.ONE);

    const particleMesh = new Mesh(gl, {
      geometry: particleGeo,
      program: particleProgram,
      mode: gl.POINTS,
    });
    particleMesh.position.set(0, 0, ICO_POS_Z);
    particleMesh.frustumCulled = false;
    particleMesh.setParent(scene);

    // ---- datastream streaks (full-screen pass) ----
    const streakGeo = new Triangle(gl);

    const streakProgram = new Program(gl, {
      vertex: streakVertex,
      fragment: streakFragment,
      uniforms: {
        uColor: { value: [0.55, 0.85, 1.0] },
        uResolution: { value: [1, 1] },
        uStreakA: { value: [0, 0, 0] }, // active, progress, y
        uStreakB: { value: [0, 0, 0] },
        uGlobalAlpha: { value: 1.0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
    });
    streakProgram.setBlendFunc(gl.SRC_ALPHA, gl.ONE);

    const streakMesh = new Mesh(gl, { geometry: streakGeo, program: streakProgram });
    streakMesh.frustumCulled = false;
    streakMesh.setParent(scene);

    // CPU-side streak controller: 2 slots, each with start time + y position
    type StreakSlot = { active: boolean; startMs: number; y: number };
    const streaks: StreakSlot[] = Array.from({ length: STREAK_SLOTS }, () => ({
      active: false,
      startMs: 0,
      y: 0,
    }));

    // Mark WebGL active so the CSS gradient fallback hides itself
    heroEl?.setAttribute('data-webgl', 'on');

    // ---- resize ----
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      streakProgram.uniforms.uResolution.value = [w * dpr, h * dpr];
      camera.perspective({ aspect: w / Math.max(h, 1) });
    };
    resize();
    window.addEventListener('resize', resize);

    // ---- visibility flags ----
    let visible = true;
    let raf = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    observer.observe(host);

    const onOverlayOpen = () => (visible = false);
    const onOverlayClose = () => (visible = true);
    window.addEventListener('case-overlay-open', onOverlayOpen);
    window.addEventListener('case-overlay-close', onOverlayClose);

    // ---- scroll fade (ScrollTrigger) ----
    let scrollTrigger: ReturnType<typeof ScrollTrigger.create> | undefined;
    if (heroEl) {
      scrollTrigger = ScrollTrigger.create({
        trigger: heroEl,
        start: 'top top',
        end: 'bottom top',
        onUpdate: (self) => {
          const a = 1 - self.progress;
          wireProgram.uniforms.uGlobalAlpha.value = a;
          particleProgram.uniforms.uGlobalAlpha.value = a;
          streakProgram.uniforms.uGlobalAlpha.value = a;
          gl.canvas.style.opacity = String(a);
        },
      });
    }

    // ---- webgl-disable (FPS watchdog kill switch) ----
    const onDisable = () => {
      cancelAnimationFrame(raf);
      scrollTrigger?.kill();
      gl.canvas.remove();
      heroEl?.removeAttribute('data-webgl');
      disposed = true;
    };
    window.addEventListener('webgl-disable', onDisable);

    // ---- streak controller update ----
    const updateStreaks = (nowMs: number) => {
      for (const s of streaks) {
        if (!s.active) {
          if (Math.random() < STREAK_PER_FRAME_SPAWN) {
            s.active = true;
            s.startMs = nowMs;
            s.y = Math.random() * 0.8 - 0.4;
          }
        } else {
          const progress = (nowMs - s.startMs) / (STREAK_DURATION_S * 1000);
          if (progress >= 1) s.active = false;
        }
      }
      const aProg = streaks[0].active ? (nowMs - streaks[0].startMs) / (STREAK_DURATION_S * 1000) : 0;
      const bProg = streaks[1].active ? (nowMs - streaks[1].startMs) / (STREAK_DURATION_S * 1000) : 0;
      streakProgram.uniforms.uStreakA.value = [streaks[0].active ? 1 : 0, aProg, streaks[0].y];
      streakProgram.uniforms.uStreakB.value = [streaks[1].active ? 1 : 0, bProg, streaks[1].y];
    };

    // ---- chromatic aberration draw passes ----
    // Three additive draws of the same wireframe with NDC-pixel offsets:
    // center pass = full accent blue, side passes = cyan / warm tint at lower
    // intensity. Where they overlap they bloom; where rotation moves them
    // apart you see the colour fringes.
    const drawWireframePasses = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      const ox = (CHROMA_OFFSET_PX * 2) / w; // NDC pixel
      const oy = (CHROMA_OFFSET_PX * 2) / h;

      // Pass 1 — center, full accent
      wireProgram.uniforms.uChromaOffset.value = [0, 0];
      wireProgram.uniforms.uColor.value = ACCENT;
      wireProgram.uniforms.uAlpha.value = 0.95;
      wireMesh.draw({ camera });

      // Pass 2 — cyan, offset right+down
      wireProgram.uniforms.uChromaOffset.value = [ox, oy];
      wireProgram.uniforms.uColor.value = CHROMA_CYAN;
      wireProgram.uniforms.uAlpha.value = 0.42;
      wireMesh.draw({ camera });

      // Pass 3 — warm, offset left+up
      wireProgram.uniforms.uChromaOffset.value = [-ox, -oy];
      wireProgram.uniforms.uColor.value = CHROMA_WARM;
      wireProgram.uniforms.uAlpha.value = 0.34;
      wireMesh.draw({ camera });
    };

    // ---- tick loop ----
    // Under reduce-motion: tick() runs exactly once and never reschedules,
    // giving a static still of the icosahedron + particle dust + (no streak,
    // since streaks are gated by random spawn at t=0). The user sees the
    // shape, just frozen.
    const tick = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      if (!visible) return;

      const tSec = now * 0.001;
      particleProgram.uniforms.uTime.value = tSec;

      wireMesh.rotation.x += ICO_ROT_X_PER_FRAME;
      wireMesh.rotation.y += ICO_ROT_Y_PER_FRAME;

      updateStreaks(now);

      // Render scene first (particles + streaks)
      renderer.render({ scene, camera });

      // Then refresh wireframe matrices and draw 3 chroma passes
      wireMesh.updateMatrixWorld();
      drawWireframePasses();
    };
    raf = requestAnimationFrame(tick);

    // Kick the fade-in on the next frame so at least one render has queued
    requestAnimationFrame(() => {
      if (!disposed) gl.canvas.style.opacity = '1';
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      scrollTrigger?.kill();
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('case-overlay-open', onOverlayOpen);
      window.removeEventListener('case-overlay-close', onOverlayClose);
      window.removeEventListener('webgl-disable', onDisable);
      try {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        /* noop */
      }
      gl.canvas.remove();
      heroEl?.removeAttribute('data-webgl');
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
