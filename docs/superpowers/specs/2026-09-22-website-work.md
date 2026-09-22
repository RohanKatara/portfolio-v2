# Website proof of work: design and implementation proposal

22 September 2026. Status: implementation prepared from confirmed requirements and supplied media; final visual review and production publication pending.

## Goal and confirmed requirements

Add a polished, responsive website showcase to rohankatara.com that helps prospects from cold outreach judge Rohan’s website work and enquire about a similar project. Phone is the primary viewing device; desktop must retain the portfolio’s editorial presence.

The page will present these projects in this exact order:

1. **ODD Care Co.** — ecommerce skincare — https://odd-care-co.vercel.app
2. **Kindred Coffee** — café and hospitality — https://kindred-coffee.vercel.app
3. **404 Energy** — beverage brand — https://404-energy-drink.vercel.app

Rohan confirmed that all three are client projects awaiting launch and that he handled everything himself. Credit can say “Design and development by Rohan Katara.” Show the projects as previews and describe the work delivered without claiming post-launch business results.

A homepage website showcase and a “Website work” navigation link will make the new page discoverable. Project enquiry actions use the existing public email, rohankatara3@gmail.com. User-supplied screenshots and screen recordings are expected; media selection and crops will follow inspection of those files.

## Recommended direction: editorial project showcase

Create `/websites/` as a curated, vertical page using the portfolio’s near-black background, Instrument Serif display type, Inter body type, mono labels, fine rules, and blue accent. Each client’s visual identity appears in its media, while the surrounding page remains recognisably Rohan’s portfolio.

Use an oversized but compact opening headline, such as **“A closer look at the work.”**, with a brief introduction and a three-project index. The first project’s media should begin within or close to the first phone screen. Avoid a full-screen introductory scene that delays the work.

Give each project its own substantial section:

- An index, category, project name, and “Client project · Awaiting launch” status.
- One prominent screenshot or recording poster showing the actual site.
- A concise description of its purpose and the work Rohan delivered.
- Two or three supporting screenshots where they add distinct information, including mobile presentation when suitable media exists.
- An optional recording with visible play controls and an accessible fallback.
- “View website preview” and “Discuss a similar website” actions. Email subjects identify the project and remain editable in the visitor’s mail application.

On desktop, use large media and an asymmetric text/media composition with restrained reveal effects. On mobile, stack content in a clear reading order, retain immediately visible project media, and use comfortable touch targets. Motion enhances the presentation; content remains readable when motion is reduced or JavaScript fails. No hover-only project information.

Use a shared project index for quick jumps without forcing users through every section. Finish with a short invitation to discuss their own website.

The homepage receives a compact three-project preview immediately after the hero, linking into the corresponding sections of `/websites/`. Existing homepage content follows. Shared navigation becomes route-aware; its mobile presentation must accommodate the new link without squeezing five labels into a narrow row.

## Alternatives considered

**Cinematic full-screen sequence:** stronger theatrical transitions, but more scrolling and interaction overhead for phone visitors comparing work. Not recommended for this acquisition path.

**Compact uniform grid:** efficient to scan and easy to extend, but gives three visually distinct projects less space to demonstrate their character. Suitable for the homepage teaser, rather than the main showcase.

## Content and media rules

The demos were visually inspected. ODD offers a monochrome product presentation; Kindred uses warm photography and large editorial type; 404 uses animated product imagery and pixel typography. The showcase can describe these observed features. It must not imply that demo checkout, forms, store links, or business outcomes were verified as production-ready.

ODD explicitly identifies its current deployment as a static portfolio snapshot with checkout disabled. Link wording should remain “preview,” not a promise of working purchase functionality. No changes to the three external demo projects are in scope.

Optimise screenshots into responsive image sizes, preserve their intrinsic dimensions, and use lazy loading below the first visible media. Use the supplied recordings selectively, with posters, controls, inline playback, and no initial download of all three videos. Do not embed the live websites in iframes. Screenshots remain useful even if an external preview is unavailable.

Assets needed for the final media pass: any preferred desktop/mobile screenshots and recordings for each project. Rohan may provide only what is already available; additional screenshots can be captured from the public demos where necessary.

## Technical approach and data model

Use the existing Astro application and installed versions. No database, authentication, CMS, or new app framework is needed.

Keep one ordered `websites` data array containing: slug, name, category, status, role, live URL, short description, highlights, cover image with alt text and dimensions, gallery images, optional video/poster, and enquiry subject. Render both the homepage teaser and dedicated page from that source of truth.

Proposed files:

- `src/pages/websites.astro`: new route and page composition.
- `src/data/websites.ts`: ordered content and media references.
- `src/components/work/WebsiteShowcase.astro`: reusable project section.
- `src/components/sections/WebsiteWork.astro`: homepage teaser.
- `src/assets/websites/`: screenshots and video posters.
- `public/website-work/`: selected recordings.
- `src/layouts/BaseLayout.astro`: per-page canonical/share metadata and homepage-only overlay behaviour.
- `src/components/chrome/Nav.astro`: new link, correct home anchors from another page, and responsive navigation.
- `src/pages/index.astro`: teaser placement and any required small animation integration.
- `public/sitemap.xml`: homepage and new route.
- Focused verification script and compatible Astro static-check setup where needed.

The existing homepage overlay guard/controller must be scoped to pages that actually contain those overlays. Otherwise a case-study hash on the new route can hide the page. Keep Person identity metadata anchored to the homepage while giving the new page its own canonical URL and description. The new route must not depend on the homepage animation boot to display its content.

Use a separate working checkout/branch for implementation, preserving the original repo’s existing untracked `public/thumbnail.png`. Keep the existing framework major versions. Current runtime is Node 24.18.0 and npm 11.16.0.

## Build phases

1. **Foundation and content:** route, data source, route-aware layout/navigation, real project information and essential links. End with a runnable state.
2. **Visual and media pass:** approved assets, project layouts, responsive homepage teaser, optional video, restrained motion, enquiry actions. End with a runnable state.
3. **Verification and review:** static/build checks, browser flows, accessibility, media behaviour, homepage regressions, and a reviewable preview. Commit coherent working changes.

Publishing to the live portfolio is a separate final action after the preview and checks are ready. Do not push the production branch incidentally: the existing repository auto-deploys from master.

## Verification and acceptance criteria

- Build succeeds; use appropriate TypeScript/Astro checks. The current repo has no lint/check script, and TypeScript alone does not validate Astro templates, so record and close that gap for changed files.
- Test at narrow phone, typical phone, tablet and desktop widths. No horizontal overflow, cropped controls, illegible media or hidden content under navigation.
- Exercise homepage → website showcase → each project anchor → each exact external preview URL, and website page → email action/home sections. Verify email destinations and subjects without sending unsolicited mail.
- Test direct URL loading, reload, browser back/forward, active navigation and keyboard operation. Check that `/websites/#mocktalk` remains visible and usable.
- Verify media dimensions, image alternatives, recording controls, reduced-motion behaviour and useful HTML with JavaScript disabled. No video should be required to understand a project.
- Verify unique page title, canonical, description and share metadata, plus the project order and honest launch status.
- Recheck the existing homepage’s hero, navigation and AI case open/close behaviour after shared layout changes.
- Exercise the main phone journey in Safari/WebKit or on an actual iPhone before calling the release verified for that device class. Clearly report any unavailable device coverage.
- After an authorised production deploy, confirm the new build is served and repeat the critical route/navigation/media checks.

## Scope boundaries

This work covers the new page, its homepage/navigation entry points, supplied media and the shared-layout changes necessary to support it correctly. Repricing services, rewriting the entire homepage, modifying external demo sites, adding a contact backend, and introducing unrelated AI features are outside this change.

## Review status

The user supplied the ODD screenshots and both recordings after the design proposal. The implementation follows the editorial direction, confirmed project order, launch status, ownership and email action. Review the working preview before publishing to the production branch. Media choices and upkeep are recorded in docs/website-work-media.md.

