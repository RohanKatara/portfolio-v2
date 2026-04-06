import { defineCollection, z } from 'astro:content';

const caseStudies = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    year: z.number(),
    role: z.string(),
    accent: z.string(),
    index: z.string(),
    metrics: z.array(z.object({ label: z.string(), value: z.string() })),
    demo: z.string().optional(),
  }),
});

export const collections = { 'case-studies': caseStudies };
