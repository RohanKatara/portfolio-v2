# Portfolio animation preference — proposed change

Status: Rohan approved the site-wide option and this plan on 24 September 2026. Implementation and deployment are authorized.

## Goal

Let visitors who have reduced motion enabled on their device choose to see Rohan's existing portfolio animations, without requiring a Windows or browser settings change. Keep the existing typography, colours, layout, content, and animation designs.

## Recommended experience

- Follow the visitor's device preference on their first visit.
- When reduced motion is active, show one small, non-modal line below the homepage introduction: “Animations are reduced on this device. Enable animations”. The action is a keyboard-accessible button styled with the existing site tokens. Hide this prompt when full animation is already active.
- Enable the existing effects only after the visitor clicks. A site preference overrides the device preference; it does not change the device settings. Explain alongside the action that applying the choice reloads the current page.
- Provide a compact footer control with “Use device setting”, “Full animations”, and “Reduced motion”, plus an “Apply & reload” action. Make it available on all portfolio pages so the choice can be reversed.
- Remember the choice in this browser. Store only the preference value. If storage is unavailable, retain readable content and report that the preference could not be saved; do not enter a reload loop or silently claim that it was applied.
- Keep project recordings under their existing playback controls. An animation preference must not start videos or audio.

## Alternative

A local “Enable text reveal” control beside the manifesto can restore only that effect. This changes fewer components but leaves other motion-sensitive effects unavailable until the visitor changes their device setting. The site-wide option is recommended because the request concerns the portfolio's effects generally.

## Implementation outline

1. Add one shared preference resolver: device default, explicit full motion, or explicit reduced motion. Validate saved values and safely handle blocked storage. Resolve the initial mode before animation startup so CSS and JavaScript agree.
2. Add the contextual homepage button and footer control. Keep standard keyboard focus, clear labels, and touch targets.
3. Route the existing homepage reveal startup, smooth scrolling, decorative WebGL, project hover previews, and animated CSS through the same effective mode. Preserve responsive breakpoints, touch behaviour, WebGL capability checks, and any existing performance fallbacks.
4. Apply explicit preference changes with a controlled reload of the current route and hash. This is the smallest reliable approach because current animation initializers do not expose a complete cleanup lifecycle. Reloading prevents duplicate scroll triggers, detached pin spacers, and hidden text without rebuilding the animation system. Do not promise exact scroll-position preservation when the desktop manifesto's pinned layout changes. Read device preferences on each page load; do not automatically reload a page while somebody is reading.
5. Record the approved scope, run verification, commit, deploy through the existing GitHub/Vercel integration, and verify the live bundle and interaction.

Primary files: the shared motion helper; BaseLayout; Hero and Footer; homepage animation startup and cleanup; SmoothScroll; HeroWireframe; SpaceStarfield; ProjectHoverImage; affected animation styles; a focused browser regression script. No dependency, database, hosting, or content changes are needed.

## Verification

- Device requests reduced motion: content is readable, opt-in is present, and the manifesto starts static.
- Click opt-in: manifesto highlights progressively while scrolling, completes, and reverses. Existing animation appearance is preserved.
- Reload and navigate between Home and Work: the explicit choice persists. Return to device setting: the OS preference applies again.
- Switch back to reduced motion: scrolling remains usable and all text remains visible; decorative motion stops.
- Device permits animation: initial behaviour and homepage appearance match the current production site.
- Test invalid/missing saved values, unavailable storage, repeat switching, viewport changes, keyboard use, touch widths, and no JavaScript. In device-default mode, verify that a new page load applies the latest OS preference.
- Test Chromium at desktop and phone widths, and mobile WebKit. Check browser errors, static checks, production build, fresh production assets, and the live opt-in flow. Physical-device testing remains distinct from engine emulation.

## Boundaries

This opt-in cannot make WebGL work on an unsupported or disabled graphics configuration. The normal fallback still applies. It also does not establish why the separate PC failed; reduced motion remains the leading unconfirmed explanation until that PC's setting is checked.

## Build order and handoff

1. Commit this confirmed design. Add the shared storage key, pre-paint resolver, preference helpers, and small Astro controls; connect Hero and Footer.
2. Gate existing JS consumers and CSS using the effective mode, preserving every original full-motion effect. The preference is a per-page snapshot; OS changes are applied on the next page load, as are saved choices from other tabs. No new package is needed.
3. Run Astro check/build and focused browser tests against the production preview. Review the phone and desktop controls visually. Run existing hover checks and Work navigation smoke checks.
4. Commit the runnable implementation and validation notes, create and attach a PR, verify the cloud build, merge and verify production. Synchronize the Desktop checkout by fast-forward only, preserving its untracked thumbnail.

Preference storage is not a content cache. Valid explicit values are `full` and `reduced`; System removes the key. The early head script resolves a validated value and OS preference into document attributes before CSS and animation startup. The form writes the key and checks it before reloading. Unavailable storage leaves the current experience intact and displays a status message.

Rollback: the previous Vercel deployment / master revision `f40d3446a4c6461a95e492aaf2a154429e3b0b58`. No data migration or environment change is involved.
