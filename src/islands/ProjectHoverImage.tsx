import { useEffect, useRef } from 'react';

interface Props {
  src: string;
  alt: string;
}

/**
 * Cursor-following preview image attached to a project row.
 * Lightweight DOM follower (no WebGL distortion in v1 — keeps the bundle lean
 * and the effect butter-smooth on integrated GPUs).
 */
export default function ProjectHoverImage({ src, alt }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const row = el.closest<HTMLElement>('[data-project-row]');
    if (!row) return;

    let visible = false;
    let mx = 0;
    let my = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;

    const enter = () => {
      visible = true;
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%, -50%) scale(1)';
    };
    const leave = () => {
      visible = false;
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(0.96)';
    };
    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    row.addEventListener('mouseenter', enter);
    row.addEventListener('mouseleave', leave);
    row.addEventListener('mousemove', move);

    const tick = () => {
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      if (visible) {
        el.style.left = `${cx}px`;
        el.style.top = `${cy}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      row.removeEventListener('mouseenter', enter);
      row.removeEventListener('mouseleave', leave);
      row.removeEventListener('mousemove', move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '320px',
        height: '200px',
        pointerEvents: 'none',
        opacity: 0,
        transform: 'translate(-50%, -50%) scale(0.96)',
        transition: 'opacity 240ms ease, transform 320ms ease',
        zIndex: 50,
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(91,141,239,0.2)',
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}
