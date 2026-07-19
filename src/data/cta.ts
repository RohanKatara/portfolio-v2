import { social } from './bio';

export type CtaChannel = 'email' | 'whatsapp' | 'booking';

export type Cta = {
  channel: CtaChannel;
  label: string;
  href: string;
};

/**
 * Single source of truth for every call-to-action on the site.
 * When the WhatsApp number / booking link exist, fill the slots below and
 * every CTA row (hero, services, contact) picks them up automatically.
 */
export const ctas: Record<CtaChannel, Cta | null> = {
  email: { channel: 'email', label: 'Email me', href: `mailto:${social.email}` },
  // e.g. { channel: 'whatsapp', label: 'WhatsApp me',
  //        href: 'https://wa.me/91XXXXXXXXXX?text=Hi%20Rohan,%20I%20saw%20your%20site' }
  whatsapp: null,
  // e.g. { channel: 'booking', label: 'Book a free 15-min call', href: 'https://cal.com/…' }
  booking: null,
};

export const primaryCta: Cta = ctas.email!;

/** Every configured CTA, primary first — render side by side where relevant. */
export const activeCtas: Cta[] = [ctas.email, ctas.whatsapp, ctas.booking].filter(
  (c): c is Cta => c !== null,
);
