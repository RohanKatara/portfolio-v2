export type Testimonial = {
  quote: string;
  name: string;
  role: string; // e.g. 'Owner, XYZ Fitness — Rajkot'
  project?: string; // optional tie to a service/project, shown as a mono tag
};

/**
 * The Testimonials section renders ONLY when this array has entries — add the
 * first real client quote here and it appears on the page automatically.
 * When enabling: the section is numbered 005, so bump About → 006 and
 * Contact → 007 in their eyebrow labels.
 *
 * Example entry:
 * {
 *   quote: 'Rohan built our gym website in a week and we started getting trial bookings on WhatsApp right away.',
 *   name: 'Owner name',
 *   role: 'Owner, Business name — Rajkot',
 * }
 */
export const testimonials: Testimonial[] = [];
