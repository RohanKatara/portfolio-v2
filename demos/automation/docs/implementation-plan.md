# Interactive automation demos — build plan

Date: 26 September 2026
Status: Approved by Rohan on 26 September 2026. Implemented and verified locally; see verification.md. Supersedes the live-AI proposal.

## Goal and confirmed requirements

Create three portfolio-ready interactive demos for Rohan to pitch automation services to Indian manufacturers, industrial suppliers, distributors, and service businesses. Use preset fictional inputs and predefined interpretation results, with working browser-side calculations, review steps, and state changes. No model calls, API credits, API keys, or visitor-submitted data.

Confirmed: support phones and laptops, including iPhone Safari; demonstrate enquiry-to-quotation, purchase-order processing, and receivables follow-up. Rohan has selected predefined sample data instead of live AI processing.

## Recommended approach and alternatives

1. **Interactive scenario demos — recommended.** Visitors choose a preset scenario, run it, review the result, resolve an exception, and approve an outcome. Calculations and business rules execute in the browser; language extraction/classification is predefined.
2. **Automatic animation.** Useful for a homepage teaser but gives prospects little opportunity to inspect results or understand exceptions.
3. **Recorded video.** Easy to share, but cannot respond to a prospect's clicks or show alternative scenarios.

Build option 1. A video can later be recorded from the working demos without a separate implementation.

## Experience and presentation

- One standalone gallery and three individually linkable demo pages; link from the portfolio later.
- Fictional supplier: Pragati Industrial Supplies. All company and customer details are sample data.
- Clear label: "Interactive simulation · Sample data · No live AI".
- Each page presents a concrete business problem, original sample input, workflow stages, review actions, and a resulting document or updated record.
- Short visual transitions illustrate processing; provide a skip action and respect reduced-motion settings. Displayed processing time is not an AI performance benchmark.
- A primary guided path takes roughly one minute to demonstrate, with optional exception scenarios.
- Controls: choose a sample, run demo, resolve/review, approve, restart.
- Graphite interface, warm amber accent, legible document previews, large touch targets, and concise business language.
- Messages show "Preview"; orders and payments are changes to sample records. Never claim an email, WhatsApp message, ERP entry, or actual payment was completed.
- No invented customer testimonials, measured savings, or production accuracy claims.
- No new brand, domain purchase, contact form, CRM, or portfolio-repository edits are required for this version.

## Demo 1 — Enquiry to quotation

### Main scenario

A fictional customer requests quantities of two standard industrial products. Show the source enquiry, then reveal predefined product/quantity requirements. Match the sample catalogue, derive prices and totals, allow review, and approve a quotation. Show a printable quote and a follow-up preview.

### Exception scenarios

- Ambiguous specification: two plausible catalogue items; require the visitor to select the demonstrated clarification before approval.
- Missing quantity: offer preset customer responses; the selected quantity changes the quote total.

### Rules

- Catalogue prices, configured sample tax rates, and calculations are authoritative; no language model or artificial confidence score.
- Store money as integer paise and calculate totals through one shared helper.
- Block approval while required details remain unresolved.
- Quote approval creates a sample activity record and enables the follow-up preview.

## Demo 2 — Purchase order to sales-order draft

### Main scenario

Show a preset purchase-order document with customer item descriptions, quantities, and prices. Reveal predefined extracted fields, map them to the catalogue, validate, and approve a sales-order draft.

### Exception scenarios

- Price mismatch: highlight the source price and agreed catalogue price; offer explicit preset resolution choices and show the effect.
- Duplicate PO: identify an existing customer/PO reference and show the existing order. Block a second order.

### Rules

- No file upload or arbitrary document extraction in this version.
- All preset document views and interpreted fields derive from the same scenario facts.
- Repeated clicks and repeated runs cannot create duplicate orders.
- Approval remains blocked until the scenario's required exceptions are resolved.

## Demo 3 — Receivables follow-up

### Main scenario

Start with a small invoice list and an explicit fixed demo date. Select an overdue invoice, preview a fact-based reminder, choose a preset customer reply, review its predefined interpretation, and apply the suggested action.

### Scenarios and outcomes

- Promise to pay: save the demonstrated promise date and show the next follow-up.
- Quantity dispute: flag the invoice for review and pause routine reminders.
- Document request: prepare an invoice-copy response preview.
- Payment confirmed: a separate explicit confirmation changes the sample invoice to paid and removes it from reminder eligibility.

### Rules

- "I paid" alone does not confirm receipt of funds.
- Outstanding totals derive from invoice balances rather than separately maintained counters.
- Show the paid/empty state when there are no invoices eligible for reminders.
- Preset dates and a visible demo date keep the sales story consistent over time.

## Users, devices, storage, and connectivity

- Public visitors and Rohan; no account creation or backend.
- State is isolated per browser tab using versioned session storage. Reload retains that tab's demo progress; reset removes it and reseeds the current scenario.
- No cross-device sync, analytics, visitor details, or sensitive records.
- There is no irreplaceable user data. Reset restores every sample; quotation output can be printed using the browser.
- Cache invalidation: change the demo schema version when sample/state formats change; reject incompatible stored data and reseed. Validate missing/undefined fields before using restored state. Storage failure falls back to memory with an explanatory notice.
- Bundle assets locally. After the site has loaded, scenario interaction requires no network calls. Initial loading needs access to the hosted site or a running local server.
- No offline-install/PWA guarantee in v1 and no service worker cache.

## Data model

- Product: ID, SKU, description, aliases, unit, price in paise, configured sample tax rate.
- Customer: ID and fictional display details.
- Scenario: workflow type, source facts, predefined interpretation, required review choices, initial state.
- Quote: approved product/quantity choices, derived totals, approval state.
- Purchase order: customer ID, PO reference, source line items, exceptions.
- Sales-order draft: unique customer/PO key, approved line items, state.
- Invoice: reference, customer, issue/due dates, amount, confirmed paid amount, promise/dispute state.
- Activity: record ID, action, sequence/timestamp, and preview/sample-change label.

The demos share catalogue and customer fixtures. No cross-module dashboard or automatic chain from quotations to invoices is included.

## Technical approach and files

Use React, Vite, TypeScript, React Router, and CSS. No server, database, AI SDK, paid API, or n8n runtime. Installed Node 24.18.0 is compatible with Vite's documented Node requirements; pin selected package versions at implementation.

Proposed project location: outputs/workflow-demo/ within this workspace, so the source and final build are deliverables.

- src/app: router, layout, route error boundaries.
- src/pages: gallery, quotations, purchase orders, receivables.
- src/components: stepper, source-document preview, status badges, review controls, activity trail.
- src/data: products, customers, scenario definitions, seed invoices.
- src/features: workflow reducers, transition guards, and business rules.
- src/lib: dates, money, validation, session storage.
- src/styles: responsive theme and print styles.
- tests: logic tests and Playwright browser flows.
- README.md, docs/requirements.md, docs/implementation-plan.md, docs/memory.md.

Use one tested date helper, with date-fns parseISO for date strings. Keep heavy demo pages lazy-loaded and lists bounded to the small fixture set. Avoid unnecessary dependencies.

## Build phases

1. Scaffold the app, theme, navigation, sample data, storage, and error boundaries.
2. Implement and verify quotation scenarios.
3. Implement and verify purchase-order scenarios.
4. Implement and verify receivables scenarios.
5. Polish presentation, print view, accessibility, mobile layout, and full browser verification.

Each phase ends in a runnable state and a commit. Secrets and generated artifacts are excluded appropriately before the first commit. Source contains no secret-dependent features.

## End-to-end acceptance checks

- Every preset happy path and exception reaches the intended result through real browser interaction.
- Unresolved quote details and PO exceptions prevent approval.
- Totals are correct, and repeat actions never create duplicate records.
- Disputed and paid invoices leave the routine reminder queue correctly.
- Reset, scenario switching, navigation, and reload behave consistently.
- Unit tests cover calculations, state guards, duplicate detection, date handling, and missing/undefined stored fields.
- Lint, typecheck, and production build pass.
- Test desktop Chromium and mobile-size WebKit, including narrow layout and touch-sized controls. Report clearly that WebKit emulation is not a physical-iPhone test.
- Verify keyboard operation, reduced-motion behaviour, print view, and readable error/empty states.
- Inspect browser requests: demo runs make zero external API calls.
- Verify disclosure is visible on every demo page.

## Limits and release

This version demonstrates an automation's intended experience; it does not prove live extraction quality, integration reliability, or ROI. A future real implementation can replace predefined interpretation behind the workflow interface.

No deadline was supplied; target a polished sales prototype. Build and verify locally first, producing static deployment files. Hosting selection and a public URL can be decided after review; there is no API usage cost in this design.

## Approval

Rohan approved this plan on 26 September 2026. Implementation uses the proposed defaults above. Public deployment remains a later step.
