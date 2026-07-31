import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import NextTopLoader from 'nextjs-toploader';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { SITE_NAME, anaSayfaMetadata, organizationJsonLd, siteUrl, webSiteJsonLd } from '@/lib/seo';

const META_PIXEL_ID = '1313971113851668';

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
  verification: {
    other: {
      'facebook-domain-verification': '95umii5kqr4zc1lccwh6t83ai5udwq',
    },
  },
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
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height={1}
            width={1}
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
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
