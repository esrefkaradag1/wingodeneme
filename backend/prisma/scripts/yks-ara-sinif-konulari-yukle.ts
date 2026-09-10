/**
 * YKS ara sınıf (9, 10 ve 11. sınıf) konu ağacını veritabanına yükler.
 * Kullanım: npm run seed:yks-ara-sinif
 */
import { OgretimTuru, PrismaClient } from '@prisma/client';
import { KONU_AGACI } from '../data/konuAgaci';

const prisma = new PrismaClient();

async function main() {
  const araSiniflar = [OgretimTuru.SINIF_9, OgretimTuru.SINIF_10, OgretimTuru.SINIF_11];
  const hedef = KONU_AGACI.filter((konu) => araSiniflar.includes(konu.ogretimTuru as OgretimTuru));

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

  console.log(`\nYKS ara sınıf konuları yüklendi: ${hedef.length} kayıt`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
