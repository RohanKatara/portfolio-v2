# Website showcase media

Prepared 22 September 2026 for `/websites/` and its homepage preview. Rohan confirmed that these are client projects awaiting launch and that he handled their design and development. The media demonstrates appearance and interaction; it does not establish sales results or working production checkout.

ODD is planned to launch on WooCommerce, as subsequently confirmed by Rohan. Its current Vercel deployment remains a static preview; the portfolio copy must distinguish the upcoming store from completed commerce integration.

## Sources and selection

| Project | Selected material | Published image dimensions |
| --- | --- | --- |
| ODD Care Co. | Supplied `odd_homepage_ss.png`, Dawn Shield from `odd_sunscreen_preview.png`, Deep Dusk from `odd_product_ss.png` | Homepage 1906 × 866; Dawn Shield 1897 × 762; Deep Dusk 1897 × 787 |
| Kindred Coffee | Browser captures of the public preview: homepage, coffee collection, and phone layout | Desktop captures 1265 × 712; phone capture 375 × 811 |
| 404 Energy | Frames from supplied `404 site preview.mp4`: hero at 5.0 seconds and Mixed Berries at 8.0 seconds | Both 1280 × 632 after removing the development badge from the left edge |

`odd_product_preview.png` was excluded because the blue Clear First page visibly contains a product-render placeholder. `odd_footer_ss.png` was omitted because it added little distinct evidence beyond the selected views. Neither omission implies a claim about the final client website.

The supplied recordings remain unchanged. Published copies are:

| File | Treatment | Output |
| --- | --- | --- |
| `odd-walkthrough.mp4` | From `odd_animation_preview.mp4`; preserve the existing H264 video stream, remove its silent audio, enable faststart | 5.50 seconds; 1898 × 730; 954,114 bytes |
| `energy-walkthrough.mp4` | From `404 site preview.mp4`; retain 4.8–52.9 seconds, crop 80 pixels from the left to remove the development badge, resize and encode H264 | 48.10 seconds; 1280 × 632; 4,736,113 bytes |

Both recordings use yuv420p, contain no audio, and have their MP4 metadata before the video payload for progressive playback. Their full video streams were decoded successfully during preparation. The larger ODD dimensions were deliberately preserved because its compatible source was already under 1 MB after removing silent audio.

## Files and loading

- Publish assets in `public/website-work/`. `src/data/website-media.json` records each image's URL, responsive candidates, and intrinsic dimensions.
- Desktop images have a 640-pixel variant and a 1280-pixel variant where the source supports it, plus the source-width variant when larger. Do not upscale a smaller source. The phone image stays at 375 pixels wide.
- The current directory contains 20 WebP files and one 1200 × 630 JPEG share image, totalling 795,760 bytes. This includes the two Energy frame masters as well as the responsive derivatives. Templates use the manifest derivatives; `energy-cover.webp` and `energy-detail.webp` preserve the prepared frame sources.
- `social-cover.jpg` supplies the website page's link preview. It is 89,948 bytes and should remain 1200 × 630 unless the layout metadata is updated.
- The first project cover loads eagerly on the dedicated page. Other screenshots and the homepage previews load lazily. Images retain width and height attributes to reserve layout space.
- Recordings have no initial video source and use `preload="none"`. Opening a recording assigns its source; playback uses native controls and does not autoplay. Closing the dialog pauses playback and releases the source. Keep this behaviour when adding media.
- Image links open an accessible dialog with a separate full-size image link. Without JavaScript, the same links open the image or recording directly. No external websites are embedded in iframes.

## Updating a project

1. Start from a clean screenshot or original recording. Remove browser/development UI and loading frames without hiding relevant unfinished content. Keep original files outside the published asset directory.
2. Export responsive WebP images and update their keys, dimensions, and `srcset` values in `src/data/website-media.json`. Use a new filename when replacing published media so caches can distinguish the change.
3. Update `src/data/websites.ts`: project order, stable slug, preview URL and displayed domain, description, image alternatives/captions, gallery, optional phone image, and optional video. The first entry should retain index `01` for eager cover loading. Email enquiries use `social.email` from `src/data/bio.ts`.
4. When adding projects, also update the hardcoded project count and introduction in `src/pages/websites.astro`, the count in `WebsiteWork.astro`, and the fixtures in `scripts/verify-websites.mjs`. The optional phone screenshot currently has a Kindred-specific accessible link label in `WebsiteShowcase.astro`; generalise it before adding another phone screenshot. Launch status and role labels are currently shared in the templates, so review those before mixing project statuses or responsibilities.
5. Run `npm run build`, `npx astro check`, and the existing showcase browser verification against a running preview. Confirm all screenshots load, enquiries address the intended inbox, preview URLs are correct, phone layouts fit, videos stay unloaded until requested, and modal close restores focus. Inspect the updated images visually on desktop and phone widths.

Keep preview wording until launch is confirmed. The ODD deployment is a static portfolio snapshot with checkout disabled; the showcase must not promise purchase functionality or post-launch outcomes.
