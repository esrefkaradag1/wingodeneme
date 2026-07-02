/** Ana sayfa bölüm anchor'ları — paketler hariç */
const ANA_SAYFA_ANCHOR = new Set(['ozellikler', 'nasil', 'paketler']);

function anchorTemizle(href: string): string {
  return href.replace(/^#+\/?/, '').replace(/^\//, '').split('?')[0].split('#')[0];
}

export function navLinkNormalize(link: { href: string; label: string }): { href: string; label: string } {
  const h = (link.href || '').trim();
  const lab = (link.label || '').trim();
  if (h === '/market' || lab.toLocaleLowerCase('tr-TR') === 'market') {
    return { href: '/iletisim', label: 'İletişim' };
  }
  return link;
}

/**
 * Landing / marketing nav linklerini çözümler.
 * - /market + «Market» → /iletisim; /market + paket etiketi → /paketler
 * - #paketler → /paketler
 */
export function resolveMarketingNavHref(href?: string | null, label?: string | null): string {
  const h = (href || '/paketler').trim();
  if (!h) return '/paketler';

  if (h === '/market') {
    const lab = (label || '').trim().toLocaleLowerCase('tr-TR');
    if (lab.includes('paket') || lab.includes('deneme')) return '/paketler';
    return '/iletisim';
  }

  if (h === '/dashboard' || h.startsWith('/dashboard/')) {
    return '/paketler';
  }

  const paketlerKalibi =
    h === '/paketler' ||
    h === '#paketler' ||
    h === '/#paketler' ||
    h.endsWith('#paketler') ||
    anchorTemizle(h) === 'paketler';

  if (paketlerKalibi) return '/paketler';

  if (h.startsWith('#')) {
    const anchor = h.slice(1).split('?')[0];
    if (ANA_SAYFA_ANCHOR.has(anchor)) {
      return anchor === 'paketler' ? '/paketler' : `/#${anchor}`;
    }
    return h;
  }

  if (h.startsWith('/') && h.includes('#')) {
    const [, hash] = h.split('#');
    if (hash === 'paketler') return '/paketler';
    return h;
  }

  return h;
}

/** @deprecated resolveMarketingNavHref kullanın */
export function publicPaketlerHref(href?: string | null): string {
  return resolveMarketingNavHref(href);
}
