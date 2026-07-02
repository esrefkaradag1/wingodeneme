const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function count() {
  try {
    const sinavSayisi = await prisma.sinav.count();
    const soruSayisi = await prisma.soru.count();
    const konuSayisi = await prisma.konu.count();
    const kullaniciSayisi = await prisma.kullanici.count();
    
    console.log('--- Veritabanı Özeti ---');
    console.log('Sınav Sayısı:', sinavSayisi);
    console.log('Soru Sayısı:', soruSayisi);
    console.log('Konu Sayısı:', konuSayisi);
    console.log('Kullanıcı Sayısı:', kullaniciSayisi);
  } catch (error) {
    console.error('Sayım hatası:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

count();
