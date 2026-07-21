/** Çalışma planı görevlerini öğrenciye anlaşılır şekilde göstermek için yardımcılar. */

export const GUNLUK_OTURUM_SAYISI = 4;
export const OTURUM_SURE_DK = 45;

/** Gün içi oturumlar için önerilen başlangıç (gece yarısından dakika). */
const OTURUM_BASLANGIC_DK = [9 * 60, 10 * 60, 11 * 60, 14 * 60];

function dkToSaat(dk: number): string {
  const h = Math.floor(dk / 60);
  const m = dk % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "Konu — 2. blok" → "Konu" */
export function gorevBaslikTemizle(baslik: string): string {
  const temiz = baslik.replace(/\s*[—–-]\s*\d+\.\s*blok\s*$/i, '').trim();
  return temiz || baslik.trim();
}

/** Başlıktaki blok numarasını okur (eski planlar). */
export function gorevBlokNoParse(baslik: string): number | null {
  const m = baslik.match(/\s*[—–-]\s*(\d+)\.\s*blok\s*$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function oturumEtiketi(oturumNo: number): string {
  return `${oturumNo}. oturum`;
}

/** Örn. "09:00 – 09:45" */
export function oturumSaatAraligi(oturumNo: number, sureDakika = OTURUM_SURE_DK): string {
  const idx = Math.max(1, Math.min(GUNLUK_OTURUM_SAYISI, oturumNo)) - 1;
  const baslangicDk = OTURUM_BASLANGIC_DK[idx] ?? OTURUM_BASLANGIC_DK[0];
  const bitisDk = baslangicDk + sureDakika;
  return `${dkToSaat(baslangicDk)} – ${dkToSaat(bitisDk)}`;
}

export function gunlukOzetMetni(gorevler: Array<{ sureDakika: number }>): string {
  const toplamDk = gorevler.reduce((a, g) => a + g.sureDakika, 0);
  const saat = Math.floor(toplamDk / 60);
  const dk = toplamDk % 60;
  const sure =
    saat > 0 && dk > 0 ? `${saat} sa ${dk} dk` : saat > 0 ? `${saat} saat` : `${dk} dk`;
  return `${gorevler.length} oturum · toplam ${sure}`;
}

export const CALISMA_PLANI_ACIKLAMA =
  'Her gün 4 çalışma oturumuna bölünmüştür. Her oturum tek bir konuya odaklanır ve yaklaşık 45 dakika sürer. Oturumlar arasında 10–15 dakika mola vermen önerilir.';
