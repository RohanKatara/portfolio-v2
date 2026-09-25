# Contact and Selected Work update — 25 September 2026

## Requested tasks, in order

- [x] 1. Replace Rohan's contact email throughout the current and legacy site with rohankatara750@gmail.com, including links, copy actions and structured data.
- [x] 2. Reuse the existing Enable animations control beneath the AI & Automations project list, visible only in reduced-motion mode.
- [x] 3. Remove the decorative arrow above “Websites with personality” in the Work introduction.
- [x] 4. Redesign the homepage Websites thumbnail as a layered composition of the actual ODD, Kindred and 404 websites.

## Implementation

Keep current-site contact details sourced from `social.email`. Update the static legacy export and give its changed JS bundle a new filename so existing caches fetch the corrected contact links. Preserve third-party license and demo placeholder addresses.

The Work page gets one prompt below all four AI project rows. Reuse existing preference persistence, error handling and reload behavior, including the current fragment. No new motion setting or forced animation is needed.

For the thumbnail, use real responsive project images in three small browser frames on the existing dark blue background, with ODD featured in front. This represents the collection better than the current single screenshot; it stays readable on phones and uses no new video or WebGL. Any hover movement is limited to full-motion devices. The card continues to link to `/work/#websites`.

## Verification and release

Scan shipped source/assets and built output for the old email. Check current-site email links, copy content, structured data, website enquiry subjects and legacy contact links. Exercise reduced-motion opt-in beneath AI projects on desktop and phone, confirm persistence after reload and navigation, and check that the prompt is hidden in full-motion mode. Check the arrow removal, image loading, thumbnail crop, target links and horizontal overflow at narrow phone, tablet and desktop sizes in Chrome and WebKit. Run Astro check and production build. Deploy through the existing GitHub/Vercel pipeline, verify fresh production assets and key flows, and sync the Desktop repository while preserving unrelated files.

## Verification results

Astro check: 61 files, zero diagnostics. Production build: eight pages. No old contact email remains in `src`, `public` or `dist`. The regenerated legacy JS asset is `index-cecc0dbe6616.js`; the legacy HTML references its new filename.

Chrome and WebKit each passed the Work opt-in flow on desktop (20 checks) and phone (17 checks), including preference persistence, full/reduced switching, fragment preservation and desktop animated project previews. Contact/selection checks passed 27 checks in each engine: homepage and Work email links, server-rendered case-study contact details, legacy contact action, removed arrow, all three thumbnail images and category navigation. Thumbnail widths checked: 360, 390, 768 and 1440px; no horizontal overflow. Visual review included desktop and phone thumbnail compositions and the phone opt-in placement. Physical iPhone hardware was not available.

Test setup notes: local Astro preview lacks Vercel's existing `/models/` and `/draco/` rewrites; the local-only legacy test forwards those requests to the real `/legacy/` files. An early broader WebKit run encountered its known native video-control `Temporal.Duration` error in an untouched case study. The focused email test now checks those pages' actual server-rendered HTML without driving unrelated native video controls; it retains full browser checks for the changed homepage, Work page and legacy contact action. Production checks do not intercept asset requests.
