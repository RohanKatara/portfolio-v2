import { social } from './bio';

export type CtaChannel = 'email' | 'whatsapp' | 'booking';
export type EnquiryIntent = 'general' | 'website' | 'ai' | 'workflow';

export type Cta = {
  channel: CtaChannel;
  label: string;
  href: string;
};

// Public chat destination; the number is never rendered as page text.
export const whatsappChatUrl = 'https://wa.me/917984242115';

export const enquiryFor = (intent: EnquiryIntent = 'general', reference?: string): Cta => {
  const introduction = reference
    ? `Hi Rohan, I saw your ${reference} project.`
    : 'Hi Rohan, I found your portfolio.';
  const requests: Record<EnquiryIntent, string> = {
    general: "I'd like to discuss a project for my business. Can we talk about the next steps?",
    website: "I'd like to discuss a website for my business. Can we talk about what I need?",
    ai: "I'd like help connecting my tools and creating an AI workflow. Can we discuss what could be automated?",
    workflow: "I'd like to improve an existing workflow in my business. Can we discuss the process and where it gets stuck?",
  };
  const labels: Record<EnquiryIntent, string> = {
    general: 'Chat on WhatsApp',
    website: 'Discuss a website',
    ai: 'Create an AI workflow',
    workflow: 'Improve a workflow',
  };
  return {
    channel: 'whatsapp',
    label: labels[intent],
    href: `${whatsappChatUrl}?text=${encodeURIComponent(`${introduction} ${requests[intent]}`)}`,
  };
};

/** One destination and one set of message templates for all enquiry actions. */
export const ctas: Record<CtaChannel, Cta | null> = {
  email: { channel: 'email', label: 'Email me', href: `mailto:${social.email}` },
  whatsapp: enquiryFor(),
  // e.g. { channel: 'booking', label: 'Book a free 15-min call', href: 'https://cal.com/…' }
  booking: null,
};

export const primaryCta: Cta = ctas.whatsapp!;
export const emailCta: Cta = ctas.email!;

/** Every configured CTA, primary first — render side by side where relevant. */
export const activeCtas: Cta[] = [ctas.whatsapp, ctas.email, ctas.booking].filter(
  (c): c is Cta => c !== null,
);
