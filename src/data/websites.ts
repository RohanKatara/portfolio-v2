import mediaFiles from './website-media.json';
import { social } from './bio';

export type WebsiteImage = {
  src: string;
  srcset: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
};

export type Website = {
  slug: string;
  index: string;
  name: string;
  category: string;
  theme: string;
  url: string;
  domain: string;
  headline: string;
  description: string;
  disciplines: string[];
  cover: WebsiteImage;
  gallery: WebsiteImage[];
  mobile?: WebsiteImage;
  video?: { src: string; label: string; description: string };
};

const image = (key: keyof typeof mediaFiles, alt: string, caption: string): WebsiteImage => ({
  ...mediaFiles[key], alt, caption,
});

export const websiteEnquiry = (name?: string) =>
  `mailto:${social.email}?subject=${encodeURIComponent(name ? `A website like ${name}` : 'My website project')}`;

// This order is shared by the dedicated page and the homepage preview.
export const websites: Website[] = [
  {
    slug: 'odd-care', index: '01', name: 'ODD Care Co.', category: 'Ecommerce · Skincare',
    theme: 'odd', url: 'https://odd-care-co.vercel.app', domain: 'odd-care-co.vercel.app',
    headline: 'Skincare with a point of view.',
    description: 'A skincare storefront for an upcoming WooCommerce store. Crisp product pages, a distinctive visual identity and a playful character make the essentials feel anything but ordinary.',
    disciplines: ['Art direction', 'Website design', 'Development', 'Product storytelling'],
    cover: image('odd-home', 'ODD Care Co. storefront with bold monochrome typography and a four product skincare range', 'The storefront'),
    gallery: [
      image('odd-sun', 'Dawn Shield product page in warm cream with orange details and ingredient information', 'Dawn Shield · A warmer morning palette'),
      image('odd-dusk', 'Deep Dusk product page with a dark night palette and illustrated packaging', 'Deep Dusk · A different mood after dark'),
    ],
    video: {
      src: '/website-work/odd-walkthrough.mp4', label: 'Watch the product animation',
      description: 'A silent recording of the ODD product presentation and animated mascot.',
    },
  },
  {
    slug: 'kindred-coffee', index: '02', name: 'Kindred Coffee', category: 'Hospitality · Café',
    theme: 'kindred', url: 'https://kindred-coffee.vercel.app', domain: 'kindred-coffee.vercel.app',
    headline: 'The atmosphere, before the first cup.',
    description: 'A warm, editorial website that brings the café experience to the screen. Immersive photography, considered typography and a story from origin to cup give visitors a feel for the brand before they visit.',
    disciplines: ['Art direction', 'Website design', 'Development', 'Responsive design'],
    cover: image('kindred-home', 'Kindred Coffee homepage with oversized serif typography over rich coffee photography', 'A story in every cup'),
    gallery: [image('kindred-collection', 'Kindred coffee collection displayed with warm photography and editorial product cards', 'The collection · From story to discovery')],
    mobile: image('kindred-mobile', 'Kindred Coffee homepage adapted to a narrow phone screen', 'The same atmosphere, on a smaller screen'),
  },
  {
    slug: '404-energy', index: '03', name: '404 Energy', category: 'Brand website · Beverage',
    theme: 'energy', url: 'https://404-energy-drink.vercel.app', domain: '404-energy-drink.vercel.app',
    headline: 'A little unexpected. By design.',
    description: 'An energetic product experience built around the can. Pixel typography, bold colour and motion carry the brand’s personality through flavour discovery and the story behind the drink.',
    disciplines: ['Art direction', 'Website design', 'Development', 'Motion design'],
    cover: image('energy-home', '404 Energy website with pixel typography, bright accents and a central beverage can', 'Not an error. A reset.'),
    gallery: [image('energy-detail', '404 Energy flavour presentation from the website preview', 'Product discovery, with personality')],
    video: {
      src: '/website-work/energy-walkthrough.mp4', label: 'Watch the walkthrough',
      description: 'A silent walkthrough of the 404 Energy website, including the product animation and flavour presentation.',
    },
  },
];

