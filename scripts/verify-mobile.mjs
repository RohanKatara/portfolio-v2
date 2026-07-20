/**
 * End-to-end verification for the mobile responsive launch
 * (plan: cozy-sniffing-treasure / tingly-stirring-mochi).
 *
 * Drives the system Chrome headless via playwright-core against the local
 * dev server. Run: node scripts/verify-mobile.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'http://localhost:4321';
let failures = 0;

const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const collectStarfieldLog = (page, sink) => {
  page.on('console', (msg) => {
    if (msg.text().includes('[SpaceStarfield] init complete')) sink.push(msg.text());
  });
};

const pageErrors = [];
const watchErrors = (page, label) => {
  page.on('pageerror', (err) => pageErrors.push(`${label}: ${err.message}`));
};

const measure = (page) =>
  page.evaluate(() => ({
    url: location.href,
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    navStatusDisplay: getComputedStyle(document.querySelector('.nav-status')).display,
    heroNameSize: getComputedStyle(document.querySelector('.hero-name')).fontSize,
    servicesPadTop: getComputedStyle(document.querySelector('.services')).paddingTop,
    rowGrid: getComputedStyle(document.querySelector('.project-row')).gridTemplateColumns,
    pinSpacer: !!document.querySelector('.pin-spacer'),
  }));

const run = async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // ---------- Mobile: 390x844 touch ----------
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 3,
    });
    const page = await ctx.newPage();
    const sfLogs = [];
    collectStarfieldLog(page, sfLogs);
    watchErrors(page, 'mobile-390');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    const m = await measure(page);
    check('390: stays on v2 (no legacy redirect)', !m.url.includes('/legacy'), m.url);
    check('390: no horizontal overflow', m.scrollWidth <= m.innerWidth, `scrollWidth=${m.scrollWidth} innerWidth=${m.innerWidth}`);
    check('390: nav status pill hidden', m.navStatusDisplay === 'none', m.navStatusDisplay);
    check('390: hero name uses mobile clamp (~52.6px)', Math.abs(parseFloat(m.heroNameSize) - 52.65) < 1, m.heroNameSize);
    check('390: section top padding eased (<160px)', parseFloat(m.servicesPadTop) < 160, m.servicesPadTop);
    check('390: project row single column', !m.rowGrid.trim().includes(' '), m.rowGrid);
    check('390: manifesto NOT pinned (no pin-spacer)', !m.pinSpacer);

    // Scroll to bottom, re-check overflow (lazy content / reveals)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    const bottomOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    check('390: no overflow after full scroll', bottomOverflow);

    // Starfield tuned down + cursor uniforms neutralized
    const sf = sfLogs.join(' ');
    check('390: starfield init logged', sfLogs.length > 0);
    check('390: starfield reduced particle count (1000)', sf.includes('1000'), sf.slice(0, 120));

    // Case overlay flow via tap
    await page.evaluate(() => window.scrollTo(0, 0));
    const firstRow = page.locator('[data-project-row]').first();
    await firstRow.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await firstRow.tap();
    await page.waitForTimeout(900);
    const overlayOpen = await page.evaluate(() => document.body.getAttribute('data-overlay-open'));
    check('390: overlay opens on tap', !!overlayOpen, String(overlayOpen));

    const canScrollInner = await page.evaluate(() => {
      const sc = document.querySelector(
        `[data-case-overlay="${document.body.getAttribute('data-overlay-open')}"] .case-scroll`,
      );
      if (!sc) return false;
      sc.scrollTop = 300;
      return sc.scrollTop > 0;
    });
    check('390: overlay inner scroll works', canScrollInner);

    await page.locator(`[data-case-overlay="${overlayOpen}"] .case-close`).tap();
    await page.waitForTimeout(700);
    const overlayClosed = await page.evaluate(() => !document.body.hasAttribute('data-overlay-open'));
    check('390: overlay closes via X', overlayClosed);

    // Cold deep link
    const page2 = await ctx.newPage();
    watchErrors(page2, 'mobile-deeplink');
    await page2.goto(`${BASE}/#mocktalk`, { waitUntil: 'networkidle' });
    await page2.waitForTimeout(1500);
    const deepOpen = await page2.evaluate(() => document.body.getAttribute('data-overlay-open'));
    check('390: cold #mocktalk deep link opens overlay', deepOpen === 'mocktalk', String(deepOpen));
    await ctx.close();
  }

  // ---------- Mobile: 360x800 overflow-only sweep ----------
  {
    const ctx = await browser.newContext({
      viewport: { width: 360, height: 800 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    watchErrors(page, 'mobile-360');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    const ok = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    check('360: no horizontal overflow', ok);
    await ctx.close();
  }

  // ---------- Reduced motion: nothing stuck hidden ----------
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    watchErrors(page, 'reduced-motion');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const vis = await page.evaluate(() => ({
      heroName: getComputedStyle(document.querySelector('[data-hero-name]')).opacity,
      heroRole: getComputedStyle(document.querySelector('.hero-role')).opacity,
      row: getComputedStyle(document.querySelector('[data-project-row]')).opacity,
      email: getComputedStyle(document.querySelector('[data-contact-email]')).opacity,
    }));
    check(
      'reduced-motion: hero/rows/email all visible',
      Object.values(vis).every((o) => parseFloat(o) === 1),
      JSON.stringify(vis),
    );
    await ctx.close();
  }

  // ---------- Desktop regression: 1440x900 fine pointer ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const sfLogs = [];
    collectStarfieldLog(page, sfLogs);
    watchErrors(page, 'desktop-1440');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    const d = await measure(page);
    check('1440: stays on v2', !d.url.includes('/legacy'), d.url);
    check('1440: nav status pill visible', d.navStatusDisplay === 'flex', d.navStatusDisplay);
    check('1440: hero name desktop size (120px)', parseFloat(d.heroNameSize) === 120, d.heroNameSize);
    check('1440: section top padding still 160px', d.servicesPadTop === '160px', d.servicesPadTop);
    check('1440: project row 3-col grid', d.rowGrid.trim().split(' ').length === 3, d.rowGrid);
    check('1440: manifesto IS pinned (pin-spacer present)', d.pinSpacer);
    const sf = sfLogs.join(' ');
    check('1440: starfield full particle count (2500)', sf.includes('2500'), sf.slice(0, 120));

    // Hover preview still enabled on fine pointer: thumbnail child rendered
    const hoverThumb = await page.evaluate(
      () => !!document.querySelector('[data-project-row] div[role="img"] svg, [data-project-row] div[role="img"] canvas, [data-project-row] div[role="img"] > *'),
    );
    check('1440: hover preview thumbnail mounted', hoverThumb);
    await ctx.close();
  }

  check('no page errors on any run', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 300));

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('verify-mobile crashed:', err);
  process.exit(1);
});
