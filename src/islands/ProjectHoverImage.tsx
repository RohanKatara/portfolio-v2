import { useEffect, useRef } from 'react';
import Thumbnail, { type ThumbSlug } from '../components/thumbnails/Thumbnail';

interface Props {
  slug: ThumbSlug;
  alt: string;
}

/**
 * Cursor-following animated preview attached to a project row. The actual
 * artwork is rendered by <Thumbnail/>, which dispatches an animated SVG scene
 * per project slug. The wrapper here just handles the cursor follow + show/hide.
 */
export default function ProjectHoverImage({ slug, alt }: Props) {
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
      role="img"
      aria-label={alt}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '420px',
        height: '260px',
        pointerEvents: 'none',
        opacity: 0,
        transform: 'translate(-50%, -50%) scale(0.96)',
        transition: 'opacity 240ms ease, transform 320ms ease',
        zIndex: 50,
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(91,141,239,0.2)',
      }}
    >
      <Thumbnail slug={slug} variant="preview" />
    </div>
  );
}
