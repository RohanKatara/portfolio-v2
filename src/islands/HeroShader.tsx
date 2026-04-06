import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { canRunWebGL } from '../lib/motion';

const vertex = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
varying vec2 vUv;

// 2D simplex noise (Ashima Arts)
vec3 mod289(vec3 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec2 mod289(vec2 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5);
  p.x *= uResolution.x / uResolution.y;

  float t = uTime * 0.08;
  float n1 = snoise(p * 1.6 + vec2(t, -t * 0.6));
  float n2 = snoise(p * 3.2 + vec2(-t * 0.5, t * 0.7) + n1);
  float n  = (n1 * 0.6 + n2 * 0.4);

  vec2 m = uMouse - 0.5;
  m.x *= uResolution.x / uResolution.y;
  float md = 1.0 - smoothstep(0.0, 0.6, distance(p, m));

  vec3 bg     = vec3(0.0941, 0.0980, 0.1098);   // #181920
  vec3 deep   = vec3(0.1450, 0.1647, 0.2078);   // #252A35
  vec3 accent = vec3(0.357, 0.553, 0.937);      // #5B8DEF

  float field = smoothstep(-0.6, 1.0, n);
  vec3 col = mix(bg, deep, field);
  col = mix(col, accent, smoothstep(0.55, 1.0, n + md * 0.25) * 0.6);

  // vignette
  float vig = smoothstep(0.95, 0.2, length(uv - 0.5));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function HeroShader() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!canRunWebGL()) return;

    const host = ref.current;
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

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [host.clientWidth, host.clientHeight] },
        uMouse: { value: [0.5, 0.5] },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      program.uniforms.uResolution.value = [host.clientWidth, host.clientHeight];
    };
    resize();
    window.addEventListener('resize', resize);

    let mx = 0.5;
    let my = 0.5;
    let lerpedX = 0.5;
    let lerpedY = 0.5;
    const onMove = (e: MouseEvent) => {
      const r = host.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width;
      my = 1.0 - (e.clientY - r.top) / r.height;
    };
    window.addEventListener('mousemove', onMove);

    let raf = 0;
    let visible = true;
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

    const onDisable = () => {
      cancelAnimationFrame(raf);
      gl.canvas.remove();
      disposed = true;
    };
    window.addEventListener('webgl-disable', onDisable);

    const start = performance.now();
    const tick = (now: number) => {
      if (disposed) return;
      if (visible) {
        lerpedX += (mx - lerpedX) * 0.06;
        lerpedY += (my - lerpedY) * 0.06;
        program.uniforms.uTime.value = (now - start) * 0.001;
        program.uniforms.uMouse.value = [lerpedX, lerpedY];
        renderer.render({ scene: mesh });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // fade in
    gl.canvas.style.opacity = '0';
    gl.canvas.style.transition = 'opacity 800ms ease-out';
    requestAnimationFrame(() => {
      gl.canvas.style.opacity = '1';
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('case-overlay-open', onOverlayOpen);
      window.removeEventListener('case-overlay-close', onOverlayClose);
      window.removeEventListener('webgl-disable', onDisable);
      try {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {}
      gl.canvas.remove();
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
