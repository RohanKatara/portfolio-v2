import { useEffect } from 'react';

const BREAKPOINT = 1024;
const REDIRECT = 'https://rohankatara.com/?from=v2';

export default function DesktopGate() {
  useEffect(() => {
    const isTouchSmall =
      navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 768;
    const isMobile = window.innerWidth < BREAKPOINT || isTouchSmall;
    const fromV2 = window.location.search.includes('from=v2');
    if (isMobile && !fromV2) {
      window.location.replace(REDIRECT);
    }
  }, []);
  return null;
}
