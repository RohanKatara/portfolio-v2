# Automation demos
Three interactive, static sales demos: enquiry to quotation, purchase-order processing, and receivables follow-up.

## Run locally
Requires Node 24 (tested with 24.18.0) and npm.
1. Open a terminal in this project folder.
2. Run `npm ci` on a fresh checkout.
3. Run `npm run dev`.
4. Open the printed local URL.

For the production version: `npm run build`, then `npm run preview -- --port 4173`.

## Demo links
- Gallery: `/#/`
- Quotations: `/#/quotes`
- Purchase orders: `/#/orders`
- Receivables: `/#/receivables`

Each page is clearly labelled as an interactive simulation. Interpretations are predefined; money calculations, approvals, duplicates, and invoice states are real client-side logic. Fonts are bundled. No API keys, model calls, external messaging, uploads, analytics, database, or backend.

Progress is stored per tab using sessionStorage. Each demo has a reset button. Corrupt/incompatible state is reseeded; unavailable storage falls back to memory.

## Portfolio-matched interface
The interface uses the portfolio's dark navy/blue palette, Instrument Serif headings, Inter body text, Fira Code labels and Space Grotesk amounts. The demo identity stays neutral: no RK mark or personal-name branding. Local font assets include licences in `public/licenses/`. Back and enquiry links lead to the existing portfolio; these demos are linked from the portfolio AI & Automations section.

## Presenting the demos
Use the scenarios in `docs/pitch-guide.md`. Begin with the straightforward flow, then show one exception. The sample clock begins on 26 September 2026; explicit controls advance quotation follow-up to 29 September and collections to 1 October. Reset restores the starting date. All records are fictional; the displayed GST rate is a sample configuration, not tax advice.

Research-led additions include assigned quotation follow-up and customer decisions, unfamiliar customer item mapping with price review, a generic sales-order CSV download, and a collections action queue with document/dispute resolution and missed-promise follow-up. Balances change only when a sample receipt is explicitly confirmed. CSV output is a review artifact, not a ready-made Tally or SAP connector.

## Static hosting and portfolio integration
The complete deployable site is the contents of `dist/`, created by `npm run build`. Serve it over HTTP(S); opening index.html with a file URL is not supported. Relative assets and hash routes allow hosting under a portfolio subdirectory without server rewrites. Link each workflow from your portfolio using the URLs above.

The portfolio build publishes this app at `/automation-demos/`. Run the root build to regenerate it; edit this source folder for future changes. Hosting and domain costs, if any, are separate from this app. There is zero AI API usage in the demo.

## Checks
- `npm run test`: business rules, money, dates, stored-state validation.
- `npm run typecheck`, `npm run lint`, `npm run build`.
- `npx playwright install chromium webkit` installs test browsers.
- Start the local server, then `npm run test:e2e`.
- Set `DEMO_BASE_URL` to check another served build; default is http://127.0.0.1:5173.
- `node scripts/capture.mjs` captures shareable screenshots into the adjacent previews folder (default target http://127.0.0.1:4173).

Chromium and iPhone-sized WebKit were used for browser verification. This is not a claim of testing on a physical iPhone. See `docs/verification.md` for the final results.

## Customisation
Scenario facts and catalogue: `src/data/catalogue.ts`.
Invoice fixtures and rules: `src/features/rules.ts`.
Brand and page content: `src/app/Layout.tsx` and `src/pages/`.
Visual style and responsive behaviour: `src/styles.css`.
String-to-date parsing: `src/lib/dates.ts`.
All monetary amounts are integer paise.

To add real AI later, replace the preset interpretation step through a separate provider integration. Preserve explicit checks and human approval. This version does not establish production extraction accuracy, integration reliability, or measured savings.
