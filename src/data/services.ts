export type Service = {
  index: string;
  title: string;
  body: string;
  price: string;
};

export const services: Service[] = [
  {
    index: '01',
    title: 'Business & Ecommerce Websites',
    body: 'Fast, mobile first sites that turn visitors into leads. Landing pages, multi page business sites, online stores, and product catalogs.',
    price: 'Starting ₹8,000',
  },
  {
    index: '02',
    title: 'App Development',
    body: 'Web and mobile apps built to solve a real business problem: booking, ordering, internal tools, dashboards.',
    price: 'Quoted after a quick call',
  },
  {
    index: '03',
    title: 'AI Automation',
    body: 'Auto reply bots, lead capture & qualification, follow up sequences, and content pipelines that run without you. Save 10 to 20+ hours a week.',
    price: 'Starting ₹10,000',
  },
  {
    index: '04',
    title: 'Care & Updates (monthly)',
    body: 'Hosting, edits, fixes, and improvements so your site/app keeps working and growing.',
    price: 'From ₹2,000/month',
  },
];
