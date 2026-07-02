/**
 * Kitapçık üst bilgisinde ÖSYM’ye benzer “sırasıyla X (1-5), Y (6-10) … toplam N soru” metni.
 */

import { TUR_BILGI } from '@/lib/osymKitapcikMetin';

export type DagilimBloku = { etiket: string; bas: number; bit: number };

/** Bölüm/test içinde soruları global sıraya göre dizip 1..n yerel numara verir */
export function sorularaYerelSiraAt<T extends { siraNo?: number }>(
  sorular: T[],
  bas = 1,
): Array<T & { siraNo: number }> {
  const sirali = [...sorular].sort((a, b) => (a.siraNo ?? 0) - (b.siraNo ?? 0));
  return sirali.map((soru, idx) => ({
    ...soru,
    siraNo: bas + idx,
  }));
}

function normTr(s: string): string {
  return (s || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Veritabanındaki ders adını kitapçıkta okunacak ÖSYM’ye yakın etikete çevirir */
export function dersKitapcikEtiketi(ders: string): string {
  const ham = (ders || '').trim();
  if (!ham) return 'Genel';
  const n = normTr(ham);
  const u = ham.toLocaleUpperCase('tr-TR');

  if (n.includes('turk dili') || (n.includes('turk') && n.includes('edeb'))) return 'Türk Dili ve Edebiyatı';
  if (n.includes('edebiyat') && !n.includes('turk')) return 'Türk Dili ve Edebiyatı';
  if (n === 'turkce' || u === 'TÜRKÇE') return 'Türkçe';
  if (n.includes('matematik') && !n.includes('geometri')) return 'Matematik';
  if (n.includes('geometri')) return 'Geometri';
  if (n.includes('fizik')) return 'Fizik';
  if (n.includes('kimya')) return 'Kimya';
  if (n.includes('biyoloji')) return 'Biyoloji';
  if (n.includes('fen bilim')) return 'Fen Bilimleri';
  if (n.includes('inkilap') || n.includes('ataturk')) return 'T.C. İnkılap Tarihi ve Atatürkçülük';
  if (n.includes('din kult')) return 'Din Kültürü ve Ahlak Bilgisi';
  if (n.includes('felsefe')) return 'Felsefe Grubu';
  if (n.includes('tarih')) return 'Tarih-1';
  if (n.includes('cografya')) return 'Coğrafya-1';
  if (n.includes('ingilizce')) return 'İngilizce';
  return ham;
}

/**
 * Soruları siraNo sırasına göre dizer; aynı dersin ardışık sorularını tek blokta birleştirir.
 * Aynı ders iki ayrı aralıkta ise iki blok üretir.
 */
export function soruSirasinaGoreDersBloklari<T extends { siraNo: number; konu?: { ders?: string } }>(
  sorular: T[]
): DagilimBloku[] {
  const sorted = [...sorular].sort((a, b) => (a.siraNo ?? 0) - (b.siraNo ?? 0));
  const out: DagilimBloku[] = [];
  for (const s of sorted) {
    const etiket = dersKitapcikEtiketi(String(s.konu?.ders || 'Genel'));
    const no = s.siraNo ?? 0;
    if (!no) continue;
    const last = out[out.length - 1];
    if (last && last.etiket === etiket && no === last.bit + 1) {
      last.bit = no;
    } else {
      out.push({ etiket, bas: no, bit: no });
    }
  }
  return out;
}

export function formatOsymDagilimCumlesi(bloklar: DagilimBloku[], toplam: number): string {
  if (toplam <= 0) {
    return 'Bu teste henüz soru eklenmemiştir; yönetim panelinden soru tanımlandığında metin güncellenir.';
  }
  if (bloklar.length === 0) {
    return `Bu testte toplam ${toplam} soru vardır.`;
  }
  const parca = bloklar.map((b) => `${b.etiket} (${b.bas}-${b.bit})`).join(', ');
  if (bloklar.length === 1) {
    return `Bu testte ${parca} alanına ait toplam ${toplam} soru vardır.`;
  }
  return `Bu testte sırasıyla ${parca} alanlarına ait toplam ${toplam} soru vardır.`;
}

/** Sol üst köşe: örn. 2025-AYT/TDE-SB1 — bölüm adından kısaltma */
export function kitapcikSolKodSatir(yil: number, tur: string, bolumAdi: string): string {
  const kod = TUR_BILGI[tur]?.kod || tur;
  const alt = bolumdenKisaKod(bolumAdi, tur);
  return `${yil}-${kod}/${alt}`;
}

export function bolumdenKisaKod(bolumAdi: string, tur: string): string {
  const b = (bolumAdi || '').toLocaleUpperCase('tr-TR');
  const n = normTr(bolumAdi);

  if (tur === 'TYT') {
    if (b.includes('TÜRKÇE') || n.includes('turkce')) return 'TUR';
    if (b.includes('SOSYAL')) return 'SOS';
    if (b.includes('MATEMATİK') || b.includes('MATEMATIK') || b.includes('GEOMETR')) return 'MAT';
    if (b.includes('FEN')) return 'FEN';
    return 'TYT';
  }
  if (tur === 'AYT' || tur === 'AYT_TYT') {
    if ((b.includes('TÜRK') || b.includes('TURK')) && b.includes('EDEB')) return 'TDE-SB1';
    if (b.includes('SOSYAL') && b.includes('BİLİM')) return 'SOS-SB1';
    if (b.includes('SAYISAL')) return 'SAY-SB1';
    if (b.includes('EŞİT') || b.includes('ESIT')) return 'ESIT-SB1';
    if (b.includes('MATEMAT')) return 'MAT';
    if (b.includes('FEN')) return 'FEN';
    return 'AYT';
  }
  if (tur === 'LGS') return 'LGS';
  return TUR_BILGI[tur]?.kod || tur;
}
