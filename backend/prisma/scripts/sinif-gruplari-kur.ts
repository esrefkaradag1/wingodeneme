/**
 * Sınıf bazlı deneme gruplarını kurar: 6-7-8 (LGS) ve 9-10-11-12 (YKS).
 * Mevcut LGS / TYT / AYT gruplarına seviye etiketi ekler, eksik sınıf gruplarını açar
 * ve öğrencileri sınıflarına göre doğru gruba dağıtır.
 *
 * Kullanım: npm run seed:sinif-gruplari
 */
import { OgretimTuru, PrismaClient } from '@prisma/client';
import { ogrenciSinifGrupIdleri } from '../../src/utils/sinifGrup';

const prisma = new PrismaClient();

type GrupTanim = {
  ad: string;
  tur: OgretimTuru;
  sinifSeviyesi: number;
  aciklama: string;
};

const SINIF_GRUPLARI: GrupTanim[] = [
  { ad: '6. Sınıf', tur: OgretimTuru.LGS, sinifSeviyesi: 6, aciklama: '6. sınıf ara sınıf denemeleri' },
  { ad: '7. Sınıf', tur: OgretimTuru.LGS, sinifSeviyesi: 7, aciklama: '7. sınıf ara sınıf denemeleri' },
  { ad: '9. Sınıf', tur: OgretimTuru.YKS, sinifSeviyesi: 9, aciklama: '9. sınıf ara sınıf denemeleri' },
  { ad: '10. Sınıf', tur: OgretimTuru.YKS, sinifSeviyesi: 10, aciklama: '10. sınıf ara sınıf denemeleri' },
  { ad: '11. Sınıf', tur: OgretimTuru.YKS, sinifSeviyesi: 11, aciklama: '11. sınıf ara sınıf denemeleri' },
];

async function main() {
  // 1) Mevcut kademe gruplarına seviye etiketi
  const lgs = await prisma.grup.findFirst({ where: { tur: OgretimTuru.LGS, parentId: null } });
  const yks = await prisma.grup.findFirst({ where: { tur: OgretimTuru.YKS, parentId: null } });

  if (lgs) {
    await prisma.grup.update({ where: { id: lgs.id }, data: { sinifSeviyesi: 8 } });
    console.log(`LGS grubu 8. sınıf olarak işaretlendi (${lgs.ad})`);
  }
  const mevcutYksAlt = await prisma.grup.findMany({
    where: { tur: OgretimTuru.YKS, parentId: { not: null } },
  });
  for (const g of mevcutYksAlt) {
    if (/tyt|ayt/i.test(g.ad)) {
      await prisma.grup.update({ where: { id: g.id }, data: { sinifSeviyesi: 12 } });
      console.log(`${g.ad} grubu 12. sınıf / mezun olarak işaretlendi`);
    }
  }

  // 2) Eksik sınıf gruplarını aç
  for (const tanim of SINIF_GRUPLARI) {
    const mevcut = await prisma.grup.findFirst({
      where: { tur: tanim.tur, sinifSeviyesi: tanim.sinifSeviyesi },
    });
    if (mevcut) {
      console.log(`zaten var: ${mevcut.ad}`);
      continue;
    }
    const parentId = tanim.tur === OgretimTuru.LGS ? lgs?.id ?? null : yks?.id ?? null;
    const olusan = await prisma.grup.create({
      data: {
        ad: tanim.ad,
        tur: tanim.tur,
        aciklama: tanim.aciklama,
        sinifSeviyesi: tanim.sinifSeviyesi,
        parentId,
        aktif: true,
      },
    });
    console.log(`oluşturuldu: ${olusan.ad} (${olusan.tur})`);
  }

  // 3) Öğrencileri sınıflarına göre gruplara dağıt
  const ogrenciler = await prisma.ogrenciProfil.findMany({
    select: { id: true, sinif: true, ogretimTuru: true, gruplar: { select: { grupId: true } } },
  });
  const gruplar = await prisma.grup.findMany({
    where: { aktif: true },
    select: { id: true, ad: true, tur: true, sinifSeviyesi: true, parentId: true },
  });

  let eklenen = 0;
  for (const o of ogrenciler) {
    const hedefIdler = ogrenciSinifGrupIdleri(gruplar, o.sinif, o.ogretimTuru);
    const mevcutSet = new Set(o.gruplar.map((g) => g.grupId));
    const eksik = hedefIdler.filter((id) => !mevcutSet.has(id));
    if (!eksik.length) continue;
    await prisma.grupUyelik.createMany({
      data: eksik.map((grupId) => ({ grupId, ogrenciId: o.id })),
      skipDuplicates: true,
    });
    eklenen += eksik.length;
  }
  console.log(`\nÖğrenci grup ataması: ${eklenen} yeni üyelik`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
