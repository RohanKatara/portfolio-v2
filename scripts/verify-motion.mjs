/**
 * Motion preference regressions against a running production preview.
 * Run: node scripts/verify-motion.mjs [baseUrl] [--webkit] [--only=scenario-name]
 * Artifacts: QA_OUTPUT_DIR/<engine>-motion, default ../qa/<engine>-motion.
 * Storage/WebGL failures are deliberate test fixtures. All browser errors remain reported.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright-core';

const args = process.argv.slice(2);
const BASE = (args.find((arg) => !arg.startsWith('--')) ?? 'http://127.0.0.1:4322').replace(/\/$/, '');
const ORIGIN = new URL(BASE).origin;
const engine = args.includes('--webkit') ? 'webkit' : 'chrome';
const only = args.find((arg) => arg.startsWith('--only='))?.slice(7);
const OUTPUT = resolve(process.env.QA_OUTPUT_DIR ?? '../qa', `${engine}-motion`);
const KEY = 'portfolio-motion-preference';
const checks = [];
const pageErrors = [];
const consoleErrors = [];
const httpErrors = [];
let browser;
let scenarioCount = 0;

class CheckFailure extends Error {}
function check(name, passed, detail = '') {
  checks.push({ name, passed: Boolean(passed), detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${String(detail).slice(0, 800)}` : ''}`);
  if (!passed) throw new CheckFailure(name);
}

const visit = (page, path = '/') => page.goto(`${BASE}${path}`, { waitUntil: 'load' });
const screenshot = (page, name) => page.screenshot({ path: resolve(OUTPUT, `${name}.png`), animations: 'disabled' });
const frames = (page) => page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
const mode = (os, preference) => preference === 'system' ? (os === 'reduce' ? 'reduced' : 'full') : preference;

async function scenario(name, { os = 'no-preference', preference = 'system', mobile = false, javaScriptEnabled = true, storageFailure, noWebGL = false } = {}, run) {
  if (only && only !== name) return;
  scenarioCount++;
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    hasTouch: mobile, isMobile: mobile, reducedMotion: os, javaScriptEnabled,
    storageState: { cookies: [], origins: [{ origin: ORIGIN, localStorage: preference === 'system' ? [] : [{ name: KEY, value: preference }] }] },
  });
  await context.addInitScript(({ storageFailure, noWebGL }) => {
    window.__motionTestDocument = `${performance.timeOrigin}-${Math.random()}`;
    if (storageFailure) {
      for (const method of storageFailure === 'all' ? ['getItem', 'setItem', 'removeItem'] : ['setItem', 'removeItem']) {
        Object.defineProperty(Storage.prototype, method, {
          configurable: true, value() { throw new DOMException('Storage disabled by regression fixture', 'SecurityError'); },
        });
      }
    }
    if (noWebGL) {
      const getContext = HTMLCanvasElement.prototype.getContext;
      window.__blockedWebGLCalls = 0;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) { window.__blockedWebGLCalls++; return null; }
        return getContext.call(this, type, ...rest);
      };
    }
  }, { storageFailure, noWebGL });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(25000);
  page.on('pageerror', (error) => pageErrors.push(`${name}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`${name}: ${message.text()}`); });
  page.on('response', (response) => {
    if (new URL(response.url()).origin === ORIGIN && response.status() >= 400) httpErrors.push(`${name}: ${response.status()} ${response.url()}`);
  });
  try {
    await run(page, { mobile, context });
  } catch (error) {
    if (!(error instanceof CheckFailure)) {
      checks.push({ name: `${name}: completes flow`, passed: false, detail: error.message });
      console.error(`FAIL ${name}: ${error.message}`);
    }
    await screenshot(page, `${name}-failure`).catch(() => {});
  } finally {
    await context.close();
  }
}

async function checkMode(page, preference, effective, label) {
  await page.waitForFunction(({ preference, effective }) => document.documentElement.dataset.motion === effective
    && document.documentElement.dataset.motionPreference === preference, { preference, effective });
  check(`${label}: effective motion and preference agree`, true, `${preference} → ${effective}`);
}

async function checkReadable(page, label, selector = '[data-hero-name], [data-hero-fade], [data-hero-status], [data-manifesto-text]') {
  await page.waitForFunction((selector) => Array.from(document.querySelectorAll(selector)).every((element) => {
    for (let current = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.99) return false;
    }
    return Boolean(element.getClientRects().length);
  }), selector);
  check(`${label}: primary copy is readable`, await page.locator(selector).count() > 0);
  const overflow = await page.evaluate(() => ({ width: innerWidth, content: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) }));
  check(`${label}: no horizontal overflow`, overflow.content <= overflow.width + 1, JSON.stringify(overflow));
}

async function checkHomeMotion(page, effective, label, mobile = false) {
  await checkReadable(page, label);
  await page.locator('#hero astro-island:not([ssr])').waitFor({ state: 'attached' });
  await frames(page);
  const prompt = page.locator('[data-motion-prompt]');
  check(`${label}: reduced-motion invitation appears only when relevant`, effective === 'reduced' ? await prompt.isVisible() : await prompt.isHidden());
  if (effective === 'reduced') {
    check(`${label}: reduced invitation has a usable opt-in`, await prompt.getByRole('button', { name: 'Enable animations', exact: true }).count() === 1);
    const state = await page.evaluate(() => ({
      lenis: Boolean(window.__lenis), canvases: document.querySelectorAll('canvas').length,
      pins: document.querySelectorAll('.pin-spacer').length,
      chars: document.querySelectorAll('[data-hero-name-visual] .char').length,
      runningCss: Array.from(document.querySelectorAll('.status-dot, .hero-scroll-line')).filter((element) => {
        const style = getComputedStyle(element);
        return style.animationName !== 'none' && style.animationPlayState !== 'paused'
          && style.animationDuration.split(',').some((duration) => parseFloat(duration) > 0.001);
      }).length,
    }));
    check(`${label}: reduced mode avoids motion engines and decorative animation`, !state.lenis && !state.canvases && !state.pins && !state.chars && !state.runningCss, JSON.stringify(state));
  } else {
    await page.waitForFunction(() => document.querySelectorAll('[data-hero-name-visual] .char').length > 0
      && document.querySelectorAll('[data-manifesto-text] .word').length > 0);
    check(`${label}: full mode initializes text animation`, true);
    check(`${label}: manifesto pin follows screen size`, mobile
      ? await page.locator('.pin-spacer [data-manifesto]').count() === 0
      : await page.locator('.pin-spacer > [data-manifesto]').count() === 1);
  }
}

async function checkFooter(page, preference, label) {
  const form = page.locator('[data-motion-form]');
  check(`${label}: one usable motion form`, await form.count() === 1 && await form.isVisible());
  const select = form.locator('select[name="motion"]');
  check(`${label}: footer reflects saved preference`, await select.inputValue() === preference);
  const values = await select.locator('option').evaluateAll((options) => options.map((option) => option.value));
  check(`${label}: footer offers system, full and reduced`, JSON.stringify(values) === JSON.stringify(['system', 'full', 'reduced']), values.join(', '));
  check(`${label}: setting change is explicitly applied`, await form.getByRole('button', { name: 'Apply & reload', exact: true }).count() === 1);
}

async function reloadBy(page, locator, { mobile = false, keyboard = false } = {}) {
  const oldUrl = page.url();
  const oldDocument = await page.evaluate(() => window.__motionTestDocument);
  await locator.scrollIntoViewIfNeeded();
  if (keyboard) await locator.focus();
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    keyboard ? page.keyboard.press('Enter') : mobile ? locator.tap() : locator.click(),
  ]);
  check('apply: reload preserves pathname, query and fragment', page.url() === oldUrl, page.url());
  check('apply: browser loaded a new document', await page.evaluate(() => window.__motionTestDocument) !== oldDocument);
}

async function applyFooter(page, preference, options = {}) {
  const form = page.locator('[data-motion-form]');
  const before = await page.evaluate(() => ({ document: window.__motionTestDocument, motion: document.documentElement.dataset.motion }));
  await form.locator('select[name="motion"]').selectOption(preference);
  check(`select ${preference}: waits for explicit Apply`, await page.evaluate((before) => window.__motionTestDocument === before.document
    && document.documentElement.dataset.motion === before.motion, before));
  await reloadBy(page, form.getByRole('button', { name: 'Apply & reload', exact: true }), options);
}

async function checkWorkHover(page, effective, label) {
  const row = page.locator('[data-project-row]').first();
  await row.scrollIntoViewIfNeeded();
  await row.locator('astro-island:not([ssr])').waitFor({ state: 'attached' });
  await page.waitForFunction((expected) => document.querySelector('[data-project-preview]')?.dataset.previewEnabled === String(expected), effective === 'full');
  check(`${label}: project hover obeys effective preference`, true);
  if (effective === 'reduced') check(`${label}: no hidden animated hover artwork`, await row.locator('[data-project-preview] svg').count() === 0);
}

async function scrollTo(page, y) {
  await page.evaluate((y) => {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, y);
  await page.waitForFunction((y) => Math.abs(scrollY - y) < 4, y);
}

async function manifestoSample(page) {
  return page.locator('[data-manifesto-text] .word').evaluateAll((words) => {
    const opacities = words.map((word) => Number(getComputedStyle(word).opacity));
    return { count: words.length, average: opacities.reduce((sum, value) => sum + value, 0) / words.length };
  });
}

async function expectStorageError(page, label) {
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-motion-error][role="status"]'))
    .some((element) => element.textContent.trim().length > 0 && element.getClientRects().length > 0));
  check(`${label}: storage failure is explained in a visible status`, true);
}

try {
  await mkdir(OUTPUT, { recursive: true });
  browser = await (engine === 'webkit' ? webkit.launch({ headless: true }) : chromium.launch({ channel: 'chrome', headless: true }));

  for (const os of ['no-preference', 'reduce']) {
    for (const preference of ['system', 'full', 'reduced']) {
      const name = `matrix-${os}-${preference}`;
      await scenario(name, { os, preference }, async (page) => {
        const effective = mode(os, preference);
        await visit(page);
        await checkMode(page, preference, effective, name);
        await checkHomeMotion(page, effective, name);
        await checkFooter(page, preference, name);
        await screenshot(page, name);
        await page.locator('.nav-links a[href="/work/"]').click();
        await page.waitForURL((url) => url.pathname === '/work/');
        await checkMode(page, preference, effective, `${name} work`);
        await checkFooter(page, preference, `${name} work`);
        await checkWorkHover(page, effective, name);
        await page.reload({ waitUntil: 'load' });
        await checkMode(page, preference, effective, `${name} reloaded`);
        await page.goBack({ waitUntil: 'load' });
        check(`${name}: browser Back returns home`, new URL(page.url()).pathname === '/');
        await checkMode(page, preference, effective, `${name} back`);
      });
    }
  }

  await scenario('keyboard-preference-flow', { os: 'reduce' }, async (page) => {
    await visit(page, '/?motion-check=keyboard#hero');
    await checkMode(page, 'system', 'reduced', 'keyboard initial');
    const enable = page.getByRole('button', { name: 'Enable animations', exact: true });
    await reloadBy(page, enable, { keyboard: true });
    await checkMode(page, 'full', 'full', 'keyboard opt-in');
    check('keyboard: full preference is saved', await page.evaluate((key) => localStorage.getItem(key), KEY) === 'full');
    await checkHomeMotion(page, 'full', 'keyboard opt-in');
    await applyFooter(page, 'reduced', { keyboard: true });
    await checkMode(page, 'reduced', 'reduced', 'keyboard reduced');
    await checkHomeMotion(page, 'reduced', 'keyboard reduced');
    await applyFooter(page, 'system', { keyboard: true });
    await checkMode(page, 'system', 'reduced', 'keyboard system');
    check('keyboard: System removes the override', await page.evaluate((key) => localStorage.getItem(key), KEY) === null);
  });

  await scenario('live-system-change', {}, async (page) => {
    await visit(page);
    await checkHomeMotion(page, 'full', 'system before OS change');
    await scrollTo(page, 320);
    const before = await page.evaluate(() => ({ document: window.__motionTestDocument, y: scrollY, href: location.href }));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await frames(page);
    await checkMode(page, 'system', 'full', 'system snapshot after OS change');
    const after = await page.evaluate(() => ({ document: window.__motionTestDocument, y: scrollY, href: location.href }));
    check('system change: no automatic reload, navigation or scroll jump', before.document === after.document && before.href === after.href && Math.abs(before.y - after.y) < 3, JSON.stringify({ before, after }));
    await page.reload({ waitUntil: 'load' });
    await checkMode(page, 'system', 'reduced', 'system new snapshot after reload');
    await checkHomeMotion(page, 'reduced', 'system reloaded');
  });

  await scenario('cross-page-preference-back', { preference: 'full' }, async (page) => {
    await visit(page);
    await checkMode(page, 'full', 'full', 'cross-page home initial');
    await page.locator('.nav-links a[href="/work/"]').click();
    await page.waitForURL((url) => url.pathname === '/work/');
    await applyFooter(page, 'reduced');
    await checkMode(page, 'reduced', 'reduced', 'cross-page Work changed');
    await page.goBack({ waitUntil: 'load' });
    check('cross-page Back: returns to homepage', new URL(page.url()).pathname === '/');
    await checkMode(page, 'reduced', 'reduced', 'cross-page Back');
    await page.waitForFunction(() => document.querySelector('[data-motion-form] select[name="motion"]')?.value === 'reduced');
    await checkFooter(page, 'reduced', 'cross-page Back');
    await checkHomeMotion(page, 'reduced', 'cross-page Back');
  });

  await scenario('desktop-reversible-manifesto', { os: 'reduce', preference: 'full' }, async (page) => {
    await visit(page);
    await checkHomeMotion(page, 'full', 'manifesto');
    const range = await page.locator('.pin-spacer > [data-manifesto]').evaluate((element) => {
      const spacer = element.parentElement.getBoundingClientRect();
      return { start: spacer.top + scrollY, distance: spacer.height - innerHeight };
    });
    check('manifesto: desktop pin creates a meaningful scroll range', range.distance > 500, JSON.stringify(range));
    await scrollTo(page, Math.round(range.start + range.distance * 0.88));
    await page.waitForFunction(() => {
      const words = [...document.querySelectorAll('[data-manifesto-text] .word')];
      return words.length > 0 && words.reduce((sum, word) => sum + Number(getComputedStyle(word).opacity), 0) / words.length > 0.7;
    });
    const forward = await manifestoSample(page);
    await screenshot(page, 'manifesto-forward');
    await scrollTo(page, Math.round(range.start + range.distance * 0.12));
    await page.waitForFunction(() => {
      const words = [...document.querySelectorAll('[data-manifesto-text] .word')];
      return words.length > 0 && words.reduce((sum, word) => sum + Number(getComputedStyle(word).opacity), 0) / words.length < 0.4;
    });
    const backward = await manifestoSample(page);
    check('manifesto: word progress reverses when scrolling back', forward.average - backward.average > 0.35, JSON.stringify({ forward, backward }));
    await screenshot(page, 'manifesto-backward');
  });

  await scenario('mobile-touch-flow', { os: 'reduce', mobile: true }, async (page) => {
    await visit(page, '/?motion-check=touch#hero');
    await checkHomeMotion(page, 'reduced', 'phone initial', true);
    const enable = page.locator('[data-enable-motion]');
    const size = await enable.boundingBox();
    check('phone: opt-in has a 44px touch target', size.width >= 44 && size.height >= 44, JSON.stringify(size));
    await reloadBy(page, enable, { mobile: true });
    await checkMode(page, 'full', 'full', 'phone opt-in');
    await checkHomeMotion(page, 'full', 'phone opt-in', true);
    check('phone: manifesto remains in normal document flow', await page.locator('.pin-spacer [data-manifesto]').count() === 0);
    const range = await page.locator('[data-manifesto]').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { start: rect.top + scrollY - innerHeight * 0.7, distance: rect.height + innerHeight * 0.15 };
    });
    await scrollTo(page, Math.round(range.start + range.distance * 0.88));
    await page.waitForFunction(() => {
      const words = [...document.querySelectorAll('[data-manifesto-text] .word')];
      return words.length > 0 && words.reduce((sum, word) => sum + Number(getComputedStyle(word).opacity), 0) / words.length > 0.7;
    });
    const forward = await manifestoSample(page);
    await screenshot(page, 'mobile-full-manifesto');
    await scrollTo(page, Math.round(range.start + range.distance * 0.12));
    await page.waitForFunction(() => {
      const words = [...document.querySelectorAll('[data-manifesto-text] .word')];
      return words.length > 0 && words.reduce((sum, word) => sum + Number(getComputedStyle(word).opacity), 0) / words.length < 0.4;
    });
    const backward = await manifestoSample(page);
    check('phone: manifesto word progress reverses', forward.average - backward.average > 0.35, JSON.stringify({ forward, backward }));
    await applyFooter(page, 'reduced', { mobile: true });
    await checkMode(page, 'reduced', 'reduced', 'phone reduced');
    await checkHomeMotion(page, 'reduced', 'phone reduced', true);
    await applyFooter(page, 'system', { mobile: true });
    await checkMode(page, 'system', 'reduced', 'phone system');
  });

  for (const os of ['reduce', 'no-preference']) {
    await scenario(`invalid-storage-${os}`, { os, preference: 'unexpected-value' }, async (page) => {
      await visit(page);
      await checkMode(page, 'system', mode(os, 'system'), 'invalid saved value');
      await checkHomeMotion(page, mode(os, 'system'), 'invalid saved value');
      await checkFooter(page, 'system', 'invalid saved value');
    });
  }

  await scenario('blocked-storage-opt-in', { os: 'reduce', storageFailure: 'all' }, async (page) => {
    await visit(page);
    await checkMode(page, 'system', 'reduced', 'blocked storage initial');
    const before = await page.evaluate(() => window.__motionTestDocument);
    await page.locator('[data-enable-motion]').click();
    await expectStorageError(page, 'blocked opt-in');
    check('blocked opt-in: no reload or temporary preference', await page.evaluate((before) => window.__motionTestDocument === before && document.documentElement.dataset.motion === 'reduced', before));
    await checkReadable(page, 'blocked opt-in');
    await screenshot(page, 'blocked-storage-error');
  });

  await scenario('blocked-storage-reset', { os: 'reduce', preference: 'full', storageFailure: 'writes' }, async (page) => {
    await visit(page);
    await checkHomeMotion(page, 'full', 'blocked reset initial');
    const before = await page.evaluate(() => window.__motionTestDocument);
    const form = page.locator('[data-motion-form]');
    await form.locator('select[name="motion"]').selectOption('system');
    await form.getByRole('button', { name: 'Apply & reload', exact: true }).click();
    await expectStorageError(page, 'blocked reset');
    check('blocked reset: previous full override and document survive', await page.evaluate(({ before, key }) => window.__motionTestDocument === before
      && localStorage.getItem(key) === 'full' && document.documentElement.dataset.motion === 'full', { before, key: KEY }));
  });

  await scenario('unsupported-webgl', { os: 'reduce', preference: 'full', noWebGL: true }, async (page) => {
    await visit(page);
    await checkMode(page, 'full', 'full', 'unsupported WebGL');
    await checkHomeMotion(page, 'full', 'unsupported WebGL');
    check('unsupported WebGL: canvas support was actually unavailable', await page.evaluate(() => window.__blockedWebGLCalls > 0));
    check('unsupported WebGL: static hero fallback remains available', await page.locator('.hero-fallback').isVisible()
      && await page.locator('#hero[data-webgl="on"]').count() === 0 && await page.locator('canvas').count() === 0);
    await page.locator('.hero-ctas a[href="#services"]').click();
    await page.waitForURL((url) => url.hash === '#services');
    await checkReadable(page, 'unsupported WebGL services', '[data-service-card]');
    await screenshot(page, 'unsupported-webgl-services');
  });

  for (const os of ['no-preference', 'reduce']) {
    await scenario(`no-javascript-${os}`, { os, mobile: true, javaScriptEnabled: false }, async (page) => {
      await visit(page);
      await checkReadable(page, `no JS ${os}`, '[data-hero-name], [data-hero-fade], [data-hero-status], [data-manifesto-text], [data-service-card], [data-testimonial-card], [data-about-para], [data-contact-email]');
      check(`no JS ${os}: unusable motion controls stay hidden`, await page.locator('[data-motion-form]:visible, [data-motion-prompt]:visible, [data-enable-motion]:visible').count() === 0);
      check(`no JS ${os}: no scroll pin or animation canvas`, await page.locator('.pin-spacer, canvas').count() === 0);
      await screenshot(page, `no-js-${os}`);
      await visit(page, '/work/');
      await checkReadable(page, `no JS ${os} work`, '#main h1, #websites h2, #ai-automations h2, [data-project-row]');
      check(`no JS ${os}: Work also hides unusable preference controls`, await page.locator('[data-motion-form]:visible').count() === 0);
    });
  }

  if (only && scenarioCount === 0) throw new Error(`Unknown scenario: ${only}`);
  for (const [name, errors] of [['no page errors', pageErrors], ['no console errors', consoleErrors], ['no local HTTP errors', httpErrors]]) {
    try { check(name, errors.length === 0, errors.join(' | ')); } catch (error) { if (!(error instanceof CheckFailure)) throw error; }
  }
} catch (error) {
  if (!(error instanceof CheckFailure)) checks.push({ name: 'runner setup', passed: false, detail: error.message });
} finally {
  await browser?.close();
  await mkdir(OUTPUT, { recursive: true });
  const report = { baseUrl: BASE, engine, onlyScenario: only ?? null, checks, pageErrors, consoleErrors, httpErrors };
  await writeFile(resolve(OUTPUT, 'report.json'), JSON.stringify(report, null, 2));
  const failed = checks.filter((entry) => !entry.passed).length;
  console.log(`${checks.length - failed} passed; ${failed} failed. Report: ${resolve(OUTPUT, 'report.json')}`);
  process.exitCode = failed ? 1 : 0;
}
