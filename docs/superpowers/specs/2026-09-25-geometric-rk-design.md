# Geometric RK identity

Rohan selected the geometric RK direction: connected initials with a shared central stem, strong diagonal cuts, off-white on graphite and blue accents. Apply it to the favicon, navigation home link and dimensional hero graphic. Keep the current page structure and copy.

## Implementation plan

- Store the mark's outline, counter and convex face pieces in one brand geometry module. Use it for inline SVG, generated browser icons and extruded hero geometry.
- Add a reusable decorative SVG mark to the navigation and server-rendered hero fallback. Preserve the navigation home label and 44px target.
- Replace the hero icosahedron with a shallow extruded RK, retaining particles, scroll fade and preference handling. Bounded tilt keeps the letters readable. Show the static fallback until WebGL renders, and restore it if the context fails.
- Generate an SVG favicon, 32px PNG fallback, ICO and 180px Apple touch icon. Version icon URLs to invalidate the old coffee favicon. No dependencies or data schema changes.

## Verification

Run Astro check and production build. Inspect the mark at 16px, 32px and navigation size, plus desktop and phone hero layouts. Verify reduced motion, no JavaScript, unavailable WebGL, context loss and opt-in. Use the existing focused browser flows in Chrome and WebKit where applicable. After release, confirm new icon/bundle content on the production domain and exercise the main visual flow. Sync the Desktop source with a fast-forward, preserving unrelated files.

## Risks

The small R counter must stay open at favicon size. A letterform must not rotate through a mirrored pose. The hero is decorative behind existing copy, so keep its surfaces subdued. Static identity must remain available independently of the React island and WebGL.
