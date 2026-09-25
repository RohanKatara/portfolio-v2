# RK identity handoff

The shared mark is defined in `src/data/brand.mjs`. `BrandMark.astro` renders it for navigation and the static hero. `rk-geometry.ts` extrudes the outline and convex face pieces for the existing OGL hero. Rotation is bounded to keep the letters front-facing. Phone and tablet framing is centered through 900px; wider screens reserve space for the right-offset mark.

The server-rendered mark remains available without JavaScript, with reduced motion, or without WebGL. The hero hides it only after its first successful frame, and restores it on renderer failure, context loss or the existing performance disable event. The same idempotent teardown removes animation frames, observers, event listeners and the renderer on failure/unmount.

## Updating the mark

Run `node scripts/generate-brand-icons.mjs` after editing the shared geometry. This uses Sharp already installed with Astro to generate the SVG, 32px and 192px PNGs, ICO (16/32/48) and 180px Apple touch icon. Increment `brandIconVersion` when replacing generated browser icons to invalidate their cache. Keep `/favicon-192.png` stable without a version query: the homepage advertises this larger raster icon for search crawlers. The navigation mark is decorative inside the existing accessible home link.

## Google search favicon

Google's search result may retain an older icon until the homepage and favicon are recrawled. The shared layout advertises a crawlable 192px square RK PNG at a stable URL; `robots.txt` permits both homepage and image crawling. The old `/legacy/` coffee assets do not define the domain homepage's favicon. Request homepage indexing in Search Console after deployment. Google controls the final search appearance and refresh timing (several days to several weeks), so successful deployment is not confirmation of an updated search result. See https://developers.google.com/search/docs/appearance/favicon-in-search.

## Verification commands

Run `npm run check` and `npm run build`, then start `npm run preview -- --host 127.0.0.1 --port 4322`.

Run `node scripts/verify-brand.mjs http://127.0.0.1:4322` and repeat with `--webkit`. Run `node scripts/verify-motion.mjs http://127.0.0.1:4322 --only=mobile-touch-flow` in both engines. Set `PLAYWRIGHT_BROWSERS_PATH` to the installed browser directory for WebKit; this workspace uses `../browsers`.

The brand checks cover icon contents and dimensions, navigation from Work to home, the animated hero, real context loss and resize recovery, phone/tablet layouts, reduced motion, unavailable WebGL and disabled JavaScript. Screenshots and reports are written under `../qa/rk`. Visual review also includes the actual 16px/32px icon sizes on light and dark backgrounds. Physical iPhone testing is separate from WebKit emulation.
