export type CaseSlug = 'mocktalk' | 'krishna' | 'automate-pro' | 'content-engine';

export const KNOWN_SLUGS: readonly CaseSlug[] = [
  'mocktalk',
  'krishna',
  'automate-pro',
  'content-engine',
];

export const isCaseSlug = (s: string): s is CaseSlug =>
  (KNOWN_SLUGS as readonly string[]).includes(s);

export const parseHash = (): CaseSlug | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#/, '');
  return isCaseSlug(raw) ? raw : null;
};

export const openCase = (slug: CaseSlug, opts: { pushHistory?: boolean } = {}) => {
  if (typeof window === 'undefined') return;
  const { pushHistory = true } = opts;
  if (pushHistory) {
    window.history.pushState({ overlay: slug }, '', `#${slug}`);
  }
  document.body.setAttribute('data-overlay-open', slug);
  window.dispatchEvent(new CustomEvent('case-overlay-open', { detail: { slug } }));
};

export const closeCase = (opts: { popHistory?: boolean } = {}) => {
  if (typeof window === 'undefined') return;
  const { popHistory = true } = opts;

  // Stop any playing videos inside the closing overlay
  document.querySelectorAll<HTMLVideoElement>('.case-overlay video').forEach((v) => {
    v.pause();
    v.currentTime = 0;
  });

  document.body.removeAttribute('data-overlay-open');
  if (popHistory && window.location.hash) {
    window.history.pushState({}, '', window.location.pathname + window.location.search);
  }
  window.dispatchEvent(new CustomEvent('case-overlay-close'));
};
