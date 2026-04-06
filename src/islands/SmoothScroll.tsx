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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

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

    // FPS watchdog
    let frameCount = 0;
    let frameTimeAccum = 0;
    let lastTime = performance.now();
    let fpsCheck: number | null = null;
    const sampleFps = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      frameTimeAccum += dt;
      frameCount++;
      if (frameTimeAccum >= 5000) {
        const avgFps = (frameCount / frameTimeAccum) * 1000;
        if (avgFps < 45) {
          window.dispatchEvent(new CustomEvent('webgl-disable'));
        }
        frameCount = 0;
        frameTimeAccum = 0;
      }
      fpsCheck = requestAnimationFrame(sampleFps);
    };
    fpsCheck = requestAnimationFrame(sampleFps);

    return () => {
      window.removeEventListener('case-overlay-open', onOverlayOpen);
      window.removeEventListener('case-overlay-close', onOverlayClose);
      gsap.ticker.remove(tickerCb);
      if (fpsCheck != null) cancelAnimationFrame(fpsCheck);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, []);
  return null;
}
