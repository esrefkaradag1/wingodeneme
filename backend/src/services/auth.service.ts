import bcrypt from 'bcryptjs';
import { prisma, prismaInteraktifTransaction, prismaPoolRetry } from '../config/database';
import { tokenOlustur, refreshTokenOlustur, refreshTokenDogrula } from '../utils/jwt';
import { AppHatasi } from '../middlewares/hata.middleware';
import type { Request } from 'express';
import { oturumBaslat, oturumBitir } from './kullaniciAktivite.service';
import { bildirimGonder, epostaGonder } from './bildirim.service';
import { tcKimlikNoGecerliMi, tcKimlikNoNormalize } from '../utils/tcKimlik';
import { ogrenciSinifGrupIdleri } from '../utils/sinifGrup';
import { Rol } from '@prisma/client';
import { ogretimTuruBelirle } from '../utils/ogretimTuru';
import { bransIcinDersler, branslarParse } from './ogretmenSinirlama';
import { platformOgretimTuruUyumlu, platformOgretimTurleriUyumlu } from '../utils/paketPlatformFiltre';
import { OgretimTuru } from '@prisma/client';
import { kpssUcretsizSinavAtaOgrenciArkaPlan } from './kpssKademeSinavAtama.service';
import { benzersizReferansKodUret, kocIdReferansKoddan, referansKodNormalize } from './koc.service';
import {
  ayniDomainOgrencileriniKurumaBagla,
  kapyaPartnerTokenDogrula,
  kapyaKurumTokenDogrula,
  kurumIdEmailDomainIle,
  kurumReferansKodEmailDomainIle,
  partnerTelefonNormalize,
} from './partnerKayit.service';
import { KocTipi, KurumBasvuruDurum } from '@prisma/client';
import { randomInt } from 'crypto';

interface KayitGirdisi {
  email: string;
  sifre: string;
  ad: string;
  soyad: string;
  telefon?: string;
  tcKimlikNo?: string;
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
  /** Koç / kurum referans kodu (WINGO-XXXXXX) */
  kocReferansKod?: string;
  /** Kapya SSO otomatik kayıt — telefon geçersizse null bırakılabilir */
  partnerSso?: boolean;
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

/** Kayıt zorunlu alan doğrulaması — telefon 10-11 hane, TC kimlik algoritmik geçerli */
function kayitTelefonNorm(telefon: unknown): string {
  let rakamlar = telefonRakamlari(String(telefon || ''));
  while (rakamlar.startsWith('90') && rakamlar.length > 11) rakamlar = rakamlar.slice(2);
  if (rakamlar.startsWith('90') && rakamlar.length === 12) rakamlar = rakamlar.slice(2);
  if (rakamlar.startsWith('90') && rakamlar.length === 11 && rakamlar[2] === '5') {
    rakamlar = `0${rakamlar.slice(2)}`;
  }
  if (rakamlar.length > 11) {
    const son10 = rakamlar.slice(-10);
    if (son10.startsWith('5')) rakamlar = `0${son10}`;
  }
  const son = rakamlar.startsWith('0') ? rakamlar.slice(1) : rakamlar;
  if (son.length !== 10 || !son.startsWith('5')) {
    throw new AppHatasi('Geçerli bir cep telefonu girin (5XX XXX XX XX)', 400);
  }
  return `0${son}`;
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    throw new AppHatasi('Geçerli bir e-posta adresi girin', 400);
  }
  const mevcutKullanici = await prisma.kullanici.findUnique({ where: { email: emailNorm } });
  if (mevcutKullanici) {
    throw new AppHatasi('Bu e-posta adresi zaten kayıtlı', 409);
  }

  // Telefon ve TC kimlik no kayıtta zorunludur (fatura ve kimlik doğrulama için)
  // Partner SSO'da Kapya bazen hatalı telefon gönderebilir → null kabul
  let telefonNorm: string | null = null;
  if (girdi.partnerSso) {
    if (girdi.telefon?.trim()) {
      try {
        telefonNorm = kayitTelefonNorm(girdi.telefon);
      } catch {
        telefonNorm = null;
      }
    }
  } else {
    telefonNorm = kayitTelefonNorm(girdi.telefon);
  }
  if (telefonNorm) {
    const telefonSahibi = await prisma.kullanici.findUnique({ where: { telefon: telefonNorm } });
    if (telefonSahibi) {
      throw new AppHatasi('Bu telefon numarası zaten başka bir hesapta kayıtlı. Farklı bir numara girin.', 409);
    }
  }

  // TC kimlik opsiyonel — verilirse geçerli ve benzersiz olmalı
  let tcNorm = tcKimlikNoNormalize(girdi.tcKimlikNo) || null;
  if (tcNorm) {
    if (!tcKimlikNoGecerliMi(tcNorm)) {
      throw new AppHatasi('Geçerli bir TC kimlik numarası girin', 400);
    }
    const tcSahibi = await prisma.ogrenciProfil.findFirst({
      where: { tcKimlikNo: tcNorm },
      select: { id: true },
    });
    if (tcSahibi) {
      if (girdi.partnerSso) {
        // Kapya demo / çakışan TC kaydı engellemesin
        tcNorm = null;
      } else {
        throw new AppHatasi('Bu TC kimlik numarası ile kayıtlı bir hesap zaten var', 409);
      }
    }
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

    const ogrenciTelefonSahibi = telefonNorm
      ? await tx.kullanici.findUnique({ where: { telefon: telefonNorm } })
      : null;
    if (ogrenciTelefonSahibi) {
      throw new AppHatasi('Bu telefon numarası zaten başka bir hesapta kayıtlı. Farklı bir numara girin.', 409);
    }

    let kocId: string | null = null;
    if (girdi.kocReferansKod?.trim()) {
      kocId = await kocIdReferansKoddan(girdi.kocReferansKod);
      if (!kocId && !girdi.partnerSso) {
        throw new AppHatasi('Geçersiz veya pasif koç / kurum referans kodu', 400);
      }
    }

    const yeniKullanici = await tx.kullanici.create({
      data: {
        email: emailNorm,
        sifre: sifreHash,
        telefon: telefonNorm,
        rol: Rol.OGRENCI,
        ogrenciProfil: {
          create: {
            ad: girdi.ad,
            soyad: girdi.soyad,
            tcKimlikNo: tcNorm,
            okul: girdi.okul,
            sehir: girdi.sehir,
            ilce: girdi.ilce,
            sinif: girdi.sinif,
            ogretimTuru: ogretimTuruKayit,
            hedefUniversite: girdi.hedefUniversite,
            hedefBolum: girdi.hedefBolum,
            veliId: veliProfil?.id,
            kocId,
          },
        },
      },
      include: { ogrenciProfil: true },
    });

    // Sınıf seviyesine göre grup ataması (6-7-8 · 9-10-11-12); seviye grubu yoksa kademe grubuna düşer
    if (yeniKullanici.ogrenciProfil) {
      const gruplar = await tx.grup.findMany({
        where: { tur: ogretimTuruKayit, aktif: true },
        select: { id: true, ad: true, tur: true, sinifSeviyesi: true, parentId: true },
      });
      const grupIdleri = ogrenciSinifGrupIdleri(gruplar, girdi.sinif, ogretimTuruKayit);
      if (grupIdleri.length) {
        await tx.grupUyelik.createMany({
          data: grupIdleri.map((grupId) => ({ grupId, ogrenciId: yeniKullanici.ogrenciProfil!.id })),
          skipDuplicates: true,
        });
      }
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

  const ogretmenTelefon = kayitTelefonNorm(girdi.telefon);
  const ogretmenTelefonSahibi = await prisma.kullanici.findUnique({ where: { telefon: ogretmenTelefon } });
  if (ogretmenTelefonSahibi) {
    throw new AppHatasi('Bu telefon numarası zaten başka bir hesapta kayıtlı', 409);
  }

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
      telefon: ogretmenTelefon,
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

export async function kocKayit(girdi: {
  email: string;
  sifre: string;
  ad: string;
  soyad: string;
  telefon?: string;
  tip?: string;
  kurumAdi?: string;
  sehir?: string;
  beklenenOgrenci?: number | string;
  basvuruNotu?: string;
}) {
  const emailNorm = girdi.email.trim().toLowerCase();
  const mevcut = await prisma.kullanici.findUnique({ where: { email: emailNorm } });
  if (mevcut) throw new AppHatasi('Bu e-posta adresi zaten kayıtlı', 409);

  const sifreHata = sifreGecerliMi(girdi.sifre);
  if (sifreHata) throw new AppHatasi(sifreHata, 400);

  const tip: KocTipi =
    String(girdi.tip || '').toUpperCase() === 'KURUMSAL' ? KocTipi.KURUMSAL : KocTipi.BIREYSEL;
  if (tip === KocTipi.KURUMSAL && !(girdi.kurumAdi || '').trim()) {
    throw new AppHatasi('Kurumsal hesap için kurum adı gerekli', 400);
  }

  const telefonNorm = kayitTelefonNorm(girdi.telefon);
  const telefonSahibi = await prisma.kullanici.findUnique({ where: { telefon: telefonNorm } });
  if (telefonSahibi) {
    throw new AppHatasi('Bu telefon numarası zaten başka bir hesapta kayıtlı', 409);
  }

  const kurumsalBasvuru = tip === KocTipi.KURUMSAL;
  const beklenenOgrenciSayi = Number(girdi.beklenenOgrenci);
  const beklenenOgrenci =
    Number.isFinite(beklenenOgrenciSayi) && beklenenOgrenciSayi > 0
      ? Math.min(Math.round(beklenenOgrenciSayi), 100000)
      : null;

  const sifreHash = await bcrypt.hash(girdi.sifre, 12);
  const referansKod = await benzersizReferansKodUret();

  const kullanici = await prisma.kullanici.create({
    data: {
      email: emailNorm,
      sifre: sifreHash,
      telefon: telefonNorm,
      rol: Rol.KOC,
      aktif: true,
      kocProfil: {
        create: {
          ad: girdi.ad.trim(),
          soyad: girdi.soyad.trim(),
          telefon: telefonNorm,
          tip,
          kurumAdi: tip === KocTipi.KURUMSAL ? girdi.kurumAdi!.trim() : null,
          referansKod,
          // Kurumsal hesaplar süper admin onayından sonra panele erişir
          basvuruDurum: kurumsalBasvuru ? KurumBasvuruDurum.BEKLEMEDE : KurumBasvuruDurum.AKTIF,
          sehir: kurumsalBasvuru ? String(girdi.sehir || '').trim() || null : null,
          beklenenOgrenci: kurumsalBasvuru ? beklenenOgrenci : null,
          basvuruNotu: kurumsalBasvuru ? String(girdi.basvuruNotu || '').trim() || null : null,
        },
      },
    },
    include: { kocProfil: true },
  });

  const token = tokenOlustur({ userId: kullanici.id, rol: kullanici.rol, email: kullanici.email });
  const refreshToken = refreshTokenOlustur(kullanici.id);

  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { refreshToken },
  });

  await bildirimGonder({
    kullaniciId: kullanici.id,
    baslik: kurumsalBasvuru ? 'Kurum başvurunuz alındı' : 'Koç hesabınız hazır',
    mesaj: kurumsalBasvuru
      ? 'Başvurunuz yönetici incelemesinde. Onaylandığında kurum paneliniz açılacak ve bilgilendirileceksiniz.'
      : `Referans kodunuz: ${referansKod}. Öğrencilerinizi bu kodla yönlendirebilirsiniz.`,
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
      referansKod,
      kocTipi: tip,
    },
    /** Kurumsal başvurular onay bekler; panel erişimi henüz açık değildir */
    onayBekliyor: kurumsalBasvuru,
  };
}

export async function girisYap(email: string, sifre: string, req?: Pick<Request, 'headers' | 'socket'>) {
  const kullanici = await prismaPoolRetry(() =>
    prisma.kullanici.findUnique({
      where: { email },
      include: {
        ogrenciProfil: true,
        veliProfil: true,
        adminProfil: true,
        kocProfil: true,
      },
    }),
  );

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

  await prismaPoolRetry(() =>
    prisma.kullanici.update({
      where: { id: kullanici.id },
      data: { refreshToken },
    }),
  );

  await oturumBaslat(kullanici.id, kullanici.rol, req);

  return {
    token,
    refreshToken,
    kullanici: kullaniciOzet(kullanici),
  };
}

/**
 * Kapya / Edulim JWT ile şifresiz öğrenci girişi.
 * - Hesap varsa (e-posta veya TC) → oturum açar
 * - Yoksa ve zorunlu alanlar doluysa → otomatik kayıt + oturum
 * - org_ref / kocReferansKod varsa öğrenci ilgili kuruma bağlanır
 * - Eksik/geçersiz alan varsa → kayitGerekli + prefill (JTI tüketilmez)
 */
export async function partnerSsoGiris(
  partner: string,
  tokenHam: string,
  req?: Pick<Request, 'headers' | 'socket'> & { platformTurleri?: OgretimTuru[] },
) {
  const partnerNorm = String(partner || '').trim().toLowerCase();
  if (partnerNorm && partnerNorm !== 'kapya') {
    throw new AppHatasi('Desteklenmeyen partner', 400);
  }

  const prefillHam = await kapyaPartnerTokenDogrula(tokenHam, { consumeJti: false });
  const telefonNorm = partnerTelefonNormalize(prefillHam.telefon);
  const tcNorm = tcKimlikNoNormalize(prefillHam.tcKimlikNo) || '';
  const prefill = {
    ...prefillHam,
    telefon: telefonNorm || prefillHam.telefon,
    tcKimlikNo: tcNorm || prefillHam.tcKimlikNo,
  };

  const include = {
    ogrenciProfil: true,
    veliProfil: true,
    adminProfil: true,
    kocProfil: true,
  } as const;

  let kullanici = await prisma.kullanici.findUnique({
    where: { email: prefill.email },
    include,
  });

  // TC ile başka e-postaya bağlama yok. Çakışan TC'yi yok say — kayıt/SSO engellenmesin.
  let tcKullan = tcNorm;
  if (tcKullan && tcKimlikNoGecerliMi(tcKullan)) {
    const tcSahibi = await prisma.ogrenciProfil.findFirst({
      where: { tcKimlikNo: tcKullan },
      select: {
        kullanici: { select: { email: true } },
      },
    });
    if (tcSahibi?.kullanici?.email && tcSahibi.kullanici.email !== prefill.email) {
      tcKullan = '';
      prefill.tcKimlikNo = '';
    }
  }

  if (!kullanici) {
    const ad = prefill.ad.trim();
    const soyad = prefill.soyad.trim();
    const sinif = prefill.sinif.trim();
    const otomatikMumkun = ad.length >= 2 && soyad.length >= 2;

    if (!otomatikMumkun) {
      return { kayitGerekli: true as const, prefill };
    }

    // org_ref yoksa aynı kurumsal e-posta domain'i ile bağla (örn. @kapyaakademi.com)
    let kocReferansKod = prefill.kocReferansKod || undefined;
    if (!kocReferansKod) {
      kocReferansKod = (await kurumReferansKodEmailDomainIle(prefill.email)) || undefined;
    }

    const harfler = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const kucuk = 'abcdefghijkmnpqrstuvwxyz';
    let govde = '';
    for (let i = 0; i < 5; i++) govde += kucuk[randomInt(kucuk.length)];
    const geciciSifre = `${harfler[randomInt(harfler.length)]}${govde}${randomInt(1000, 9999)}!`;

    try {
      const olusan = await ogrenciKayit(
        {
          email: prefill.email,
          sifre: geciciSifre,
          ad,
          soyad,
          telefon: telefonNorm || undefined,
          tcKimlikNo: tcKullan && tcKimlikNoGecerliMi(tcKullan) ? tcKullan : undefined,
          sinif: sinif || undefined,
          okul: prefill.okul || undefined,
          sehir: prefill.sehir || undefined,
          kocReferansKod,
          partnerSso: true,
        },
        req?.platformTurleri,
      );

      await kapyaPartnerTokenDogrula(tokenHam, { consumeJti: true });

      return {
        kayitGerekli: false as const,
        yeniHesap: true as const,
        token: olusan.token,
        refreshToken: olusan.refreshToken,
        kullanici: olusan.kullanici,
      };
    } catch (err) {
      // Çakışma / validasyon → forma düş
      if (err instanceof AppHatasi && (err.statusKodu === 409 || err.statusKodu === 400)) {
        return { kayitGerekli: true as const, prefill, kayitMesaj: err.message };
      }
      throw err;
    }
  }

  if (kullanici.rol !== Rol.OGRENCI) {
    throw new AppHatasi('Bu e-posta bir öğrenci hesabına ait değil. Normal giriş kullanın.', 403);
  }

  if (!kullanici.aktif) {
    throw new AppHatasi('Hesabınız pasif durumdadır. Lütfen iletişime geçiniz.', 403);
  }

  // Mevcut öğrenci → org_ref veya aynı e-posta domain'i ile kuruma bağla
  if (kullanici.ogrenciProfil?.id) {
    let kocId = prefill.kocReferansKod
      ? await kocIdReferansKoddan(prefill.kocReferansKod)
      : null;
    if (!kocId) {
      kocId = await kurumIdEmailDomainIle(prefill.email);
    }
    if (kocId && kullanici.ogrenciProfil.kocId !== kocId) {
      await prisma.ogrenciProfil.update({
        where: { id: kullanici.ogrenciProfil.id },
        data: { kocId },
      });
    }
  }

  await kapyaPartnerTokenDogrula(tokenHam, { consumeJti: true });

  const token = tokenOlustur({ userId: kullanici.id, rol: kullanici.rol, email: kullanici.email });
  const refreshToken = refreshTokenOlustur(kullanici.id);

  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { refreshToken },
  });

  await oturumBaslat(kullanici.id, kullanici.rol, req);

  return {
    kayitGerekli: false as const,
    yeniHesap: false as const,
    token,
    refreshToken,
    kullanici: kullaniciOzet(kullanici),
  };
}

const kocInclude = {
  ogrenciProfil: true,
  veliProfil: true,
  adminProfil: true,
  kocProfil: true,
} as const;

async function kurumsalProfilBul(opts: {
  orgRef?: string;
  orgEmail?: string;
  email?: string;
}) {
  if (opts.orgRef) {
    const kod = referansKodNormalize(opts.orgRef);
    if (kod) {
      const profil = await prisma.kocProfil.findUnique({
        where: { referansKod: kod },
        include: { kullanici: { include: kocInclude } },
      });
      if (profil?.tip === KocTipi.KURUMSAL && profil.kullanici) {
        return profil.kullanici;
      }
    }
  }

  for (const mail of [opts.orgEmail, opts.email]) {
    const email = String(mail || '').trim().toLowerCase();
    if (!email) continue;
    const ku = await prisma.kullanici.findUnique({
      where: { email },
      include: kocInclude,
    });
    if (ku?.rol === Rol.KOC && ku.kocProfil?.tip === KocTipi.KURUMSAL) {
      return ku;
    }
  }

  return null;
}

async function partnerKurumHesabiOlustur(claim: {
  email: string;
  ad: string;
  soyad: string;
  orgName: string;
  orgPhone: string;
  orgRef: string;
}) {
  const email = claim.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppHatasi('Kurum için geçerli e-posta gerekli', 400);
  }

  const mevcut = await prisma.kullanici.findUnique({ where: { email }, include: kocInclude });
  if (mevcut) {
    if (mevcut.rol === Rol.KOC && mevcut.kocProfil?.tip === KocTipi.KURUMSAL) {
      return mevcut;
    }
    throw new AppHatasi('Bu e-posta başka bir hesap türüne ait; kurum oluşturulamadı', 409);
  }

  let referansKod = claim.orgRef ? referansKodNormalize(claim.orgRef) : '';
  if (referansKod) {
    const cakisan = await prisma.kocProfil.findUnique({
      where: { referansKod },
      select: { id: true },
    });
    if (cakisan) {
      throw new AppHatasi(`Referans kodu zaten kullanılıyor: ${referansKod}`, 409);
    }
  } else {
    referansKod = await benzersizReferansKodUret();
  }

  const telefon = partnerTelefonNormalize(claim.orgPhone) || null;
  const harfler = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const kucuk = 'abcdefghijkmnpqrstuvwxyz';
  let govde = '';
  for (let i = 0; i < 5; i++) govde += kucuk[randomInt(kucuk.length)];
  const geciciSifre = `${harfler[randomInt(harfler.length)]}${govde}${randomInt(1000, 9999)}!`;

  const ad = (claim.ad || 'Kurum').trim() || 'Kurum';
  const soyad = (claim.soyad || 'Yönetici').trim() || 'Yönetici';
  const kurumAdi = (claim.orgName || 'Kurum').trim() || 'Kurum';

  const yeni = await prisma.kullanici.create({
    data: {
      email,
      sifre: await bcrypt.hash(geciciSifre, 12),
      telefon,
      rol: Rol.KOC,
      aktif: true,
      kocProfil: {
        create: {
          ad,
          soyad,
          telefon,
          tip: KocTipi.KURUMSAL,
          kurumAdi,
          referansKod,
          basvuruDurum: KurumBasvuruDurum.AKTIF,
          kararTarihi: new Date(),
          demoBitis: null,
        },
      },
    },
    include: kocInclude,
  });

  await bildirimGonder({
    kullaniciId: yeni.id,
    baslik: 'Kurum hesabınız açıldı',
    mesaj: `Kapya üzerinden kurum paneliniz hazır. Referans kodunuz: ${referansKod}`,
    tur: 'kurum_onay',
  });

  return yeni;
}

/**
 * Kapya kurum JWT → şifresiz kurum paneli girişi.
 * Eşleme: org_ref → org_email → email; yoksa kurum hesabı oluşturur.
 */
export async function partnerKurumSsoGiris(
  partner: string,
  tokenHam: string,
  req?: Pick<Request, 'headers' | 'socket'>,
) {
  const partnerNorm = String(partner || '').trim().toLowerCase();
  if (partnerNorm && partnerNorm !== 'kapya') {
    throw new AppHatasi('Desteklenmeyen partner', 400);
  }

  const claim = await kapyaKurumTokenDogrula(tokenHam, { consumeJti: false });

  let kullanici = await kurumsalProfilBul({
    orgRef: claim.orgRef,
    orgEmail: claim.orgEmail,
    email: claim.email,
  });

  let yeniHesap = false;
  if (!kullanici) {
    kullanici = await partnerKurumHesabiOlustur({
      email: claim.orgEmail || claim.email,
      ad: claim.ad,
      soyad: claim.soyad,
      orgName: claim.orgName,
      orgPhone: claim.orgPhone,
      orgRef: claim.orgRef,
    });
    yeniHesap = true;
  }

  if (!kullanici.aktif) {
    throw new AppHatasi('Kurum hesabınız pasif durumdadır. Lütfen iletişime geçiniz.', 403);
  }

  if (kullanici.rol !== Rol.KOC || kullanici.kocProfil?.tip !== KocTipi.KURUMSAL) {
    throw new AppHatasi('Bu hesap kurum paneline giriş için uygun değil', 403);
  }

  // Profil bilgilerini Kapya claim ile hafifçe güncelle (ad/kurum adı)
  if (kullanici.kocProfil) {
    await prisma.kocProfil.update({
      where: { id: kullanici.kocProfil.id },
      data: {
        ...(claim.ad ? { ad: claim.ad } : {}),
        ...(claim.soyad ? { soyad: claim.soyad } : {}),
        ...(claim.orgName ? { kurumAdi: claim.orgName } : {}),
        ...(claim.orgPhone
          ? { telefon: partnerTelefonNormalize(claim.orgPhone) || claim.orgPhone }
          : {}),
        basvuruDurum: KurumBasvuruDurum.AKTIF,
        aktif: true,
      },
    });
  }

  await kapyaKurumTokenDogrula(tokenHam, { consumeJti: true });

  // Aynı domain'deki bağsız Kapya öğrencilerini bu kuruma bağla
  if (kullanici.kocProfil?.id) {
    await ayniDomainOgrencileriniKurumaBagla(
      kullanici.kocProfil.id,
      claim.orgEmail || claim.email || kullanici.email,
    );
  }

  const token = tokenOlustur({ userId: kullanici.id, rol: kullanici.rol, email: kullanici.email });
  const refreshToken = refreshTokenOlustur(kullanici.id);

  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { refreshToken },
  });

  // Güncel profil ile özet
  const guncel = await prisma.kullanici.findUnique({
    where: { id: kullanici.id },
    include: kocInclude,
  });

  await oturumBaslat(kullanici.id, kullanici.rol, req);

  return {
    yeniHesap,
    token,
    refreshToken,
    kullanici: kullaniciOzet(guncel!),
    yonlendirme: '/kurum/dashboard',
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
  kocProfil?: { ad: string; soyad: string; referansKod?: string; tip?: string } | null;
}) {
  const profil =
    kullanici.ogrenciProfil || kullanici.veliProfil || kullanici.adminProfil || kullanici.kocProfil;
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
    referansKod: kullanici.kocProfil?.referansKod,
    /** Koç hesabının tipi — giriş sonrası bireysel koç / kurum paneli ayrımı için */
    kocTipi: kullanici.kocProfil?.tip,
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
