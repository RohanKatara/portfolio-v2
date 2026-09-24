/**
 * Cursor-preview regressions. Run against a fresh build:
 * node scripts/verify-hover.mjs http://127.0.0.1:4322 [--webkit]
 * Artifacts: QA_OUTPUT_DIR/<engine>-hover, default ../qa/<engine>-hover.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright-core';

const args = process.argv.slice(2);
const base = (args.find((arg) => !arg.startsWith('--')) ?? 'http://127.0.0.1:4322').replace(/\/$/, '');
const engine = args.includes('--webkit') ? 'webkit' : 'chrome';
const output = resolve(process.env.QA_OUTPUT_DIR ?? '../qa', `${engine}-hover`);
const checks = [];
const errors = [];
const browser = await (engine === 'webkit' ? webkit.launch({ headless: true }) : chromium.launch({ channel: 'chrome', headless: true }));
await mkdir(output, { recursive: true });

function check(name, passed, detail = '') {
  checks.push({ name, passed: Boolean(passed), detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!passed) throw new Error(name);
}

async function scenario(name, options, run) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${name}: ${message.text()}`); });
  try {
    await page.goto(`${base}/work/#ai-automations`, { waitUntil: 'load' });
    const row = page.locator('[data-project-row]').first();
    await row.scrollIntoViewIfNeeded();
    await row.locator('astro-island:not([ssr])').waitFor({ state: 'attached' });
    await run(page, row, row.locator('[data-project-preview]'));
    await page.screenshot({ path: resolve(output, `${name}.png`) });
  } catch (error) {
    if (!checks.some((entry) => entry.name === error.message && !entry.passed)) {
      checks.push({ name: `${name}: scenario completes`, passed: false, detail: error.message });
      console.error(`FAIL ${name}: ${error.message}`);
    }
    await page.screenshot({ path: resolve(output, `${name}-failure.png`) }).catch(() => {});
  } finally {
    await context.close();
  }
}

async function waitEnabled(preview, enabled) {
  await preview.page().waitForFunction((expected) => document.querySelector('[data-project-preview]')?.getAttribute('data-preview-enabled') === String(expected), enabled);
}

async function hoverRow(page, row) {
  const box = await row.boundingBox();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
}

async function checkDisabled(page, row, preview, label) {
  await waitEnabled(preview, false);
  await hoverRow(page, row);
  const state = await preview.evaluate((element) => ({
    opacity: getComputedStyle(element).opacity,
    svg: Boolean(element.querySelector('svg')),
  }));
  check(`${label}: preview stays hidden with no animated artwork`, state.opacity === '0' && !state.svg, JSON.stringify(state));
  check(`${label}: case link remains available`, await row.getAttribute('href') === '/work/mocktalk/');
}

try {
  await scenario('desktop', { viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' }, async (page, row, preview) => {
    await waitEnabled(preview, true);
    await page.mouse.move(1, 1);
    // Record the first painted frames after a real mouseenter. A final screenshot
    // alone misses the old preview travelling from (0, 0) across the navigation.
    await row.evaluate((element) => {
      window.__hoverFrames = [];
      element.addEventListener('mouseenter', () => {
        const sample = () => {
          const image = element.querySelector('[data-project-preview]');
          const box = image.getBoundingClientRect();
          const barBottom = Math.max(...Array.from(document.querySelectorAll('.nav, .work-categories')).map((bar) => bar.getBoundingClientRect().bottom));
          window.__hoverFrames.push({ left: box.left, right: box.right, top: box.top, bottom: box.bottom, barBottom });
          if (window.__hoverFrames.length < 10) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }, { once: true });
    });
    await hoverRow(page, row);
    await page.waitForFunction(() => window.__hoverFrames?.length === 10);
    const frames = await page.evaluate(() => window.__hoverFrames);
    check('desktop: every entry frame fits below navigation and inside viewport',
      frames.every((box) => box.left >= 15 && box.right <= 1425 && box.top >= box.barBottom + 15 && box.bottom <= 885), JSON.stringify(frames[0]));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-project-preview]')).opacity === '1');
    const layers = await page.evaluate(() => ({
      preview: Number(getComputedStyle(document.querySelector('[data-project-preview]')).zIndex),
      category: Number(getComputedStyle(document.querySelector('.work-categories')).zIndex),
      nav: Number(getComputedStyle(document.querySelector('.nav')).zIndex),
    }));
    check('desktop: preview layer stays below both navigation bars', layers.preview < layers.category && layers.preview < layers.nav, JSON.stringify(layers));

    // Move to the row's left edge near the sticky bars: the whole preview must
    // remain inside the viewport even when the cursor cannot be its centre.
    await row.evaluate((element) => {
      const bars = document.querySelector('.work-categories').getBoundingClientRect();
      window.scrollBy(0, element.getBoundingClientRect().top - bars.bottom - 20);
    });
    const edge = await row.boundingBox();
    await page.mouse.move(edge.x + 2, edge.y + 5);
    await page.waitForFunction(() => {
      const preview = document.querySelector('[data-project-preview]');
      const box = preview.getBoundingClientRect();
      const bar = document.querySelector('.work-categories').getBoundingClientRect();
      return Number(getComputedStyle(preview).opacity) === 1 && box.left >= 15 && box.top >= bar.bottom + 15;
    });
    check('desktop: edge hover remains clamped below sticky categories', true);
    await page.screenshot({ path: resolve(output, 'desktop-edge.png') });

    await page.mouse.move(1, 1);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-project-preview]')).opacity === '0');
    check('desktop: leaving row hides preview', true);

    await page.setViewportSize({ width: 900, height: 900 });
    await row.scrollIntoViewIfNeeded();
    await checkDisabled(page, row, preview, 'resize to 900px');
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitEnabled(preview, true);
    await row.scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    await hoverRow(page, row);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-project-preview]')).opacity === '1');
    check('desktop: resizing wide restores hover enhancement', true);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await waitEnabled(preview, true);
    check('desktop: live OS change preserves the page-load motion snapshot',
      await page.locator('html').getAttribute('data-motion') === 'full');
    await page.reload({ waitUntil: 'load' });
    await row.scrollIntoViewIfNeeded();
    await row.locator('astro-island:not([ssr])').waitFor({ state: 'attached' });
    await checkDisabled(page, row, preview, 'reloaded system reduced-motion preference');
  });

  await scenario('narrow-540', { viewport: { width: 540, height: 844 }, reducedMotion: 'no-preference' }, async (page, row, preview) => {
    await checkDisabled(page, row, preview, '540px mouse browser');
  });
  await scenario('touch', { viewport: { width: 1440, height: 900 }, hasTouch: true, isMobile: true, reducedMotion: 'no-preference' }, async (page, row, preview) => {
    check('touch: browser reports a coarse pointer', await page.evaluate(() => matchMedia('(pointer: coarse)').matches));
    await checkDisabled(page, row, preview, 'touch browser');
  });
  await scenario('reduced-motion', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }, async (page, row, preview) => {
    await checkDisabled(page, row, preview, 'cold reduced-motion preference');
  });

  checks.push({ name: 'no page or console errors', passed: errors.length === 0, detail: errors });
} finally {
  await browser.close();
  const report = { base, engine, passed: checks.filter((entry) => entry.passed).length, failed: checks.filter((entry) => !entry.passed).length, checks, errors };
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`${report.passed} passed; ${report.failed} failed. Report: ${resolve(output, 'report.json')}`);
  if (report.failed) process.exitCode = 1;
}
