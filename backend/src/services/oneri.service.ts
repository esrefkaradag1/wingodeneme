import { prisma } from '../config/database';

export interface OneriUretGirdi {
  ogrenciId: string;
  zayifKonular: Array<{ konu: string; ders: string; basari: number }>;
}

/**
 * Öğrencinin zayıf konularına göre Kurs (video) ve Paket önerileri oluşturur.
 */
export async function oneriUret(girdi: OneriUretGirdi) {
  const { ogrenciId, zayifKonular } = girdi;

  // Zayıf konuların isimlerini etiket eşleştirmesi için kullanıyoruz
  const konuIsimleri = zayifKonular.map(zk => zk.konu.toLowerCase());

  if (konuIsimleri.length === 0) return;

  // Etiketleri zayıf konularla eşleşen kurs ve paketleri bul
  const [uygunKurslar, uygunPaketler] = await Promise.all([
    prisma.kurs.findMany({
      where: {
        OR: [
          { etiketler: { hasSome: konuIsimleri } },
          { ders: { in: zayifKonular.map(z => z.ders) } }
        ]
      },
      take: 5
    }),
    prisma.paket.findMany({
      where: {
        etiketler: { hasSome: konuIsimleri },
        aktif: true
      },
      take: 3
    })
  ]);

  const yeniOneriler: any[] = [];

  // Mevcut önerileri getir (mükerrer olmasın)
  const mevcutlar = await prisma.oneri.findMany({
    where: { ogrenciId },
    select: { kursId: true, paketId: true }
  });
  
  const kursSet = new Set(mevcutlar.map(m => m.kursId));
  const paketSet = new Set(mevcutlar.map(m => m.paketId));

  // Kursları (Videoları) öneri olarak ekle
  for (const kurs of uygunKurslar) {
    if (!kursSet.has(kurs.id)) {
      yeniOneriler.push({
        ogrenciId,
        kursId: kurs.id,
        neden: `${kurs.ders} - ${kurs.baslik} konusundaki eksiklerini wingolink.com.tr üzerinden bu video ile tamamlayabilirsin.`,
        oncelik: 1
      });
    }
  }

  // Paketleri öneri olarak ekle
  for (const paket of uygunPaketler) {
    if (!paketSet.has(paket.id)) {
      yeniOneriler.push({
        ogrenciId,
        paketId: paket.id,
        neden: `${paket.ad} paketi tam sana göre! Eksik olduğun konuları kapsıyor.`,
        oncelik: 2
      });
    }
  }

  if (yeniOneriler.length > 0) {
    await prisma.oneri.createMany({
      data: yeniOneriler
    });
  }
}

export async function onerileriGetir(ogrenciId: string) {
  return prisma.oneri.findMany({
    where: { ogrenciId },
    include: {
      kurs: true,
      paket: true
    },
    orderBy: { oncelik: 'desc' }
  });
}
