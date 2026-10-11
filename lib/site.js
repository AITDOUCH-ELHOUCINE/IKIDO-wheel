// Site-wide constants used for metadata, sitemap, robots and structured data.
// Set NEXT_PUBLIC_SITE_URL to the production domain (e.g. https://wheel.example.com).
export const site = {
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  name: 'IKIDO Wheel',
  title: 'IKIDO Wheel – Free random name picker wheel',
  description:
    'Spin the wheel to pick a random name, winner or choice. Free online random name picker by IKIDO digital: add names, spin, and get a fair result in seconds.',
  keywords: [
    'random name picker', 'spin the wheel', 'wheel spinner', 'name wheel', 'random picker',
    'giveaway picker', 'raffle wheel', 'decision wheel', 'random winner', 'IKIDO',
  ],
  author: 'IKIDO digital',
  locale: 'en_US',
  themeColor: '#14b8b3',
};
