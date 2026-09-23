# Unified Work — approved structure, 23 September 2026

Rohan approved one dedicated `/work/` page with Websites first, AI & Automations below, a two-section switcher, and one compact Selected work section on the homepage. Prospects mainly visit on phones after cold outreach. Preserve the portfolio’s dark background, serif display type, blue accents, existing screenshots and recordings.

## Structure and scope

- One Work navigation item on desktop and mobile, linking to `/work/` and active throughout its case-study routes.
- Homepage: two visual category entries under Selected work. Remove the separate website teaser and full AI project list. Keep the rest of the homepage intact.
- Work: concise introduction, sticky native anchor links for Websites and AI & Automations, then the existing website showcases in ODD / Kindred / 404 order. Label only the website projects as awaiting launch; retain ODD’s upcoming WooCommerce context.
- AI & Automations: the existing four project rows and full case-study content. Static `/work/<slug>/` pages replace the old overlay mechanism so case studies have direct URLs and work without JavaScript. Include Back to Work, next case, and an email enquiry.
- Keep media dialogs and lazy, user-initiated recordings. Do not add autoplay or hide category content behind JavaScript tabs.
- Preserve `/websites/` links via a permanent production redirect, with an HTML fallback for local static preview. Preserve fragments. Redirect old homepage case hashes to the matching case routes, and old Work/category hashes to the unified page.
- Keep current project data as the source of truth. No database, auth, new dependency, new environmental variable, or schema change.

## Implementation phases

1. Record this approved design. Update routes, homepage summary, navigation, category styles and compatibility links. Add static case-study routes while reusing existing MDX and data.
2. Adapt the existing browser regression suite to the unified navigation and case pages. Run Astro check/build, Chrome and WebKit phone/tablet/desktop flows; visually inspect mobile and desktop. Commit a runnable version.
3. Publish through the repository’s Vercel integration. Verify the new production bundle and complete the critical navigation/media flow. Record release and rollback details.

## Files and verification

Main files: `src/pages/index.astro`, `src/pages/work.astro`, `src/pages/work/[slug].astro`, `src/pages/websites.astro`, `src/components/sections/SelectedWork.astro`, `src/components/chrome/Nav.astro`, `src/components/work/ProjectRow.astro`, `src/components/work/WebsiteShowcase.astro`, `src/layouts/BaseLayout.astro`, `src/styles/websites.css`, `vercel.json`, `public/sitemap.xml`, and the existing browser verification script.

Verify home → Work → each category; website order, launch labels, WooCommerce wording, screenshots, video playback and focus return, live-preview and email destinations; all four case studies, back/next/reload/browser history; old URLs; no horizontal overflow at 360/390/768/1440px; keyboard, reduced motion and no-JavaScript access. Confirm canonical URLs, sitemap and production asset hashes.

Known existing limitation: the installed automated WebKit build emits a Temporal.Duration error from native video controls even on a bare video page. Continue reporting this separately; do not suppress errors or replace native controls to hide it. Physical iPhone verification is unavailable.

Rollback: restore the current production deployment from commit `481431661af031fae97dfcd061efa63134a032f1`. No data migration is involved.
