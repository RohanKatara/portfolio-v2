/**
 * Rollback-flag verification. Expects the dev server to be running with the
 * env described by the mode argument:
 *   node scripts/verify-flags.mjs mobile-legacy   (PUBLIC_MOBILE_LEGACY=1)
 *   node scripts/verify-flags.mjs force-legacy    (PUBLIC_FORCE_LEGACY=1)
 */
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:4321';
const mode = process.argv[2];
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const finalUrl = async (ctx, url) => {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const u = page.url();
  await page.close();
  return u;
};

const run = async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  if (mode === 'mobile-legacy') {
    const u1 = await finalUrl(mobile, BASE);
    check('MOBILE_LEGACY: 390 redirects to /legacy/', u1.includes('/legacy'), u1);
    const u2 = await finalUrl(mobile, `${BASE}/?desktop=1`);
    check('MOBILE_LEGACY: ?desktop=1 bypasses', !u2.includes('/legacy'), u2);
    const u3 = await finalUrl(desktop, BASE);
    check('MOBILE_LEGACY: desktop unaffected', !u3.includes('/legacy'), u3);
  } else if (mode === 'force-legacy') {
    const u1 = await finalUrl(desktop, BASE);
    check('FORCE_LEGACY: desktop redirects to /legacy/', u1.includes('/legacy'), u1);
    const u2 = await finalUrl(mobile, BASE);
    check('FORCE_LEGACY: mobile redirects to /legacy/', u2.includes('/legacy'), u2);
  } else {
    console.error('unknown mode', mode);
    process.exit(2);
  }

  await browser.close();
  console.log(failures === 0 ? 'FLAG CHECKS PASSED' : `${failures} FLAG CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
