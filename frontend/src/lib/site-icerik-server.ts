import { VARSAYILAN_SITE_ICERIK, type SiteGenelIcerik } from './site-icerik-defaults';

/** Server (RSC) tarafında API tabanını normalize eder — client api.ts'e bağımlı olmadan. */
function apiTaban(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1')
    .trim()
    .replace(/\/+$/, '');
  if (raw.endsWith('/api/v1')) return raw;
  if (raw.endsWith('/api')) return `${raw}/v1`;
  return `${raw}/api/v1`;
}

/**
 * Site içeriğini sunucu tarafında çeker; landing'de varsayılan içeriğin
 * anlık görünüp gerçek içeriğe atlaması (flicker) yaşanmasın diye SSR'de
 * hazır edilip client sorgusuna initialData olarak verilir.
 */
export async function siteIcerikGetirSSR(): Promise<SiteGenelIcerik> {
  try {
    const res = await fetch(`${apiTaban()}/public/site-icerik`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return VARSAYILAN_SITE_ICERIK;
    const json = await res.json();
    return (json?.veri as SiteGenelIcerik) || VARSAYILAN_SITE_ICERIK;
  } catch {
    return VARSAYILAN_SITE_ICERIK;
  }
}
