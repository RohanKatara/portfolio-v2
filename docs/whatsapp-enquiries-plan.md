# Pricing and easier enquiries

## User request

Change website development pricing to Starting from ₹5,000. Make WhatsApp the primary enquiry route without displaying the phone number as page text. Preserve email, add a persistent mobile action, contextual enquiries beside website/AI/workflow examples, and a clear enquiry action on every current case study.

## Plan

1. Update website pricing.
2. Use the WhatsApp number the user supplied with India's country code. The user was told that a standard click-to-chat link contains the recipient number and supplied it for this purpose. Keep it out of visible page text; the link is public, not a secret.
3. Centralise short contextual enquiry drafts and use them consistently in the hero, service cards, project examples, case-study endings and the mobile contact action. Opening a link prepares a message; visitors choose whether to send it.
4. Keep a direct email option and the existing copy-address interaction. Visually prioritise WhatsApp in the contact section. Maintain the dark aesthetic, accessible labels/focus, 48px mobile targets and safe-area spacing. Hide the mobile bar during media overlays.
5. Verify generated destinations and draft encoding, contact navigation, every case-study CTA, mobile footer/overlay clearance and no-JavaScript/reduced-motion behavior. Build/check, deploy to the existing Vercel project, verify the fresh production page, then sync the Desktop source.

No contact form, backend, new external dependency or automatic message sending is required.

## Implementation and local verification

- A shared enquiry helper produces editable drafts for general, website, AI and workflow enquiries. Website and AI project links name the example; case-study mobile bars use the same project context.
- WhatsApp is primary in the hero, services, contact section and Work ending. Three website examples and four AI/automation examples have contextual buttons. Every case study offers WhatsApp and email before the next-case navigation.
- The fixed mobile bar uses 48px targets, safe-area padding and reserved footer space, and hides while the media viewer is open. All links render in HTML and work without JavaScript.
- Astro check: 64 files, zero errors/warnings/hints. Production build: eight pages.
- Chrome: 150 enquiry checks passed across desktop, 360px mobile and JavaScript-disabled pages. WebKit: all 149 contact/layout assertions passed, but the overall suite correctly fails its final runtime-error check on the previously observed native video-control `Temporal.Duration properties must be finite and of consistent sign` error. This is not silently filtered; reports are in `../qa/enquiries/`.
- Focused WebKit Work layout: 38 checks passed with no browser errors. Mobile motion opt-in regression: 17 passed with no errors.
- Actual browser click reached WhatsApp's official handoff page showing the correct recipient and the website-specific draft. No message was sent. Physical iPhone app handoff has not been exercised from this Windows machine.
