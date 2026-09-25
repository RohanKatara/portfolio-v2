import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:4322';
const useWebkit = process.argv.includes('--webkit');
const output = resolve(process.env.QA_OUTPUT_DIR || '../qa/enquiries', useWebkit ? 'webkit' : 'chrome');
await mkdir(output, { recursive: true });
const browser = await (useWebkit ? webkit.launch() : chromium.launch({ channel: 'chrome' }));
const checks = [], errors = [];
const check = (name, condition) => { checks.push({ name, passed: !!condition }); assert.ok(condition, name); console.log(`PASS ${name}`); };
const cases = [['mocktalk', 'MockTalk'], ['krishna', 'Krishna.AI'], ['automate-pro', 'Automate Pro'], ['content-engine', 'Content Engine']];
const paths = ['/', '/work/', ...cases.map(([slug]) => `/work/${slug}/`)];
try {
  for (const mode of ['phone', 'desktop', 'no-js']) {
    const context = await browser.newContext({ viewport: mode === 'desktop' ? { width: 1440, height: 1000 } : { width: 360, height: 800 }, reducedMotion: 'reduce', javaScriptEnabled: mode !== 'no-js', isMobile: mode !== 'desktop', hasTouch: mode !== 'desktop' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push({ mode, url: page.url(), message: error.message }));
    for (const path of paths) {
      await page.goto(`${base}${path}`, { waitUntil: 'load' });
      const links = await page.locator('a[href^="https://wa.me/"]').evaluateAll(elements => elements.map(el => ({ href: el.href, reference: el.dataset.enquiryReference, intent: el.dataset.enquiry })));
      check(`${mode} ${path}: WhatsApp destinations and editable drafts`, links.length > 0 && links.every(link => {
        const url = new URL(link.href), text = url.searchParams.get('text');
        return url.pathname === '/917984242115' && !!text && (!link.reference || text.includes(link.reference)) && (!link.intent || link.intent !== 'website' || text.includes('website for my business')) && (!link.intent || link.intent !== 'workflow' || text.includes('improve an existing workflow'));
      }));
      const body = await page.locator('body').innerText();
      check(`${mode} ${path}: number not displayed`, !body.includes('7984242115'));
      check(`${mode} ${path}: email alternative`, await page.locator('a[href="mailto:rohankatara750@gmail.com"]').count() > 0);
      check(`${mode} ${path}: no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      check(`${mode} ${path}: mobile bar visibility`, await page.locator('.mobile-contact').isVisible() === (mode !== 'desktop'));
      if (mode !== 'desktop') {
        const sizes = await page.locator('.mobile-contact a').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
        check(`${mode} ${path}: touch targets`, sizes.every(height => height >= 48));
        await page.locator('footer').scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        check(`${mode} ${path}: footer clears contact bar`, await page.evaluate(() => document.querySelector('footer').getBoundingClientRect().bottom <= document.querySelector('.mobile-contact').getBoundingClientRect().top + 1));
      }
      if (path === '/') {
        check(`${mode}: updated price`, body.includes('Starting from ₹5,000') && !body.includes('₹8,000'));
        check(`${mode}: three contextual services`, await page.locator('#services [data-enquiry]').count() === 3);
        await page.locator('#contact').scrollIntoViewIfNeeded();
        await page.screenshot({ path: resolve(output, `${mode}-contact.png`) });
      } else if (path === '/work/') {
        check(`${mode}: all seven examples have enquiries`, await page.locator('main [data-enquiry]').count() === 7);
        if (mode === 'phone') {
          await page.locator('[data-image-open]').first().click();
          check('phone: media viewer hides contact bar', await page.locator('#media-dialog').isVisible() && !await page.locator('.mobile-contact').isVisible());
          await page.locator('[data-media-close]').click();
          check('phone: closing viewer restores contact bar', await page.locator('.mobile-contact').isVisible());
        }
        await page.locator('#ai-automations').scrollIntoViewIfNeeded();
        await page.screenshot({ path: resolve(output, `${mode}-work.png`) });
      } else {
        const project = cases.find(([slug]) => path.includes(slug));
        check(`${mode} ${path}: contextual case and mobile drafts`, await page.locator('.case-enquiry [data-enquiry]').getAttribute('data-enquiry-reference') === project[1] && new URL(await page.locator('[data-mobile-enquiry]').getAttribute('href')).searchParams.get('text').includes(project[1]));
        check(`${mode} ${path}: enquiry before next case`, await page.evaluate(() => document.querySelector('.case-enquiry').compareDocumentPosition(document.querySelector('.case-pagination')) & Node.DOCUMENT_POSITION_FOLLOWING));
        await page.locator('.case-enquiry').scrollIntoViewIfNeeded();
        await page.screenshot({ path: resolve(output, `${mode}-${project[0]}.png`) });
      }
    }
    await context.close();
  }
  check('no browser runtime errors', errors.length === 0);
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
