import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { DestekTalebiDurum, Rol } from '@prisma/client';
import { bildirimGonder } from './bildirim.service';

async function ogrenciProfilIdGetir(kullaniciId: string): Promise<string> {
  const ogr = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId }, select: { id: true } });
  if (!ogr) throw new AppHatasi('Öğrenci bulunamadı', 404);
  return ogr.id;
}

export async function veliDestekTalebiOlustur(
  veliKullaniciId: string,
  ogrenciProfilId: string,
  girdi: { baslik: unknown; mesaj: unknown },
) {
  const veli = await prisma.veliProfil.findUnique({ where: { kullaniciId: veliKullaniciId }, select: { id: true } });
  if (!veli) throw new AppHatasi('Veli profili bulunamadı', 404);

  const ogrenci = await prisma.ogrenciProfil.findFirst({
    where: { id: ogrenciProfilId, veliId: veli.id },
    select: { id: true },
  });
  if (!ogrenci) throw new AppHatasi('Bu öğrenciye erişim yetkiniz yok', 403);

  const baslik = String(girdi.baslik || '').trim();
  const mesaj = String(girdi.mesaj || '').trim();
  if (baslik.length < 3) throw new AppHatasi('Başlık en az 3 karakter olmalı', 400);
  if (mesaj.length < 2) throw new AppHatasi('Mesaj boş olamaz', 400);

  const talep = await prisma.destekTalebi.create({
    data: {
      ogrenciId: ogrenci.id,
      baslik,
      durum: DestekTalebiDurum.ACIK,
      sonMesajAt: new Date(),
      mesajlar: {
        create: {
          gonderenId: veliKullaniciId,
          gonderenRol: Rol.VELI,
          mesaj,
        },
      },
    },
    include: { mesajlar: { orderBy: { olusturuldu: 'asc' } } },
  });

  const adminler = await prisma.kullanici.findMany({
    where: { rol: { in: [Rol.ADMIN, Rol.SUPER_ADMIN] }, aktif: true },
    select: { id: true },
    take: 50,
  });
  await Promise.all(
    adminler.map((a) =>
      bildirimGonder({
        kullaniciId: a.id,
        baslik: 'Yeni destek talebi (veli)',
        mesaj: `“${baslik}” başlıklı yeni bir destek talebi var.`,
        tur: 'destek',
        veriJson: { talepId: talep.id },
      })
    )
  );

  return talep;
}

export async function destekTalebiOlustur(
  kullaniciId: string,
  girdi: { baslik: unknown; mesaj: unknown },
) {
  const ogrenciId = await ogrenciProfilIdGetir(kullaniciId);
  const baslik = String(girdi.baslik || '').trim();
  const mesaj = String(girdi.mesaj || '').trim();
  if (baslik.length < 3) throw new AppHatasi('Başlık en az 3 karakter olmalı', 400);
  if (mesaj.length < 2) throw new AppHatasi('Mesaj boş olamaz', 400);

  const talep = await prisma.destekTalebi.create({
    data: {
      ogrenciId,
      baslik,
      durum: DestekTalebiDurum.ACIK,
      sonMesajAt: new Date(),
      mesajlar: {
        create: {
          gonderenId: kullaniciId,
          gonderenRol: Rol.OGRENCI,
          mesaj,
        },
      },
    },
    include: { mesajlar: { orderBy: { olusturuldu: 'asc' } } },
  });

  // Adminlere bildirim (hafif)
  const adminler = await prisma.kullanici.findMany({
    where: { rol: { in: [Rol.ADMIN, Rol.SUPER_ADMIN] }, aktif: true },
    select: { id: true },
    take: 50,
  });
  await Promise.all(
    adminler.map((a) =>
      bildirimGonder({
        kullaniciId: a.id,
        baslik: 'Yeni destek talebi',
        mesaj: `“${baslik}” başlıklı yeni bir destek talebi var.`,
        tur: 'destek',
        veriJson: { talepId: talep.id },
      })
    )
  );

  return talep;
}

export async function destekTaleplerim(kullaniciId: string) {
  const ogrenciId = await ogrenciProfilIdGetir(kullaniciId);
  return prisma.destekTalebi.findMany({
    where: { ogrenciId },
    orderBy: { sonMesajAt: 'desc' },
    take: 100,
    select: { id: true, baslik: true, durum: true, oncelik: true, sonMesajAt: true, olusturuldu: true },
  });
}

export async function destekTalebiDetay(kullaniciId: string, talepId: string) {
  const k = await prisma.kullanici.findUnique({ where: { id: kullaniciId }, select: { rol: true } });
  if (!k) throw new AppHatasi('Kullanıcı bulunamadı', 404);

  const talep = await prisma.destekTalebi.findUnique({
    where: { id: talepId },
    include: {
      mesajlar: { orderBy: { olusturuldu: 'asc' } },
    },
  });
  if (!talep) throw new AppHatasi('Talep bulunamadı', 404);

  const adminMi = k.rol === Rol.ADMIN || k.rol === Rol.SUPER_ADMIN || k.rol === Rol.TEACHER;
  if (adminMi) return talep;

  if (k.rol === Rol.VELI) {
    const veli = await prisma.veliProfil.findUnique({ where: { kullaniciId }, select: { id: true } });
    if (!veli) throw new AppHatasi('Veli profili bulunamadı', 404);
    const ogrenci = await prisma.ogrenciProfil.findFirst({
      where: { id: talep.ogrenciId, veliId: veli.id },
      select: { id: true },
    });
    if (!ogrenci) throw new AppHatasi('Yetkisiz', 403);
    return talep;
  }

  const ogrenciId = await ogrenciProfilIdGetir(kullaniciId);
  if (talep.ogrenciId !== ogrenciId) throw new AppHatasi('Yetkisiz', 403);
  return talep;
}

export async function destekMesajGonder(
  kullaniciId: string,
  talepId: string,
  girdi: { mesaj: unknown },
) {
  const mesaj = String(girdi.mesaj || '').trim();
  if (mesaj.length < 1) throw new AppHatasi('Mesaj boş olamaz', 400);

  const kullanici = await prisma.kullanici.findUnique({ where: { id: kullaniciId }, select: { rol: true } });
  if (!kullanici) throw new AppHatasi('Kullanıcı bulunamadı', 404);

  const talep = await prisma.destekTalebi.findUnique({ where: { id: talepId }, select: { id: true, ogrenciId: true, baslik: true, durum: true } });
  if (!talep) throw new AppHatasi('Talep bulunamadı', 404);

  // Öğrenci mesaj atıyorsa sadece kendi talebine
  if (kullanici.rol === Rol.OGRENCI) {
    const ogrenciId = await ogrenciProfilIdGetir(kullaniciId);
    if (talep.ogrenciId !== ogrenciId) throw new AppHatasi('Yetkisiz', 403);
  }

  if (kullanici.rol === Rol.VELI) {
    const veli = await prisma.veliProfil.findUnique({ where: { kullaniciId }, select: { id: true } });
    if (!veli) throw new AppHatasi('Veli profili bulunamadı', 404);
    const ogrenci = await prisma.ogrenciProfil.findFirst({
      where: { id: talep.ogrenciId, veliId: veli.id },
      select: { id: true },
    });
    if (!ogrenci) throw new AppHatasi('Yetkisiz', 403);
  }

  // Kapalı taleplerde öğrenci/veli mesaj atamasın
  if (
    (talep.durum === DestekTalebiDurum.COZULDU || talep.durum === DestekTalebiDurum.KAPANDI) &&
    (kullanici.rol === Rol.OGRENCI || kullanici.rol === Rol.VELI)
  ) {
    throw new AppHatasi('Bu talep kapalı. Yeni talep açabilirsiniz.', 400);
  }

  const out = await prisma.$transaction(async (tx) => {
    const msg = await tx.destekMesaji.create({
      data: {
        talepId,
        gonderenId: kullaniciId,
        gonderenRol: kullanici.rol,
        mesaj,
      },
    });
    await tx.destekTalebi.update({
      where: { id: talepId },
      data: {
        sonMesajAt: new Date(),
        durum:
          kullanici.rol === Rol.OGRENCI || kullanici.rol === Rol.VELI
            ? DestekTalebiDurum.ACIK
            : DestekTalebiDurum.BEKLEMEDE,
      },
    });
    return msg;
  });

  // Bildirim: karşı tarafa
  if (kullanici.rol === Rol.OGRENCI || kullanici.rol === Rol.VELI) {
    const adminler = await prisma.kullanici.findMany({
      where: { rol: { in: [Rol.ADMIN, Rol.SUPER_ADMIN] }, aktif: true },
      select: { id: true },
      take: 50,
    });
    await Promise.all(
      adminler.map((a) =>
        bildirimGonder({
          kullaniciId: a.id,
          baslik: 'Destek talebine yeni mesaj',
          mesaj: `“${talep.baslik}” talebine yeni mesaj geldi.`,
          tur: 'destek',
          veriJson: { talepId },
        })
      )
    );
  } else {
    // Admin cevapladı → öğrenciye bildir
    const ogr = await prisma.ogrenciProfil.findUnique({ where: { id: talep.ogrenciId }, select: { kullaniciId: true } });
    if (ogr?.kullaniciId) {
      await bildirimGonder({
        kullaniciId: ogr.kullaniciId,
        baslik: 'Destek talebine yanıt',
        mesaj: `“${talep.baslik}” talebinize yanıt verildi.`,
        tur: 'destek',
        veriJson: { talepId },
      });
    }
  }

  return out;
}

export async function adminDestekTalepleri(girdi: { durum?: unknown; q?: unknown }) {
  const durum = typeof girdi.durum === 'string' ? girdi.durum : undefined;
  const q = typeof girdi.q === 'string' ? girdi.q.trim() : '';
  const durumFiltre =
    durum && (Object.values(DestekTalebiDurum) as string[]).includes(durum) ? (durum as DestekTalebiDurum) : undefined;

  return prisma.destekTalebi.findMany({
    where: {
      ...(durumFiltre ? { durum: durumFiltre } : {}),
      ...(q
        ? {
            OR: [
              { baslik: { contains: q, mode: 'insensitive' as any } },
              { ogrenci: { ad: { contains: q, mode: 'insensitive' as any } } },
              { ogrenci: { soyad: { contains: q, mode: 'insensitive' as any } } },
            ],
          }
        : {}),
    },
    orderBy: { sonMesajAt: 'desc' },
    take: 200,
    select: {
      id: true,
      baslik: true,
      durum: true,
      oncelik: true,
      sonMesajAt: true,
      olusturuldu: true,
      ogrenci: { select: { id: true, ad: true, soyad: true, kullanici: { select: { email: true } } } },
    },
  });
}

export async function adminTalepDurumGuncelle(talepId: string, durum: string) {
  const d =
    (Object.values(DestekTalebiDurum) as string[]).includes(durum) ? (durum as DestekTalebiDurum) : null;
  if (!d) throw new AppHatasi('Geçersiz durum', 400);
  return prisma.destekTalebi.update({ where: { id: talepId }, data: { durum: d } });
}

