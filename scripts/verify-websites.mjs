/**
 * Website showcase regressions against a running dev or preview server.
 * Run: node scripts/verify-websites.mjs [baseUrl] [--webkit]
 * Uses system Chrome by default. --webkit requires Playwright WebKit installed.
 * Screenshots and report.json go to QA_OUTPUT_DIR, or ../qa/<engine>.
 * External demos and mailto links are inspected, never opened or submitted.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright-core';

const args = process.argv.slice(2);
const BASE = (args.find((arg) => !arg.startsWith('--')) ?? 'http://localhost:4321').replace(/\/$/, '');
const engine = args.includes('--webkit') ? 'webkit' : 'chrome';
const OUTPUT = resolve(process.env.QA_OUTPUT_DIR ?? '../qa', engine);
const ORIGIN = new URL(BASE).origin;
const EMAIL = 'rohankatara3@gmail.com';
const PROJECTS = [
  { id: 'odd-care', url: 'https://odd-care-co.vercel.app', subject: 'A website like ODD Care Co.' },
  { id: 'kindred-coffee', url: 'https://kindred-coffee.vercel.app', subject: 'A website like Kindred Coffee' },
  { id: '404-energy', url: 'https://404-energy-drink.vercel.app', subject: 'A website like 404 Energy' },
];
const checks = [];
const pageErrors = [];
const consoleErrors = [];
const httpErrors = [];
let browser;

class CheckFailure extends Error {}

const check = (name, passed, detail = '') => {
  checks.push({ name, passed: Boolean(passed), detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail.slice(0, 700)}` : ''}`);
  if (!passed) throw new CheckFailure(name);
};

const screenshot = (page, name, fullPage = false) =>
  page.screenshot({ path: resolve(OUTPUT, `${name}.png`), fullPage, animations: 'disabled' });

const scenario = async (name, options, run) => {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(25000);
  page.on('pageerror', (error) => pageErrors.push(`${name}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`${name}: ${message.text()}`);
  });
  page.on('response', (response) => {
    if (new URL(response.url()).origin === ORIGIN && response.status() >= 400) {
      httpErrors.push(`${name}: ${response.status()} ${response.url()}`);
    }
  });
  try {
    await run(page);
  } catch (error) {
    if (!(error instanceof CheckFailure)) {
      checks.push({ name: `${name}: completes flow`, passed: false, detail: error.message });
      console.error(`FAIL  ${name}: ${error.message}`);
    }
    await screenshot(page, `${name}-failure`).catch(() => {});
  } finally {
    await context.close();
  }
};

const visit = (page, path = '/websites/') => page.goto(`${BASE}${path}`, { waitUntil: 'load' });

const checkOverflow = async (page, label) => {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  check(`${label}: no horizontal overflow`,
    Math.max(dimensions.document, dimensions.body) <= dimensions.viewport + 1,
    JSON.stringify(dimensions));
};

const checkStructure = async (page, label) => {
  const ids = await page.locator('article[data-website]').evaluateAll((articles) => articles.map((article) => article.id));
  check(`${label}: exact project order`, JSON.stringify(ids) === JSON.stringify(PROJECTS.map((project) => project.id)), ids.join(', '));
  check(`${label}: one main and one H1`, await page.locator('main#main').count() === 1 && await page.locator('h1').count() === 1);
  for (const project of PROJECTS) {
    const article = page.locator(`article[id="${project.id}"][data-website]`);
    const demoLinks = article.locator('a[data-demo]');
    const href = await demoLinks.first().getAttribute('href');
    check(`${label}: ${project.id} exact demo URL`, await demoLinks.count() === 1 && new URL(href, BASE).href === new URL(project.url).href, href ?? 'missing');
    const mailtos = await article.locator('a[href^="mailto:"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    const expected = `mailto:${EMAIL}?subject=${encodeURIComponent(project.subject)}`;
    check(`${label}: ${project.id} exact email and subject`, mailtos.includes(expected), mailtos.join(', '));
    check(`${label}: ${project.id} has screenshot access`, await article.locator('a[data-image-open]').count() > 0);
  }
  const videoIds = await page.locator('a[data-video-open]').evaluateAll((links) => links.map((link) => link.closest('article[data-website]')?.id));
  check(`${label}: videos only for ODD and 404`, JSON.stringify(videoIds) === JSON.stringify(['odd-care', '404-energy']), videoIds.join(', '));
};

const loadProjectImages = async (page, label) => {
  const images = page.locator('article[data-website] img');
  check(`${label}: project images present`, await images.count() >= 3);
  for (let index = 0; index < await images.count(); index++) {
    const img = images.nth(index);
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((element) => element.decode());
    const data = await img.evaluate((element) => ({
      loaded: element.complete && element.naturalWidth > 0,
      alt: element.alt.trim(),
      renderedWidth: element.getBoundingClientRect().width,
    }));
    check(`${label}: image ${index + 1} loaded and described`, data.loaded && data.alt.length > 0 && data.renderedWidth > 0, JSON.stringify(data));
  }
};

const checkVisibleContent = async (page, label) => {
  const hidden = await page.locator('main#main h1, article[data-website] h2, article[data-website] a').evaluateAll((elements) => {
    const visible = (element) => {
      if (!element.getClientRects().length) return false;
      for (let current = element; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      }
      return true;
    };
    return elements.filter((element) => !visible(element)).map((element) => element.textContent.trim().slice(0, 80));
  });
  check(`${label}: headings and project links visible`, hidden.length === 0, hidden.join(' | '));
};

const run = async () => {
  await mkdir(OUTPUT, { recursive: true });
  browser = engine === 'webkit'
    ? await webkit.launch({ headless: true })
    : await chromium.launch({ channel: 'chrome', headless: true });

  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    const mobile = viewport.width < 720;
    const touch = viewport.width <= 768;
    const label = `layout-${viewport.width}`;
    await scenario(label, { viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 }, async (page) => {
      await visit(page);
      await checkStructure(page, label);
      await loadProjectImages(page, label);
      await checkOverflow(page, label);
      await page.evaluate(() => window.scrollTo(0, 0));
      await checkVisibleContent(page, label);
      check(`${label}: canonical is unique`, await page.locator('link[rel="canonical"]').getAttribute('href') === 'https://rohankatara.com/websites/');
      const identities = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent)));
      const person = identities.find((item) => item['@type'] === 'Person');
      check(`${label}: Person identity remains homepage`, person?.url === 'https://rohankatara.com/');
      const activeLink = mobile ? page.locator('.mobile-work-link') : page.locator('.nav-links a[href="/websites/"]');
      check(`${label}: website navigation marks active page`, await activeLink.getAttribute('aria-current') === 'page');
      await screenshot(page, label, true);
      if (mobile) {
        const menu = page.locator('[data-nav-menu]');
        await menu.locator('summary').click();
        check(`${label}: mobile menu opens`, await menu.evaluate((element) => element.open));
        await checkOverflow(page, `${label} menu`);
        const smallTargets = await page.locator('.nav-logo, .mobile-work-link, .nav-menu summary, .mobile-nav-links a').evaluateAll((elements) =>
          elements.filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width < 44 || rect.height < 44;
          }).map((element) => element.textContent.trim()));
        check(`${label}: navigation targets at least 44px`, smallTargets.length === 0, smallTargets.join(', '));
        await menu.locator('summary').focus();
        await page.keyboard.press('Escape');
        check(`${label}: Escape closes menu and preserves focus`, await menu.evaluate((element) => !element.open && document.activeElement === element.querySelector('summary')));
      }
    });
  }

  await scenario('media', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async (page) => {
    const requestedMedia = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'media') requestedMedia.push(request.url());
    });
    await visit(page);
    const dialog = page.locator('dialog#media-dialog');
    const video = page.locator('video#showcase-video');
    check('media: video has no initial source', !(await video.getAttribute('src')) && await video.locator('source[src]').count() === 0);
    check('media: video preload is none', await video.getAttribute('preload') === 'none');
    check('media: videos not requested on page load', requestedMedia.length === 0, requestedMedia.join(', '));

    const imageLink = page.locator('#odd-care a[data-image-open]').first();
    await imageLink.click();
    await page.waitForFunction(() => document.querySelector('#media-dialog')?.open);
    await page.locator('#showcase-image').evaluate((image) => image.decode());
    check('media: image dialog is named and loaded',
      (await page.locator('#media-title').innerText()).trim().length > 0 && await page.locator('#showcase-image').isVisible());
    const originalLink = page.locator('#media-original');
    check('media: full-size image link matches opener', await originalLink.isVisible()
      && new URL(await originalLink.getAttribute('href'), BASE).href === new URL(await imageLink.getAttribute('href'), BASE).href);
    for (let index = 0; index < 4; index++) {
      await page.keyboard.press('Tab');
      check(`media: modal prevents background control focus ${index + 1}`, await dialog.evaluate((element) =>
        element.matches(':modal') && (element.contains(document.activeElement) || document.activeElement === document.body)));
    }
    await screenshot(page, 'image-dialog');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#media-dialog')?.open);
    check('media: image Escape restores opener focus', await imageLink.evaluate((element) => document.activeElement === element));

    for (const id of ['odd-care', '404-energy']) {
      const link = page.locator(`[id="${id}"] a[data-video-open]`);
      const source = await link.getAttribute('data-video');
      check(`media: ${id} has a video source`, Boolean(source));
      await link.click();
      await page.waitForFunction(() => document.querySelector('#media-dialog')?.open);
      check(`media: ${id} hides full-size image link`, await originalLink.isHidden());
      const actualSource = await video.getAttribute('src');
      check(`media: ${id} source assigned on click`, Boolean(actualSource) && new URL(actualSource, BASE).href === new URL(source, BASE).href, actualSource ?? 'missing');
      check(`media: ${id} exposes native playback controls`, await video.evaluate((element) => element.controls));
      // The viewer loads on request; it intentionally does not autoplay.
      // Exercise the browser's decoder without relying on OS-specific control coordinates.
      await video.evaluate((element) => element.play());
      await page.waitForFunction(() => {
        const element = document.querySelector('#showcase-video');
        return element && element.readyState >= 2 && !element.error;
      }, null, { timeout: 25000 });
      await page.waitForFunction(() => {
        const element = document.querySelector('#showcase-video');
        return element && !element.paused && element.currentTime > 0;
      }, null, { timeout: 12000 });
      check(`media: ${id} video loads and plays`, true);
      await dialog.locator('[data-media-close]').click();
      // The native dialog close event is queued after the open attribute changes.
      await page.waitForFunction(() => {
        const element = document.querySelector('#showcase-video');
        return !document.querySelector('#media-dialog')?.open && element?.paused && !element.getAttribute('src');
      });
      check(`media: ${id} close pauses video`, await video.evaluate((element) => element.paused));
      check(`media: ${id} close restores focus`, await link.evaluate((element) => document.activeElement === element));
    }
  });

  await scenario('no-javascript', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, javaScriptEnabled: false }, async (page) => {
    await visit(page);
    await checkStructure(page, 'no-js');
    await checkVisibleContent(page, 'no-js');
    const mediaHrefs = await page.locator('a[data-image-open], a[data-video-open]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    check('no-js: media has usable direct links', mediaHrefs.every((href) => href && !href.startsWith('#') && !href.startsWith('javascript:')), mediaHrefs.join(', '));
    await page.locator('.nav-menu summary').click();
    check('no-js: native menu exposes home navigation', await page.locator('.mobile-nav-links a[href="/#contact"]').isVisible());
    await checkOverflow(page, 'no-js');
    await screenshot(page, 'no-javascript');
  });

  await scenario('reduced-motion', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }, async (page) => {
    await visit(page);
    await checkVisibleContent(page, 'reduced-motion');
    await loadProjectImages(page, 'reduced-motion');
    await checkOverflow(page, 'reduced-motion');
  });

  await scenario('navigation', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async (page) => {
    await visit(page, '/websites/#mocktalk');
    const cold = await page.evaluate(() => ({
      coldOverlay: document.documentElement.hasAttribute('data-cold-overlay'),
      overlay: document.body.hasAttribute('data-overlay-open'),
      mainVisibility: getComputedStyle(document.querySelector('main#main')).visibility,
      mainOpacity: getComputedStyle(document.querySelector('main#main')).opacity,
      smoothScroll: Boolean(window.__lenis),
    }));
    check('navigation: unrelated case hash cannot hide or lock showcase', !cold.coldOverlay && !cold.overlay && cold.mainVisibility === 'visible' && cold.mainOpacity === '1' && !cold.smoothScroll, JSON.stringify(cold));
    const showcaseTitle = await page.title();
    await page.locator('.nav-menu summary').click();
    await page.locator('.mobile-nav-links a[href="/#contact"]').click();
    await page.waitForURL((url) => url.pathname === '/' && url.hash === '#contact');
    await page.waitForFunction(() => Math.abs(document.querySelector('#contact').getBoundingClientRect().top) < window.innerHeight);
    check('navigation: Contact reaches homepage contact', await page.locator('#contact').isVisible());
    const homeTitle = await page.title();
    check('navigation: website and homepage titles differ', showcaseTitle.trim().length > 0 && showcaseTitle !== homeTitle, `${showcaseTitle} | ${homeTitle}`);
    check('navigation: homepage canonical preserved', await page.locator('link[rel="canonical"]').getAttribute('href') === 'https://rohankatara.com/');
    const teaserHrefs = await page.locator('section#website-work a[href^="/websites/#"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    check('navigation: three homepage project entries', JSON.stringify(teaserHrefs) === JSON.stringify(PROJECTS.map((project) => `/websites/#${project.id}`)), teaserHrefs.join(', '));
    await page.locator('section#website-work a[href="/websites/#odd-care"]').click();
    await page.waitForURL((url) => url.pathname.replace(/\/$/, '') === '/websites' && url.hash === '#odd-care');
    check('navigation: homepage project link reaches matching showcase', await page.locator('#odd-care').isVisible());
    await page.reload({ waitUntil: 'load' });
    check('navigation: deep link survives reload', new URL(page.url()).hash === '#odd-care' && await page.locator('main#main').isVisible());
    await page.goBack({ waitUntil: 'load' });
    check('navigation: browser back returns home', new URL(page.url()).pathname === '/');
    await page.goForward({ waitUntil: 'load' });
    check('navigation: browser forward returns showcase', new URL(page.url()).pathname.replace(/\/$/, '') === '/websites');
    await page.locator('.nav-logo').click();
    await page.waitForURL((url) => url.pathname === '/' && url.hash === '#hero');
    check('navigation: logo returns to homepage hero', await page.locator('#hero').isVisible());
  });

  await scenario('home-cases', { viewport: { width: 1440, height: 900 } }, async (page) => {
    await visit(page, '/#mocktalk');
    await page.waitForFunction(() => document.body.getAttribute('data-overlay-open') === 'mocktalk');
    check('home: existing cold case deep link opens', await page.locator('[data-case-overlay="mocktalk"]').isVisible());
    await page.locator('[data-case-overlay="mocktalk"] .case-close').click();
    await page.waitForFunction(() => !document.body.hasAttribute('data-overlay-open'));
    const nextCase = page.locator('[data-project-row][data-open-case="automate-pro"]');
    await nextCase.scrollIntoViewIfNeeded();
    await nextCase.click();
    await page.waitForFunction(() => document.body.getAttribute('data-overlay-open') === 'automate-pro');
    check('home: existing project click still opens case', await page.locator('[data-case-overlay="automate-pro"]').isVisible());
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.hasAttribute('data-overlay-open'));
    check('home: Escape closes existing case', true);
  });

  for (const [name, errors] of [['no page errors', pageErrors], ['no browser console errors', consoleErrors], ['no local HTTP errors', httpErrors]]) {
    try { check(name, errors.length === 0, errors.join(' | ')); } catch (error) {
      if (!(error instanceof CheckFailure)) throw error;
    }
  }
};

try {
  await run();
} catch (error) {
  checks.push({ name: `${engine}: runner setup`, passed: false, detail: error.message });
  console.error(`FAIL  ${engine}: ${error.message}`);
} finally {
  await browser?.close();
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(resolve(OUTPUT, 'report.json'), JSON.stringify({
    baseUrl: BASE, engine, createdAt: new Date().toISOString(), checks, pageErrors, consoleErrors, httpErrors,
  }, null, 2));
  const failures = checks.filter((result) => !result.passed).length;
  console.log(`\n${failures ? `${failures} CHECK(S) FAILED` : 'ALL CHECKS PASSED'} — ${checks.length} checks; artifacts: ${OUTPUT}`);
  process.exitCode = failures ? 1 : 0;
}
