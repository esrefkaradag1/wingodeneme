/**
 * LGS ara sınıf (6 ve 7) konu ağacını veritabanına yükler.
 * Kullanım: npm run seed:lgs-ara-sinif
 */
import { OgretimTuru, PrismaClient } from '@prisma/client';
import { KONU_AGACI } from '../data/konuAgaci';

const prisma = new PrismaClient();

async function main() {
  const hedef = KONU_AGACI.filter(
    (konu) => konu.ogretimTuru === OgretimTuru.SINIF_6 || konu.ogretimTuru === OgretimTuru.SINIF_7
  );

  const chunk = 25;
  for (let i = 0; i < hedef.length; i += chunk) {
    const slice = hedef.slice(i, i + chunk);
    await prisma.$transaction(
      slice.map((konu) =>
        prisma.konu.upsert({
          where: { id: konu.id },
          update: {
            ad: konu.ad,
            ders: konu.ders,
            ogretimTuru: konu.ogretimTuru,
            uniteAdi: konu.uniteAdi,
            yksSegment: konu.yksSegment,
          },
          create: { ...konu, kazanimlar: [] },
        })
      )
    );
    process.stdout.write(`\r${Math.min(i + chunk, hedef.length)} / ${hedef.length}`);
  }

  console.log(`\nLGS ara sınıf konuları yüklendi: ${hedef.length} kayıt`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
