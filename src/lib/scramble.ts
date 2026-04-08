/**
 * Per-letter Matrix scramble on hover for the hero name + role.
 *
 * Each `.char` span (produced by Splitting.js inside the visual wrappers
 * `[data-hero-name-visual]` and `[data-hero-role-visual]`) gets a `mouseenter`
 * listener that briefly cycles its text through a mixed pool of glyphs
 * (ASCII symbols + digits + binary + half-width katakana) and then snaps it
 * back to the original character.
 *
 * The visual wrappers are `aria-hidden`; the canonical text is held in a
 * sibling `<span class="sr-only">` so screen readers never see the scramble.
 *
 * No GSAP / no React. Pure DOM + requestAnimationFrame.
 */

const ASCII = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
const DIGITS = '0123456789';
const BINARY = '01';
// Half-width katakana — the literal Matrix-rain glyph set
const KATAKANA = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

// BINARY doubled to weight it slightly higher in the pool
const GLYPHS = (ASCII + DIGITS + BINARY + BINARY + KATAKANA).split('');

const DURATION_MS = 400;
const TICK_MS = 45;

const randomGlyph = (): string => GLYPHS[(Math.random() * GLYPHS.length) | 0];

const scrambleElement = (el: HTMLElement): void => {
  // Silently drop re-entry while a scramble is already running on this char
  if (el.dataset.scrambling === '1') return;

  const original = el.dataset.original ?? el.textContent ?? '';
  el.dataset.scrambling = '1';

  const start = performance.now();
  let lastSwap = 0;

  const tick = (now: number): void => {
    const elapsed = now - start;
    if (elapsed >= DURATION_MS) {
      el.textContent = original;
      delete el.dataset.scrambling;
      return;
    }
    if (now - lastSwap >= TICK_MS) {
      el.textContent = randomGlyph();
      lastSwap = now;
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

/**
 * Wire up scramble listeners on every `.char` span inside the hero name +
 * role visual wrappers. Returns a destructor that removes all listeners.
 *
 * Must run AFTER `initHeroReveal()` because Splitting.js produces the `.char`
 * spans we attach to.
 */
export const initHeroScramble = (): (() => void) => {
  const containers = document.querySelectorAll<HTMLElement>(
    '[data-hero-name-visual], [data-hero-role-visual]',
  );
  if (containers.length === 0) return () => {};

  const cleanups: Array<() => void> = [];

  containers.forEach((container) => {
    const chars = container.querySelectorAll<HTMLElement>('.char');
    chars.forEach((ch) => {
      // Cache the original character once at init — by the time scramble
      // resolves, textContent has been mutated, so the closure can't trust it.
      ch.dataset.original = ch.textContent ?? '';
      const onEnter = (): void => scrambleElement(ch);
      ch.addEventListener('mouseenter', onEnter);
      cleanups.push(() => ch.removeEventListener('mouseenter', onEnter));
    });
  });

  return () => cleanups.forEach((fn) => fn());
};
