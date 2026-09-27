# Portfolio-matched workflow demos

Status: approved by Rohan, with the explicit correction that the demo pages must not contain RK branding. Use a neutral Automation demos identity; no RK mark or personal-name branding. All remaining scope is approved.

## Goal and reference

Restyle the existing three working sample-data demos to belong to Rohan Katara's portfolio. The references are https://rohankatara.com/work/ and the local source at `C:/Users/rohan/OneDrive/Desktop/3d portfolio website/portfolio-v2`. The live Work page and local typography, tokens, navigation and AI & Automations section were inspected. Both phones (including Safari) and laptops remain in scope.

This phase redesigns the standalone demo gallery and three workflow pages. Integrating and publishing them in the portfolio's AI & Automations section is the next phase, following review of the working redesign.

## Approaches considered

1. Approved: portfolio-matched demo pages. Use a neutral Automation demos identity, exact portfolio typefaces and colour tokens, editorial introductions and compact functional workspaces. Each demo remains directly linkable and is ready for a later portfolio entry.
2. Minimal reskin. Swap fonts and colours but retain the existing Workflow Studio identity and composition. Faster, but leaves a visibly separate product identity.
3. Embedded demos inside portfolio project cards. Tight visual continuity, but nested scrolling and limited phone space make document review awkward. This also combines redesign and integration prematurely.

## Proposed visual design

- Identity: neutral Automation demos label with no RK mark or personal-name branding. A clear Back to AI & Automations link points to the existing portfolio section. A separate demo switcher makes all three examples accessible.
- Palette: reuse the portfolio's dark navy background/surfaces, cool off-white text, blue accent, fine borders and subtle paper texture. Use clear semantic colours for blocked, approved and overdue states rather than relying on blue for every status.
- Typography: Instrument Serif for page headings with restrained italic blue emphasis; Inter for explanations and controls; Fira Code for small labels; Space Grotesk for amounts and metrics. Keep dense document and table content in legible sans-serif type. Bundle assets locally with their applicable licences.
- Gallery: a short editorial introduction and three numbered workflow entries with an actual example preview, business purpose and Try demo action. Keep the simulation disclosure visible.
- Workflow pages: compact introduction, scenario chooser, progress, source document and review/output workspace, responsible person and next action, and activity trail. Desktop uses two columns where useful. Phones stack in reading order with readable tables and touch targets.
- Commercial context: a restrained footer action links to the existing portfolio contact path for discussing a similar workflow. No enquiry is automatically submitted or sent.
- Motion: subtle control transitions and existing processing progress. Respect reduced motion; never hide essential content while waiting for animation. Keep document printing focused on the quotation.

## Behaviour and data

Preserve all existing sample scenarios, calculations, clarification gates, price approval, duplicate detection, CSV download, quote follow-up/decisions, collection blockers, dated actions, payment confirmation, activity, reset and per-tab persistence. No entity/schema changes, backend, API credits, uploads or real messaging. No claimed client results or fabricated ROI.

## Implementation outline

1. Record the approved direction. Bundle portfolio fonts and texture with their licences; create shared theme tokens. No portfolio brand assets.
2. Update `src/app/Layout.tsx`, `src/pages/Home.tsx`, shared workflow presentation components and `src/styles.css`. Adjust only markup needed for the portfolio hierarchy in Quotes, Orders and Receivables. Update document metadata and favicon.
3. Keep domain rules and storage stable. Update browser selectors only when accessible labels intentionally change, retaining behaviour assertions. Add navigation coverage for Back to portfolio and the demo switcher.
4. Verify the production build, refresh screenshots and pitch material, and create a committed source/static archive. Present the redesigned local demos for review before portfolio integration.

## Verification

- Typecheck, lint, 54 existing logic tests and the full Chromium/WebKit workflow suite, with any necessary new navigation checks.
- Exercise gallery to every workflow, switching between workflows, each scenario and exception, approval, CSV download, print, invoice blockers, reset and reload.
- Visually inspect desktop and 390px/360px phone views; check overflow, text contrast, touch targets, keyboard focus, reduced motion and initial loading/error states.
- Verify the actual in-app side-panel preview, including both previously reported blank pages. Confirm the preview server remains reachable before handing over.
- No physical iPhone claim. No public deployment in this phase.

## Scope and risks

No unrelated portfolio refactor, changes to existing portfolio work entries, new product features, authentication or framework migration. The portfolio is Astro/React 18 and the demo is Vite/React 19; retain their separate builds now rather than combining runtimes during a visual redesign. The later integration can link to the static demos without loading both React versions into one page.

Readable functional screens take precedence over copying large marketing-page whitespace. Preserve print styles, explicit Safari select styling, route errors and versioned sample state. Reuse observed source values instead of approximating the palette. The existing untracked portfolio `public/thumbnail.png` is outside this work.

Self-review: scope, behaviour, files, risks and acceptance checks are explicit; no undecided data or infrastructure changes are required. The user approved this direction excluding RK branding. The writing-plans skill remains unavailable; this approved document supplies the build plan.
