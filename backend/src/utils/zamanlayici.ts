import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from './logger';
import { bildirimGonder } from '../services/bildirim.service';
import { dokumanIsle } from '../services/rag.service';
import { osymKaynaklariTara } from '../services/osym.service';

export function sinavZamanlayici(): void {
  // Dev ortamda cron job'ları devre dışı — lokal geliştirmede gereksiz yük oluşturuyorlar.
  // İhtiyaç olursa .env'ye CRON_AKTIF=1 ekleyerek açabilirsin.
  if (process.env.NODE_ENV === 'development' && process.env.CRON_AKTIF !== '1') {
    logger.info('⏰ Cron job\'lar dev ortamda devre dışı (CRON_AKTIF=1 ile açılabilir)');
    return;
  }

  let durumGuncellemeCalisiyor = false;
  let ragKuyrukCalisiyor = false;
  let osymTaramaCalisiyor = false;

  // Her 5 dakikada sınav durumlarını kontrol et (dakikada bir gereksiz DB yükü oluşturuyordu)
  cron.schedule('*/5 * * * *', async () => {
    if (durumGuncellemeCalisiyor) return;
    durumGuncellemeCalisiyor = true;

    const simdi = new Date();
    try {
      // Başlayan sınavları aktif et
      const baslayacakSinavlar = await prisma.sinav.findMany({
        where: {
          yayinlandi: true,
          aktif: false,
          baslangicZamani: { lte: simdi },
          bitisZamani: { gt: simdi },
        },
      });

      for (const sinav of baslayacakSinavlar) {
        await prisma.sinav.update({
          where: { id: sinav.id },
          data: { aktif: true },
        });
        logger.info(`Sınav başladı: ${sinav.baslik}`);
      }

      // Biten sınavları kapat
      const bitecekSinavlar = await prisma.sinav.findMany({
        where: {
          aktif: true,
          bitisZamani: { lte: simdi },
        },
      });

      for (const sinav of bitecekSinavlar) {
        await prisma.sinav.update({
          where: { id: sinav.id },
          data: { aktif: false },
        });
        logger.info(`Sınav bitti: ${sinav.baslik}`);
      }
    } catch (error) {
      logger.warn(`Sınav zamanlayıcı durum güncelleme hatası: ${(error as Error).message}`);
    } finally {
      durumGuncellemeCalisiyor = false;
    }
  });

  // Sınav öncesi hatırlatma (1 gün önce)
  cron.schedule('0 9 * * *', async () => {
    try {
      const yarin = new Date();
      yarin.setDate(yarin.getDate() + 1);
      const yarinSonu = new Date(yarin);
      yarinSonu.setHours(23, 59, 59);

      const yarinSinavlar = await prisma.sinav.findMany({
        where: {
          yayinlandi: true,
          baslangicZamani: { gte: yarin, lte: yarinSonu },
        },
        include: {
          grup: { include: { uyeler: { include: { ogrenci: { include: { kullanici: true } } } } } },
        },
      });

      for (const sinav of yarinSinavlar) {
        for (const uye of sinav.grup.uyeler) {
          await bildirimGonder({
            kullaniciId: uye.ogrenci.kullaniciId,
            baslik: '📝 Yarın Sınav Var!',
            mesaj: `${sinav.baslik} sınavı yarın ${sinav.baslangicZamani.toLocaleTimeString('tr-TR')} saatinde başlıyor.`,
            tur: 'sinav_hatirlatma',
          });
        }
      }
    } catch (error) {
      logger.warn(`Sınav zamanlayıcı hatırlatma hatası: ${(error as Error).message}`);
    }
  });

  // RAG kuyruğu toparlayıcı: restart/çakışma sonrası BEKLIYOR kayıtları işler.
  cron.schedule('*/3 * * * *', async () => {
    if (ragKuyrukCalisiyor) return;
    ragKuyrukCalisiyor = true;
    try {
      const ikiDakikaOnce = new Date(Date.now() - 2 * 60 * 1000);
      const bekleyen = await prisma.egitimDokuman.findFirst({
        where: {
          OR: [
            { durum: 'BEKLIYOR' },
            // Yarıda kalmış işlemleri de toparla.
            { durum: 'ISLENIYOR', guncellendi: { lt: ikiDakikaOnce } },
          ],
        },
        orderBy: { olusturuldu: 'asc' },
      });
      if (!bekleyen) return;

      // Kaynak yoksa sonsuza kadar beklemesin, HATA'ya al.
      if (!bekleyen.dosyaUrl && !bekleyen.hamMetin) {
        await prisma.egitimDokuman.update({
          where: { id: bekleyen.id },
          data: {
            durum: 'HATA',
            hataMetni: 'Kaynak dosya/metin bulunamadı. Dokümanı silip yeniden yükleyin.',
          },
        });
        return;
      }

      logger.info(`[RAG] Kuyruktan işleniyor: ${bekleyen.id}`);
      await dokumanIsle(bekleyen.id);
    } catch (error) {
      logger.warn(`RAG kuyruk toparlayıcı hatası: ${(error as Error).message}`);
    } finally {
      ragKuyrukCalisiyor = false;
    }
  });

  logger.info('⏰ Sınav zamanlayıcı başlatıldı');

  // ÖSYM duyuruları ve sayfa snapshot'ları otomatik tarama
  // Varsayılan: 30 dakikada bir. İstersen OSYM_CRON ile değiştir.
  // Duyuru oluşturmamak için duyuruAktar=false.
  const osymCron = process.env.OSYM_CRON || '*/30 * * * *';
  // Dev ortamda ÖSYM taramasını varsayılan olarak devre dışı bırak (gereksiz ağ trafiği)
  const osymKapali = process.env.OSYM_AUTO === '0' || (process.env.NODE_ENV === 'development' && process.env.OSYM_AUTO !== '1');
  if (!osymKapali) {
    cron.schedule(osymCron, async () => {
      if (osymTaramaCalisiyor) return;
      osymTaramaCalisiyor = true;
      try {
        await osymKaynaklariTara({ duyuruAktar: false });
        logger.info(`[ÖSYM] Otomatik tarama tamamlandı (cron: ${osymCron})`);
      } catch (error) {
        logger.warn(`[ÖSYM] Otomatik tarama hatası: ${(error as Error).message}`);
      } finally {
        osymTaramaCalisiyor = false;
      }
    });
    logger.info(`[ÖSYM] Otomatik tarama aktif (cron: ${osymCron})`);
  } else {
    logger.info('[ÖSYM] Otomatik tarama kapalı (OSYM_AUTO=0)');
  }
}
