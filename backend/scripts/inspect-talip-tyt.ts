import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const talip = await p.kullanici.findFirst({
    where: { email: 'tcoogu@gmail.com' },
    select: {
      id: true,
      email: true,
      rol: true,
      adminProfil: { select: { id: true, ad: true, soyad: true, brans: true, ogretimTuru: true } },
    },
  });
  console.log('TALIP', JSON.stringify(talip, null, 2));
  if (!talip) return;

  const byStatus = await p.soru.groupBy({
    by: ['onayDurumu'],
    where: { olusturanId: talip.id },
    _count: { _all: true },
  });
  console.log('BY_STATUS', byStatus);
  console.log('TOTAL', await p.soru.count({ where: { olusturanId: talip.id } }));

  const sample = await p.soru.findMany({
    where: { olusturanId: talip.id },
    take: 15,
    orderBy: { olusturuldu: 'desc' },
    include: {
      konu: { select: { ad: true, ders: true, ogretimTuru: true, yksSegment: true } },
      sinav: { select: { baslik: true } },
    },
  });
  console.log(
    'SAMPLE',
    sample.map((s) => ({
      onay: s.onayDurumu,
      ders: s.konu?.ders,
      konu: s.konu?.ad,
      seg: s.konu?.yksSegment,
      tur: s.konu?.ogretimTuru,
      sinav: s.sinav?.baslik ?? null,
    })),
  );

  const turkRelated = await p.soru.findMany({
    where: {
      olusturanId: talip.id,
      OR: [
        { konu: { ders: { contains: 'Türk', mode: 'insensitive' } } },
        { konu: { ders: { contains: 'Edebiyat', mode: 'insensitive' } } },
      ],
    },
    select: {
      onayDurumu: true,
      sinavId: true,
      konu: { select: { ad: true, ders: true, yksSegment: true, ogretimTuru: true } },
      sinav: { select: { baslik: true } },
    },
  });
  console.log('TURK_EDEB_TOTAL', turkRelated.length);
  const m = new Map<string, number>();
  for (const s of turkRelated) {
    const k = [
      s.onayDurumu,
      s.konu.ogretimTuru,
      s.konu.yksSegment,
      s.konu.ders,
      s.konu.ad,
      s.sinav?.baslik ?? 'HAVUZ/NULL',
    ].join(' | ');
    m.set(k, (m.get(k) || 0) + 1);
  }
  [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(v, k));

  const allTytOnay = await p.soru.count({
    where: {
      onayDurumu: 'ONAYLANDI',
      konu: {
        ders: { contains: 'Türkçe', mode: 'insensitive' },
        ogretimTuru: 'YKS',
        yksSegment: 'TYT',
      },
    },
  });
  const allTytBekleyen = await p.soru.count({
    where: {
      onayDurumu: 'ONAY_BEKLIYOR',
      konu: {
        ders: { contains: 'Türkçe', mode: 'insensitive' },
        ogretimTuru: 'YKS',
        yksSegment: 'TYT',
      },
    },
  });
  console.log({ allTytOnay, allTytBekleyen });

  for (const ad of ['Anlatım Bozuklukları', 'Cümle Türleri', 'Cümlede Anlam', 'Paragrafta Anlam', 'Sözcükte Anlam']) {
    const konular = await p.konu.findMany({
      where: { ad: { contains: ad, mode: 'insensitive' }, ogretimTuru: 'YKS' },
      select: { id: true, ad: true, ders: true, yksSegment: true },
    });
    for (const konu of konular) {
      const all = await p.soru.groupBy({
        by: ['onayDurumu'],
        where: { konuId: konu.id },
        _count: { _all: true },
      });
      const talipC = await p.soru.groupBy({
        by: ['onayDurumu'],
        where: { konuId: konu.id, olusturanId: talip.id },
        _count: { _all: true },
      });
      console.log('KONU', konu.yksSegment, konu.ad, 'ALL', all, 'TALIP', talipC);
    }
  }

  // Where are Talip questions sitting if not on TYT topics?
  const byKonu = await p.soru.groupBy({
    by: ['konuId', 'onayDurumu'],
    where: { olusturanId: talip.id },
    _count: { _all: true },
  });
  const konuIds = [...new Set(byKonu.map((x) => x.konuId))];
  const konular = await p.konu.findMany({
    where: { id: { in: konuIds } },
    select: { id: true, ad: true, ders: true, ogretimTuru: true, yksSegment: true },
  });
  const km = Object.fromEntries(konular.map((k) => [k.id, k]));
  console.log('ALL_TALIP_KONULAR');
  for (const row of byKonu.sort((a, b) => b._count._all - a._count._all)) {
    const k = km[row.konuId];
    console.log(
      row._count._all,
      row.onayDurumu,
      k?.ogretimTuru,
      k?.yksSegment,
      k?.ders,
      k?.ad,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await p.$disconnect();
  });
