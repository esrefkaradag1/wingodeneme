/**
 * YKS sıralama–net ilişkisi için sadeleştirilmiş tahmin modeli.
 * Gerçek yerleştirme puanı / sıralama OSYM verilerinden farklıdır; yalnızca eğitim amaçlı yönlendirme içindir.
 */

const DERS_KATSAYI: Record<string, number> = {
  MATEMATIK: 1.15,
  TURKCE: 1.0,
  FIZIK: 1.05,
  KIMYA: 1.0,
  BIYOLOJI: 1.0,
  TARIH: 0.95,
  COGRAFYA: 0.95,
  FELSEFE: 0.9,
  INGILIZCE: 0.95,
  GENEL: 1.0,
};

function dersAnahtari(etiket: string): string {
  const t = etiket.trim().toUpperCase();
  if (t.includes('MATEMAT') || t.includes('MATEMATİK')) return 'MATEMATIK';
  if (t.includes('TÜRK') || t.includes('TURK')) return 'TURKCE';
  if (t.includes('FİZ') || t.includes('FIZ')) return 'FIZIK';
  if (t.includes('KİM') || t.includes('KIM')) return 'KIMYA';
  if (t.includes('BİYO') || t.includes('BIYO')) return 'BIYOLOJI';
  if (t.includes('TARİH') || t.includes('TARIH')) return 'TARIH';
  if (t.includes('COĞ') || t.includes('COG')) return 'COGRAFYA';
  if (t.includes('FELSE')) return 'FELSEFE';
  if (t.includes('İNG') || t.includes('ING')) return 'INGILIZCE';
  return 'GENEL';
}

export interface NetSimulasyonGirdi {
  siralama: number;
  ders: string;
  ekNet: number;
}

export interface NetSimulasyonSonuc {
  mevcutSiralama: number;
  ders: string;
  ekNet: number;
  tahminiYeniSiralama: number;
  siralamaIyilesme: number;
  yuzdeIyilesmeYaklasik: number;
  uyari: string;
  metodNotu: string;
}

export function netSimulasyonHesapla(girdi: NetSimulasyonGirdi): NetSimulasyonSonuc {
  const siralama = Math.max(1, Math.floor(Number(girdi.siralama) || 1));
  const ekNet = Math.max(0, Math.min(40, Number(girdi.ekNet) || 0));
  const key = dersAnahtari(girdi.ders || 'GENEL');
  const w = DERS_KATSAYI[key] ?? DERS_KATSAYI.GENEL;

  // Her ek net, sıralamayı çok kaba bir şekilde iyileştirir: çarpan ≈ 1 / (1 + α * ekNet * w)
  const alpha = 0.085;
  const carpan = 1 + alpha * ekNet * w;
  const tahminiYeniSiralama = Math.max(1, Math.round(siralama / carpan));
  const siralamaIyilesme = siralama - tahminiYeniSiralama;
  const yuzdeIyilesmeYaklasik = siralama > 0 ? Math.round((siralamaIyilesme / siralama) * 1000) / 10 : 0;

  return {
    mevcutSiralama: siralama,
    ders: girdi.ders,
    ekNet,
    tahminiYeniSiralama,
    siralamaIyilesme,
    yuzdeIyilesmeYaklasik,
    uyari:
      'Bu sonuç istatistiksel bir örneklemdir; gerçek YKS sıralamanız ders net dağılımı, baraj ve kontenjanlara göre değişir.',
    metodNotu:
      'WingoSınav rehber modeli: seçilen derse göre ağırlık uygulanır; amaç motivasyon ve çalışma yönü vermektir.',
  };
}
