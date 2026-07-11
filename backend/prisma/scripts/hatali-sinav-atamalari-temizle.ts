/**
 * Ödemesi tamamlanmamış satın almalardan gelen hatalı sınav erişimlerini temizler.
 *
 * Hedef: kaynak PAKET veya TEK_SINAV olan ve şunlardan biri olan ogrenciSinavAtama kayıtları:
 *   a) Bağlı satın alma (satinAlim) TAMAMLANDI değil (BEKLEMEDE / IPTAL_EDILDI / HATA / IADE_EDILDI)
 *   b) Bağlı satın alma hiç yok (satinAlimId null) — iptal/silinmiş siparişten kalan yetim erişim
 * MANUEL (admin) atamalarına ve tamamlanmış satın almalara DOKUNULMAZ.
 *
 * Kullanım:
 *   npm run temizle:hatali-atamalar           (rapor + silme)
 *   DRY_RUN=true npm run temizle:hatali-atamalar   (yalnızca rapor)
 */
import { PrismaClient, SinavAtamaKaynak, OdemeDurumu } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

async function main() {
  console.log(`\n=== Hatalı sınav ataması temizliği ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  const satinAlmaKaynakli: SinavAtamaKaynak[] = [
    SinavAtamaKaynak.PAKET,
    SinavAtamaKaynak.TEK_SINAV,
  ];

  const adaylar = await prisma.ogrenciSinavAtama.findMany({
    where: {
      kaynak: { in: satinAlmaKaynakli },
    },
    include: {
      satinAlim: { select: { id: true, durum: true, referansNo: true } },
      sinav: { select: { baslik: true } },
      ogrenci: { select: { ad: true, soyad: true } },
    },
  });

  const silinecek = adaylar.filter(
    (a) => !a.satinAlim || a.satinAlim.durum !== OdemeDurumu.TAMAMLANDI
  );

  const durumSayaci: Record<string, number> = {};
  for (const a of silinecek) {
    const d = a.satinAlim ? a.satinAlim.durum : 'YETIM_BAGLANTI_YOK';
    durumSayaci[d] = (durumSayaci[d] || 0) + 1;
  }

  console.log(`İncelenen satın alma kaynaklı atama: ${adaylar.length}`);
  console.log(`Silinecek (ödeme tamamlanmamış) atama: ${silinecek.length}`);
  console.log('Duruma göre dağılım:', durumSayaci);

  if (silinecek.length > 0) {
    console.log('\nÖrnekler (ilk 10):');
    for (const a of silinecek.slice(0, 10)) {
      const ad = `${a.ogrenci?.ad ?? ''} ${a.ogrenci?.soyad ?? ''}`.trim();
      const durum = a.satinAlim ? a.satinAlim.durum : 'YETIM (bağlantı yok)';
      console.log(
        `  - ${ad} → «${a.sinav?.baslik ?? a.sinavId}» [${a.kaynak}] satınAlma=${durum} (${a.satinAlim?.referansNo ?? '-'})`
      );
    }
  }

  if (DRY_RUN) {
    console.log('\nDRY_RUN=true — hiçbir kayıt silinmedi.\n');
    return;
  }

  if (silinecek.length === 0) {
    console.log('\nSilinecek hatalı atama bulunamadı.\n');
    return;
  }

  const idler = silinecek.map((a) => a.id);
  const sonuc = await prisma.ogrenciSinavAtama.deleteMany({
    where: { id: { in: idler } },
  });

  console.log(`\n✔ Silinen hatalı atama sayısı: ${sonuc.count}\n`);
}

main()
  .catch((e) => {
    console.error('Temizlik sırasında hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
