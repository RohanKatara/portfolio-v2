import { useEffect, useId, useRef } from 'react';

/**
 * Krishna.AI thumbnail — Layered sienna feather drift.
 *
 * 5 stylized peacock feathers at three depths (back, mid, front) drift slowly
 * across the frame on independent orbits. Cursor movement parallaxes them
 * (front layers shift more than back layers). The eye on each feather pulses
 * a halo when the pointer approaches it in viewBox space.
 *
 * The barb geometry is the parametric Bezier-rachis + perpendicular-barb
 * sampler from the previous iteration — pulled into module-level helpers and
 * precomputed once per sample-count so each render is just JSX.
 *
 * Pause: per-frame work is skipped when offsetParent === null (parent is
 * display:none — i.e. while the case overlay is closed).
 */

const W = 800;
const H = 500;
const VBOX_CX = W / 2;
const VBOX_CY = H / 2;

// Feather-local coordinate system. The base (stem foot) sits at the origin;
// the curve runs upward into negative Y. Render-time transforms place each
// feather into viewBox space.
const FP0 = { x: -30, y: -220 }; // top tip
const FP1 = { x: 60, y: -100 };  // bow control
const FP2 = { x: 0, y: 0 };      // base anchor

const EYE_T = 0.18;

function pointAt(t: number) {
  const u = 1 - t;
  return {
    x: u * u * FP0.x + 2 * u * t * FP1.x + t * t * FP2.x,
    y: u * u * FP0.y + 2 * u * t * FP1.y + t * t * FP2.y,
  };
}

function tangentAt(t: number) {
  return {
    x: 2 * (1 - t) * (FP1.x - FP0.x) + 2 * t * (FP2.x - FP1.x),
    y: 2 * (1 - t) * (FP1.y - FP0.y) + 2 * t * (FP2.y - FP1.y),
  };
}

// Bell-curve barb length, peaks just below the eye
function barbLength(t: number) {
  if (t < 0.018 || t > 0.94) return 0;
  const peak = 0.32;
  const z = (t - peak) / 0.36;
  return 80 * Math.exp(-z * z) * (1 - t * 0.32);
}

// Sienna color stops along the rachis
const STOPS: Array<[number, [number, number, number]]> = [
  [0.00, [255, 224, 204]], // cream tip highlight
  [0.18, [244, 160, 122]], // light sienna
  [0.40, [224, 123, 92]],  // brand sienna #E07B5C
  [0.62, [194, 90, 56]],   // deep sienna
  [0.85, [109, 42, 20]],   // umber
  [1.00, [42, 16, 6]],     // near-black brown
];

function colorAt(t: number) {
  const tt = Math.max(0, Math.min(1, t));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (tt >= t0 && tt <= t1) {
      const k = (tt - t0) / (t1 - t0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * k);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * k);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * k);
      return `rgb(${r},${g},${b})`;
    }
  }
  return 'rgb(42,16,6)';
}

interface Barb {
  d: string;
  color: string;
  opacity: number;
  width: number;
}

function buildBarbs(samples: number): Barb[] {
  const out: Barb[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const p = pointAt(t);
    const tg = tangentAt(t);
    const mag = Math.hypot(tg.x, tg.y) || 1;
    const perpX = -tg.y / mag;
    const perpY = tg.x / mag;
    const len = barbLength(t);
    if (len < 2) continue;
    const color = colorAt(t);
    const op = 0.55 + 0.4 * Math.exp(-Math.pow((t - 0.3) / 0.5, 2));
    // Sweep barbs upward (toward the top tip) along curve direction
    const sweepX = (-tg.x / mag) * 10;
    const sweepY = (-tg.y / mag) * 10;
    const width = Math.max(0.9, 0.85 + len / 90);

    // Left barb (quadratic curve for organic outward bow)
    {
      const tipX = p.x + perpX * len + sweepX;
      const tipY = p.y + perpY * len + sweepY;
      const ctrlX = (p.x + tipX) / 2 + perpX * 5 + sweepX * 0.3;
      const ctrlY = (p.y + tipY) / 2 + perpY * 5 + sweepY * 0.3;
      out.push({
        d: `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`,
        color,
        opacity: Math.min(1, op),
        width,
      });
    }
    // Right barb
    {
      const tipX = p.x - perpX * len + sweepX;
      const tipY = p.y - perpY * len + sweepY;
      const ctrlX = (p.x + tipX) / 2 - perpX * 5 + sweepX * 0.3;
      const ctrlY = (p.y + tipY) / 2 - perpY * 5 + sweepY * 0.3;
      out.push({
        d: `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`,
        color,
        opacity: Math.min(1, op),
        width,
      });
    }
  }
  return out;
}

interface Wisp {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  op: number;
}

function buildWisps(): Wisp[] {
  const out: Wisp[] = [];
  const tip = pointAt(0);
  for (let i = 0; i < 14; i++) {
    const angle = -Math.PI / 2 + (i - 6.5) * 0.18;
    const len = 18 + ((i * 13) % 14);
    out.push({
      x1: tip.x + Math.sin(i * 0.7) * 2,
      y1: tip.y + 1,
      x2: tip.x + Math.cos(angle) * len + Math.sin(i * 1.3) * 2,
      y2: tip.y + Math.sin(angle) * len,
      op: Math.max(0.18, 0.55 - (i % 6) * 0.06),
    });
  }
  return out;
}

// ---------- Per-feather configuration ----------

type Layer = 'back' | 'mid' | 'front';

interface FeatherConfig {
  id: string;
  layer: Layer;
  anchorX: number;
  anchorY: number;
  scale: number;
  baseRot: number;     // degrees
  driftRX: number;
  driftRY: number;
  periodX: number;     // seconds
  periodY: number;
  periodR: number;
  phase: number;       // radians
  opacity: number;
  samples: number;
  hasSpark: boolean;
}

const FEATHERS: FeatherConfig[] = [
  // Back layer (drawn first → behind everything)
  { id: 'b1', layer: 'back',  anchorX: 110, anchorY: 360, scale: 0.38, baseRot:  28, driftRX: 8,  driftRY: 5, periodX: 22, periodY: 24, periodR: 30, phase: 2.2, opacity: 0.45, samples: 32, hasSpark: false },
  { id: 'b2', layer: 'back',  anchorX: 700, anchorY: 380, scale: 0.34, baseRot: -24, driftRX: 8,  driftRY: 5, periodX: 20, periodY: 23, periodR: 28, phase: 4.4, opacity: 0.40, samples: 32, hasSpark: false },
  // Mid layer
  { id: 'm1', layer: 'mid',   anchorX: 230, anchorY: 320, scale: 0.62, baseRot:  18, driftRX: 10, driftRY: 6, periodX: 16, periodY: 19, periodR: 25, phase: 1.7, opacity: 0.80, samples: 44, hasSpark: false },
  { id: 'm2', layer: 'mid',   anchorX: 600, anchorY: 300, scale: 0.58, baseRot: -16, driftRX: 10, driftRY: 6, periodX: 18, periodY: 21, periodR: 26, phase: 3.1, opacity: 0.76, samples: 44, hasSpark: false },
  // Front layer (drawn last → on top)
  { id: 'f1', layer: 'front', anchorX: 430, anchorY: 380, scale: 1.00, baseRot:  -8, driftRX: 12, driftRY: 8, periodX: 14, periodY: 17, periodR: 22, phase: 0.0, opacity: 1.00, samples: 56, hasSpark: true  },
];

// Precompute barb arrays once per unique feather config
const FEATHER_BARBS: Barb[][] = FEATHERS.map((cfg) => buildBarbs(cfg.samples));
const WISPS = buildWisps();
const EYE_LOCAL = pointAt(EYE_T);

// Initial transform string for first paint (matches t=0 of the rAF loop so
// there's no first-frame jump when the animation starts)
function initialTransform(cfg: FeatherConfig): string {
  const dx = Math.sin(cfg.phase) * cfg.driftRX;
  const dy = Math.cos(cfg.phase) * cfg.driftRY;
  const drot = Math.sin(cfg.phase) * 3.2;
  const x = cfg.anchorX + dx;
  const y = cfg.anchorY + dy;
  const rot = cfg.baseRot + drot;
  return `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${cfg.scale})`;
}

function depthFor(layer: Layer): number {
  return layer === 'front' ? 0.045 : layer === 'mid' ? 0.025 : 0.012;
}

export default function KrishnaThumb() {
  const uid = useId().replace(/[:]/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const featherRefs = useRef<Array<SVGGElement | null>>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mouseX: number | null = null;
    let mouseY: number | null = null;
    let smParaX = 0;
    let smParaY = 0;
    let raf = 0;
    let prev = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', onMove);

    const tick = (ts: number) => {
      const dt = prev ? Math.min(0.05, (ts - prev) / 1000) : 0.016;
      prev = ts;
      const t = ts / 1000;

      // Skip all work when parent is display:none (overlay closed)
      if (container.offsetParent !== null) {
        const rect = container.getBoundingClientRect();
        let cursorVX = VBOX_CX;
        let cursorVY = VBOX_CY;
        let hasCursor = false;
        if (mouseX != null && mouseY != null && rect.width > 4) {
          cursorVX = ((mouseX - rect.left) / rect.width) * W;
          cursorVY = ((mouseY - rect.top) / rect.height) * H;
          hasCursor = true;
        }

        // Smoothed cursor offset from viewBox center, in viewBox units
        const paraXTarget = hasCursor ? cursorVX - VBOX_CX : 0;
        const paraYTarget = hasCursor ? cursorVY - VBOX_CY : 0;
        const paraK = Math.min(1, dt * 4);
        smParaX += (paraXTarget - smParaX) * paraK;
        smParaY += (paraYTarget - smParaY) * paraK;

        for (let i = 0; i < FEATHERS.length; i++) {
          const cfg = FEATHERS[i];
          const g = featherRefs.current[i];
          if (!g) continue;

          const depth = depthFor(cfg.layer);
          const dxOrbit = Math.sin((t / cfg.periodX) * Math.PI * 2 + cfg.phase) * cfg.driftRX;
          const dyOrbit = Math.cos((t / cfg.periodY) * Math.PI * 2 + cfg.phase) * cfg.driftRY;
          const drot    = Math.sin((t / cfg.periodR) * Math.PI * 2 + cfg.phase) * 3.2;

          // Parallax: feathers shift opposite-to-cursor (camera-feel), magnitude scales with depth
          const x = cfg.anchorX + dxOrbit - smParaX * depth;
          const y = cfg.anchorY + dyOrbit - smParaY * depth;
          const rot = cfg.baseRot + drot;

          g.setAttribute(
            'transform',
            `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${cfg.scale})`
          );

          // Compute the eye's CURRENT position in viewBox space (apply scale + rotate + translate to local eye coords)
          const cosR = Math.cos((rot * Math.PI) / 180);
          const sinR = Math.sin((rot * Math.PI) / 180);
          const sx = EYE_LOCAL.x * cfg.scale;
          const sy = EYE_LOCAL.y * cfg.scale;
          const eyeVX = x + sx * cosR - sy * sinR;
          const eyeVY = y + sx * sinR + sy * cosR;
          const dexd = cursorVX - eyeVX;
          const deyd = cursorVY - eyeVY;
          const dist = Math.hypot(dexd, deyd);
          const prox = hasCursor ? Math.max(0, 1 - dist / 140) : 0;
          g.style.setProperty('--eye-prox', prox.toFixed(3));
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={containerRef} className="thumb-root kr-root">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Krishna.AI: drifting peacock feathers, interactive"
      >
        <defs>
          <linearGradient id={`kr-bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a100a" />
            <stop offset="55%" stopColor="#0f0907" />
            <stop offset="100%" stopColor="#080503" />
          </linearGradient>
          <radialGradient id={`kr-glow-${uid}`} cx="50%" cy="38%" r="58%">
            <stop offset="0%" stopColor="#E07B5C" stopOpacity="0.20" />
            <stop offset="50%" stopColor="#8B4023" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <filter id={`kr-blur-mid-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
          <filter id={`kr-blur-back-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        {/* Background */}
        <rect width={W} height={H} fill={`url(#kr-bg-${uid})`} />
        <rect width={W} height={H} fill={`url(#kr-glow-${uid})`} />

        {/* Feathers — rendered in array order (back first, front last) */}
        {FEATHERS.map((cfg, idx) => {
          const barbs = FEATHER_BARBS[idx];
          const filterUrl =
            cfg.layer === 'back'
              ? `url(#kr-blur-back-${uid})`
              : cfg.layer === 'mid'
                ? `url(#kr-blur-mid-${uid})`
                : undefined;

          return (
            <g
              key={cfg.id}
              ref={(el) => {
                featherRefs.current[idx] = el;
              }}
              className="kr-feather"
              transform={initialTransform(cfg)}
              opacity={cfg.opacity}
              filter={filterUrl}
            >
              {/* Stem (rachis) */}
              <path
                d={`M ${FP0.x} ${FP0.y} Q ${FP1.x} ${FP1.y} ${FP2.x} ${FP2.y}`}
                fill="none"
                stroke="#8B4023"
                strokeWidth="1.4"
                strokeOpacity="0.55"
                strokeLinecap="round"
              />

              {/* Barbs */}
              {barbs.map((b, i) => (
                <path
                  key={i}
                  d={b.d}
                  stroke={b.color}
                  strokeWidth={b.width}
                  strokeOpacity={b.opacity}
                  fill="none"
                  strokeLinecap="round"
                />
              ))}

              {/* Wispy top strands (front feather only — keeps the back/mid clean) */}
              {cfg.hasSpark &&
                WISPS.map((w, i) => (
                  <line
                    key={i}
                    x1={w.x1}
                    y1={w.y1}
                    x2={w.x2}
                    y2={w.y2}
                    stroke="#FFE0CC"
                    strokeWidth="0.85"
                    strokeOpacity={w.op}
                    strokeLinecap="round"
                  />
                ))}

              {/* Eye — six layered ellipses, all sienna */}
              <ellipse
                cx={EYE_LOCAL.x}
                cy={EYE_LOCAL.y}
                rx="34"
                ry="44"
                fill="#E07B5C"
                className="kr-eye-halo"
              />
              <ellipse
                cx={EYE_LOCAL.x}
                cy={EYE_LOCAL.y}
                rx="24"
                ry="32"
                fill="#C25A38"
                opacity="0.85"
              />
              <ellipse
                cx={EYE_LOCAL.x}
                cy={EYE_LOCAL.y}
                rx="18"
                ry="24"
                fill="#2A1006"
                opacity="0.95"
              />
              <ellipse
                cx={EYE_LOCAL.x}
                cy={EYE_LOCAL.y}
                rx="11"
                ry="15"
                fill="#F4A07A"
                opacity="0.95"
              />
              <ellipse
                cx={EYE_LOCAL.x}
                cy={EYE_LOCAL.y + 1}
                rx="5"
                ry="7"
                fill="#1A0804"
              />
              {cfg.hasSpark && (
                <ellipse
                  cx={EYE_LOCAL.x}
                  cy={EYE_LOCAL.y - 1}
                  rx="1.8"
                  ry="2.6"
                  fill="#FBE4D8"
                  className="kr-eye-spark"
                />
              )}
            </g>
          );
        })}
      </svg>

      <style>{`
        .thumb-root.kr-root {
          width: 100%;
          height: 100%;
          background: #0f0907;
          overflow: hidden;
          position: relative;
        }
        .kr-root svg { display: block; width: 100%; height: 100%; }
        .kr-feather {
          --eye-prox: 0;
          will-change: transform;
        }
        .kr-eye-halo {
          opacity: calc(0.30 + var(--eye-prox) * 0.55);
        }
        .kr-eye-spark {
          transform-box: fill-box;
          transform-origin: center;
          transform: scale(calc(1 + var(--eye-prox) * 0.7));
          opacity: calc(0.85 + var(--eye-prox) * 0.15);
        }
      `}</style>
    </div>
  );
}
