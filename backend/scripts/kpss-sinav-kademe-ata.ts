/**
 * KPSS DENEME 1 sınavlarını, aynı kademedeki tüm aktif öğrencilere manuel atar.
 *
 * Hedef sınavlar (ekrandaki üçlü):
 *   - KPSS LİSANS DENEME 1      → KPSS_LISANS öğrencileri
 *   - KPSS ÖN LİSANS DENEME 1   → KPSS_ONLISANS öğrencileri
 *   - KPSS ORTA ÖĞRETİM DENEME 1 → KPSS_ORTAOGRETIM öğrencileri
 *
 * Not: Lisans grubunun DB tur'u bazen genel «KPSS» olabilir; grup adından kademe çözülür.
 *
 * Kullanım:
 *   npx tsx scripts/kpss-sinav-kademe-ata.ts
 *   DRY_RUN=true npx tsx scripts/kpss-sinav-kademe-ata.ts
 *   TUM_DENEMELER=true npx tsx scripts/kpss-sinav-kademe-ata.ts  # 1-30 hepsi
 */
import { PrismaClient, OgretimTuru, SinavAtamaKaynak } from '@prisma/client';
import { grupKonuOgretimTuru } from '../src/utils/grupOgretimTuru';

const prisma = new PrismaClient();
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const TUM_DENEMELER = String(process.env.TUM_DENEMELER || '').toLowerCase() === 'true';

const HEDEF_BASLIKLAR = [
  'KPSS LİSANS DENEME 1',
  'KPSS ÖN LİSANS DENEME 1',
  'KPSS ORTA ÖĞRETİM DENEME 1',
] as const;

const KPSS_OGRENCI_TURLERI: OgretimTuru[] = [
  OgretimTuru.KPSS_LISANS,
  OgretimTuru.KPSS_ONLISANS,
  OgretimTuru.KPSS_ORTAOGRETIM,
];

function sinavKademe(sinav: { baslik: string; grup: { ad: string; tur: string } }): OgretimTuru | null {
  const efektif = grupKonuOgretimTuru(sinav.grup);
  if (efektif && KPSS_OGRENCI_TURLERI.includes(efektif)) return efektif;

  const n = sinav.baslik.toLocaleLowerCase('tr-TR');
  if (n.includes('ön lisans') || n.includes('on lisans') || n.includes('önlisans')) {
    return OgretimTuru.KPSS_ONLISANS;
  }
  if (n.includes('orta öğretim') || n.includes('ortaogretim') || n.includes('ortaöğretim')) {
    return OgretimTuru.KPSS_ORTAOGRETIM;
  }
  if (n.includes('lisans')) return OgretimTuru.KPSS_LISANS;
  return null;
}

async function main() {
  console.log(`\n=== KPSS kademe → sınav ataması ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  const where = TUM_DENEMELER
    ? {
        baslik: { not: 'Soru Bankası (Grup)' },
        OR: [
          { grup: { tur: { in: [...KPSS_OGRENCI_TURLERI, OgretimTuru.KPSS] } } },
          { baslik: { startsWith: 'KPSS ', mode: 'insensitive' as const } },
        ],
      }
    : { baslik: { in: [...HEDEF_BASLIKLAR] } };

  const sinavlar = await prisma.sinav.findMany({
    where,
    select: {
      id: true,
      baslik: true,
      yayinlandi: true,
      grup: { select: { id: true, ad: true, tur: true } },
      _count: { select: { ogrenciAtamalari: true } },
    },
    orderBy: { baslik: 'asc' },
  });

  if (sinavlar.length === 0) {
    console.log('Hedef KPSS deneme bulunamadı.');
    return;
  }

  let toplamYeni = 0;
  let toplamZaten = 0;

  for (const sinav of sinavlar) {
    const tur = sinavKademe(sinav);
    if (!tur) {
      console.log(`⚠ Atlandı (kademe çözülemedi): «${sinav.baslik}» grup.tur=${sinav.grup.tur}`);
      continue;
    }

    const ogrenciler = await prisma.ogrenciProfil.findMany({
      where: {
        ogretimTuru: tur,
        kullanici: { rol: 'OGRENCI', aktif: true },
      },
      select: {
        id: true,
        ad: true,
        soyad: true,
        kullanici: { select: { email: true } },
      },
    });

    const mevcut = await prisma.ogrenciSinavAtama.findMany({
      where: { sinavId: sinav.id, ogrenciId: { in: ogrenciler.map((o) => o.id) } },
      select: { ogrenciId: true },
    });
    const mevcutSet = new Set(mevcut.map((m) => m.ogrenciId));
    const eklenecek = ogrenciler.filter((o) => !mevcutSet.has(o.id));
    toplamZaten += mevcutSet.size;

    console.log(
      `\n→ «${sinav.baslik}» [${tur}] mevcut=${sinav._count.ogrenciAtamalari} | öğrenci=${ogrenciler.length} | yeni=${eklenecek.length}`,
    );
    for (const o of eklenecek.slice(0, 5)) {
      console.log(`     + ${o.ad} ${o.soyad} <${o.kullanici.email}>`);
    }
    if (eklenecek.length > 5) console.log(`     … +${eklenecek.length - 5} daha`);

    if (DRY_RUN || eklenecek.length === 0) continue;

    const sonuc = await prisma.ogrenciSinavAtama.createMany({
      data: eklenecek.map((o) => ({
        ogrenciId: o.id,
        sinavId: sinav.id,
        kaynak: SinavAtamaKaynak.MANUEL,
      })),
      skipDuplicates: true,
    });
    toplamYeni += sonuc.count;
    console.log(`   ✔ eklenen: ${sonuc.count}`);
  }

  console.log(`\nÖzet: yeni atama=${DRY_RUN ? 0 : toplamYeni}, zaten vardı≈${toplamZaten}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
