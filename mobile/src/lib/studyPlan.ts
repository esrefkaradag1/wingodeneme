/** Çalışma planı gösterim yardımcıları (web ile aynı mantık) */

export const GUNLUK_OTURUM_SAYISI = 4;
export const OTURUM_SURE_DK = 45;

const OTURUM_BASLANGIC_DK = [9 * 60, 10 * 60, 11 * 60, 14 * 60];

function dkToSaat(dk: number): string {
  const h = Math.floor(dk / 60);
  const m = dk % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function gorevBaslikTemizle(baslik: string): string {
  const temiz = baslik.replace(/\s*[—–-]\s*\d+\.\s*blok\s*$/i, '').trim();
  return temiz || baslik.trim();
}

export function oturumEtiketi(oturumNo: number): string {
  return `${oturumNo}. oturum`;
}

export function oturumSaatAraligi(oturumNo: number, sureDakika = OTURUM_SURE_DK): string {
  const idx = Math.max(1, Math.min(GUNLUK_OTURUM_SAYISI, oturumNo)) - 1;
  const baslangicDk = OTURUM_BASLANGIC_DK[idx] ?? OTURUM_BASLANGIC_DK[0];
  const bitisDk = baslangicDk + sureDakika;
  return `${dkToSaat(baslangicDk)} – ${dkToSaat(bitisDk)}`;
}

export const CALISMA_PLANI_ACIKLAMA =
  'Her gün 4 çalışma oturumuna bölünmüştür. Her oturum tek bir konuya odaklanır ve yaklaşık 45 dakika sürer.';
