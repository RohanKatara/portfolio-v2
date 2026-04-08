import { gsap, ScrollTrigger } from './gsap';
import Splitting from 'splitting';
import { prefersReducedMotion } from './motion';

const RM = () => prefersReducedMotion();

/**
 * Hero name + tagline char/word reveal. Runs once on load.
 */
export const initHeroReveal = () => {
  const heroName = document.querySelector<HTMLElement>('[data-hero-name]');
  const heroEyebrow = document.querySelectorAll<HTMLElement>('[data-hero-fade]');
  const heroStatus = document.querySelector<HTMLElement>('[data-hero-status]');
  if (!heroName) return;

  if (RM()) {
    // Reduce-motion: opacity-only fade-in. No yPercent, no char split, no
    // stagger — fades aren't vestibular motion and are spec-compliant.
    gsap.set(heroName, { opacity: 0 });
    heroEyebrow.forEach((el) => gsap.set(el, { opacity: 0, y: 0 }));
    if (heroStatus) gsap.set(heroStatus, { opacity: 0, y: 0 });
    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(heroName, { opacity: 1, duration: 0.8, ease: 'power1.out' })
      .to(heroEyebrow, { opacity: 1, duration: 0.6, ease: 'power1.out' }, '-=0.4');
    if (heroStatus) {
      tl.to(heroStatus, { opacity: 1, duration: 0.5, ease: 'power1.out' }, '-=0.3');
    }
    return;
  }

  const heroNameVisual = heroName.querySelector<HTMLElement>('[data-hero-name-visual]');
  if (heroNameVisual) {
    Splitting({ target: heroNameVisual, by: 'chars' });
  }
  const chars = heroNameVisual?.querySelectorAll<HTMLElement>('.char') ?? [];

  // Also split the role paragraph so the scramble effect has `.char` spans to attach to.
  // The role isn't part of the load-in stagger — it uses the parent <p>'s opacity fade,
  // so we just split it without adding it to the timeline.
  const heroRoleVisual = document.querySelector<HTMLElement>('[data-hero-role-visual]');
  if (heroRoleVisual) {
    Splitting({ target: heroRoleVisual, by: 'chars' });
  }

  gsap.set(heroName, { opacity: 1 });
  gsap.set(chars, { yPercent: 110, opacity: 0 });

  const tl = gsap.timeline({ delay: 0.15 });
  tl.to(chars, {
    yPercent: 0,
    opacity: 1,
    duration: 0.9,
    stagger: 0.025,
    ease: 'expo.out',
  })
    .to(
      heroEyebrow,
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' },
      '-=0.6',
    )
    .to(
      heroStatus,
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
      '-=0.4',
    );
};

/**
 * Manifesto pin: words fade from faint → ink as scroll progresses through 200vh.
 */
export const initManifestoPin = () => {
  const root = document.querySelector<HTMLElement>('[data-manifesto]');
  if (!root) return;
  const sentence = root.querySelector<HTMLElement>('[data-manifesto-text]');
  if (!sentence) return;

  if (RM()) {
    // Reduce-motion: skip the pin/scrub entirely (pinning is vestibular).
    // Just fade the whole sentence in once when it enters view.
    gsap.set(sentence, { opacity: 0 });
    gsap.to(sentence, {
      opacity: 1,
      duration: 0.8,
      ease: 'power1.out',
      scrollTrigger: { trigger: root, start: 'top 80%' },
    });
    return;
  }

  Splitting({ target: sentence, by: 'words' });
  const words = sentence.querySelectorAll<HTMLElement>('.word');
  gsap.set(sentence, { opacity: 1 });
  gsap.set(words, { opacity: 0.12 });

  ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: '+=180%',
    pin: true,
    scrub: 0.6,
    onUpdate: (self) => {
      const p = self.progress;
      const total = words.length;
      words.forEach((w, i) => {
        const wordProgress = Math.min(1, Math.max(0, p * total - i));
        w.style.opacity = String(0.12 + wordProgress * 0.88);
      });
    },
  });
};

export const initWorkRowReveals = () => {
  const rows = document.querySelectorAll<HTMLElement>('[data-project-row]');
  if (!rows.length) return;

  if (RM()) {
    // Reduce-motion: fade each row in on enter. No char split, no stagger,
    // no underline scaleX — opacity only.
    rows.forEach((row) => gsap.set(row, { opacity: 0 }));
    ScrollTrigger.batch('[data-project-row]', {
      start: 'top 85%',
      onEnter: (batch) => {
        gsap.to(batch, { opacity: 1, duration: 0.6, ease: 'power1.out' });
      },
    });
    return;
  }

  rows.forEach((row) => {
    const title = row.querySelector<HTMLElement>('[data-row-title]');
    if (title) Splitting({ target: title, by: 'chars' });
  });

  ScrollTrigger.batch('[data-project-row]', {
    start: 'top 85%',
    onEnter: (batch) => {
      batch.forEach((row) => {
        const r = row as HTMLElement;
        const chars = r.querySelectorAll<HTMLElement>('[data-row-title] .char');
        const meta = r.querySelectorAll<HTMLElement>('[data-row-meta]');
        const underline = r.querySelector<HTMLElement>('[data-row-underline]');

        gsap.set(r, { opacity: 1 });
        gsap.from(chars, {
          yPercent: 110,
          opacity: 0,
          duration: 0.8,
          stagger: 0.018,
          ease: 'expo.out',
        });
        gsap.from(meta, {
          opacity: 0,
          y: 12,
          duration: 0.6,
          stagger: 0.06,
          ease: 'power3.out',
          delay: 0.15,
        });
        if (underline) {
          gsap.from(underline, {
            scaleX: 0,
            transformOrigin: 'left center',
            duration: 0.9,
            ease: 'expo.out',
            delay: 0.1,
          });
        }
      });
    },
  });
};

export const initSectionFades = () => {
  const items = document.querySelectorAll<HTMLElement>('[data-fade]');
  if (!items.length) return;

  if (RM()) {
    // Reduce-motion: opacity-only fade-in. No y translation.
    items.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.7,
          ease: 'power1.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        },
      );
    });
    return;
  }

  items.forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      },
    );
  });
};

export const initAboutReveal = () => {
  const portrait = document.querySelector<HTMLElement>('[data-about-portrait]');
  const paragraphs = document.querySelectorAll<HTMLElement>('[data-about-para]');
  if (!portrait && !paragraphs.length) return;

  if (RM()) {
    // Reduce-motion: skip the clipPath reveal (which feels like a slide) and
    // the per-word stagger. Just fade portrait + paragraphs in on scroll.
    if (portrait) {
      portrait.style.clipPath = 'inset(0)';
      gsap.fromTo(
        portrait,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.8,
          ease: 'power1.out',
          scrollTrigger: { trigger: portrait, start: 'top 80%' },
        },
      );
    }
    paragraphs.forEach((para) => {
      gsap.fromTo(
        para,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.7,
          ease: 'power1.out',
          scrollTrigger: { trigger: para, start: 'top 85%' },
        },
      );
    });
    return;
  }

  if (portrait) {
    gsap.fromTo(
      portrait,
      { clipPath: 'inset(50% 0 50% 0)' },
      {
        clipPath: 'inset(0% 0 0% 0)',
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: portrait, start: 'top 80%' },
      },
    );
  }

  paragraphs.forEach((para, i) => {
    Splitting({ target: para, by: 'words' });
    const words = para.querySelectorAll<HTMLElement>('.word');
    gsap.set(para, { opacity: 1 });
    gsap.set(words, { opacity: 0 });
    gsap.to(words, {
      opacity: 1,
      duration: 0.5,
      stagger: 0.012,
      ease: 'power2.out',
      scrollTrigger: { trigger: para, start: 'top 85%' },
      delay: i * 0.05,
    });
  });
};

export const initContactReveal = () => {
  const email = document.querySelector<HTMLElement>('[data-contact-email]');
  if (!email) return;

  if (RM()) {
    // Reduce-motion: opacity-only fade on scroll. No char split.
    gsap.fromTo(
      email,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.7,
        ease: 'power1.out',
        scrollTrigger: { trigger: email, start: 'top 80%' },
      },
    );
    return;
  }

  Splitting({ target: email, by: 'chars' });
  const chars = email.querySelectorAll<HTMLElement>('.char');
  gsap.set(email, { opacity: 1 });
  gsap.from(chars, {
    yPercent: 110,
    opacity: 0,
    duration: 0.7,
    stagger: 0.012,
    ease: 'expo.out',
    scrollTrigger: { trigger: email, start: 'top 80%' },
  });
};

export const initSkillsMarquee = () => {
  const track = document.querySelector<HTMLElement>('[data-skills-track]');
  if (!track) return;
  if (RM()) return;
  const distance = track.scrollWidth / 2;
  if (!distance) return;
  gsap.to(track, {
    x: -distance,
    duration: 30,
    ease: 'none',
    repeat: -1,
  });
};
