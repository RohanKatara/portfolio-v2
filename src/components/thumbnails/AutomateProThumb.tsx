import { useId } from 'react';

/**
 * Automate Pro thumbnail — Cinematic Gatekeeper.
 * Atmospheric, NOT schematic. A vertical bar of light spans the frame; soft
 * particles drift in from both sides toward the gate. Some pass through and
 * brighten on the other side (qualified leads); others fade out before
 * reaching the gate (rejected). Volumetric light bleeds via SVG Gaussian blur.
 */
export default function AutomateProThumb() {
  const uid = useId().replace(/[:]/g, '');

  // Particles entering from the left
  const leftPass = [
    { y: 110, delay: 0.0, r: 2.8 },
    { y: 200, delay: 1.4, r: 2.4 },
    { y: 300, delay: 2.6, r: 3.0 },
    { y: 390, delay: 4.0, r: 2.5 },
  ];
  const leftReject = [
    { y: 160, delay: 0.7, r: 2.0 },
    { y: 270, delay: 2.0, r: 2.2 },
    { y: 360, delay: 3.4, r: 1.9 },
  ];
  // Particles entering from the right (mirrored)
  const rightPass = [
    { y: 90,  delay: 0.5, r: 2.6 },
    { y: 230, delay: 1.9, r: 2.9 },
    { y: 350, delay: 3.2, r: 2.4 },
  ];
  const rightReject = [
    { y: 180, delay: 1.2, r: 2.0 },
    { y: 310, delay: 2.6, r: 2.1 },
  ];

  return (
    <div className="thumb-root ap-root">
      <svg
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Automate Pro: cinematic gatekeeper"
      >
        <defs>
          <linearGradient id={`ap-bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#13111c" />
            <stop offset="100%" stopColor="#08070d" />
          </linearGradient>
          <linearGradient id={`ap-gate-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#9B7BE0" stopOpacity="0" />
            <stop offset="18%" stopColor="#9B7BE0" stopOpacity="1" />
            <stop offset="50%" stopColor="#F0E2FF" stopOpacity="1" />
            <stop offset="82%" stopColor="#9B7BE0" stopOpacity="1" />
            <stop offset="100%" stopColor="#9B7BE0" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`ap-mist-${uid}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%"  stopColor="#9B7BE0" stopOpacity="0.55" />
            <stop offset="40%" stopColor="#9B7BE0" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#9B7BE0" stopOpacity="0" />
          </radialGradient>
          <filter id={`ap-blur-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id={`ap-blur-soft-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>

        <rect width="800" height="500" fill={`url(#ap-bg-${uid})`} />

        {/* Atmospheric mist */}
        <ellipse cx="400" cy="250" rx="380" ry="240" fill={`url(#ap-mist-${uid})`} />

        {/* Volumetric halo around the gate (very blurred wide bar) */}
        <rect
          x="345"
          y="40"
          width="110"
          height="420"
          fill={`url(#ap-gate-${uid})`}
          opacity="0.45"
          filter={`url(#ap-blur-${uid})`}
          className="ap-halo"
        />

        {/* Mid halo (less blur, tighter) */}
        <rect
          x="385"
          y="40"
          width="30"
          height="420"
          fill={`url(#ap-gate-${uid})`}
          opacity="0.6"
          filter={`url(#ap-blur-soft-${uid})`}
          className="ap-mid"
        />

        {/* The gate itself — sharp vertical bar of light */}
        <rect
          x="397"
          y="40"
          width="6"
          height="420"
          fill={`url(#ap-gate-${uid})`}
          className="ap-gate"
        />

        {/* Gate cap glints */}
        <circle cx="400" cy="40"  r="3" fill="#F0E2FF" className="ap-glint" />
        <circle cx="400" cy="460" r="3" fill="#F0E2FF" className="ap-glint" />

        {/* Left-side particles */}
        {leftPass.map((p, i) => (
          <circle
            key={`lp${i}`}
            cx={20}
            cy={p.y}
            r={p.r}
            fill="#F0E2FF"
            filter={`url(#ap-blur-soft-${uid})`}
            className="ap-pass-l"
            style={{ animationDelay: `${p.delay}s` }}
          />
        ))}
        {leftReject.map((p, i) => (
          <circle
            key={`lr${i}`}
            cx={20}
            cy={p.y}
            r={p.r}
            fill="#9B7BE0"
            filter={`url(#ap-blur-soft-${uid})`}
            className="ap-reject-l"
            style={{ animationDelay: `${p.delay}s` }}
          />
        ))}

        {/* Right-side particles */}
        {rightPass.map((p, i) => (
          <circle
            key={`rp${i}`}
            cx={780}
            cy={p.y}
            r={p.r}
            fill="#F0E2FF"
            filter={`url(#ap-blur-soft-${uid})`}
            className="ap-pass-r"
            style={{ animationDelay: `${p.delay}s` }}
          />
        ))}
        {rightReject.map((p, i) => (
          <circle
            key={`rr${i}`}
            cx={780}
            cy={p.y}
            r={p.r}
            fill="#9B7BE0"
            filter={`url(#ap-blur-soft-${uid})`}
            className="ap-reject-r"
            style={{ animationDelay: `${p.delay}s` }}
          />
        ))}
      </svg>

      <style>{`
        .thumb-root.ap-root {
          width: 100%;
          height: 100%;
          background: #08070d;
          overflow: hidden;
          position: relative;
        }
        .ap-root svg { display: block; width: 100%; height: 100%; }

        .ap-halo {
          transform-box: view-box;
          transform-origin: 400px 250px;
          animation: ap-halo-pulse 5.2s ease-in-out infinite;
          will-change: opacity, transform;
        }
        @keyframes ap-halo-pulse {
          0%, 100% { opacity: 0.42; transform: scaleX(1);    }
          50%      { opacity: 0.6;  transform: scaleX(1.12); }
        }
        .ap-mid {
          animation: ap-mid-pulse 4s ease-in-out infinite;
        }
        @keyframes ap-mid-pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.8;  }
        }
        .ap-gate {
          animation: ap-gate-flicker 6s ease-in-out infinite;
        }
        @keyframes ap-gate-flicker {
          0%, 100% { opacity: 1;    }
          47%      { opacity: 0.85; }
          50%      { opacity: 1;    }
          53%      { opacity: 0.9;  }
        }
        .ap-glint {
          animation: ap-glint 3s ease-in-out infinite;
        }
        @keyframes ap-glint {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1;    }
        }

        .ap-pass-l, .ap-pass-r, .ap-reject-l, .ap-reject-r {
          transform-box: view-box;
          opacity: 0;
          animation-iteration-count: infinite;
          animation-duration: 6.4s;
          animation-timing-function: ease-out;
          will-change: transform, opacity;
        }
        .ap-pass-l   { animation-name: ap-pass-l;   }
        .ap-reject-l { animation-name: ap-reject-l; }
        .ap-pass-r   { animation-name: ap-pass-r;   }
        .ap-reject-r { animation-name: ap-reject-r; }

        @keyframes ap-pass-l {
          0%   { transform: translateX(0);     opacity: 0;   }
          15%  {                                opacity: 0.7; }
          50%  { transform: translateX(380px); opacity: 1;   }
          85%  {                                opacity: 0.4; }
          100% { transform: translateX(820px); opacity: 0;   }
        }
        @keyframes ap-reject-l {
          0%   { transform: translateX(0);     opacity: 0;   }
          20%  {                                opacity: 0.65;}
          50%  { transform: translateX(360px); opacity: 0.55;}
          65%  { transform: translateX(370px); opacity: 0;   }
          100% { transform: translateX(370px); opacity: 0;   }
        }
        @keyframes ap-pass-r {
          0%   { transform: translateX(0);      opacity: 0;   }
          15%  {                                 opacity: 0.7; }
          50%  { transform: translateX(-380px); opacity: 1;   }
          85%  {                                 opacity: 0.4; }
          100% { transform: translateX(-820px); opacity: 0;   }
        }
        @keyframes ap-reject-r {
          0%   { transform: translateX(0);      opacity: 0;   }
          20%  {                                 opacity: 0.65;}
          50%  { transform: translateX(-360px); opacity: 0.55;}
          65%  { transform: translateX(-370px); opacity: 0;   }
          100% { transform: translateX(-370px); opacity: 0;   }
        }

        @media (prefers-reduced-motion: reduce) {
          .ap-halo, .ap-mid, .ap-gate, .ap-glint,
          .ap-pass-l, .ap-pass-r, .ap-reject-l, .ap-reject-r { animation: none; }
        }
      `}</style>
    </div>
  );
}
