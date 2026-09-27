# Automation demo integration

Approved by Rohan on 27 September 2026: publish the completed portfolio-matched demos in AI & Automations, push their source to this repository and deploy the existing Vercel portfolio. No RK branding inside demo pages. Phones (including Safari) and laptops are required.

## Implementation

- Keep the three client-only, fictional sample-data workflows as an independent React/Vite app in `demos/automation`. No database, credentials, external AI calls or messaging integration.
- Add three descriptive entry cards to the Work page and link the collection from the homepage's existing AI & Automations card. Preserve existing case studies.
- Build Astro first, then the locked demo app and copy its output to `dist/automation-demos`. Relative assets and hash routing support direct links and reloads.
- Each Vercel Git deployment builds from source. No checked-in generated bundles or new hosting project.

## Verification and release

Run Astro check, demo lint/unit tests and production build. Exercise portfolio-to-demo navigation and all demo scenarios in Chromium and phone WebKit against the integrated local build. Then push the reviewed branch, merge to master, verify Vercel READY for that commit and repeat browser checks on rohankatara.com. Confirm new asset hashes and no errors. A physical iPhone is not available; WebKit emulation is the Safari-engine coverage.

Rollback: revert the integration commit on master and let the existing Vercel Git integration rebuild. No schema or server-side data changes exist.

Demo source of truth after this release: `demos/automation` in this repository. The earlier standalone Codex working folder is an archive, not a second deployment source. Progress is tab-scoped sessionStorage, validated/versioned by the existing app; no service worker is installed. Static asset filenames are content-hashed.

Local verification: Astro check 66 files, zero errors/warnings/hints; demo lint clean; 54 unit tests pass; production build passes; 52 browser tests pass (26 Chromium, 26 phone WebKit, no retries), plus 8 existing category-navigation assertions. Initial sandbox runs encountered build-replacement 404s and WebKit cold-load delays; the final stable-build run outside the sandbox passed all 52. No physical iPhone test performed.
