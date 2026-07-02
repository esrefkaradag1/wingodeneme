/** Soru listesi / detay için düzenleyen kullanıcı seçimi */
export const soruKullaniciOzetSelect = {
  id: true,
  email: true,
  rol: true,
  adminProfil: { select: { ad: true, soyad: true, brans: true } },
} as const;

export type SoruKullaniciOzet = {
  id: string;
  email: string;
  rol: string;
  adminProfil: { ad: string; soyad: string; brans: string | null } | null;
};

export function kullaniciGorunenAd(k: SoruKullaniciOzet | null | undefined): string | null {
  if (!k) return null;
  const ad = k.adminProfil?.ad?.trim();
  const soyad = k.adminProfil?.soyad?.trim();
  if (ad) return [ad, soyad].filter(Boolean).join(' ');
  return k.email;
}

export function kullaniciBransEtiketi(k: SoruKullaniciOzet | null | undefined): string | null {
  const brans = k?.adminProfil?.brans?.trim();
  if (!brans) return null;
  return brans.split(',')[0]?.trim() || null;
}

/** Soru onay bekliyor mu? (enum: ONAY_BEKLIYOR) */
export function soruOnayBekliyorMu(onayDurumu?: string | null): boolean {
  return onayDurumu === 'ONAY_BEKLIYOR';
}

/** Öğretmen yalnızca kendi hazırladığı soruda işlem yapabilir; sahipsiz bekleyen sorular branş içi üstlenilebilir */
export function soruOgretmenSahibiMi(
  soru: {
    olusturanId?: string | null;
    duzenleyenId?: string | null;
    onayDurumu?: string | null;
  },
  userId: string,
): boolean {
  if (soru.olusturanId) return soru.olusturanId === userId;
  if (soru.duzenleyenId) return soru.duzenleyenId === userId;
  return false;
}
