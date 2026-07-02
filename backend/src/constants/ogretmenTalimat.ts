/** Öğretmen talimatı — panel ve API üst sınırı (karakter) */
export const OGRETMEN_TALIMAT_MAX = 3000;

export function ogretmenTalimatKirp(talimat?: string | null): string {
  return (talimat || '').trim().slice(0, OGRETMEN_TALIMAT_MAX);
}

/** Modele eklenecek katı kısıt bloğu */
export function ogretmenTalimatBlogu(talimat?: string | null): string {
  const t = ogretmenTalimatKirp(talimat);
  if (!t) return '';
  return `

⛔ ÖĞRETMEN TALİMATI — ZORUNLU KISIT (genel kurallardan öncelikli, ihlal EDİLEMEZ):
${t}

Bu talimattaki fiziksel, görsel, biçimsel, dilsel ve içerik kurallarına %100 uy.
Talimat ile genel kurallar çelişirse YALNIZCA TALİMAT geçerlidir.
Üretilen soru metni, şıklar, cozumAciklamasi ve svgGorsel (varsa) bu kısıtları karşılamalıdır.
`;
}
