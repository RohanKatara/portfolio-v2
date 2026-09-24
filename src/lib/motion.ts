export const MOTION_STORAGE_KEY = 'portfolio-motion-preference';
export type MotionPreference = 'system' | 'full' | 'reduced';

// The head script resolves one mode before paint. It stays fixed until the
// next page load so CSS, GSAP, and client islands cannot disagree mid-scroll.
export const getMotionPreference = (): MotionPreference => {
  if (typeof document === 'undefined') return 'system';
  const preference = document.documentElement.dataset.motionPreference;
  return preference === 'full' || preference === 'reduced' ? preference : 'system';
};

export const isMotionReduced = (): boolean => {
  if (typeof window === 'undefined') return true;
  const mode = document.documentElement.dataset.motion;
  if (mode === 'full' || mode === 'reduced') return mode === 'reduced';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const saveMotionPreference = (preference: string): boolean => {
  if (!['system', 'full', 'reduced'].includes(preference)) return false;
  try {
    if (preference === 'system') window.localStorage.removeItem(MOTION_STORAGE_KEY);
    else window.localStorage.setItem(MOTION_STORAGE_KEY, preference);
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === (preference === 'system' ? null : preference);
  } catch {
    return false;
  }
};

export const canRunWebGL = (): boolean => {
  if (typeof window === 'undefined') return false;
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
  return true;
};
