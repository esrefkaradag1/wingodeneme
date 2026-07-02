import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import NextTopLoader from 'nextjs-toploader';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { SITE_NAME, anaSayfaMetadata, organizationJsonLd, siteUrl, webSiteJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  ...anaSayfaMetadata(),
  metadataBase: new URL(siteUrl()),
  title: {
    default: `Online Deneme Sınavı — TYT, AYT, LGS | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  authors: [{ name: 'Wingo Team' }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: '/wingolink-icon.png', type: 'image/png', sizes: 'any' }],
    shortcut: ['/wingolink-icon.png'],
    apple: [{ url: '/wingolink-icon.png', type: 'image/png' }],
  },
  category: 'education',
  applicationName: SITE_NAME,
  other: {
    'apple-mobile-web-app-title': SITE_NAME,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <JsonLdScript data={[organizationJsonLd(), webSiteJsonLd()]} />
      </head>
      <body>
        <NextTopLoader
          color="#4f46e5"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #4f46e5,0 0 5px #4f46e5"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
