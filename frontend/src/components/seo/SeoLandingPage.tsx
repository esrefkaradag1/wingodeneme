import { MarketingShell } from '@/components/layout/MarketingShell';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { SeoLandingBody } from '@/components/seo/SeoLandingBody';
import { SEO_LANDING, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';

type SeoLandingKey = keyof typeof SEO_LANDING;

export function SeoLandingPage({ pageKey }: { pageKey: SeoLandingKey }) {
  const config = SEO_LANDING[pageKey];

  return (
    <>
      <JsonLdScript
        data={[
          breadcrumbJsonLd([
            { name: 'Ana sayfa', path: '/' },
            { name: config.h1, path: config.path },
          ]),
          faqJsonLd(config.faqs),
        ]}
      />
      <MarketingShell>
        <SeoLandingBody config={config} pageKey={pageKey} />
      </MarketingShell>
    </>
  );
}
