import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    window.__lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    const tickerCb = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tickerCb);
    gsap.ticker.lagSmoothing(0);

    const onOverlayOpen = () => lenis.stop();
    const onOverlayClose = () => lenis.start();
    window.addEventListener('case-overlay-open', onOverlayOpen);
    window.addEventListener('case-overlay-close', onOverlayClose);

    return () => {
      window.removeEventListener('case-overlay-open', onOverlayOpen);
      window.removeEventListener('case-overlay-close', onOverlayClose);
      gsap.ticker.remove(tickerCb);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, []);
  return null;
}
