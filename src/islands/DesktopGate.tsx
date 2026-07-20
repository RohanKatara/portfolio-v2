import { useEffect } from 'react';

const BREAKPOINT = 1024;
const REDIRECT = 'https://rohankatara.com/?from=v2';

export default function DesktopGate() {
  useEffect(() => {
    // Never gate local dev — we need the full desktop experience available
    // on localhost regardless of window size. DEV also covers `astro preview`
    // of a dev build, so this is the single safe gate for all local work.
    if (import.meta.env.DEV) return;

    // Also skip when served from localhost / LAN IPs, in case a production
    // build is being inspected locally via `astro preview` with NODE_ENV=production.
    const host = window.location.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local')
    ) {
      return;
    }

    // The mobile→legacy redirect is opt-in via env flag now that v2 is
    // responsive. Set PUBLIC_MOBILE_LEGACY=1 (and redeploy) to restore it —
    // this must stay in sync with the inline script in BaseLayout.astro.
    if (import.meta.env.PUBLIC_MOBILE_LEGACY !== '1') return;

    const search = window.location.search;
    // ?desktop=1 is the same escape hatch honored by the inline script in
    // BaseLayout.astro — keep them in sync so a QA override applies to both
    // redirect layers.
    if (search.includes('desktop=1')) return;
    if (search.includes('from=v2')) return;

    const isTouchSmall =
      navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 768;
    const isMobile = window.innerWidth < BREAKPOINT || isTouchSmall;
    if (isMobile) {
      window.location.replace(REDIRECT);
    }
  }, []);
  return null;
}
