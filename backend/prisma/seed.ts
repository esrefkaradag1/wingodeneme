import { PrismaClient, Rol, OgretimTuru, SinavTuru } from '@prisma/client';
import { KONU_AGACI } from './data/konuAgaci';
import { KPSS_KONU_AGACI } from './data/kpssKonuAgaci';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed başlatılıyor...');

  // Super Admin
  const adminSifre = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.kullanici.upsert({
    where: { email: 'admin@wingodeneme.com' },
    update: {},
    create: {
      email: 'admin@wingodeneme.com',
      sifre: adminSifre,
      rol: Rol.SUPER_ADMIN,
      emailDogrulandi: true,
      adminProfil: {
        create: { ad: 'Sistem', soyad: 'Admin', yetkiSeviye: 10 },
      },
    },
  });

  // Demo Öğrenci 1
  const ogrenciSifre = await bcrypt.hash('Ogrenci123!', 12);
  const ogrenci1 = await prisma.kullanici.upsert({
    where: { email: 'ogrenci@test.com' },
    update: {},
    create: {
      email: 'ogrenci@test.com',
      sifre: ogrenciSifre,
      rol: Rol.OGRENCI,
      emailDogrulandi: true,
      ogrenciProfil: {
        create: {
          ad: 'Ahmet',
          soyad: 'Yılmaz',
          okul: 'Ankara Fen Lisesi',
          sehir: 'Ankara',
          sinif: '12',
          ogretimTuru: OgretimTuru.YKS,
          hedefUniversite: 'Orta Doğu Teknik Üniversitesi',
          hedefBolum: 'Bilgisayar Mühendisliği',
        },
      },
    },
  });

  // Demo Öğrenci 2
  const ogrenci2 = await prisma.kullanici.upsert({
    where: { email: 'selin@test.com' },
    update: {},
    create: {
      email: 'selin@test.com',
      sifre: ogrenciSifre,
      rol: Rol.OGRENCI,
      emailDogrulandi: true,
      ogrenciProfil: {
        create: {
          ad: 'Selin',
          soyad: 'Aktaş',
          okul: 'İstanbul Erkek Lisesi',
          sehir: 'İstanbul',
          sinif: '11',
          ogretimTuru: OgretimTuru.YKS,
          puan: 1450,
        },
      },
    },
  });

  // Demo Öğrenci 3
  const ogrenci3 = await prisma.kullanici.upsert({
    where: { email: 'murat@test.com' },
    update: {},
    create: {
      email: 'murat@test.com',
      sifre: ogrenciSifre,
      rol: Rol.OGRENCI,
      emailDogrulandi: true,
      ogrenciProfil: {
        create: {
          ad: 'Murat',
          soyad: 'Demir',
          okul: 'İzmir Fen Lisesi',
          sehir: 'İzmir',
          sinif: '12',
          ogretimTuru: OgretimTuru.YKS,
          puan: 1200,
        },
      },
    },
  });

  // Gruplar
  const yksGrubu = await prisma.grup.upsert({
    where: { id: 'yks-grup' },
    update: {},
    create: {
      id: 'yks-grup',
      ad: 'YKS 2025',
      tur: OgretimTuru.YKS,
      aciklama: 'TYT ve AYT sınavlarına hazırlık grubu',
    },
  });

  const lgsGrubu = await prisma.grup.upsert({
    where: { id: 'lgs-grup' },
    update: {},
    create: {
      id: 'lgs-grup',
      ad: 'LGS 2025',
      tur: OgretimTuru.LGS,
      aciklama: 'LGS sınavına hazırlık grubu',
    },
  });

  // Konu ağacı (LGS / TYT / AYT / KPSS) — prisma/data/
  const tumKonular = [...KONU_AGACI, ...KPSS_KONU_AGACI];
  for (const konu of tumKonular) {
    await prisma.konu.upsert({
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
  }

  // Demo Üniversiteler
  const odtu = await prisma.universite.upsert({
    where: { id: 'odtu' },
    update: {},
    create: {
      id: 'odtu',
      ad: 'Orta Doğu Teknik Üniversitesi',
      kisaAd: 'ODTÜ',
      sehir: 'Ankara',
      tur: 'Devlet',
    },
  });

  await prisma.universiteBolum.upsert({
    where: { id: 'odtu-cs' },
    update: {},
    create: {
      id: 'odtu-cs',
      universiteId: odtu.id,
      bolumAdi: 'Bilgisayar Mühendisliği',
      sinavTuru: SinavTuru.AYT,
      yil: 2024,
      minPuan: 520.5,
      maxPuan: 545.3,
      minSiralama: 1200,
      maxSiralama: 2500,
      kontenjan: 120,
    },
  });

  // Demo Kurslar (Videolar)
  await prisma.kurs.upsert({
    where: { id: 'kurs-turev' },
    update: {},
    create: {
      id: 'kurs-turev',
      baslik: 'Türev Konu Anlatımı - Temel Seviye',
      aciklama: 'Türev alma kuralları ve temel örnekler',
      ders: 'Matematik',
      konular: ['Türev'],
      etiketler: ['türev', 'matematik', 'limit'],
      platform: 'WingoLink',
      url: 'https://wingolink.com.tr/video/turev-temel',
    },
  });

  await prisma.kurs.upsert({
    where: { id: 'kurs-paragraf' },
    update: {},
    create: {
      id: 'kurs-paragraf',
      baslik: 'Paragrafta Anlam Teknikleri',
      aciklama: 'Hızlı okuma ve paragraf çözme teknikleri',
      ders: 'Türkçe',
      konular: ['Paragraf'],
      etiketler: ['türkçe', 'paragraf', 'okuma-anlama'],
      platform: 'WingoLink',
      url: 'https://wingolink.com.tr/video/paragraf-teknikleri',
    },
  });

  // Demo Paketler
  await prisma.paket.upsert({
    where: { id: 'paket-mat-full' },
    update: {},
    create: {
      id: 'paket-mat-full',
      ad: 'AYT Matematik Full Paket',
      aciklama: 'Tüm AYT Matematik konularını kapsayan video ve soru bankası paketi',
      fiyat: 499.0,
      sinavSayisi: 10,
      etiketler: ['matematik', 'ayt', 'türev', 'integral', 'limit'],
      disUrl: 'https://wingolink.com.tr/paket/ayt-matematik',
      aktif: true,
      populer: true,
      oneCikan: true,
    },
  });

  console.log('✅ Seed tamamlandı!');
  console.log(`Admin: admin@wingodeneme.com / Admin1234!`);
  console.log(`Öğrenci: ogrenci@test.com / Ogrenci123!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
