# Contact and Selected Work update — 25 September 2026

## Requested tasks, in order

- [x] 1. Replace Rohan's contact email throughout the current and legacy site with rohankatara750@gmail.com, including links, copy actions and structured data.
- [ ] 2. Reuse the existing Enable animations control beneath the AI & Automations project list, visible only in reduced-motion mode.
- [ ] 3. Remove the decorative arrow above “Websites with personality” in the Work introduction.
- [ ] 4. Redesign the homepage Websites thumbnail as a layered composition of the actual ODD, Kindred and 404 websites.

## Implementation

Keep current-site contact details sourced from `social.email`. Update the static legacy export and give its changed JS bundle a new filename so existing caches fetch the corrected contact links. Preserve third-party license and demo placeholder addresses.

The Work page gets one prompt below all four AI project rows. Reuse existing preference persistence, error handling and reload behavior, including the current fragment. No new motion setting or forced animation is needed.

For the thumbnail, use real responsive project images in three small browser frames on the existing dark blue background, with ODD featured in front. This represents the collection better than the current single screenshot; it stays readable on phones and uses no new video or WebGL. Any hover movement is limited to full-motion devices. The card continues to link to `/work/#websites`.

## Verification and release

Scan shipped source/assets and built output for the old email. Check current-site email links, copy content, structured data, website enquiry subjects and legacy contact links. Exercise reduced-motion opt-in beneath AI projects on desktop and phone, confirm persistence after reload and navigation, and check that the prompt is hidden in full-motion mode. Check the arrow removal, image loading, thumbnail crop, target links and horizontal overflow at narrow phone, tablet and desktop sizes in Chrome and WebKit. Run Astro check and production build. Deploy through the existing GitHub/Vercel pipeline, verify fresh production assets and key flows, and sync the Desktop repository while preserving unrelated files.
