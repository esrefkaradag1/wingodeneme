import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { KPSS_KONU_AGACI } from "../prisma/data/kpssKonuAgaci";

const p = new PrismaClient();

async function main() {
  let eklenen = 0;
  for (const konu of KPSS_KONU_AGACI) {
    const onceki = await p.konu.findUnique({ where: { id: konu.id }, select: { id: true } });
    await p.konu.upsert({
      where: { id: konu.id },
      update: {
        ad: konu.ad,
        ders: konu.ders,
        ogretimTuru: konu.ogretimTuru,
        uniteAdi: konu.uniteAdi,
        yksSegment: konu.yksSegment,
      },
      create: { ...konu, kazanimlar: [] },
    });
    if (!onceki) eklenen++;
  }
  const tr = await p.konu.findMany({
    where: { ders: "Türkçe", ogretimTuru: "KPSS_LISANS" },
    select: { ad: true },
    orderBy: { ad: "asc" },
  });
  console.log("Yeni eklenen:", eklenen);
  console.log("KPSS_LISANS Türkçe konuları (" + tr.length + "):");
  console.log(tr.map((t) => t.ad).join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
