export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const canRunWebGL = (): boolean => {
  if (typeof window === 'undefined') return false;
  // NOTE: prefers-reduced-motion is intentionally NOT a kill switch here.
  // WebGL itself isn't vestibular motion — only the *animation inside* is.
  // Each WebGL island handles RM by rendering a single static frame instead
  // of a per-frame rAF loop. See SpaceStarfield.tsx and HeroWireframe.tsx.
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (!gl) return false;
  } catch {
    return false;
  }
  if (
    typeof navigator !== 'undefined' &&
    navigator.hardwareConcurrency &&
    navigator.hardwareConcurrency < 4
  ) {
    return false;
  }
  return true;
};
