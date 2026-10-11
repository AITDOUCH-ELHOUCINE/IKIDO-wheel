import WheelApp from '@/components/WheelApp';
import { site } from '@/lib/site';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: site.name,
  url: site.url,
  description: site.description,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: site.author },
};

export default function Home() {
  return (
    <>
      <h1 className="sr-only">{site.title}</h1>
      <WheelApp />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </>
  );
}
