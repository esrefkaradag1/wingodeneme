/**
 * KPSS konu ağacını veritabanına yükler (mevcut kurulumlar için).
 * Kullanım: npm run seed:kpss
 */
import { PrismaClient } from '@prisma/client';
import { KPSS_KONU_AGACI } from '../data/kpssKonuAgaci';

const prisma = new PrismaClient();

async function main() {
  const chunk = 25;
  for (let i = 0; i < KPSS_KONU_AGACI.length; i += chunk) {
    const slice = KPSS_KONU_AGACI.slice(i, i + chunk);
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
        }),
      ),
    );
    process.stdout.write(`\r${Math.min(i + chunk, KPSS_KONU_AGACI.length)} / ${KPSS_KONU_AGACI.length}`);
  }
  console.log(`\nKPSS konuları yüklendi: ${KPSS_KONU_AGACI.length} kayıt`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
