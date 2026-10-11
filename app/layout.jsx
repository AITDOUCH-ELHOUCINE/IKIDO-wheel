import { Archivo, Inter } from 'next/font/google';
import { site } from '@/lib/site';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], weight: ['600', '800', '900'], variable: '--font-archivo' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: site.keywords,
  applicationName: site.name,
  authors: [{ name: site.author }],
  creator: site.author,
  publisher: site.author,
  category: 'utilities',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: site.name,
    title: site.title,
    description: site.description,
    locale: site.locale,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export const viewport = {
  themeColor: site.themeColor,
  colorScheme: 'dark light',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable}`}>
      <body data-theme="dark">{children}</body>
    </html>
  );
}
