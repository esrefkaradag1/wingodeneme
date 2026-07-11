/** Giriş/kayıt sonrası güvenli geri dönüş yolu (yalnızca aynı site içi) */
export function guvenliReturnUrl(ham?: string | null): string | null {
  if (!ham) return null;
  try {
    const decoded = decodeURIComponent(ham).trim();
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function girisUrlWithReturn(path: string): string {
  return `/giris?returnUrl=${encodeURIComponent(path)}`;
}

export function kayitUrlWithReturn(path: string): string {
  return `/kayit?returnUrl=${encodeURIComponent(path)}`;
}

/** Öğrenci giriş/kayıt sonrası paket sayfasına dönmek için */
export function ogrenciGirisSonrasiHedef(
  rol: string | undefined,
  returnUrl: string | null
): string | null {
  if (rol !== 'OGRENCI' || !returnUrl) return null;
  return returnUrl;
}
