import bcrypt from 'bcryptjs';
import { prisma, prismaInteraktifTransaction } from '../config/database';
import { tokenOlustur, refreshTokenOlustur, refreshTokenDogrula } from '../utils/jwt';
import { AppHatasi } from '../middlewares/hata.middleware';
import type { Request } from 'express';
import { oturumBaslat, oturumBitir } from './kullaniciAktivite.service';
import { bildirimGonder, epostaGonder } from './bildirim.service';
import { Rol } from '@prisma/client';
import { ogretimTuruBelirle } from '../utils/ogretimTuru';
import { bransIcinDersler, branslarParse } from './ogretmenSinirlama';
import { platformOgretimTuruUyumlu, platformOgretimTurleriUyumlu } from '../utils/paketPlatformFiltre';
import { OgretimTuru } from '@prisma/client';
import { kpssUcretsizSinavAtaOgrenciArkaPlan } from './kpssKademeSinavAtama.service';

interface KayitGirdisi {
  email: string;
  sifre: string;
  ad: string;
  soyad: string;
  telefon?: string;
  okul?: string;
  sehir?: string;
  ilce?: string;
  sinif?: string;
  ogretimTuru?: string;
  hedefUniversite?: string;
  hedefBolum?: string;
  veliAd?: string;
  veliSoyad?: string;
  veliEmail?: string;
  veliTelefon?: string;
  veliSifre?: string;
}

function sifreGecerliMi(sifre: string): string | null {
  if (!sifre || sifre.length < 8) return 'Şifre en az 8 karakter olmalı';
  if (!/[A-Z]/.test(sifre)) return 'Şifre en az bir büyük harf içermeli';
  if (!/[0-9]/.test(sifre)) return 'Şifre en az bir rakam içermeli';
  return null;
}

function telefonRakamlari(telefon: string): string {
  return (telefon || '').replace(/\D/g, '');
}

function telefonSonAlti(telefon: string): string | null {
  const rakamlar = telefonRakamlari(telefon);
  if (rakamlar.length < 6) return null;
  return rakamlar.slice(-6);
}

function veliSifreGecerliMi(sifre: string): string | null {
  if (/^\d{6}$/.test(sifre)) return null;
  return sifreGecerliMi(sifre);
}

function veliSifreBelirle(veliSifre: string | undefined, veliTelefon: string | undefined): string {
  if (veliSifre?.trim()) return veliSifre.trim();
  const sonAlti = telefonSonAlti(veliTelefon || '');
  if (!sonAlti) {
    throw new AppHatasi('Veli telefonu geçersiz; giriş için son 6 hane gerekli', 400);
  }
  return sonAlti;
}

function veliTelefonNorm(telefon: string | undefined): string | undefined {
  const rakamlar = telefonRakamlari(telefon || '');
  return rakamlar.length >= 10 ? rakamlar : undefined;
}

async function veliHesapEpostasiGonder(
  veliEmail: string,
  veliAd: string,
  sifreMetni: string,
  ogrenciAd?: string,
  ogrenciSoyad?: string,
): Promise<void> {
  const uygulama = process.env.APP_NAME || 'WingoSınav';
  const girisUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const baglantiMetni =
    ogrenciAd && ogrenciSoyad
      ? `<strong>${ogrenciAd} ${ogrenciSoyad}</strong> öğrenci kaydı sırasında veli hesabınız oluşturuldu ve öğrenci hesabınıza bağlandı.`
      : 'Veli hesabınız oluşturuldu. Öğrenciniz kayıt olduğunda otomatik eşleşir; panelden öğrenci e-postası ile de bağlayabilirsiniz.';
  await epostaGonder(
    veliEmail,
    `${uygulama} — Veli hesabınız oluşturuldu`,
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">${uygulama}</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111827;">Merhaba ${veliAd},</h2>
          <p style="color: #6B7280;">${baglantiMetni}</p>
          <p style="color: #6B7280;">Veli paneline giriş bilgileriniz:</p>
          <ul style="color: #374151; line-height: 1.8;">
            <li><strong>E-posta:</strong> ${veliEmail}</li>
            <li><strong>Şifre:</strong> ${sifreMetni}</li>
          </ul>
          <p style="color: #6B7280;">Şifrenizi bu kayıt sırasında belirlediniz${sifreMetni.length === 6 && /^\d+$/.test(sifreMetni) ? ' (telefon numaranızın son 6 hanesi)' : ''}. İsterseniz giriş yaptıktan sonra değiştirebilirsiniz.</p>
          <p style="margin-top: 20px;">
            <a href="${girisUrl}/giris" style="background: #4F46E5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Veli Paneline Giriş</a>
          </p>
        </div>
      </div>
    `,
  ).catch(() => undefined);
}

export async function ogrenciKayit(girdi: KayitGirdisi, platformTurleri?: OgretimTuru[]) {
  const emailNorm = girdi.email.trim().toLowerCase();
  const mevcutKullanici = await prisma.kullanici.findUnique({ where: { email: emailNorm } });
  if (mevcutKullanici) {
    throw new AppHatasi('Bu e-posta adresi zaten kayıtlı', 409);
  }

  const sifreHash = await bcrypt.hash(girdi.sifre, 12);

  const kayitSonuc = await prismaInteraktifTransaction(async (tx) => {
    let veliProfil = null;
    let yeniVeliOlusturuldu = false;
    let veliGirisSifresi: string | null = null;

    if (girdi.veliEmail) {
      const veliEmailNorm = girdi.veliEmail.trim().toLowerCase();
      const mevcutVeliKullanici = await tx.kullanici.findUnique({
        where: { email: veliEmailNorm },
        include: { veliProfil: true },
      });

      if (mevcutVeliKullanici) {
        if (mevcutVeliKullanici.rol !== Rol.VELI || !mevcutVeliKullanici.veliProfil) {
          throw new AppHatasi('Veli e-posta adresi başka bir hesap türüne ait', 409);
        }
        veliProfil = mevcutVeliKullanici.veliProfil;
      } else {
        const veliTelefon = veliTelefonNorm(girdi.veliTelefon);
        if (!veliTelefon) {
          throw new AppHatasi('Yeni veli hesabı için geçerli telefon numarası gerekli', 400);
        }
        // Telefon numarası hesaplarda benzersiz; aynı numara zaten varsa
        // ham Prisma hatası yerine anlaşılır uyarı ver, mevcut veliyse bağla.
        const telefonSahibi = await tx.kullanici.findUnique({
          where: { telefon: veliTelefon },
          include: { veliProfil: true },
        });
        if (telefonSahibi) {
          if (telefonSahibi.rol === Rol.VELI && telefonSahibi.veliProfil) {
            veliProfil = telefonSahibi.veliProfil;
          } else {
            throw new AppHatasi(
              'Bu veli telefon numarası başka bir hesapta kayıtlı. Farklı bir numara girin ya da veli e-postasıyla mevcut hesaba bağlanın.',
              409,
            );
          }
        }
        if (!veliProfil) {
          const veliSifreDuz = veliSifreBelirle(girdi.veliSifre, veliTelefon);
          const veliSifreHata = veliSifreGecerliMi(veliSifreDuz);
          if (veliSifreHata) {
            throw new AppHatasi(`Yeni veli hesabı için ${veliSifreHata.toLowerCase()}`, 400);
          }
          const veliSifre = await bcrypt.hash(veliSifreDuz, 12);
          const veliKullanici = await tx.kullanici.create({
            data: {
              email: veliEmailNorm,
              sifre: veliSifre,
              telefon: veliTelefon,
              rol: Rol.VELI,
              veliProfil: {
                create: {
                  ad: girdi.veliAd || 'Veli',
                  soyad: girdi.veliSoyad || '',
                  telefon: veliTelefon,
                },
              },
            },
            include: { veliProfil: true },
          });
          veliProfil = veliKullanici.veliProfil;
          yeniVeliOlusturuldu = true;
          veliGirisSifresi = veliSifreDuz;
        }
      }
    }

    const ogretimTuruKayit = ogretimTuruBelirle(girdi.sinif, girdi.ogretimTuru);
    if (!platformOgretimTuruUyumlu(ogretimTuruKayit, platformTurleri)) {
      throw new AppHatasi('Seçilen kademe bu platformda kayıt için uygun değil', 400);
    }

    if (girdi.telefon && girdi.telefon.trim()) {
      const ogrenciTelefonSahibi = await tx.kullanici.findUnique({ where: { telefon: girdi.telefon } });
      if (ogrenciTelefonSahibi) {
        throw new AppHatasi('Bu telefon numarası zaten başka bir hesapta kayıtlı. Farklı bir numara girin.', 409);
      }
    }

    const yeniKullanici = await tx.kullanici.create({
      data: {
        email: emailNorm,
        sifre: sifreHash,
        telefon: girdi.telefon,
        rol: Rol.OGRENCI,
        ogrenciProfil: {
          create: {
            ad: girdi.ad,
            soyad: girdi.soyad,
            okul: girdi.okul,
            sehir: girdi.sehir,
            ilce: girdi.ilce,
            sinif: girdi.sinif,
            ogretimTuru: ogretimTuruKayit,
            hedefUniversite: girdi.hedefUniversite,
            hedefBolum: girdi.hedefBolum,
            veliId: veliProfil?.id,
          },
        },
      },
      include: { ogrenciProfil: true },
    });

    // Grubu otomatik ata
    const grup = await tx.grup.findFirst({ where: { tur: ogretimTuruKayit, aktif: true } });
    if (grup && yeniKullanici.ogrenciProfil) {
      await tx.grupUyelik.create({
        data: { grupId: grup.id, ogrenciId: yeniKullanici.ogrenciProfil.id },
      });
    }

    return { yeniKullanici, yeniVeliOlusturuldu, veliGirisSifresi, veliProfil };
  }, {
    maxWait: 10000,
    timeout: 20000,
  });

  const { yeniKullanici: kullanici, yeniVeliOlusturuldu, veliGirisSifresi } = kayitSonuc;

  // KPSS öğrencisine yayındaki ücretsiz denemeleri kademesine göre ata
  kpssUcretsizSinavAtaOgrenciArkaPlan(
    kullanici.ogrenciProfil?.id,
    kullanici.ogrenciProfil?.ogretimTuru,
  );

  const token = tokenOlustur({ userId: kullanici.id, rol: kullanici.rol, email: kullanici.email });
  const refreshToken = refreshTokenOlustur(kullanici.id);

  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { refreshToken },
  });

  await bildirimGonder({
    kullaniciId: kullanici.id,
    baslik: '🎉 Hoş Geldiniz!',
    mesaj: `Merhaba ${girdi.ad}! ${process.env.APP_NAME || 'Wingo Deneme'}'e hoş geldiniz. Başarılar!`,
    tur: 'hos_geldiniz',
  });

  if (yeniVeliOlusturuldu && girdi.veliEmail && veliGirisSifresi) {
    await veliHesapEpostasiGonder(
      girdi.veliEmail.trim().toLowerCase(),
      girdi.veliAd || 'Veli',
      veliGirisSifresi,
      girdi.ad,
      girdi.soyad,
    );
  }

  return {
    token,
    refreshToken,
    kullanici: kullaniciOzet(kullanici),
  };
}

// ── ÖĞRETMEN KAYDI ─────────────────────────────────────────────
const LGS_BRANSLARI = [
  'Matematik', 'Fen Bilimleri', 'Türkçe',
  'Sosyal Bilgiler',
  'İnkılap Tarihi ve Atatürkçülük', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce',
];
const YKS_BRANSLARI = [
  'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji',
  'Türkçe', 'Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe',
  'Din Kültürü ve Ahlak Bilgisi', 'İngilizce', 'Almanca', 'Fransızca',
];
const KPSS_BRANSLARI = [
  'Türkçe',
  'Matematik',
  'Tarih',
  'Coğrafya',
  'Vatandaşlık',
  'Güncel Bilgiler',
];

function izinliBranslar(kademe: string) {
  if (kademe === 'LGS') return LGS_BRANSLARI;
  if (kademe === 'YKS') return YKS_BRANSLARI;
  if (String(kademe).startsWith('KPSS')) return KPSS_BRANSLARI;
  return [];
}

export async function ogretmenKayit(girdi: {
  email: string;
  sifre: string;
  ad: string;
  soyad: string;
  telefon?: string;
  brans?: string;
  branslar?: string[];
  ogretimTuru?: 'YKS' | 'LGS' | 'KPSS_LISANS' | 'KPSS_ONLISANS' | 'KPSS_ORTAOGRETIM';
  ogretimTurleri?: Array<'YKS' | 'LGS' | 'KPSS_LISANS' | 'KPSS_ONLISANS' | 'KPSS_ORTAOGRETIM'>;
  branslarByTur?: Record<string, string[]>;
}, platformTurleri?: OgretimTuru[]) {
  const mevcut = await prisma.kullanici.findUnique({ where: { email: girdi.email } });
  if (mevcut) throw new AppHatasi('Bu e-posta adresi zaten kayıtlı', 409);

  const turlerRaw = (girdi.ogretimTurleri?.length ? girdi.ogretimTurleri : girdi.ogretimTuru ? [girdi.ogretimTuru] : []) as string[];
  const ogretimTurleri = [...new Set(turlerRaw.map((t) => String(t).trim()).filter(Boolean))];
  if (ogretimTurleri.length === 0) throw new AppHatasi('En az bir kademe seçiniz', 400);
  if (!platformOgretimTurleriUyumlu(ogretimTurleri, platformTurleri)) {
    throw new AppHatasi('Seçilen kademe(ler) bu platformda kayıt için uygun değil', 400);
  }

  const harita: Record<string, string[]> = {};
  if (girdi.branslarByTur && typeof girdi.branslarByTur === 'object') {
    for (const t of ogretimTurleri) {
      const rawList = Array.isArray(girdi.branslarByTur[t]) ? girdi.branslarByTur[t] : [];
      harita[t] = [...new Set(rawList.map((b) => String(b).trim()).filter(Boolean))];
    }
  } else {
    const fallback = [
      ...new Set(
        (girdi.branslar?.length ? girdi.branslar : girdi.brans ? [girdi.brans] : [])
          .map((b) => String(b).trim())
          .filter(Boolean)
      ),
    ];
    for (const t of ogretimTurleri) harita[t] = fallback;
  }

  for (const t of ogretimTurleri) {
    const secilen = harita[t] || [];
    if (secilen.length === 0) throw new AppHatasi(`Kademe için en az bir branş seçiniz: ${t}`, 400);
    const izinli = izinliBranslar(t);
    const gecersiz = secilen.filter((b) => !izinli.includes(b));
    if (gecersiz.length > 0) throw new AppHatasi(`Geçersiz branş (${t}): ${gecersiz.join(', ')}`, 400);
  }

  const tumBranslar = [...new Set(Object.values(harita).flat())];
  const bransKayit = tumBranslar.join(', ');

  const sifreHash = await bcrypt.hash(girdi.sifre, 12);

  const kullanici = await prisma.kullanici.create({
    data: {
      email: girdi.email,
      sifre: sifreHash,
      telefon: girdi.telefon,
      rol: Rol.TEACHER,
      aktif: false, // Admin onayı bekliyor
      adminProfil: {
        create: {
          ad: girdi.ad,
          soyad: girdi.soyad,
          yetkiSeviye: 1,
          brans: bransKayit,
          ogretimTuru: (ogretimTurleri[0] || 'YKS') as any,
          ogretimTurleri: ogretimTurleri as any,
          ogretmenBranslar: harita as any,
        },
      },
    },
    include: { adminProfil: true },
  });

  const token = tokenOlustur({ userId: kullanici.id, rol: kullanici.rol, email: kullanici.email });
  const refreshToken = refreshTokenOlustur(kullanici.id);

  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { refreshToken },
  });

  await bildirimGonder({
    kullaniciId: kullanici.id,
    baslik: '🎓 Hoş Geldiniz Öğretmenim',
    mesaj: `Merhaba ${girdi.ad}! ${process.env.APP_NAME || 'Wingo Deneme'} öğretmen panelinize hoş geldiniz.`,
    tur: 'hos_geldiniz',
  });

  return {
    token,
    refreshToken,
    kullanici: {
      id: kullanici.id,
      email: kullanici.email,
      rol: kullanici.rol,
      ad: girdi.ad,
      soyad: girdi.soyad,
      brans: bransKayit,
      ogretimTuru: (ogretimTurleri[0] || 'YKS') as any,
    },
  };
}

export async function veliKayit(girdi: { email: string; sifre?: string; ad: string; soyad: string; telefon?: string }) {
  const mevcut = await prisma.kullanici.findUnique({ where: { email: girdi.email } });
  if (mevcut) throw new AppHatasi('Bu e-posta adresi zaten kayıtlı', 409);

  const veliTelefon = veliTelefonNorm(girdi.telefon);
  if (!veliTelefon) {
    throw new AppHatasi('Geçerli telefon numarası gerekli', 400);
  }

  const telefonSahibi = await prisma.kullanici.findUnique({ where: { telefon: veliTelefon } });
  if (telefonSahibi) {
    throw new AppHatasi('Bu telefon numarası zaten başka bir hesapta kayıtlı. Farklı bir numara girin.', 409);
  }

  const veliSifreDuz = veliSifreBelirle(girdi.sifre, veliTelefon);
  const veliSifreHata = veliSifreGecerliMi(veliSifreDuz);
  if (veliSifreHata) throw new AppHatasi(veliSifreHata, 400);

  const sifreHash = await bcrypt.hash(veliSifreDuz, 12);
  const emailNorm = girdi.email.trim().toLowerCase();

  const kullanici = await prisma.kullanici.create({
    data: {
      email: emailNorm,
      sifre: sifreHash,
      telefon: veliTelefon,
      rol: Rol.VELI,
      veliProfil: {
        create: {
          ad: girdi.ad,
          soyad: girdi.soyad,
          telefon: veliTelefon,
        },
      },
    },
    include: { veliProfil: true },
  });

  const token = tokenOlustur({ userId: kullanici.id, rol: kullanici.rol, email: kullanici.email });
  const refreshToken = refreshTokenOlustur(kullanici.id);

  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { refreshToken },
  });

  await bildirimGonder({
    kullaniciId: kullanici.id,
    baslik: '🎉 Veli hesabı oluşturuldu',
    mesaj: `Merhaba ${girdi.ad}! Öğrencinizi takip etmeye başlayabilirsiniz.`,
    tur: 'hos_geldiniz',
  });

  await veliHesapEpostasiGonder(emailNorm, girdi.ad, veliSifreDuz);

  return {
    token,
    refreshToken,
    kullanici: {
      id: kullanici.id,
      email: kullanici.email,
      rol: kullanici.rol,
      ad: girdi.ad,
      soyad: girdi.soyad,
    },
  };
}

export async function girisYap(email: string, sifre: string, req?: Pick<Request, 'headers' | 'socket'>) {
  const kullanici = await prisma.kullanici.findUnique({
    where: { email },
    include: {
      ogrenciProfil: true,
      veliProfil: true,
      adminProfil: true,
    },
  });

  if (!kullanici) throw new AppHatasi('E-posta veya şifre hatalı', 401);

  if (!kullanici.aktif) {
    if (kullanici.rol === Rol.TEACHER) {
      throw new AppHatasi('Hesabınız henüz yönetici tarafından onaylanmamış. Lütfen onay bekleyiniz.', 403);
    }
    throw new AppHatasi('Hesabınız pasif durumdadır. Lütfen iletişime geçiniz.', 403);
  }

  const sifreGecerli = await bcrypt.compare(sifre, kullanici.sifre);
  if (!sifreGecerli) throw new AppHatasi('E-posta veya şifre hatalı', 401);

  const token = tokenOlustur({ userId: kullanici.id, rol: kullanici.rol, email: kullanici.email });
  const refreshToken = refreshTokenOlustur(kullanici.id);

  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { refreshToken },
  });

  await oturumBaslat(kullanici.id, kullanici.rol, req);

  return {
    token,
    refreshToken,
    kullanici: kullaniciOzet(kullanici),
  };
}

function kullaniciOzet(kullanici: {
  id: string;
  email: string;
  rol: string;
  ogrenciProfil?: {
    ad: string;
    soyad: string;
    avatarUrl?: string | null;
    ogretimTuru?: string;
    sinif?: string | null;
  } | null;
  veliProfil?: { ad: string; soyad: string } | null;
  adminProfil?: { ad: string; soyad: string; brans?: string | null; ogretimTuru?: string | null } | null;
}) {
  const profil = kullanici.ogrenciProfil || kullanici.veliProfil || kullanici.adminProfil;
  const ogrenciOgretim = kullanici.ogrenciProfil
    ? ogretimTuruBelirle(kullanici.ogrenciProfil.sinif, kullanici.ogrenciProfil.ogretimTuru)
    : undefined;
  const brans = kullanici.adminProfil?.brans ?? undefined;
  const ogretimTuru = ogrenciOgretim ?? kullanici.adminProfil?.ogretimTuru ?? undefined;
  return {
    id: kullanici.id,
    email: kullanici.email,
    rol: kullanici.rol,
    ad: profil?.ad,
    soyad: profil?.soyad,
    avatarUrl: kullanici.ogrenciProfil?.avatarUrl ?? undefined,
    brans,
    branslar: brans ? branslarParse(brans) : undefined,
    ogretimTuru,
    izinliDersler:
      kullanici.rol === 'TEACHER' && brans ? bransIcinDersler(brans) : undefined,
  };
}

export async function tokenYenile(refreshToken: string) {
  const payload = refreshTokenDogrula(refreshToken);
  const kullanici = await prisma.kullanici.findUnique({
    where: { id: payload.userId, refreshToken, aktif: true },
  });

  if (!kullanici) throw new AppHatasi('Geçersiz refresh token', 401);

  const yeniToken = tokenOlustur({ userId: kullanici.id, rol: kullanici.rol, email: kullanici.email });
  const yeniRefreshToken = refreshTokenOlustur(kullanici.id);

  await prisma.kullanici.update({ where: { id: kullanici.id }, data: { refreshToken: yeniRefreshToken } });

  return { token: yeniToken, refreshToken: yeniRefreshToken };
}

export async function cikisYap(kullaniciId: string): Promise<void> {
  await oturumBitir(kullaniciId);
  await prisma.kullanici.update({ where: { id: kullaniciId }, data: { refreshToken: null } });
}

const SIFRE_SIFIRLAMA_MESAJI =
  'Eğer bu e-posta kayıtlıysa şifre sıfırlama kodu gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.';

export async function sifremiUnuttumTalep(email: string) {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm) throw new AppHatasi('Geçerli bir e-posta girin', 400);

  const kullanici = await prisma.kullanici.findUnique({ where: { email: emailNorm } });
  if (!kullanici) {
    return { mesaj: SIFRE_SIFIRLAMA_MESAJI };
  }

  const kod = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { dogrulamaKodu: kod },
  });

  const uygulama = process.env.APP_NAME || 'WingoSınav';
  await epostaGonder(
    kullanici.email,
    `${uygulama} şifre sıfırlama kodu`,
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111827;">Şifre sıfırlama</h2>
        <p style="color: #6B7280;">${uygulama} hesabınız için şifre sıfırlama kodunuz:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #4F46E5;">${kod}</p>
        <p style="color: #6B7280;">Kod 15 dakika geçerlidir. Bu talebi siz yapmadıysanız e-postayı yok sayın.</p>
      </div>
    `,
  ).catch(() => undefined);

  return { mesaj: SIFRE_SIFIRLAMA_MESAJI };
}

export async function sifremiUnuttumOnayla(email: string, kod: string, yeniSifre: string) {
  const emailNorm = email.trim().toLowerCase();
  const kodNorm = kod.trim();
  if (!emailNorm || !kodNorm) throw new AppHatasi('E-posta ve doğrulama kodu gerekli', 400);
  if (yeniSifre.length < 6) throw new AppHatasi('Şifre en az 6 karakter olmalı', 400);

  const kullanici = await prisma.kullanici.findUnique({ where: { email: emailNorm } });
  if (!kullanici || !kullanici.dogrulamaKodu || kullanici.dogrulamaKodu !== kodNorm) {
    throw new AppHatasi('Geçersiz veya süresi dolmuş doğrulama kodu', 400);
  }

  const sifreHash = await bcrypt.hash(yeniSifre, 12);
  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { sifre: sifreHash, dogrulamaKodu: null, refreshToken: null },
  });

  return { mesaj: 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' };
}
