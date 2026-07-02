import { LGS_OSYM_DERS_ADET } from '@/lib/sinav-konu-sablon';
import { bolumlerFromKonuDagilimi } from '@/lib/sinav-konu-dagilim';
import {
  formatOsymDagilimCumlesi,
  soruSirasinaGoreDersBloklari,
  sorularaYerelSiraAt,
  type DagilimBloku,
} from '@/lib/kitapcikDagilimMetni';

export type KitapcikBolumKey = 'TR' | 'SOS' | 'MAT' | 'FEN' | 'DIGER';

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

function tytBolumKey(ders: string): KitapcikBolumKey {
  const d = normTr(ders);
  if (d.includes('turkce') || d.includes('dil')) return 'TR';
  if (d.includes('matematik') || d.includes('geometri')) return 'MAT';
  if (d.includes('fizik') || d.includes('kimya') || d.includes('biyoloji') || d.includes('fen')) return 'FEN';
  if (d.includes('tarih') || d.includes('cografya') || d.includes('felsefe') || d.includes('din')) return 'SOS';
  return 'DIGER';
}

function lgsBolumKey(ders: string): KitapcikBolumKey {
  const d = normTr(ders);
  if (d.includes('turkce')) return 'TR';
  if (d.includes('matematik')) return 'MAT';
  if (d.includes('fen') || d.includes('fizik') || d.includes('kimya') || d.includes('biyoloji')) return 'FEN';
  return 'DIGER';
}

function lgsDersSiraIndex(ders: string): number {
  const d = normTr(ders);
  const idx = LGS_OSYM_DERS_ADET.findIndex((row) => {
    const sablon = normTr(row.ders);
    return d === sablon || d.includes(sablon) || sablon.includes(d);
  });
  return idx < 0 ? 999 : idx;
}

function lgsOturumSira(ders: string): number {
  const idx = lgsDersSiraIndex(ders);
  if (idx === 1 || idx === 2) return 1;
  return 0;
}

export function bolumAdiOtomatik(tur: string, ders: string): { key: KitapcikBolumKey; bolumAdi: string } {
  if (tur === 'TYT') {
    const key = tytBolumKey(ders);
    const bolumAdi =
      key === 'TR'
        ? 'TÜRKÇE TESTİ'
        : key === 'SOS'
          ? 'SOSYAL BİLİMLER TESTİ'
          : key === 'MAT'
            ? 'TEMEL MATEMATİK TESTİ'
            : key === 'FEN'
              ? 'FEN BİLİMLERİ TESTİ'
              : 'GENEL TEST';
    return { key, bolumAdi };
  }

  if (tur === 'LGS') {
    const key = lgsBolumKey(ders);
    const bolumAdi =
      key === 'TR'
        ? 'TÜRKÇE TESTİ'
        : key === 'MAT'
          ? 'MATEMATİK TESTİ'
          : key === 'FEN'
            ? 'FEN BİLİMLERİ TESTİ'
            : `${(ders || 'GENEL').toLocaleUpperCase('tr-TR')} TESTİ`;
    return { key, bolumAdi };
  }

  return { key: 'DIGER', bolumAdi: `${(ders || 'GENEL').toLocaleUpperCase('tr-TR')} TESTİ` };
}

function sorulariArdisikBolumlereAyir<T extends { konu?: { ders?: string } }>(
  tur: string,
  sorular: T[],
): Array<{ bolumAdi: string; sorular: T[] }> {
  const out: Array<{ bolumAdi: string; sorular: T[] }> = [];
  let current: { bolumAdi: string; sorular: T[] } | null = null;

  for (const s of sorular) {
    const ders = s?.konu?.ders || '';
    const { bolumAdi } = bolumAdiOtomatik(tur, ders);
    if (!current || current.bolumAdi !== bolumAdi) {
      current = { bolumAdi, sorular: [] };
      out.push(current);
    }
    current.sorular.push(s);
  }

  return out;
}

export function sorulariBolumlereAyir<T extends { konu?: { ders?: string }; siraNo?: number }>(
  tur: string,
  sorular: T[],
): Array<{ bolumAdi: string; sorular: T[] }> {
  if (tur === 'LGS') {
    const sirali = [...sorular].sort((a, b) => {
      const dersA = a?.konu?.ders || '';
      const dersB = b?.konu?.ders || '';
      const oturumFark = lgsOturumSira(dersA) - lgsOturumSira(dersB);
      if (oturumFark !== 0) return oturumFark;
      const dersFark = lgsDersSiraIndex(dersA) - lgsDersSiraIndex(dersB);
      if (dersFark !== 0) return dersFark;
      return (a.siraNo ?? 0) - (b.siraNo ?? 0);
    });

    const sozel = sirali.filter((s) => lgsOturumSira(s?.konu?.ders || '') === 0);
    const sayisal = sirali.filter((s) => lgsOturumSira(s?.konu?.ders || '') === 1);
    const out: Array<{ bolumAdi: string; sorular: T[] }> = [];

    if (sozel.length > 0) {
      out.push(
        ...sorulariArdisikBolumlereAyir('LGS', sozel).map((b) => ({
          bolumAdi: `SÖZEL BÖLÜM — ${b.bolumAdi}`,
          sorular: sorularaYerelSiraAt(b.sorular),
        })),
      );
    }
    if (sayisal.length > 0) {
      out.push(
        ...sorulariArdisikBolumlereAyir('LGS', sayisal).map((b) => ({
          bolumAdi: `SAYISAL BÖLÜM — ${b.bolumAdi}`,
          sorular: sorularaYerelSiraAt(b.sorular),
        })),
      );
    }
    return out;
  }

  return sorulariArdisikBolumlereAyir(tur, sorular).map((b) => ({
    ...b,
    sorular: sorularaYerelSiraAt(b.sorular),
  }));
}

export type KitapcikTestBolumu<T> = {
  bolumAdi: string;
  sorular: T[];
  aciklama?: string;
  dagilimBloklari?: DagilimBloku[];
};

/** Alt bölümdeki tüm konu satırlarına göre soru id → yerel sıra (1..n) */
export function altBolumYerelSiraHaritasi(
  altSatirlar: Array<{ konuId: string }>,
  sinavdakiSorular: Array<{ id: string; konuId: string; siraNo: number }>,
): Map<string, number> {
  const konuIdleri = new Set(altSatirlar.map((satir) => satir.konuId).filter(Boolean));
  const altSorular = sinavdakiSorular
    .filter((soru) => konuIdleri.has(soru.konuId))
    .sort((a, b) => a.siraNo - b.siraNo);
  const harita = new Map<string, number>();
  altSorular.forEach((soru, idx) => harita.set(soru.id, idx + 1));
  return harita;
}

function konuDagilimindeAltBolumVar(konuDagilimi: unknown): boolean {
  return bolumlerFromKonuDagilimi(konuDagilimi).some((bolum) =>
    bolum.altBolumler.some((alt) => alt.ad.trim() || alt.satirlar.length > 0),
  );
}

/** Kitapçık önizleme/HTML: konu dağılımı varsa testlere böl; tek `kitapcikBolumAdi` bunu ezmesin */
export function cozumleKitapcikBolumleri<T extends { konu?: { ders?: string }; siraNo?: number; konuId?: string; id?: string }>(
  tur: string,
  sorular: T[],
  konuDagilimi: unknown,
  kitapcikBolumAdi?: string | null,
): KitapcikTestBolumu<T>[] {
  if (konuDagilimindeAltBolumVar(konuDagilimi)) {
    return kitapcikTestleriFromDagilim(tur, sorular, konuDagilimi);
  }
  if (kitapcikBolumAdi?.trim()) {
    const yerelSorular = sorularaYerelSiraAt(sorular);
    const dagilimBloklari = soruSirasinaGoreDersBloklari(
      yerelSorular as Array<{ siraNo: number; konu?: { ders?: string } }>,
    );
    return [
      {
        bolumAdi: kitapcikBolumAdi.trim().toLocaleUpperCase('tr-TR'),
        sorular: yerelSorular,
        dagilimBloklari,
        aciklama: formatOsymDagilimCumlesi(dagilimBloklari, yerelSorular.length),
      },
    ];
  }
  return kitapcikTestleriFromDagilim(tur, sorular, konuDagilimi);
}

export function kitapcikTestleriFromDagilim<T extends { konu?: { ders?: string }; siraNo?: number; konuId?: string; id?: string }>(
  tur: string,
  sorular: T[],
  konuDagilimi: unknown,
): KitapcikTestBolumu<T>[] {
  const bolumler = bolumlerFromKonuDagilimi(konuDagilimi);
  const altBolumVar = bolumler.some((bolum) => bolum.altBolumler.some((alt) => alt.ad.trim() || alt.satirlar.length > 0));

  if (!altBolumVar) {
    return sorulariBolumlereAyir(tur, sorular).map((bolum) => {
      const yerelSorular = sorularaYerelSiraAt(bolum.sorular);
      return {
        ...bolum,
        sorular: yerelSorular,
        dagilimBloklari: soruSirasinaGoreDersBloklari(
          yerelSorular as Array<{ siraNo: number; konu?: { ders?: string } }>,
        ),
      };
    });
  }

  const testler: KitapcikTestBolumu<T>[] = [];
  const kullanilmisIds = new Set<string>();
  let globalFallbackOffset = 0;

  for (const bolum of bolumler) {
    for (const alt of bolum.altBolumler) {
      const konuIdleri = new Set(alt.satirlar.map((satir) => satir.konuId).filter(Boolean));
      if (konuIdleri.size === 0 && !alt.ad.trim()) continue;

      let altSorular = sorular.filter((soru) => {
        const id = soru.id;
        if (id && kullanilmisIds.has(id)) return false;
        const konuId = soru.konuId;
        return !!(konuId && konuIdleri.has(konuId));
      });

      if (altSorular.length === 0 && konuIdleri.size === 0 && alt.soruBas != null && alt.soruBit != null) {
        const bolumSoruAdedi = alt.soruBit - alt.soruBas + 1;
        const globalBas = globalFallbackOffset + 1;
        const globalBit = globalFallbackOffset + bolumSoruAdedi;
        altSorular = sorular.filter((soru) => {
          const id = soru.id;
          if (id && kullanilmisIds.has(id)) return false;
          const no = soru.siraNo ?? 0;
          return no >= globalBas && no <= globalBit;
        });
        globalFallbackOffset += bolumSoruAdedi;
      }

      altSorular = [...altSorular].sort((a, b) => (a.siraNo ?? 0) - (b.siraNo ?? 0));
      if (altSorular.length === 0 && alt.satirlar.length === 0) continue;

      altSorular.forEach((soru) => {
        if (soru.id) kullanilmisIds.add(soru.id);
      });

      const yerelSorular = sorularaYerelSiraAt(altSorular);
      const dagilimBloklari = soruSirasinaGoreDersBloklari(
        yerelSorular as Array<{ siraNo: number; konu?: { ders?: string } }>,
      );

      testler.push({
        bolumAdi: (alt.ad.trim() || bolum.ad.trim() || 'GENEL TEST').toLocaleUpperCase('tr-TR'),
        sorular: yerelSorular,
        aciklama:
          yerelSorular.length > 0
            ? formatOsymDagilimCumlesi(dagilimBloklari, yerelSorular.length)
            : alt.aciklama.trim() || undefined,
        dagilimBloklari,
      });
    }
  }

  if (testler.length === 0) {
    return sorulariBolumlereAyir(tur, sorular).map((bolum) => {
      const yerelSorular = sorularaYerelSiraAt(bolum.sorular);
      return {
        ...bolum,
        sorular: yerelSorular,
        dagilimBloklari: soruSirasinaGoreDersBloklari(
          yerelSorular as Array<{ siraNo: number; konu?: { ders?: string } }>,
        ),
      };
    });
  }

  return testler;
}
