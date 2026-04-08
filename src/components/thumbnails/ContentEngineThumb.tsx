import { useId } from 'react';

/**
 * Content Engine thumbnail — Multiplication.
 * Tiles emerge from the center and tessellate outward to fill a grid, then
 * fade. Reads as "one piece of content -> many channels". Pure SVG + CSS.
 */
export default function ContentEngineThumb() {
  const uid = useId().replace(/[:]/g, '');

  const cols = 4;
  const rows = 3;
  const gap = 22;
  const rectW = 140;
  const rectH = 78;
  const totalW = cols * rectW + (cols - 1) * gap;
  const totalH = rows * rectH + (rows - 1) * gap;
  const offsetX = (800 - totalW) / 2;
  const offsetY = (500 - totalH) / 2;

  type Tile = { x: number; y: number; dist: number; key: string };
  const tiles: Tile[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * (rectW + gap);
      const y = offsetY + r * (rectH + gap);
      const cx = x + rectW / 2;
      const cy = y + rectH / 2;
      const dist = Math.hypot(cx - 400, cy - 250);
      tiles.push({ x, y, dist, key: `${r}-${c}` });
    }
  }
  // Stagger by distance from center so the multiplication ripples outward
  tiles.sort((a, b) => a.dist - b.dist);

  return (
    <div className="thumb-root ce-root">
      <svg
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Content Engine: content multiplying outward"
      >
        <defs>
          <linearGradient id={`ce-bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e1812" />
            <stop offset="100%" stopColor="#100a06" />
          </linearGradient>
          <radialGradient id={`ce-glow-${uid}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%"  stopColor="#F59E66" stopOpacity="0.32" />
            <stop offset="55%" stopColor="#F59E66" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#F59E66" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="800" height="500" fill={`url(#ce-bg-${uid})`} />
        <ellipse cx="400" cy="250" rx="380" ry="240" fill={`url(#ce-glow-${uid})`} />

        {/* Multiplied tiles — each scales out from the SVG center */}
        {tiles.map((it, i) => (
          <g
            key={it.key}
            className="ce-tile"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
            <rect
              x={it.x}
              y={it.y}
              width={rectW}
              height={rectH}
              rx={3}
              fill="#1c1611"
              stroke="#F59E66"
              strokeWidth="1"
            />
            {/* fake text lines inside the tile */}
            <line x1={it.x + 14} y1={it.y + 20} x2={it.x + rectW - 56} y2={it.y + 20} stroke="#F59E66" strokeWidth="1.4" opacity="0.75" />
            <line x1={it.x + 14} y1={it.y + 34} x2={it.x + rectW - 14} y2={it.y + 34} stroke="#F59E66" strokeWidth="0.8" opacity="0.4" />
            <line x1={it.x + 14} y1={it.y + 46} x2={it.x + rectW - 28} y2={it.y + 46} stroke="#F59E66" strokeWidth="0.8" opacity="0.4" />
            <line x1={it.x + 14} y1={it.y + 58} x2={it.x + rectW - 60} y2={it.y + 58} stroke="#F59E66" strokeWidth="0.8" opacity="0.4" />
          </g>
        ))}

        {/* Pulsing core dot at center suggesting the source */}
        <circle cx="400" cy="250" r="4" fill="#F59E66" className="ce-core" />
      </svg>

      <style>{`
        .thumb-root.ce-root {
          width: 100%;
          height: 100%;
          background: #100a06;
          overflow: hidden;
          position: relative;
        }
        .ce-root svg { display: block; width: 100%; height: 100%; }

        .ce-tile {
          transform-box: view-box;
          transform-origin: 400px 250px;
          opacity: 0;
          animation: ce-tile-multiply 9s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @keyframes ce-tile-multiply {
          0%   { transform: scale(0);    opacity: 0;   }
          8%   { transform: scale(0);    opacity: 0;   }
          22%  { transform: scale(0.55); opacity: 0.6; }
          38%  { transform: scale(1);    opacity: 1;   }
          78%  { transform: scale(1);    opacity: 0.85;}
          100% { transform: scale(1);    opacity: 0;   }
        }

        .ce-core {
          transform-box: view-box;
          transform-origin: 400px 250px;
          animation: ce-core-pulse 2.4s ease-in-out infinite;
        }
        @keyframes ce-core-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1);   }
          50%      { opacity: 1;   transform: scale(1.6); }
        }
      `}</style>
    </div>
  );
}
