import { OgretimTuru } from '@prisma/client';

export type SinifGrupKaydi = {
  id: string;
  ad?: string | null;
  tur: OgretimTuru;
  sinifSeviyesi?: number | null;
  parentId?: string | null;
};

/** '10', '10. Sınıf', 'mezun' → 10 / 12 (mezun 12 sayılır) */
export function sinifSeviyesiCoz(sinif?: string | null): number | null {
  const ham = String(sinif || '').trim().toLocaleLowerCase('tr-TR');
  if (!ham) return null;
  if (ham.includes('mezun')) return 12;
  const sayi = parseInt(ham.replace(/[^\d]/g, ''), 10);
  if (Number.isNaN(sayi)) return null;
  return sayi >= 6 && sayi <= 12 ? sayi : null;
}

/**
 * Öğrencinin sınıfına göre atanacağı grup id'leri.
 * - Sınıf seviyesi eşleşen gruplar (6/7/8 · 9/10/11/12) önceliklidir.
 * - Seviye grubu yoksa kademenin seviyesiz (genel) gruplarına düşer.
 * - KPSS kademelerinde seviye kavramı yoktur; kademe grubu kullanılır.
 */
export function ogrenciSinifGrupIdleri(
  gruplar: SinifGrupKaydi[],
  sinif?: string | null,
  ogretimTuru?: OgretimTuru | string | null,
): string[] {
  const tur = String(ogretimTuru || '') as OgretimTuru;
  const kademeGruplari = gruplar.filter((g) => g.tur === tur);
  if (!kademeGruplari.length) return [];

  const seviye = sinifSeviyesiCoz(sinif);
  if (seviye != null) {
    const seviyeEslesen = kademeGruplari.filter((g) => g.sinifSeviyesi === seviye);
    if (seviyeEslesen.length) return seviyeEslesen.map((g) => g.id);
  }

  // Seviyesi tanımsız (genel kademe) gruplar — eski davranışla uyumlu
  const genel = kademeGruplari.filter((g) => g.sinifSeviyesi == null);
  if (genel.length) {
    // Alt grup varsa (TYT/AYT gibi) onları, yoksa kök grubu ver
    const altlar = genel.filter((g) => g.parentId);
    return (altlar.length ? altlar : genel).map((g) => g.id);
  }
  return [];
}
