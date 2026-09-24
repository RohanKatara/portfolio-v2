import { useEffect, useRef, useState } from 'react';
import Thumbnail, { type ThumbSlug } from '../components/thumbnails/Thumbnail';
import { isMotionReduced } from '../lib/motion';

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
  // Keep the server and initial client render identical; the preview is an
  // enhancement for wide mouse-driven screens with motion enabled.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)');
    // Motion is resolved at page load; viewport and pointer changes remain live.
    const update = () => setEnabled(media.matches && !isMotionReduced());
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
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
    let bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    const measureBounds = () => {
      const clearance = Array.from(document.querySelectorAll<HTMLElement>('.nav, .work-categories'))
        .reduce((bottom, bar) => {
          const rect = bar.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < window.innerHeight ? Math.max(bottom, rect.bottom) : bottom;
        }, 0);
      const halfWidth = el.offsetWidth / 2;
      const halfHeight = el.offsetHeight / 2;
      bounds = {
        minX: 16 + halfWidth,
        maxX: window.innerWidth - 16 - halfWidth,
        minY: clearance + 16 + halfHeight,
        maxY: window.innerHeight - 16 - halfHeight,
      };
      return bounds.minX <= bounds.maxX && bounds.minY <= bounds.maxY;
    };
    const clampX = (x: number) => Math.min(bounds.maxX, Math.max(bounds.minX, x));
    const clampY = (y: number) => Math.min(bounds.maxY, Math.max(bounds.minY, y));
    const position = () => {
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
    };
    const leave = () => {
      visible = false;
      cancelAnimationFrame(raf);
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(0.96)';
    };
    const tick = () => {
      if (!visible) return;
      cx += (clampX(mx) - cx) * 0.18;
      cy += (clampY(my) - cy) * 0.18;
      position();
      raf = requestAnimationFrame(tick);
    };
    const enter = (e: MouseEvent) => {
      if (!measureBounds()) return;
      mx = e.clientX;
      my = e.clientY;
      cx = clampX(mx);
      cy = clampY(my);
      position();
      visible = true;
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%, -50%) scale(1)';
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    const refreshBounds = () => {
      if (!visible) return;
      if (!measureBounds()) return leave();
      cx = clampX(cx);
      cy = clampY(cy);
      position();
    };

    row.addEventListener('mouseenter', enter);
    row.addEventListener('mouseleave', leave);
    row.addEventListener('mousemove', move);
    window.addEventListener('resize', refreshBounds);
    window.addEventListener('scroll', refreshBounds, { passive: true });

    return () => {
      leave();
      row.removeEventListener('mouseenter', enter);
      row.removeEventListener('mouseleave', leave);
      row.removeEventListener('mousemove', move);
      window.removeEventListener('resize', refreshBounds);
      window.removeEventListener('scroll', refreshBounds);
    };
  }, [enabled]);

  return (
    <div
      ref={ref}
      data-project-preview
      data-preview-enabled={enabled}
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
        zIndex: 20,
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(91,141,239,0.2)',
      }}
    >
      {enabled && <Thumbnail slug={slug} variant="preview" />}
    </div>
  );
}
