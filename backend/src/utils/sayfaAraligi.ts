export interface SayfaAraligi {
  baslangic: number | null;
  bitis: number | null;
}

/** Form/body alanlarını doğrular; ikisi de boşsa null döner (tüm sayfalar). */
export function sayfaAraligiParse(bas?: unknown, bit?: unknown): SayfaAraligi | null {
  const bos = (v: unknown) => v === undefined || v === null || v === '';
  if (bos(bas) && bos(bit)) return null;

  const baslangic = bos(bas) ? null : parseInt(String(bas), 10);
  const bitis = bos(bit) ? null : parseInt(String(bit), 10);

  if (baslangic != null && (!Number.isFinite(baslangic) || baslangic < 1)) {
    throw new Error('Başlangıç sayfası 1 veya daha büyük olmalıdır.');
  }
  if (bitis != null && (!Number.isFinite(bitis) || bitis < 1)) {
    throw new Error('Bitiş sayfası 1 veya daha büyük olmalıdır.');
  }
  if (baslangic != null && bitis != null && bitis < baslangic) {
    throw new Error('Bitiş sayfası, başlangıç sayfasından küçük olamaz.');
  }

  return { baslangic, bitis };
}

export function sayfaAraligiEtiket(aralik: SayfaAraligi | null | undefined): string | null {
  if (!aralik) return null;
  const { baslangic, bitis } = aralik;
  if (baslangic && bitis) return `${baslangic}–${bitis}`;
  if (baslangic) return `${baslangic}+`;
  if (bitis) return `1–${bitis}`;
  return null;
}
