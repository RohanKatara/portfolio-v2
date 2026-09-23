/**
 * Unified work and static case-study regressions against a running dev or preview server.
 * Run: node scripts/verify-websites.mjs [baseUrl] [--webkit] [--only=scenario-name]
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
const onlyScenario = args.find((arg) => arg.startsWith('--only='))?.slice(7);
const OUTPUT = resolve(process.env.QA_OUTPUT_DIR ?? '../qa', engine);
const ORIGIN = new URL(BASE).origin;
const EMAIL = 'rohankatara3@gmail.com';
const PROJECTS = [
  { id: 'odd-care', url: 'https://odd-care-co.vercel.app', subject: 'A website like ODD Care Co.' },
  { id: 'kindred-coffee', url: 'https://kindred-coffee.vercel.app', subject: 'A website like Kindred Coffee' },
  { id: '404-energy', url: 'https://404-energy-drink.vercel.app', subject: 'A website like 404 Energy' },
];
const CASES = [
  { slug: 'mocktalk', name: 'MockTalk', heading: 'MockTalk', year: '2026', role: 'Solo build', body: 'audio loop' },
  { slug: 'krishna', name: 'Krishna.AI', heading: 'Krishna.AI', year: '2024', role: 'Solo build', body: '700 verses' },
  { slug: 'automate-pro', name: 'Automate Pro', heading: 'Automate Pro', year: '2026', role: 'Client build', body: 'lead gatekeeper' },
  { slug: 'content-engine', name: 'Content Engine', heading: 'Content Multiplier', year: '2025', role: 'Solo build', body: 'write once, ship twelve places' },
];
const WORK_SECTIONS = ['websites', 'ai-automations'];
const checks = [];
const pageErrors = [];
const consoleErrors = [];
const httpErrors = [];
let scenarioCount = 0;
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
  if (onlyScenario && name !== onlyScenario) return;
  scenarioCount++;
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(25000);
  // Preserve every page error, including the known automated-WebKit native
  // media-control Temporal error. The report must not silently waive failures.
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

const visit = (page, path = '/work/') => page.goto(`${BASE}${path}`, { waitUntil: 'load' });
const isWorkUrl = (url, hash = '') => url.pathname.replace(/\/$/, '') === '/work' && url.hash === hash;
const isCaseUrl = (url, slug) => url.pathname.replace(/\/$/, '') === `/work/${slug}`;

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
  const sections = await page.locator('section#websites, section#ai-automations').evaluateAll((elements) => elements.map((element) => element.id));
  check(`${label}: websites precede AI and automations`, JSON.stringify(sections) === JSON.stringify(WORK_SECTIONS), sections.join(', '));
  const categoryLinks = await page.locator('.work-categories a').evaluateAll((links) => links.map((link) => ({ pathname: new URL(link.href).pathname, hash: new URL(link.href).hash })));
  check(`${label}: category switcher links to both work sections`,
    JSON.stringify(categoryLinks.map((link) => link.hash)) === JSON.stringify(WORK_SECTIONS.map((section) => `#${section}`))
    && categoryLinks.every((link) => link.pathname.replace(/\/$/, '') === '/work'), JSON.stringify(categoryLinks));
  check(`${label}: category switcher remains sticky`, await page.locator('.work-categories').evaluate((element) => getComputedStyle(element).position === 'sticky'));
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
  const caseLinks = await page.locator('#ai-automations [data-project-row]').evaluateAll((links) => links.map((link) => ({ href: link.getAttribute('href'), opensOverlay: link.hasAttribute('data-open-case') })));
  check(`${label}: four AI rows link directly to static case pages`,
    JSON.stringify(caseLinks.map((link) => link.href)) === JSON.stringify(CASES.map((project) => `/work/${project.slug}/`))
    && caseLinks.every((link) => !link.opensOverlay), JSON.stringify(caseLinks));
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
  const hidden = await page.locator('main#main h1, main#main h2, article[data-website] h3, article[data-website] a, #ai-automations [data-project-row]').evaluateAll((elements) => {
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

const checkCase = async (page, project, label) => {
  const main = page.locator(`main#main[data-case-study="${project.slug}"]`);
  check(`${label}: static case has one main and one descriptive H1`, await main.count() === 1
    && await page.locator('h1').count() === 1 && (await main.locator('h1').innerText()).includes(project.heading));
  const text = await main.innerText();
  check(`${label}: case year and role are visible`, text.includes(project.year) && text.includes(project.role));
  const prose = main.locator('.case-prose');
  check(`${label}: MDX body includes overview and implementation`,
    await prose.getByRole('heading', { name: 'Overview', exact: true }).count() === 1
    && await prose.getByRole('heading', { name: 'How it works', exact: true }).count() === 1
    && (await prose.innerText()).toLowerCase().includes(project.body));
  const metrics = main.locator('.case-metrics');
  check(`${label}: four existing case metrics rendered`, await metrics.locator('dt').count() === 4
    && await metrics.locator('dd').count() === 4
    && (await metrics.locator('dd').allTextContents()).every((value) => value.trim().length > 0));
  check(`${label}: page title identifies case`, (await page.title()).includes(project.name));
  check(`${label}: case has its own canonical`, await page.locator('link[rel="canonical"]').getAttribute('href') === `https://rohankatara.com/work/${project.slug}/`);
  check(`${label}: case description is populated`, (await page.locator('meta[name="description"]').getAttribute('content'))?.trim().length > 20);
  const enquiry = main.locator('.case-enquiry a');
  check(`${label}: direct project enquiry uses the existing email`, await enquiry.count() === 1
    && await enquiry.isVisible() && await enquiry.getAttribute('href') === `mailto:${EMAIL}`);
  check(`${label}: Back returns to AI section`, await main.locator('a.case-back').first().getAttribute('href') === '/work/#ai-automations');
  const next = CASES[(CASES.findIndex((entry) => entry.slug === project.slug) + 1) % CASES.length];
  check(`${label}: next case follows the project order`, await main.locator('a.case-next').getAttribute('href') === `/work/${next.slug}/`);
  check(`${label}: case renders without an overlay lock`, await page.evaluate(() =>
    !document.documentElement.hasAttribute('data-cold-overlay') && !document.body.hasAttribute('data-overlay-open')));
  await checkOverflow(page, label);
  return next;
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
      check(`${label}: canonical is unique`, await page.locator('link[rel="canonical"]').getAttribute('href') === 'https://rohankatara.com/work/');
      const identities = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent)));
      const person = identities.find((item) => item['@type'] === 'Person');
      check(`${label}: Person identity remains homepage`, person?.url === 'https://rohankatara.com/');
      const activeLink = mobile ? page.locator('.mobile-work-link') : page.locator('.nav-links a[href="/work/"]');
      check(`${label}: Work navigation marks active page`, await activeLink.getAttribute('aria-current') === 'page' && await activeLink.getAttribute('href') === '/work/');
      const desktopWorkLinks = await page.locator('.nav-links a').evaluateAll((links) => links.filter((link) => link.textContent.trim() === 'Work').map((link) => link.getAttribute('href')));
      check(`${label}: primary navigation has one Work destination`, JSON.stringify(desktopWorkLinks) === JSON.stringify(['/work/']));
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
    // WebKit may scroll between synthetic mouse-down/up in its phone viewport.
    // Native touch keeps both events on the control the visitor actually taps.
    const activate = (locator) => engine === 'webkit' ? locator.tap() : locator.click();
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
    await activate(imageLink);
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
      await activate(link);
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
      await activate(dialog.locator('[data-media-close]'));
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
    await visit(page, '/work/#ai-automations');
    for (const project of CASES) {
      const row = page.locator(`#ai-automations a[href="/work/${project.slug}/"]`);
      if (engine === 'webkit') {
        // With JavaScript disabled, WebKit can stall the driver's frame-based
        // stability retry after returning from a case. Verify the visible hit
        // target, then exercise a native phone tap rather than forcing a click.
        const measureTarget = () => row.evaluate((element) => {
          const heading = element.querySelector('h3');
          if (!heading) return null;
          const rect = heading.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const barBottom = Math.max(...Array.from(document.querySelectorAll('.nav, .work-categories'),
            (bar) => bar.getBoundingClientRect().bottom));
          return { x, y, visible: x > 0 && x < innerWidth && y > barBottom && y < innerHeight,
            hit: element.contains(document.elementFromPoint(x, y)) };
        });
        let target;
        const deadline = Date.now() + 4000;
        do {
          await row.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
          target = await measureTarget();
          if (target?.visible && target?.hit) break;
          // Poll the real scroll/hit state from Node: page timers are disabled.
          await new Promise((resolve) => setTimeout(resolve, 50));
        } while (Date.now() < deadline);
        check(`no-js ${project.slug}: case heading is visible and receives touch`, target?.visible && target?.hit, JSON.stringify(target));
        await page.touchscreen.tap(target.x, target.y);
      } else {
        await row.click();
      }
      await page.waitForURL((url) => isCaseUrl(url, project.slug));
      await checkCase(page, project, `no-js ${project.slug}`);
      await page.locator('a.case-back').first().click();
      await page.waitForURL((url) => isWorkUrl(url, '#ai-automations'));
      check(`no-js ${project.slug}: Back reaches AI work`, await page.locator('#ai-automations').isVisible());
    }
  });

  await scenario('reduced-motion', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }, async (page) => {
    await visit(page);
    await checkVisibleContent(page, 'reduced-motion');
    await loadProjectImages(page, 'reduced-motion');
    await checkOverflow(page, 'reduced-motion');
  });

  await scenario('navigation', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async (page) => {
    await visit(page, '/work/#mocktalk');
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
    check('navigation: Work and homepage titles differ', showcaseTitle.trim().length > 0 && showcaseTitle !== homeTitle, `${showcaseTitle} | ${homeTitle}`);
    check('navigation: homepage canonical preserved', await page.locator('link[rel="canonical"]').getAttribute('href') === 'https://rohankatara.com/');
    const teaserHrefs = await page.locator('#work .selected-work-card').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    check('navigation: homepage has one card per Work category', JSON.stringify(teaserHrefs) === JSON.stringify(WORK_SECTIONS.map((section) => `/work/#${section}`)), teaserHrefs.join(', '));
    check('navigation: homepage no longer duplicates full project lists', await page.locator('article[data-website], [data-project-row], #website-work, [data-case-overlay]').count() === 0);
    await page.locator('#work .selected-work-card[href="/work/#websites"]').click();
    await page.waitForURL((url) => isWorkUrl(url, '#websites'));
    check('navigation: homepage website card reaches its Work section', await page.locator('#websites').isVisible());
    await page.reload({ waitUntil: 'load' });
    check('navigation: category deep link survives reload', isWorkUrl(new URL(page.url()), '#websites') && await page.locator('main#main').isVisible());
    await page.goBack({ waitUntil: 'load' });
    check('navigation: browser back returns home', new URL(page.url()).pathname === '/');
    await page.goForward({ waitUntil: 'load' });
    check('navigation: browser forward returns Work', isWorkUrl(new URL(page.url()), '#websites'));
    await page.locator('.nav-logo').click();
    await page.waitForURL((url) => url.pathname === '/' && url.hash === '#hero');
    check('navigation: logo returns to homepage hero', await page.locator('#hero').isVisible());
    await page.locator('#work .selected-work-card[href="/work/#ai-automations"]').click();
    await page.waitForURL((url) => isWorkUrl(url, '#ai-automations'));
    check('navigation: homepage AI card reaches its Work section', await page.locator('#ai-automations').isVisible());
  });

  await scenario('category-navigation', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async (page) => {
    await visit(page);
    for (const section of ['ai-automations', 'websites']) {
      await page.locator(`.work-categories a[href$="#${section}"]`).click();
      await page.waitForURL((url) => isWorkUrl(url, `#${section}`));
      await page.waitForFunction((id) => {
        const heading = document.getElementById(id)?.querySelector('h2');
        const switcher = document.querySelector('.work-categories');
        if (!heading || !switcher) return false;
        const headingRect = heading.getBoundingClientRect();
        const switcherRect = switcher.getBoundingClientRect();
        return headingRect.top >= switcherRect.bottom - 2 && headingRect.bottom <= window.innerHeight;
      }, section);
      check(`categories: ${section} heading remains below sticky controls`, true);
      await checkOverflow(page, `categories ${section}`);
    }
    await page.reload({ waitUntil: 'load' });
    check('categories: selected section survives reload', isWorkUrl(new URL(page.url()), '#websites'));
  });

  for (const [index, project] of CASES.entries()) {
    await scenario(`case-${project.slug}`, { viewport: index % 2 ? { width: 1440, height: 900 } : { width: 390, height: 844 }, hasTouch: index % 2 === 0, isMobile: index % 2 === 0 }, async (page) => {
      await visit(page, '/work/#ai-automations');
      await page.locator(`#ai-automations a[href="/work/${project.slug}/"]`).click();
      await page.waitForURL((url) => isCaseUrl(url, project.slug));
      const next = await checkCase(page, project, project.slug);
      if (project.slug === 'automate-pro') {
        const demo = page.locator('main[data-case-study="automate-pro"] video');
        check('automate-pro: preserved demo has native inline controls and lazy loading', await demo.evaluate((element) =>
          element.controls && element.playsInline && element.preload === 'none'));
        check('automate-pro: original demo URL is preserved', await demo.locator('source').getAttribute('src') === '/automate-pro-demo/automate-pro-demo.mp4');
        await demo.scrollIntoViewIfNeeded();
        await demo.evaluate((element) => { element.muted = true; return element.play(); });
        await page.waitForFunction(() => {
          const video = document.querySelector('main[data-case-study="automate-pro"] video');
          return video && video.readyState >= 2 && !video.error && !video.paused && video.currentTime > 0;
        }, null, { timeout: 25000 });
        check('automate-pro: preserved demo loads and plays', true);
        await demo.evaluate((element) => element.pause());
      }
      await screenshot(page, `case-${project.slug}`, true);
      await page.reload({ waitUntil: 'load' });
      check(`${project.slug}: case survives a direct reload`, isCaseUrl(new URL(page.url()), project.slug) && await page.locator('.case-prose').isVisible());
      await page.locator('a.case-next').click();
      await page.waitForURL((url) => isCaseUrl(url, next.slug));
      check(`${project.slug}: next case opens correct page`, (await page.locator('h1').innerText()).includes(next.heading));
      await page.goBack({ waitUntil: 'load' });
      check(`${project.slug}: browser Back restores the case`, isCaseUrl(new URL(page.url()), project.slug));
      await page.locator('a.case-back').first().click();
      await page.waitForURL((url) => isWorkUrl(url, '#ai-automations'));
      check(`${project.slug}: Back link returns to AI category`, await page.locator('#ai-automations').isVisible());
    });
  }

  const legacyRoutes = [
    { from: '/websites/', to: '/work/' },
    ...PROJECTS.map((project) => ({ from: `/websites/#${project.id}`, to: `/work/#${project.id}` })),
    { from: '/#website-work', to: '/work/#websites' },
    { from: '/#work', to: '/work/' },
    ...CASES.map((project) => ({ from: `/#${project.slug}`, to: `/work/${project.slug}/` })),
  ];
  for (const [index, route] of legacyRoutes.entries()) {
    await scenario(`legacy-${index + 1}`, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async (page) => {
      await visit(page, route.from);
      const expected = new URL(route.to, BASE);
      await page.waitForURL((url) => url.pathname === expected.pathname && url.hash === expected.hash);
      check(`legacy: ${route.from} reaches ${route.to}`, true);
      check(`legacy: ${route.from} shows its destination`, await page.locator('main#main').isVisible());
      check(`legacy: ${route.from} does not leave an overlay lock`, await page.evaluate(() =>
        !document.documentElement.hasAttribute('data-cold-overlay') && !document.body.hasAttribute('data-overlay-open')));
    });
  }

  const sameDocumentRoutes = [
    { hash: '#mocktalk', to: '/work/mocktalk/' },
    { hash: '#website-work', to: '/work/#websites' },
    { hash: '#work', to: '/work/' },
  ];
  for (const [index, route] of sameDocumentRoutes.entries()) {
    await scenario(`legacy-hashchange-${index + 1}`, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async (page) => {
      const search = '?ref=legacy%20check&campaign=work';
      await visit(page, `/${search}`);
      check(`legacy hashchange: ${route.hash} starts on a loaded homepage`,
        new URL(page.url()).pathname === '/' && new URL(page.url()).hash === ''
        && await page.locator('#work .selected-work-card').count() === 2);
      const expected = new URL(route.to, BASE);
      // Change only the current document's fragment after load; a cold visit
      // would not catch a missing hashchange listener in the legacy router.
      await Promise.all([
        page.waitForURL((url) => url.pathname === expected.pathname && url.hash === expected.hash),
        page.evaluate((hash) => { window.location.hash = hash; }, route.hash),
      ]);
      check(`legacy hashchange: ${route.hash} reaches ${route.to}`, true);
      check(`legacy hashchange: ${route.hash} preserves the query string`, new URL(page.url()).search === search);
      check(`legacy hashchange: ${route.hash} shows its destination`, await page.locator('main#main').isVisible());
    });
  }

  if (onlyScenario && scenarioCount === 0) throw new Error(`Unknown scenario: ${onlyScenario}`);
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
    baseUrl: BASE, engine, onlyScenario: onlyScenario ?? null, createdAt: new Date().toISOString(), checks, pageErrors, consoleErrors, httpErrors,
  }, null, 2));
  const failures = checks.filter((result) => !result.passed).length;
  console.log(`\n${failures ? `${failures} CHECK(S) FAILED` : 'ALL CHECKS PASSED'} — ${checks.length} checks; artifacts: ${OUTPUT}`);
  process.exitCode = failures ? 1 : 0;
}
