export type Project = {
  slug: 'mocktalk' | 'krishna' | 'automate-pro' | 'content-engine';
  index: string;
  name: string;
  title: string;
  tagline: string;
  description: string[];
  stack: string[];
  year: number;
  role: string;
  accent: `#${string}`;
  cover: string;
  caseStudySlug: string;
  links?: { live?: string; repo?: string; demo?: string };
};

export const projects: Project[] = [
  {
    slug: 'mocktalk',
    index: '01',
    name: 'MockTalk',
    title: 'MockTalk — Real Time AI Interview Simulator',
    tagline: 'Voice to voice interview prep with sub 200ms response latency',
    description: [
      'Architected and developed a low latency, voice to voice web application using Next.js and the OpenAI Realtime API to simulate high pressure behavioral interviews.',
      'Engineered secure, bidirectional WebSocket connections to process and stream audio in real time, handling complex chunking and base64 encoding via native browser APIs (MediaRecorder and Web Audio).',
      'Designed specialized LLM system prompts to roleplay as a strict hiring manager evaluating candidates for Relationship Manager positions, complete with dynamic pacing and conversational interruptions.',
      'Streamlined development by utilizing Claude Code CLI for agentic workflow automation, rapid prototyping of complex React hooks, and serverless route configuration.',
    ],
    stack: ['Next.js 15', 'OpenAI Realtime API', 'WebSockets', 'Web Audio', 'Claude Code CLI'],
    year: 2026,
    role: 'Solo build · Engineering & design',
    accent: '#5B8DEF',
    cover: '/projects/mocktalk-cover.svg',
    caseStudySlug: 'mocktalk',
  },
  {
    slug: 'krishna',
    index: '02',
    name: 'Krishna.AI',
    title: 'Krishna.AI — Bhagavad Gita Guidance',
    tagline: 'Ancient wisdom answered through modern LLM prompt engineering',
    description: [
      'AI powered web platform that provides personalized life guidance inspired by the Bhagavad Gita.',
      'Designed to help users apply ancient wisdom to modern problems such as financial stress, ethical dilemmas, and personal decision making.',
      'Implemented prompt engineering with ChatGPT API and created an accessible, interactive interface allowing busy individuals to gain insights without reading the full scripture.',
    ],
    stack: ['React', 'ChatGPT API', 'Prompt Engineering', 'Tailwind'],
    year: 2024,
    role: 'Solo build · Engineering & narrative design',
    accent: '#E07B5C',
    cover: '/projects/krishna-cover.svg',
    caseStudySlug: 'krishna',
  },
  {
    slug: 'automate-pro',
    index: '03',
    name: 'Automate Pro',
    title: 'Automate Pro — AI Lead Gatekeeper',
    tagline: 'n8n + Gemini pipeline that saves an agency 20+ hours per week',
    description: [
      'Built an automated pipeline using n8n and Google Gemini 2.5 Flash to instantly score, qualify, and route agency leads saving 20+ hours a week of manual filtering.',
      'Engineered an LLM scoring engine that analyzes project scope, budget signals, and urgency to assign each lead a quality score out of 10 in real time.',
      'Implemented a smart routing system that escalates VIP leads directly to Slack while placing low budget prospects into a segmented Google Sheets nurture queue.',
      'Developed a custom React frontend with dynamic forms and behavioral tracking to capture high-value prospect data at the top of the funnel.',
    ],
    stack: ['n8n', 'Google Gemini 2.5 Flash', 'Slack API', 'Google Sheets', 'React'],
    year: 2026,
    role: 'Client build · Automation engineering',
    accent: '#9B7BE0',
    cover: '/projects/automate-pro-cover.svg',
    caseStudySlug: 'automate-pro',
    links: { demo: '/automate-pro-demo/automate-pro-demo.mp4' },
  },
  {
    slug: 'content-engine',
    index: '04',
    name: 'Content Engine',
    title: 'AI Content Multiplier & Syndication Engine',
    tagline: 'One long form input, twelve platform native variants out',
    description: [
      'Engineered an automated content repurposing system using Generative AI to instantly transform long form core content into platform-specific short-form copy.',
      'Streamlined digital marketing workflows by integrating API-driven automation to format and prepare content for distribution across multiple social channels.',
      'Leveraged advanced prompt engineering to ensure the AI maintained a consistent brand voice and optimized messaging for maximum audience engagement on different platforms.',
      'Scaled digital presence and content output capacity, drastically reducing manual copywriting hours while simultaneously increasing cross platform visibility.',
    ],
    stack: ['LLM API', 'Prompt Engineering', 'Node.js', 'Webhooks'],
    year: 2025,
    role: 'Solo build · Engineering & prompt design',
    accent: '#F59E66',
    cover: '/projects/content-engine-cover.svg',
    caseStudySlug: 'content-engine',
  },
];
