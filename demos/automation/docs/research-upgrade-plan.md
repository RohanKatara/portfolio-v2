# Research-led workflow upgrade

26 September 2026. Authorized by Rohan's request to add the essential features identified in the research. This extends the approved preset simulation and the proposed demo directions in the research brief; devices, zero API spending and fictional data are already confirmed.

## Design and scope

Keep three independent, individually linkable workflows. Extend the existing interactions rather than adding unrelated invoice-processing, logistics or factory modules. The chosen approach is interactive action tracking inside each workflow. Alternatives considered: explanation-only cards would not demonstrate completed work; a new cross-module CRM would exceed the three-demo scope.

- Quotations: expose capture/assignment, a selectable sample salesperson, missing-detail responsibility and the next due action. After approval, simulate an overdue follow-up, record that it was reviewed, and record customer acceptance or decline. Closed opportunities stop follow-up. Preserve source, clarification, pricing and printing.
- Customer POs: add an unfamiliar customer code alongside a price mismatch. Show customer wording separately from the internal catalogue. Require an explicit preset customer confirmation before mapping. Show passed/blocked checks and the assigned order desk. Preserve duplicate protection and export an approved sample draft as CSV, clearly not an ERP import integration.
- Receivables: a prioritized next-action queue exposes blocker, owner and due date. Document requests pause routine reminders until a sample document-provided action. Disputes require a sample delivery check before resuming follow-up. Payment claims remain unverified until explicit receipt confirmation. An explicit sample-date advance demonstrates a missed promise returning to the queue. Keep outstanding balances separate from administrative resolution.
- Each flow gets a concise explanation of the manual work addressed. No invented savings, sales uplift, performance or accuracy claims.

## Model and implementation

Quote state adds owner, fixed scenario clock, follow-up progress and customer outcome. Order state adds a confirmed item mapping; export derives from approved order lines. Invoice state adds owner, next-action date, last reply, resolution and bounded activity; receivables state adds a fixed scenario clock. Derived task views avoid duplicate counters. Version 2 stored-state validation resets incompatible fixtures and rejects absent fields. Date parsing and comparisons stay in the shared date helper.

Touch catalogue, rules, storage, dates, workflow screens, gallery copy, documents, styles, unit tests and browser tests. Add focused presentation components for action context and quotation follow-up, plus CSV generation. No dependency changes, backend, real messages, arbitrary uploads or AI calls.

## Build and verification

1. Save this plan and requirement/memory update; commit planning baseline.
2. Implement state transitions, guards, source/export consistency and corresponding UI in one runnable feature phase.
3. Run meaningful logic tests (date boundaries, missing fields, impossible transitions, closed/paid records, duplicate checks, CSV values), lint, typecheck and build.
4. Exercise every original and added scenario in desktop Chromium and iPhone-sized WebKit against the production build. Cover reload, reset, navigation, late promises, resolved blockers, quote outcomes and download content. Check zero external requests, narrow layout, print isolation, keyboard and accessibility. Visually inspect key screens. Physical iPhone testing remains unperformed.
5. Commit the verified implementation; update verification, pitch guide and delivery archives; open the new local preview with a cache-busting build identity.

## Risks and decisions

Old tab progress will reset intentionally on schema upgrade. Advancing time is an explicit sample control, not actual scheduling. CSV is a generic handoff artifact, not a promise of native Tally/SAP compatibility. Administrative resolution does not mark an invoice paid. Quote acceptance is a demo sales outcome and does not create an order in another module. The previously checked writing-plans skill is absent; this project plan supplies the implementation details.

Verification exposed intermittent WebKit loading delays with render-time React.lazy/Suspense, even after the route assets had loaded and with a single worker. Move the existing lazy imports to React Router's lazy route API, preserving code splitting and per-route errors. This targeted loading fix adds AppRouter.tsx and Layout.tsx to the touched files. Browser reload/navigation tests are the regression checks; keep their deadlines unchanged.
