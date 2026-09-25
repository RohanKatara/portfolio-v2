/**
 * RK identity and hero fallback regressions against a production preview.
 * Run: node scripts/verify-brand.mjs [baseUrl] [--webkit]
 * Artifacts: QA_OUTPUT_DIR/<engine>-brand, default ../qa/rk/<engine>-brand.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright-core';
import { brandIconVersion, rkPath } from '../src/data/brand.mjs';

const args = process.argv.slice(2);
const BASE = (args.find(arg => !arg.startsWith('--')) ?? 'http://127.0.0.1:4322').replace(/\/$/, '');
const ORIGIN = new URL(BASE).origin;
const engine = args.includes('--webkit') ? 'webkit' : 'chrome';
const OUTPUT = resolve(process.env.QA_OUTPUT_DIR ?? '../qa/rk', `${engine}-brand`);
const checks = [];
const pageErrors = [];
const consoleErrors = [];
const httpErrors = [];
let browser;

class CheckFailure extends Error {}
function check(name, passed, detail = '') {
  checks.push({ name, passed: Boolean(passed), detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${String(detail).slice(0, 600)}` : ''}`);
  if (!passed) throw new CheckFailure(name);
}
const screenshot = (page, name) => page.screenshot({ path: resolve(OUTPUT, `${name}.png`), animations: 'disabled' });
const frames = page => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
const visit = page => page.goto(BASE, { waitUntil: 'load' });

async function scenario(name, { width = 1440, height = 900, mobile = false, reducedMotion = 'no-preference', javaScriptEnabled = true, noWebGL = false } = {}, run) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile, reducedMotion, javaScriptEnabled });
  if (noWebGL) await context.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    window.__blockedBrandWebGLCalls = 0;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) {
        window.__blockedBrandWebGLCalls++;
        return null;
      }
      return getContext.call(this, type, ...rest);
    };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', error => pageErrors.push(`${name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${name}: ${message.text()}`); });
  page.on('response', response => {
    if (new URL(response.url()).origin === ORIGIN && response.status() >= 400) httpErrors.push(`${name}: ${response.status()} ${response.url()}`);
  });
  try {
    await visit(page);
    await run(page, name, context);
  } catch (error) {
    if (!(error instanceof CheckFailure)) checkError(`${name}: completes flow`, error);
    await screenshot(page, `${name}-failure`).catch(() => {});
  } finally {
    await context.close();
  }
}

function checkError(name, error) {
  checks.push({ name, passed: false, detail: error.message });
  console.error(`FAIL ${name}: ${error.message}`);
}

async function checkNav(page, label) {
  const home = page.getByRole('link', { name: 'Rohan Katara home', exact: true });
  const box = await home.boundingBox();
  check(`${label}: accessible home link retains a 44px target`, await home.isVisible() && box.width >= 44 && box.height >= 44, JSON.stringify(box));
  check(`${label}: nav uses the shared decorative RK`, await home.locator('[data-rk-mark][aria-hidden="true"][focusable="false"] path').getAttribute('d') === rkPath);
}

async function checkLayout(page, label) {
  await page.waitForFunction(() => {
    const content = [...document.querySelectorAll('[data-hero-name], [data-hero-fade], [data-hero-status]')];
    return content.length > 0 && content.every(element => Number(getComputedStyle(element).opacity) > 0.99);
  });
  const size = await page.evaluate(() => ({ width: innerWidth, content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) }));
  check(`${label}: no horizontal overflow`, size.content <= size.width + 1, JSON.stringify(size));
  check(`${label}: hero content and call to action stay available`, await page.locator('.hero-role').isVisible() && await page.locator('.hero-ctas a').first().isVisible());
  await checkNav(page, label);
}

async function checkAnimated(page, label) {
  await page.locator('#hero[data-webgl="on"] [data-rk-hero] canvas').waitFor({ state: 'visible' });
  await checkLayout(page, label);
  const canvas = await page.locator('[data-rk-hero] canvas').evaluate(element => ({ width: element.width, height: element.height, opacity: Number(getComputedStyle(element).opacity) }));
  check(`${label}: hero renderer has a visible drawing buffer`, canvas.width > 0 && canvas.height > 0 && canvas.opacity > 0, JSON.stringify(canvas));
  check(`${label}: animated hero replaces static fallback`, await page.locator('.hero-fallback').isHidden());
}

async function checkFallback(page, label) {
  const mark = page.locator('.hero-fallback [data-rk-mark]');
  await mark.waitFor({ state: 'visible' });
  check(`${label}: fallback displays the shared RK`, await mark.locator('path').getAttribute('d') === rkPath);
  const rect = await mark.boundingBox();
  const viewport = page.viewportSize();
  check(`${label}: fallback mark fits the viewport`, rect.width > 0 && rect.height > 0 && rect.x >= -1 && rect.x + rect.width <= viewport.width + 1, JSON.stringify(rect));
  check(`${label}: hero canvas is removed or never created`, await page.locator('[data-rk-hero] canvas').count() === 0 && await page.locator('#hero[data-webgl="on"]').count() === 0);
  await checkLayout(page, label);
}

async function checkIcons(page, context) {
  const links = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll(elements => elements.map(element => ({ href: element.href, type: element.type, sizes: element.sizes.value })));
  const searchIcon = links.find(link => new URL(link.href).pathname === '/favicon-192.png');
  check('icons: stable high-resolution PNG for search crawlers', searchIcon?.type === 'image/png' && searchIcon.sizes === '192x192' && new URL(searchIcon.href).search === '');
  const versioned = links.filter(link => link !== searchIcon);
  check('icons: versioned SVG, PNG and Apple touch links', versioned.length === 3 && versioned.every(link => new URL(link.href).searchParams.get('v') === brandIconVersion));
  for (const link of links) {
    const response = await context.request.get(link.href);
    check(`icons: ${new URL(link.href).pathname} loads`, response.ok(), response.status());
    const body = await response.body();
    if (link.type === 'image/svg+xml') check('icons: favicon contains shared RK', body.toString().includes(`d="${rkPath}"`));
    else {
      const size = Number(link.sizes.split('x')[0]);
      check(`icons: PNG ${size}px has expected dimensions`, body.subarray(1, 4).toString() === 'PNG' && body.readUInt32BE(16) === size && body.readUInt32BE(20) === size);
    }
  }
  const response = await context.request.get(`${ORIGIN}/favicon.ico`);
  const ico = await response.body();
  check('icons: root ICO fallback loads with three sizes', response.ok() && ico.readUInt16LE(2) === 1 && ico.readUInt16LE(4) === 3);
}

try {
  await mkdir(OUTPUT, { recursive: true });
  browser = await (engine === 'webkit' ? webkit.launch({ headless: true }) : chromium.launch({ channel: 'chrome', headless: true }));
  await scenario('desktop', {}, async (page, label, context) => {
    await checkAnimated(page, label);
    await checkIcons(page, context);
    await screenshot(page, 'desktop-animated');
    await page.locator('.nav-links a[href="/work/"]').click();
    await page.waitForURL(url => url.pathname === '/work/');
    await checkNav(page, 'Work page');
    await page.getByRole('link', { name: 'Rohan Katara home', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/' && url.hash === '#hero');
    await checkAnimated(page, 'return home');
    const lost = await page.locator('[data-rk-hero] canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = gl?.getExtension('WEBGL_lose_context');
      if (!extension) return false;
      extension.loseContext();
      return true;
    });
    check('context loss: real WebGL loss was requested', lost);
    await checkFallback(page, 'context loss');
    await page.setViewportSize({ width: 1000, height: 900 });
    await frames(page);
    await checkFallback(page, 'context loss after resize');
    await screenshot(page, 'context-loss-fallback');
  });
  for (const [name, width, height] of [['phone', 390, 844], ['tablet', 768, 1024]]) {
    await scenario(name, { width, height, mobile: true }, async (page, label) => {
      await checkAnimated(page, label);
      await screenshot(page, `${name}-animated`);
    });
  }
  await scenario('reduced-phone', { width: 390, height: 844, mobile: true, reducedMotion: 'reduce' }, async (page, label) => {
    await checkFallback(page, label);
    check(`${label}: motion opt-in stays available`, await page.getByRole('button', { name: 'Enable animations', exact: true }).isVisible());
    check(`${label}: no animation canvas starts`, await page.locator('canvas').count() === 0);
    await screenshot(page, label);
  });
  await scenario('no-javascript-phone', { width: 390, height: 844, mobile: true, javaScriptEnabled: false }, async (page, label) => {
    await checkFallback(page, label);
    await screenshot(page, label);
  });
  await scenario('no-webgl-tablet', { width: 768, height: 1024, mobile: true, noWebGL: true }, async (page, label) => {
    await page.locator('#hero astro-island:not([ssr])').waitFor({ state: 'attached' });
    await checkFallback(page, label);
    check(`${label}: WebGL was deliberately unavailable`, await page.evaluate(() => window.__blockedBrandWebGLCalls > 0));
    await screenshot(page, label);
  });
  for (const [name, errors] of [['no page errors', pageErrors], ['no console errors', consoleErrors], ['no local HTTP errors', httpErrors]]) {
    try { check(name, errors.length === 0, errors.join(' | ')); } catch (error) { if (!(error instanceof CheckFailure)) throw error; }
  }
} catch (error) {
  if (!(error instanceof CheckFailure)) checkError('runner setup', error);
} finally {
  await browser?.close();
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(resolve(OUTPUT, 'report.json'), JSON.stringify({ baseUrl: BASE, engine, checks, pageErrors, consoleErrors, httpErrors }, null, 2));
  const failed = checks.filter(entry => !entry.passed).length;
  console.log(`${checks.length - failed} passed; ${failed} failed. Report: ${resolve(OUTPUT, 'report.json')}`);
  process.exitCode = failed ? 1 : 0;
}
