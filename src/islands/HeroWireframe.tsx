import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Geometry, Camera, Transform, Triangle } from 'ogl';
import { canRunWebGL, isMotionReduced } from '../lib/motion';
import { ScrollTrigger } from '../lib/gsap';
import { buildRKGeometry } from '../lib/rk-geometry';

// ---- tuning constants ---------------------------------------------------
const ACCENT: [number, number, number] = [0.36, 0.55, 0.94]; // ≈ --accent #5B8DEF
const CHROMA_CYAN: [number, number, number] = [0.15, 0.85, 1.0];
const CHROMA_WARM: [number, number, number] = [1.0, 0.42, 0.55];

const MARK_SCALE = 1.25;
const MARK_POS_Z = -4.0;
const CHROMA_OFFSET_PX = 1.6; // pixel-space NDC offset magnitude per chroma pass

const PARTICLE_COUNT = 1200;
const PARTICLE_COUNT_SMALL = 500; // phones / small touch tablets
const PARTICLE_RADIUS = 3.6;
const PARTICLE_BASE_SIZE = 3.4;
const PARTICLE_DRIFT_AMP = 0.085;

const STREAK_DURATION_S = 0.95;
const STREAK_PER_FRAME_SPAWN = 0.0035; // tuned so avg gap ≈ 4–7s at 60fps
const STREAK_SLOTS = 2;

const MARK = buildRKGeometry();

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

const faceVertex = /* glsl */ `
attribute vec3 position;
attribute float aShade;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
varying float vShade;
void main() {
  vShade = aShade;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const faceFragment = /* glsl */ `
precision highp float;
uniform float uGlobalAlpha;
varying float vShade;
void main() {
  gl_FragColor = vec4(0.48, 0.65, 1.0, 0.055 * vShade * uGlobalAlpha);
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
const buildParticles = (count: number) => {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
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
    if (isMotionReduced()) return;
    if (!canRunWebGL()) return;

    const host = ref.current;
    const heroEl = host.closest<HTMLElement>('.hero');
    let disposed = false;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
        alpha: true,
        antialias: false,
      });
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Hero renderer unavailable; using static RK.', error);
      return;
    }
    const gl = renderer.gl;
    if (!gl) return;
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

    // ---- dimensional RK ----
    const markEdges = new Geometry(gl, {
      position: { size: 3, data: MARK.lines },
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
      geometry: markEdges,
      program: wireProgram,
      mode: gl.LINES,
    });
    wireMesh.position.set(0, 0, MARK_POS_Z);
    // Scale is set by resize() (called below before the first frame) — it
    // caps the shape to the visible frustum width on narrow viewports.
    wireMesh.frustumCulled = false;

    const faceGeo = new Geometry(gl, {
      position: { size: 3, data: MARK.faces },
      aShade: { size: 1, data: MARK.shades },
    });
    const faceProgram = new Program(gl, {
      vertex: faceVertex,
      fragment: faceFragment,
      uniforms: { uGlobalAlpha: { value: 1 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
    });
    const faceMesh = new Mesh(gl, { geometry: faceGeo, program: faceProgram });
    faceMesh.frustumCulled = false;

    // ---- particle dust field ----
    // Same small-screen rule as SpaceStarfield: phones and small touch
    // tablets get less dust; touch laptops keep the full set.
    const isSmallScreen =
      matchMedia('(max-width: 720px)').matches ||
      (matchMedia('(hover: none)').matches && Math.min(screen.width, screen.height) < 900);
    const particles = buildParticles(isSmallScreen ? PARTICLE_COUNT_SMALL : PARTICLE_COUNT);
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
    particleMesh.position.set(0, 0, MARK_POS_Z);
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

    // ---- resize ----
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      streakProgram.uniforms.uResolution.value = [w * dpr, h * dpr];
      const aspect = w / Math.max(h, 1);
      camera.perspective({ aspect });
      // The RK outline spans -1..1. Allow room for its shallow extrusion
      // and bounded tilt; phones keep the complete mark inside the viewport.
      const visibleW = 2 * Math.abs(MARK_POS_Z) * Math.tan((camera.fov * Math.PI) / 360) * aspect;
      const centered = w <= 900;
      const s = Math.min(MARK_SCALE, (centered ? 0.4 : 0.27) * visibleW);
      wireMesh.scale.set(s, s, s);
      wireMesh.position.x = centered ? 0 : visibleW * 0.18;
      faceMesh.scale.copy(wireMesh.scale);
      faceMesh.position.copy(wireMesh.position);
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
          faceProgram.uniforms.uGlobalAlpha.value = a;
          particleProgram.uniforms.uGlobalAlpha.value = a;
          streakProgram.uniforms.uGlobalAlpha.value = a;
          gl.canvas.style.opacity = String(a);
        },
      });
    }

    // ---- webgl-disable (FPS watchdog kill switch) ----
    const onDisable = () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      scrollTrigger?.kill();
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('case-overlay-open', onOverlayOpen);
      window.removeEventListener('case-overlay-close', onOverlayClose);
      window.removeEventListener('webgl-disable', onDisable);
      gl.canvas.removeEventListener('webglcontextlost', onDisable);
      try {
        if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        // Context loss is already handled by the static fallback below.
      }
      gl.canvas.remove();
      heroEl?.removeAttribute('data-webgl');
    };
    window.addEventListener('webgl-disable', onDisable);
    gl.canvas.addEventListener('webglcontextlost', onDisable);

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
    // Reduced motion leaves the server-rendered SVG mark visible.
    let hasRendered = false;
    const tick = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      if (!visible) return;

      const tSec = now * 0.001;
      particleProgram.uniforms.uTime.value = tSec;

      wireMesh.rotation.x = -0.1 + Math.sin(tSec * 0.35) * 0.08;
      wireMesh.rotation.y = -0.24 + Math.sin(tSec * 0.28) * 0.2;
      faceMesh.rotation.copy(wireMesh.rotation);

      updateStreaks(now);

      // Render scene first (particles + streaks)
      try {
        renderer.render({ scene, camera });
        faceMesh.updateMatrixWorld();
        faceMesh.draw({ camera });
        wireMesh.updateMatrixWorld();
        drawWireframePasses();
        if (!hasRendered) {
          hasRendered = true;
          heroEl?.setAttribute('data-webgl', 'on');
          gl.canvas.style.opacity = '1';
        }
      } catch (error) {
        if (import.meta.env.DEV) console.warn('Hero render failed; using static RK.', error);
        onDisable();
      }
    };
    raf = requestAnimationFrame(tick);

    return onDisable;
  }, []);

  return (
    <div
      ref={ref}
      data-rk-hero
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
