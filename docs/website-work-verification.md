# Website work verification — 22 September 2026

The new showcase was tested against the local production preview at `http://127.0.0.1:4322`. No external website previews were opened by the automated suite, and no emails, forms, orders or other external writes were submitted.

## Results

| Check | Result |
| --- | --- |
| Astro source check | 51 files; 0 errors, 0 warnings, 0 hints |
| System Chrome showcase regression | 179 of 179 checks passed |
| Playwright WebKit 26.5 showcase regression | 178 of 179 checks passed; all functional checks passed, but the page-error audit found a reproducible native-video-controls exception |
| Final navigation/image-link changes | Passed at 390px, 768px and 1440px in both Chrome and WebKit; six completed flows |
| Physical iPhone / installed Safari | Not available; not tested |

The automated viewports were 360 × 800 and 390 × 844 phones, a touch-enabled 768 × 1024 tablet, and a 1440 × 900 desktop. Coverage included project order and exact preview/email URLs, responsive images, overflow, active navigation and touch targets, image enlargement and the full-size image link, two recordings loading and playing on request, video cleanup, dialog focus restoration, no-JavaScript fallbacks, reduced motion, cross-route navigation, reload/back/forward, canonical metadata, and existing homepage case-study flows.

The media test invokes the native HTML media playback API after opening a recording. It verifies native controls are present and the recording actually decodes and advances; it does not require autoplay or depend on platform-specific control coordinates.

Reports and screenshots are saved outside the repository in `../qa/chrome/` and `../qa/webkit/`. The complete check log is `../qa/check.log`; browser run logs are `../qa/chrome-run.log` and `../qa/webkit-run.log`.

## WebKit native-controls diagnostic

The strict WebKit page-error audit recorded:

```text
RangeError: Temporal.Duration properties must be finite and of consistent sign
    at format (undefined:423:73)
    at commitProperty (:423:73)
    at commit (:320:20)
    at unknown (:339:152)
    at forEach ([native code]:0:0)
    at performScheduledLayout (:339:95)
    at _layout (:205:9)
    at _frameDidFire (:201:39)
```

This was reproduced in a bare page created with Playwright `page.setContent`, without the application, its scripts, styles, dialogs or framework:

```html
<video controls preload="none"
  src="http://127.0.0.1:4322/website-work/odd-walkthrough.mp4"></video>
```

The same exception also occurred when the video had `display: none`, and when controls were enabled only after `loadedmetadata`. The stack contains native control layout/formatting frames and no application frames.

A further isolated comparison used `preload="metadata"` and verified finite metadata before playback:

```json
{"duration":5.534,"time":0,"readyState":4}
```

With `controls=false`, the recording loaded and played with no page errors. With `controls=true`, it still loaded and played but emitted the identical exception. The tested WebKit version reported `26.5`. These results isolate the diagnostic to this automated engine's native controls, rather than the application's dialog close or source-removal logic.

Native controls were preserved. No exception filtering, event suppression or alternate controls were introduced to turn the test green. WebKit functional success must be reported separately from its non-clean diagnostic audit; actual iPhone Safari remains unverified.

## Final change verification

The full-suite results above precede the last visual adjustments to the website route's solid navigation background and the full-size-image link's 44px target. The final production rebuild completed at 16:46:24, with the source check again clean across 51 files. Targeted verification then passed at 390px, 768px and 1440px in both Chrome and WebKit against that final build. Each flow confirmed fixed, fully opaque navigation over scrolled project content (background alpha 255), no horizontal overflow, an image viewer full-size link measuring approximately 134.23 × 44px with the correct URL, and focus restoration after Escape. These six image-only flows emitted no page errors; they do not supersede the native-video diagnostic above.

Final screenshots and the machine-readable outcomes are in `../qa/final-changes/`. The earlier dev-server run suffered Vite optimizer invalidation; production-preview results replace that run and avoid simultaneous build/check/dev-cache mutation. An initial targeted check used an ambiguous `nav` locator; selecting the explicitly named Primary navigation resolved that harness issue before the successful final run.

## Reproduction commands

Dependency audit comparison found the same 14 affected packages in the original lockfile and the new lockfile (3 low, 1 moderate, 9 high, 1 critical); adding the Astro checker introduced none. The critical image-processing advisory requires an attacker-controlled AVIF input. This static portfolio has no upload endpoint, SSR adapter or visitor-controlled image-processing path. The dependencies are still unpatched; a framework maintenance update remains separate work. Development previews were restricted to loopback. Full audit comparison is recorded outside the repository in `../qa/dependency-audit-triage.md`.

```powershell
$env:ASTRO_TELEMETRY_DISABLED = '1'
npm run check
npm run build
npm run preview -- --host 127.0.0.1 --port 4322

# In another terminal after preview is ready:
node scripts/verify-websites.mjs http://127.0.0.1:4322
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:\Users\rohan\Documents\Codex\2026-09-21\i-w\work\browsers'
node scripts/verify-websites.mjs http://127.0.0.1:4322 --webkit
```

`QA_OUTPUT_DIR` optionally changes the artifact root; the script appends the browser engine name. WebKit intentionally reports the native-controls diagnostic as a failed page-error audit while it remains reproducible.
