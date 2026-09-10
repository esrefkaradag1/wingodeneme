/** Havale / EFT ödeme bilgileri (öğrenciye gösterilir) */
export const HAVALE_HESAP = {
  unvan: 'EDUNOVA TECH EĞİTİM VE BİLİŞİM TEKNOLOJİLERİ SANAYİ TİCARET LİMİTED ŞİRKETİ',
  banka: 'Albaraka Türk',
  hesapNo: '180-10722059-1',
  iban: 'TR460020300010722059000001',
  ibanGorunum: 'TR46 0020 3000 1072 2059 0000 01',
  vergiDairesi: 'İKİTELLİ',
  adres:
    'Ziya Gökalp Mah. Süleyman Demirel Blv. The Office No: 7 E İç Kapı No: 136 Başakşehir / İstanbul',
} as const;

export function havaleAciklamaKodu(referansNo?: string | null, siparisId?: string): string {
  const raw = String(referansNo || siparisId || '').replace(/\s+/g, '');
  return raw.slice(-10).toUpperCase() || 'WINGO';
}

export function havaleBilgiPaketi(opts: {
  tutar: number;
  referansNo?: string | null;
  siparisId: string;
}) {
  const aciklama = havaleAciklamaKodu(opts.referansNo, opts.siparisId);
  return {
    ...HAVALE_HESAP,
    tutar: opts.tutar,
    aciklamaKodu: aciklama,
    talimat: `Havale/EFT açıklamasına «${aciklama}» yazın. Ödeme sonrası Siparişlerim’den ödeme bildirimi gönderin; onaylanınca erişiminiz açılır.`,
  };
}
