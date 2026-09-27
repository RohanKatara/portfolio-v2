# Verification record

Portfolio-matched redesign verified locally on 27 September 2026 against the served production build at http://127.0.0.1:4173.

## Results

| Check | Result |
| --- | --- |
| ESLint | Passed, no warnings |
| TypeScript | Passed |
| Production build | Passed |
| Business rules, dates, money, CSV and stored-state validation | 54 tests passed |
| Complete end-to-end browser suite | 50 tests passed: 25 desktop Chromium, 25 iPhone-sized WebKit; two workers, no retries |
| Portfolio UI regression | Neutral branding, correct portfolio destinations, 360px navigation through every route and reload passed in both engines |
| External traffic | No external requests or fetch/XHR calls in the tested three-workflow journey |
| Visual review | Desktop workflow screens, mobile result/action panels, gallery and quotation print view reviewed; captures check page overflow |

The complete suite passed against the final redesigned production build. This phase changes presentation, locally bundled fonts and portfolio navigation links; workflow rules and saved-state schema are unchanged. Desktop, phone-sized WebKit and print screenshots were regenerated and inspected. No runtime changes were made after the full suite.

The initial 26 September build had zero reported axe 4.12.1 violations on the gallery and three review screens, and zero known dependency vulnerabilities. These are historical checks, not a new accessibility scan or dependency audit for this upgrade. Dependencies did not change. Keyboard and narrow-layout regressions remained in the full browser suite.

## Portfolio redesign checks

- Matched the inspected portfolio tokens and fonts while using a neutral Automation demos identity. No RK logo or personal-name branding appears in the pages.
- Gallery examples, workflow headings, review panels, owner selector, invoice queue and quotation print were visually reviewed. Semantic success and warning colours remain distinct.
- The in-app browser displayed the redesigned purchase-order and receivables pages, with header navigation checked in a dedicated preview tab.
- Fonts are bundled locally, with their licences included. Demo interactions still make no external/API requests; portfolio/contact links navigate only when activated.
- Physical iPhone testing, a fresh axe scan and public portfolio integration remain unperformed.

## Exercised upgrade flows

- Quotation ownership survives reload. Approved quotations have a dated follow-up; advancing the sample clock exposes overdue work. Recording a reviewed follow-up creates a next decision date. Customer acceptance and decline both close follow-up. Reset restores the sample state.
- An unfamiliar customer PO code and a price mismatch independently block order creation. Customer confirmation maps the source code to the internal SKU. Corrected pricing or explicit sample manager approval resolves the remaining check.
- Downloading the approved sales-order CSV produces a real file containing the reviewed SKU, quantity, price, PO and sales-order references. Rechecking the same PO still prevents a duplicate, including after reload.
- Collections tasks expose the blocker, responsible person and next-action date. Document requests and disputes pause routine reminders while preserving the outstanding balance.
- Providing a sample invoice copy schedules a later check. Confirming the preset delivery evidence resolves the dispute and resumes follow-up without marking the invoice paid.
- A promise remains paused on its promised date and becomes eligible the following day. Advancing the demo clock to 1 October demonstrates a missed 30 September promise. Renewed promises pause follow-up again.
- A customer's payment claim remains unverified until explicit sample receipt confirmation. Paid invoices stay out of the reminder queue even when the sample date advances. Repeated payment confirmation cannot reduce the balance twice.
- Invoice activity, owner, dates and resolution survive selection changes and reload. Required new fields are checked with missing/undefined fixtures. Incompatible version 1 progress safely reseeds as version 2.

## Preserved regression coverage

Standard and ambiguous quotations; missing quantities; correct totals and print isolation; clean, mismatched and duplicate POs; clearing all sample invoices; reset; malformed or unavailable storage; isolated tabs; route navigation and reload; keyboard skip link; reduced motion; cancelling an animation by resetting; narrow layout; already-loaded quotation use without a network connection.

## Issues found and corrected

The full suite initially exposed intermittent WebKit route-loading timeouts: three failures in a parallel run and another failure after moving to one worker. Instrumentation showed that route assets arrived promptly while React.lazy/Suspense delayed the view. Route-level imports now use React Router's lazy route API, preserving code splitting and error boundaries. The complete 48-test suite then passed with the original two-worker settings and unchanged deadlines.

Screenshot review found that WebKit's native select appearance painted a light background behind the light owner text. Explicit select appearance, dark background and a visible CSS arrow correct the contrast. The updated WebKit screenshot was inspected after the two targeted tests passed.

Earlier fixes remain covered: read-only storage initialization preserves recovery notices across retried renders; print rules isolate the quotation and use a white page background; the clipped skip link stays hidden until keyboard focus.

## Build identity and reproduction

Final entry script: `assets/index-DLdCG1HY.js`.
Final stylesheet: `assets/index-BKgurnGZ.css`.

Run the commands in README.md. For production E2E verification, start `npm run preview -- --port 4173`, set `DEMO_BASE_URL=http://127.0.0.1:4173`, then run `npm run test:e2e`. The Playwright configuration runs desktop Chromium and WebKit with iPhone 13 settings. Regenerate previews with `node scripts/capture.mjs`.

After rebuilding while a preview tab is open, reload the document using a new build query parameter. Hash-only navigation can retain the previous entry bundle. No service worker is installed.

## Practical limits

- WebKit ran with an iPhone-sized viewport and touch settings on Windows. No physical iPhone or installed Safari PWA was tested.
- The site is a labelled simulation. Interpretation is predefined. No live extraction accuracy, external integration, message delivery, production financial outcome or measured time saving is claimed.
- The CSV is a generic sample handoff, not a validated Tally/SAP import format. No real banking or accounting connection is present.
- Printing was checked through browser print media and the print action; no physical printer was tested.
- No new automated accessibility scan was performed for this upgrade; visual and functional checks are not an accessibility certification.
- Initial loading and previously unopened routes need the server. Cold offline navigation and offline installation are outside this version.
- No public deployment or portfolio modification was made. The preview is local to this computer. The static ZIP is available for later hosting.
