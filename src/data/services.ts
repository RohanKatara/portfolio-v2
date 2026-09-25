export type Service = {
  index: string;
  title: string;
  body: string;
  price: string;
};

export const services: Service[] = [
  {
    index: '01',
    title: 'Website development',
    body: 'Help visitors understand your business and take the next step. Fast, mobile-friendly websites built around enquiries, bookings or online sales.',
    price: 'Starting ₹8,000',
  },
  {
    index: '02',
    title: 'AI workflow creation',
    body: 'Connect your existing tools and automate repetitive tasks, from qualifying leads and following up to creating content. Use AI where it adds practical value.',
    price: 'Starting ₹10,000',
  },
  {
    index: '03',
    title: 'Workflow optimisation',
    body: 'Find bottlenecks, remove unnecessary steps and improve an existing process. Clearer handoffs and better use of your current tools can be enough. AI is optional.',
    price: 'Quoted after a process review',
  },
];
