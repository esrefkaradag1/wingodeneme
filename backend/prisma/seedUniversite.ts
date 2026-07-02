
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const universiteler = [
  { ad: 'İstanbul Teknik Üniversitesi', kisaAd: 'İTÜ', sehir: 'İstanbul', tur: 'DEVLET' },
  { ad: 'Orta Doğu Teknik Üniversitesi', kisaAd: 'ODTÜ', sehir: 'Ankara', tur: 'DEVLET' },
  { ad: 'Boğaziçi Üniversitesi', kisaAd: 'BOĞAZİÇİ', sehir: 'İstanbul', tur: 'DEVLET' },
  { ad: 'Hacettepe Üniversitesi', kisaAd: 'HACETTEPE', sehir: 'Ankara', tur: 'DEVLET' },
  { ad: 'Koç Üniversitesi', kisaAd: 'KOÇ', sehir: 'İstanbul', tur: 'VAKIF' },
  { ad: 'Bilkent Üniversitesi', kisaAd: 'BİLKENT', sehir: 'Ankara', tur: 'VAKIF' },
  { ad: 'Sabancı Üniversitesi', kisaAd: 'SABANCI', sehir: 'İstanbul', tur: 'VAKIF' },
  { ad: 'İstanbul Üniversitesi', kisaAd: 'İSTANBUL ÜNİ', sehir: 'İstanbul', tur: 'DEVLET' },
  { ad: 'Yıldız Teknik Üniversitesi', kisaAd: 'YTÜ', sehir: 'İstanbul', tur: 'DEVLET' },
  { ad: 'Ege Üniversitesi', kisaAd: 'EGE', sehir: 'İzmir', tur: 'DEVLET' },
  { ad: 'Dokuz Eylül Üniversitesi', kisaAd: 'DEÜ', sehir: 'İzmir', tur: 'DEVLET' },
  { ad: 'Ankara Üniversitesi', kisaAd: 'ANKARA ÜNİ', sehir: 'Ankara', tur: 'DEVLET' },
  { ad: 'Marmara Üniversitesi', kisaAd: 'MARMARA', sehir: 'İstanbul', tur: 'DEVLET' },
  { ad: 'Gazi Üniversitesi', kisaAd: 'GAZİ', sehir: 'Ankara', tur: 'DEVLET' },
  { ad: 'Gebze Teknik Üniversitesi', kisaAd: 'GTÜ', sehir: 'Kocaeli', tur: 'DEVLET' },
  { ad: 'Bursa Uludağ Üniversitesi', kisaAd: 'ULUDAĞ', sehir: 'Bursa', tur: 'DEVLET' },
  { ad: 'Akdeniz Üniversitesi', kisaAd: 'AKDENİZ', sehir: 'Antalya', tur: 'DEVLET' },
  { ad: 'Çukurova Üniversitesi', kisaAd: 'ÇUKUROVA', sehir: 'Adana', tur: 'DEVLET' },
  { ad: 'Selçuk Üniversitesi', kisaAd: 'SELÇUK', sehir: 'Konya', tur: 'DEVLET' },
  { ad: 'Erciyes Üniversitesi', kisaAd: 'ERCİYES', sehir: 'Kayseri', tur: 'DEVLET' },
  { ad: 'Atatürk Üniversitesi', kisaAd: 'ATATÜRK', sehir: 'Erzurum', tur: 'DEVLET' },
];

const bolumler = [
  { ad: 'Bilgisayar Mühendisliği', sinavTuru: 'AYT' },
  { ad: 'Yazılım Mühendisliği', sinavTuru: 'AYT' },
  { ad: 'Tıp', sinavTuru: 'AYT' },
  { ad: 'Diş Hekimliği', sinavTuru: 'AYT' },
  { ad: 'Eczacılık', sinavTuru: 'AYT' },
  { ad: 'Hukuk', sinavTuru: 'AYT' },
  { ad: 'Psikoloji', sinavTuru: 'AYT' },
  { ad: 'İşletme', sinavTuru: 'AYT' },
  { ad: 'İktisat', sinavTuru: 'AYT' },
  { ad: 'Mimarlık', sinavTuru: 'AYT' },
  { ad: 'İnşaat Mühendisliği', sinavTuru: 'AYT' },
  { ad: 'Makine Mühendisliği', sinavTuru: 'AYT' },
  { ad: 'Elektrik-Elektronik Mühendisliği', sinavTuru: 'AYT' },
  { ad: 'Endüstri Mühendisliği', sinavTuru: 'AYT' },
  { ad: 'Hemşirelik', sinavTuru: 'AYT' },
  { ad: 'Beslenme ve Diyetetik', sinavTuru: 'AYT' },
  { ad: 'Okul Öncesi Öğretmenliği', sinavTuru: 'AYT' },
  { ad: 'Özel Eğitim Öğretmenliği', sinavTuru: 'AYT' },
  { ad: 'İlahiyat', sinavTuru: 'AYT' },
  { ad: 'Gastronomi ve Mutfak Sanatları', sinavTuru: 'AYT' },
  { ad: 'Türk Dili ve Edebiyatı', sinavTuru: 'AYT' },
  { ad: 'Türkçe Öğretmenliği', sinavTuru: 'AYT' },
  { ad: 'Tarih', sinavTuru: 'AYT' },
  { ad: 'Siyaset Bilimi ve Uluslararası İlişkiler', sinavTuru: 'AYT' },
  { ad: 'Sosyoloji', sinavTuru: 'AYT' },
  { ad: 'Halkla İlişkiler ve Tanıtım', sinavTuru: 'AYT' },
  { ad: 'İstatistik', sinavTuru: 'AYT' },
  { ad: 'Matematik', sinavTuru: 'AYT' },
  { ad: 'Fizik', sinavTuru: 'AYT' },
  { ad: 'Kimya', sinavTuru: 'AYT' },
  { ad: 'Biyoloji', sinavTuru: 'AYT' },
  { ad: 'Felsefe', sinavTuru: 'AYT' },
  { ad: 'Arkeoloji', sinavTuru: 'AYT' },
  { ad: 'Sanat Tarihi', sinavTuru: 'AYT' },
  { ad: 'Mütercim Tercümanlık', sinavTuru: 'AYT' },
  { ad: 'Görsel İletişim Tasarımı', sinavTuru: 'AYT' },
  { ad: 'İç Mimarlık', sinavTuru: 'AYT' },
  { ad: 'Peyzaj Mimarlığı', sinavTuru: 'AYT' },
  { ad: 'Şehir ve Bölge Planlama', sinavTuru: 'AYT' },
];

function slugify(metin: string): string {
  return metin
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function main() {
  console.log('Üniversiteler ve bölümler ekleniyor...');

  for (const uni of universiteler) {
    const uniId = `uni-${slugify(`${uni.ad}-${uni.sehir}`)}`;
    
    await prisma.universite.upsert({
      where: { id: uniId },
      update: {
        ad: uni.ad,
        kisaAd: uni.kisaAd,
        sehir: uni.sehir,
        tur: uni.tur,
      },
      create: {
        id: uniId,
        ad: uni.ad,
        kisaAd: uni.kisaAd,
        sehir: uni.sehir,
        tur: uni.tur,
      },
    });

    for (const bolum of bolumler) {
      const bolumId = `seed-${slugify(`${uni.ad}-${bolum.ad}`)}`;
      
      // Tahmini puanlar (rastgele gerçekçi aralıklar)
      const baseSiralama = Math.floor(Math.random() * 50000) + 1000;
      const basePuan = 550 - (baseSiralama / 1000);

      await prisma.universiteBolum.upsert({
        where: { id: bolumId },
        update: {
          bolumAdi: bolum.ad,
          sinavTuru: 'AYT',
          minPuan: basePuan,
          maxPuan: basePuan + 50,
          minSiralama: baseSiralama,
          maxSiralama: baseSiralama + 10000,
        },
        create: {
          id: bolumId,
          universiteId: uniId,
          bolumAdi: bolum.ad,
          sinavTuru: 'AYT',
          minPuan: basePuan,
          maxPuan: basePuan + 50,
          minSiralama: baseSiralama,
          maxSiralama: baseSiralama + 10000,
          yil: 2024,
        },
      });
    }
  }

  console.log('Tamamlandı!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
