/** Ana sayfa bölüm anchor'ları — paketler hariç */
const ANA_SAYFA_ANCHOR = new Set(['ozellikler', 'nasil', 'paketler', 'bizimle-calisin']);

function anchorTemizle(href: string): string {
  return href.replace(/^#+\/?/, '').replace(/^\//, '').split('?')[0].split('#')[0];
}

function etiketPaketMi(label?: string | null): boolean {
  const lab = (label || '').trim().toLocaleLowerCase('tr-TR');
  return lab.includes('paket') || lab.includes('deneme') || lab.includes('satın');
}

export function navLinkNormalize(link: { href: string; label: string }): { href: string; label: string } {
  const h = (link.href || '').trim();
  const lab = (link.label || '').trim();
  const labLower = lab.toLocaleLowerCase('tr-TR');

  // Eski «Market» menü maddesi → İletişim (paket etiketliyse dokunma)
  if (
    !etiketPaketMi(lab) &&
    (labLower === 'market' || (h === '/market' && (labLower === 'market' || labLower === 'iletişim' || labLower === 'iletisim')))
  ) {
    return { href: '/iletisim', label: labLower.includes('ileti') ? lab : 'İletişim' };
  }

  // Paket / market satış linkleri → /paketler
  if (etiketPaketMi(lab) || h === '/market' || h === '#paketler' || h === '/#paketler') {
    if (h.startsWith('/market/siparis') || h.includes('odeme')) return link;
    return { ...link, href: '/paketler' };
  }

  return link;
}

/**
 * Landing / marketing nav linklerini çözümler.
 * - «Tüm paketler» / paket etiketleri → her zaman /paketler
 * - /market (eski satış URL) → /paketler
 * - Eski «Market» menü etiketi → /iletisim
 * - #paketler → /paketler
 * - #bizimle-calisin / öğretmen başvurusu → /#bizimle-calisin
 */
export function resolveMarketingNavHref(href?: string | null, label?: string | null): string {
  const h = (href || '/paketler').trim();
  if (!h) return '/paketler';

  const lab = (label || '').trim().toLocaleLowerCase('tr-TR');

  // Paket butonları / etiketleri — kayıt veya iletişime gitmesin
  if (etiketPaketMi(label)) {
    if (h.startsWith('/market/siparis') || h.includes('odeme')) return h;
    return '/paketler';
  }

  if (
    lab.includes('öğretmen') ||
    lab.includes('ogretmen') ||
    h === '/bizimle-calisin' ||
    h.includes('bizimle-calisin')
  ) {
    if (h === '/bizimle-calisin' || h.startsWith('/bizimle-calisin')) return h.split('?')[0];
    return '/#bizimle-calisin';
  }

  // /market: varsayılan paketler; yalnızca açık «market» etiketi iletişime
  if (h === '/market' || h === '/market/') {
    if (lab === 'market' || lab === 'iletişim' || lab === 'iletisim') return '/iletisim';
    return '/paketler';
  }

  if (h.startsWith('/market/')) {
    return h;
  }

  // CMS yanlışlıkla kayıt/iletişim yazmışsa ama bağlam paket ise yukarıda yakalandı;
  // çıplak /kayit paket butonunda kullanılmamalı — Paketler bileşeni label ile çağırır.

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
    if (hash === 'bizimle-calisin') return '/#bizimle-calisin';
    return h;
  }

  return h;
}

/** @deprecated resolveMarketingNavHref kullanın */
export function publicPaketlerHref(href?: string | null): string {
  return resolveMarketingNavHref(href);
}

/**
 * Marketing navbar aktif durumu.
 * Hash linkler (Özellikler, Nasıl) yalnızca ana sayfada aktif sayılır.
 */
export function isMarketingNavActive(
  pathname: string | null | undefined,
  href: string,
  label?: string | null
): boolean {
  const path = pathname || '/';
  const resolved = resolveMarketingNavHref(href, label);

  if (resolved === '/' || resolved === '') {
    return path === '/';
  }

  if (resolved === '/paketler') {
    return path === '/paketler' || path.startsWith('/paket/');
  }

  if (resolved === '/iletisim') {
    return path === '/iletisim' || path.startsWith('/iletisim/');
  }

  if (resolved === '/bizimle-calisin' || resolved.startsWith('/bizimle-calisin')) {
    return path === '/bizimle-calisin' || path.startsWith('/bizimle-calisin/');
  }

  // Ana sayfa bölümleri (#ozellikler, #nasil, #bizimle-calisin) — Ana Sayfa aktif kalsın
  if (resolved.startsWith('/#') || resolved.startsWith('#')) {
    return false;
  }

  if (resolved.startsWith('/')) {
    const base = resolved.split('#')[0].split('?')[0];
    if (!base || base === '/') return path === '/';
    return path === base || path.startsWith(`${base}/`);
  }

  return false;
}
