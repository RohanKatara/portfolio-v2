import { useId } from 'react';

/**
 * MockTalk thumbnail — Live Voice AI.
 * Pulsing waveform + concentric rings emanating from a microphone glyph.
 * Pure SVG + CSS animations (paused automatically when display:none).
 */
export default function MockTalkThumb() {
  const uid = useId().replace(/[:]/g, '');
  const bars = Array.from({ length: 28 });

  return (
    <div className="thumb-root mt-root">
      <svg
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="MockTalk: live voice waveform"
      >
        <defs>
          <linearGradient id={`mt-bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1f2e" />
            <stop offset="100%" stopColor="#0c1019" />
          </linearGradient>
          <radialGradient id={`mt-glow-${uid}`} cx="50%" cy="55%" r="60%">
            <stop offset="0%" stopColor="#5B8DEF" stopOpacity="0.32" />
            <stop offset="55%" stopColor="#5B8DEF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#5B8DEF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="800" height="500" fill={`url(#mt-bg-${uid})`} />
        <ellipse cx="400" cy="280" rx="380" ry="200" fill={`url(#mt-glow-${uid})`} />

        {/* Concentric rings emanating from mic */}
        <circle cx="400" cy="380" r="40" fill="none" stroke="#5B8DEF" strokeWidth="1.2" className="mt-ring mt-ring-1" />
        <circle cx="400" cy="380" r="40" fill="none" stroke="#5B8DEF" strokeWidth="1.2" className="mt-ring mt-ring-2" />
        <circle cx="400" cy="380" r="40" fill="none" stroke="#5B8DEF" strokeWidth="1.2" className="mt-ring mt-ring-3" />

        {/* Waveform bars */}
        <g>
          {bars.map((_, i) => {
            const x = 120 + i * 20;
            const baseHeight = 36 + Math.sin(i * 0.7) * 22;
            return (
              <rect
                key={i}
                x={x}
                y={250 - baseHeight / 2}
                width={6}
                height={baseHeight}
                rx={3}
                fill="#5B8DEF"
                className="mt-bar"
                style={{ animationDelay: `${(i * 0.07) % 1.4}s` }}
              />
            );
          })}
        </g>

        {/* Mic glyph */}
        <g className="mt-mic">
          <rect x="386" y="345" width="28" height="50" rx="14" fill="none" stroke="#5B8DEF" strokeWidth="2.2" />
          <path d="M 372 380 a 28 28 0 0 0 56 0" fill="none" stroke="#5B8DEF" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="400" y1="408" x2="400" y2="420" stroke="#5B8DEF" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="386" y1="420" x2="414" y2="420" stroke="#5B8DEF" strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* Subtle horizontal scan line for techno-feel */}
        <line x1="0" y1="250" x2="800" y2="250" stroke="#5B8DEF" strokeWidth="0.5" opacity="0.15" />
      </svg>

      <style>{`
        .thumb-root.mt-root {
          width: 100%;
          height: 100%;
          background: #0c1019;
          overflow: hidden;
          position: relative;
        }
        .mt-root svg { display: block; width: 100%; height: 100%; }
        .mt-bar {
          transform-box: fill-box;
          transform-origin: 50% 50%;
          animation: mt-bar-pulse 1.4s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @keyframes mt-bar-pulse {
          0%, 100% { transform: scaleY(0.28); opacity: 0.45; }
          50%      { transform: scaleY(1.6);  opacity: 1;    }
        }
        .mt-ring {
          animation: mt-ring 2.6s ease-out infinite;
          will-change: r, opacity;
        }
        .mt-ring-1 { animation-delay: 0s;    }
        .mt-ring-2 { animation-delay: 0.86s; }
        .mt-ring-3 { animation-delay: 1.72s; }
        @keyframes mt-ring {
          0%   { r: 40;  opacity: 0.85; }
          70%  {         opacity: 0.2;  }
          100% { r: 230; opacity: 0;    }
        }
        .mt-mic {
          animation: mt-mic-glow 2.6s ease-in-out infinite;
        }
        @keyframes mt-mic-glow {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1;    }
        }
      `}</style>
    </div>
  );
}
