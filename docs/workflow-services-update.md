# Explicit workflow services — 25 September 2026

The user requested three main offers: website development, AI workflow creation and workflow optimisation, with a clear explanation that improving a process does not require AI. Maintenance remains supporting information.

## Changes

- Reuse the existing service-card design, with three equal columns on desktop and stacked cards through 900px. Derive the card count from the service data.
- Explain each service in buyer terms: enquiries/bookings/sales, connecting tools and repetitive tasks, or removing bottlenecks in an existing process.
- Preserve website and AI starting prices. Workflow optimisation is quoted after reviewing the process; no new fixed price is invented.
- Move optional maintenance and its existing starting price below the cards.
- Align the hero paragraph, service summary and service-anchor button with the three offers. Existing project/case-study content stays relevant as proof of past work.

## Verification

Run Astro check and production build. In the running site, inspect desktop and phone layouts, the three titles/order and numbering, the optional-AI wording, supporting maintenance placement and preserved prices. Exercise hero-to-services navigation, check the contact link targets the current email, and verify readable content in reduced-motion/no-JavaScript modes. Verify the deployed HTML and repeat the key flow in production. Sync the Desktop source without altering its unrelated untracked thumbnail.

Local verification passed: Astro check61files with zero diagnostics, production build8pages, desktop three-column and390px stacked layouts, service titles/order/03 numbering, maintenance outside the cards, current contact link, and hero-to-services navigation. No browser console errors or horizontal overflow. Existing WebKit phone no-JavaScript/reduced-motion scenario passed10checks. Physical iPhone hardware was not available. No new dependencies or tests were introduced for this copy/layout change.
