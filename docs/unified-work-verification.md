# Unified Work verification — 23 September 2026

The approved structure is recorded in `superpowers/specs/2026-09-23-unified-work-design.md`. `/work/` is the single portfolio destination, with Websites first and AI & Automations below. The homepage has two category entries. Case studies are static `/work/<slug>/` pages. Legacy website paths redirect at Vercel; homepage hashes redirect on initial load and hash changes.

## Verification

- Astro check: 53 files, zero errors, warnings or hints. Production build succeeds with eight generated pages.
- Full Chrome regression: 368 checks passed across 360px and 390px phones, 768px touch tablet and 1440px desktop, including images, all recordings, native dialog focus, project order, website/enquiry URLs, category navigation, four full case studies, back/next/reload/history, no JavaScript, reduced motion, and legacy redirects with query preservation.
- Focused hover regression: 17 checks passed, covering initial coordinates, viewport/navigation clearance, pointer leave, narrow and touch devices, and live reduced-motion changes.
- Visual review: homepage category cards, Work introduction/category jumps and static case pages inspected at phone and desktop widths. The final keyboard skip link focuses `main`. Without JavaScript, categories have no misleading active indicator.
- A WebKit redirect-cancellation hydration error was fixed by making the old `/websites/` fallback a plain HTML redirect with no client islands.

## WebKit test-driver limitation

WebKit with JavaScript disabled reproducibly stopped delivering the animation-frame callbacks used by Playwright's actionability check after returning from the first case study. A subsequent row could be visibly present yet `locator.click()` and `scrollIntoViewIfNeeded()` would wait indefinitely for stable frames. Geometry showed a one-time font swap, no ongoing animation and no overlay interception.

The real phone interaction was independently exercised using native touchscreen taps after scrolling the heading into view and checking the actual element at the tap point. All four cases, their narrative/enquiry content and Back links passed three consecutive runs (12 complete flows, no errors). Only that WebKit/no-JavaScript test activation uses this method. Chrome retains normal locator actionability, and every browser retains route/content assertions and uncensored error auditing. Diagnostic reports are outside git in `../qa/webkit-nojs-focus/`.

The final focused no-JavaScript suite passed all 79 checks in WebKit with zero page, console or HTTP errors (`../qa/unified-nojs-final/webkit/report.json`). Use `--only=no-javascript` to reproduce that exact scenario.

A separate mobile WebKit mouse-click timeout was also traced: the engine scrolled 194px between mouse-down on the 404 recording link and mouse-up on a screenshot, so the final click correctly did not activate the link. Native touch taps passed the complete image → ODD recording → 404 recording sequence, including playback and focus restoration. The phone media scenario now uses native taps for WebKit; desktop/Chrome retain clicks. Evidence is in `../qa/media-investigation/`. Neither workaround forces clicks, invokes application handlers directly, suppresses errors, or changes the application.

The final focused media suite passed all 24 interaction/playback/focus assertions. Its full result was 26/27: no console or HTTP errors, with only the known native-controls page-error audit failing (`../qa/unified-media-final/webkit/report.json`, reproduce with `--only=media`).

## Native video diagnostic

The installed automated WebKit 26.5 engine still emits `RangeError: Temporal.Duration properties must be finite and of consistent sign` from native video controls. Video decoding and advancing playback pass. This same diagnostic was independently reproduced on a bare video element during the earlier website release; see `website-work-verification.md`. Native controls are preserved and errors are not filtered. A strict WebKit run is therefore not a clean diagnostic pass even when its functional assertions pass. Physical iPhone Safari testing is unavailable.

## Reproduction and release

Run `npm run check`, `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4322`. Run `node scripts/verify-websites.mjs http://127.0.0.1:4322` and `node scripts/verify-hover.mjs http://127.0.0.1:4322`. Append `--webkit` after setting `PLAYWRIGHT_BROWSERS_PATH` to the installed Playwright browser directory. `QA_OUTPUT_DIR` chooses the report/screenshot directory.

No new dependencies, environment variables or data schemas are required. Existing dependency advisories are unchanged from the previous release. Production uses the GitHub → Vercel integration for `master`. Confirm the new HTML and asset hashes, permanent `/websites` redirects and full live journey after deployment.

Rollback target: production commit `481431661af031fae97dfcd061efa63134a032f1`, deployment `portfolio-v2-b8qew3ceb-celest2230s-projects.vercel.app`. No migration needs reversal.
