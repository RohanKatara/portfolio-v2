# Animation preference verification — 24 September 2026

The approved scope is recorded in `superpowers/specs/2026-09-24-animation-preference-design.md`. The site now resolves a validated browser preference before first paint. System follows the device; Full and Reduced are explicit overrides. Applying a preference reloads the current URL. No animation design, project content, dependency, environment variable, or database schema changed.

## Verified locally

- Astro check: 56 files, zero errors, warnings or hints. Production build: eight static pages.
- Chrome motion suite: 249 checks passed. Covers both OS settings and all three choices, page navigation/reload persistence, keyboard and touch opt-in, reset to System, actual forward/reverse manifesto progress on desktop and phone, blocked/invalid storage, unavailable WebGL and readable no-JavaScript content. No page, console or HTTP errors.
- A separate real-browser review found that Back could restore an old footer select value after changing the preference on Work. The control now synchronizes on `pageshow`. A restored back/forward-cache page revalidates its preference and reloads only when the cached snapshot no longer matches the saved choice or current System setting.
- The rebuilt Chrome Back-navigation regression passed all 19 checks, including correct reduced effects and the footer selection after Home → Work → change preference → Back.
- The rebuilt full WebKit suite passed 265 checks with no page, console or HTTP errors, including the Back-navigation regression and native phone taps.
- Chrome hover regression: 18 checks passed. Existing device restrictions and cursor-following bounds are preserved. Device preference changes apply on the next page load, without a spontaneous reload during reading.
- Existing Work category-navigation smoke: eight checks passed, including sticky-header clearance, reload and no horizontal overflow.
- Manual browser review: homepage opt-in and footer controls checked at desktop and 390px phone width, with successful apply/reload, navigation and corrected Back restoration.

The tests use Chrome and automated WebKit with phone emulation. A physical iPhone and the separate PC reported by Rohan were not available for direct testing. These tests do not establish the separate PC's original setting; they verify that visitors can explicitly enable the effects even when the browser requests reduced motion.

## Reproduce

Run `npm run check`, `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4322`. Run `node scripts/verify-motion.mjs http://127.0.0.1:4322` and `node scripts/verify-hover.mjs http://127.0.0.1:4322`. Append `--webkit` with the installed Playwright WebKit path configured. Use `--only=cross-page-preference-back` for the Back regression. `QA_OUTPUT_DIR` selects the artifact root.

Run browser suites sequentially on this Windows machine: parallel Chrome/WebKit graphics contexts caused an initial WebKit navigation timeout. That resource-related attempt was stopped; the sequential full run completed cleanly. An initial test assertion incorrectly included a decorative arrow in an exact text comparison; it was corrected to use the actual accessible button name. No browser errors were filtered.

## Persistence and rollback

Only `portfolio-motion-preference` is stored, with `full` or `reduced`; System removes the key. Invalid values fall back to System. Failed saves show a visible status and retain the current page/mode. No saved choice is transmitted. Another tab's changed preference applies on a subsequent navigation or restored-page check, without changing a page the visitor is reading.

Rollback target: previous production revision `f40d3446a4c6461a95e492aaf2a154429e3b0b58`. Revert this change or restore the preceding Vercel production deployment. There is no migration to reverse. Production verification is recorded in the release note in the task outputs.
