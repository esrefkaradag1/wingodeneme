/** Havale / EFT ile ödeme için şirket ve banka bilgileri */
export const HAVALE_HESAP = {
  unvan: 'EDUNOVA TECH EĞİTİM VE BİLİŞİM TEKNOLOJİLERİ SANAYİ TİCARET LİMİTED ŞİRKETİ',
  banka: 'Albaraka Türk',
  hesapNo: '180-10722059-1',
  iban: 'TR46 0020 3000 1072 2059 0000 01',
  ibanGorunum: 'TR46 0020 3000 1072 2059 0000 01',
  vergiDairesi: 'İKİTELLİ',
  adres:
    'Ziya Gökalp Mah. Süleyman Demirel Blv. The Office No: 7 E İç Kapı No: 136 Başakşehir / İstanbul',
} as const;

export function havaleAciklamaKodu(referansNo?: string | null, siparisId?: string): string {
  const raw = (referansNo || siparisId || '').replace(/\s+/g, '');
  return raw.slice(-10).toUpperCase() || 'WINGO';
}
