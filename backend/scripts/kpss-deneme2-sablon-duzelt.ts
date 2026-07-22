/**
 * KPSS ORTA ÖĞRETİM DENEME 2: GK şablonunu Deneme 1'den kopyala, mükerrer/fazla soruları temizle.
 *
 *   npx ts-node --transpile-only scripts/kpss-deneme2-sablon-duzelt.ts
 *   npx ts-node --transpile-only scripts/kpss-deneme2-sablon-duzelt.ts --dry
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { soruMetinImzasi, soruMetinImzasiGecerli } from '../src/utils/soruMetinImza';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry');

const DENEME1_BASLIK = 'KPSS ORTA ÖĞRETİM DENEME 1';
const DENEME2_BASLIK = 'KPSS ORTA ÖĞRETİM DENEME 2';

type KonuDagilimiV2 = {
  version?: number;
  bolumler?: Array<{
    ad: string;
    altBolumler?: Array<Record<string, unknown>>;
    satirlar?: unknown[];
  }>;
};

function bolumBul(kd: KonuDagilimiV2 | null | undefined, anahtar: 'YETENEK' | 'KÜLTÜR') {
  return (kd?.bolumler ?? []).find((b) => {
    const ad = String(b.ad || '').toLocaleUpperCase('tr-TR');
    return anahtar === 'YETENEK' ? ad.includes('YETENEK') : ad.includes('KÜLTÜR') || ad.includes('KULTUR');
  });
}

async function ozet(sinavId: string, etiket: string) {
  const sorular = await prisma.soru.findMany({
    where: { sinavId },
    select: { konuId: true, konu: { select: { ders: true } } },
  });
  const ders: Record<string, number> = {};
  for (const s of sorular) {
    const d = s.konu?.ders || '?';
    ders[d] = (ders[d] || 0) + 1;
  }
  console.log(`${etiket}: ${sorular.length} soru`, ders);
}

async function main() {
  const [d1, d2] = await Promise.all([
    prisma.sinav.findFirst({ where: { baslik: DENEME1_BASLIK } }),
    prisma.sinav.findFirst({ where: { baslik: DENEME2_BASLIK } }),
  ]);

  if (!d1 || !d2) {
    console.error('Sınav bulunamadı', { d1: !!d1, d2: !!d2 });
    process.exit(1);
  }

  console.log('Deneme 1:', d1.id);
  console.log('Deneme 2:', d2.id);

  const kd1 = d1.konuDagilimi as KonuDagilimiV2;
  const kd2 = d2.konuDagilimi as KonuDagilimiV2;
  const gyBolum = bolumBul(kd2, 'YETENEK') ?? bolumBul(kd1, 'YETENEK');
  const gkBolumD1 = bolumBul(kd1, 'KÜLTÜR');

  if (!gyBolum || !gkBolumD1) {
    console.error('GY/GK bölümü bulunamadı');
    process.exit(1);
  }

  const yeniKonuDagilimi: KonuDagilimiV2 = {
    version: 2,
    bolumler: [gyBolum, gkBolumD1],
  };

  const gkSatir = (gkBolumD1.altBolumler?.[0] as { satirlar?: { adet: number }[] })?.satirlar ?? [];
  const gkPlan = gkSatir.reduce((a, s) => a + (s.adet || 0), 0);
  console.log(`Yeni GK şablon: ${gkSatir.length} satır, ${gkPlan} planlı soru`);

  if (DRY) {
    console.log('[DRY] konuDagilimi güncellenmedi');
  } else {
    await prisma.sinav.update({
      where: { id: d2.id },
      data: { konuDagilimi: yeniKonuDagilimi as Prisma.InputJsonValue },
    });
    console.log('konuDagilimi güncellendi (GK şablon Deneme 1\'den kopyalandı)');
  }

  // Mükerrer temizliği
  const sorular = await prisma.soru.findMany({
    where: { sinavId: d2.id },
    orderBy: { siraNo: 'asc' },
    select: { id: true, siraNo: true, metinHtml: true, konu: { select: { ders: true } } },
  });

  const imzaIlk = new Map<string, { id: string; siraNo: number }>();
  const silinecekIds: string[] = [];

  for (const s of sorular) {
    const imza = soruMetinImzasi(s.metinHtml);
    if (!soruMetinImzasiGecerli(imza)) continue;
    const ilk = imzaIlk.get(imza);
    if (!ilk) {
      imzaIlk.set(imza, { id: s.id, siraNo: s.siraNo });
      continue;
    }
    silinecekIds.push(s.id);
    console.log(`Mükerrer: S.${s.siraNo} (${s.konu?.ders}) → S.${ilk.siraNo} ile aynı`);
  }

  // Fazla Geometri (4→3) — 123 - 2 mükerrer - 1 geo = 120
  const geoLimit = 3;
  const geoListe = sorular.filter(
    (s) => !silinecekIds.includes(s.id) && s.konu?.ders === 'Geometri',
  );
  const geoFazla = geoListe.length - geoLimit;
  if (geoFazla > 0) {
    for (const s of geoListe.slice(-geoFazla)) {
      silinecekIds.push(s.id);
      console.log(`Fazla Geometri: S.${s.siraNo} silinecek (${geoListe.length} > ${geoLimit})`);
    }
  }

  const benzersizSil = [...new Set(silinecekIds)];
  console.log(`Toplam silinecek: ${benzersizSil.length} (${sorular.length} → ${sorular.length - benzersizSil.length})`);

  if (benzersizSil.length > 0 && !DRY) {
    await prisma.soru.deleteMany({ where: { id: { in: benzersizSil } } });

    const kalan = await prisma.soru.findMany({
      where: { sinavId: d2.id },
      orderBy: { siraNo: 'asc' },
      select: { id: true },
    });
    for (let i = 0; i < kalan.length; i++) {
      await prisma.soru.update({
        where: { id: kalan[i].id },
        data: { siraNo: i + 1 },
      });
    }
    console.log('siraNo 1..N yeniden numaralandırıldı');
  }

  await ozet(d2.id, DRY ? 'Sonuç (dry — silme uygulanmadı)' : 'Sonuç');

  // Şablona uymayan soru sayısı
  const guncelSinav = await prisma.sinav.findUnique({ where: { id: d2.id } });
  const tplKonuIds = new Set<string>();
  for (const b of (guncelSinav?.konuDagilimi as KonuDagilimiV2)?.bolumler ?? []) {
    for (const ab of b.altBolumler ?? []) {
      for (const row of (ab as { satirlar?: { konuId: string }[] }).satirlar ?? []) {
        if (row.konuId) tplKonuIds.add(row.konuId);
      }
    }
  }
  const kalanSorular = await prisma.soru.findMany({
    where: { sinavId: d2.id },
    select: { konuId: true },
  });
  const yetim = kalanSorular.filter((s) => !tplKonuIds.has(s.konuId)).length;
  console.log(`Şablona uymayan soru: ${yetim}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
