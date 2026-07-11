import { prisma } from '../config/database';
import nodemailer from 'nodemailer';
import { Rol } from '@prisma/client';
import { logger } from '../utils/logger';

interface BildirimGirdisi {
  kullaniciId: string;
  baslik: string;
  mesaj: string;
  tur: string;
  veriJson?: Record<string, unknown>;
}

const tasiyi = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function epostaGonder(to: string, baslik: string, html: string): Promise<void> {
  if (!process.env.SMTP_USER) {
    logger.warn('SMTP yapılandırılmadı; e-posta gönderilmedi:', to);
    return;
  }
  try {
    await tasiyi.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: baslik,
      html,
    });
  } catch (err) {
    logger.warn('E-posta gönderilemedi:', err);
    throw err;
  }
}

export async function bildirimGonder(girdi: BildirimGirdisi): Promise<void> {
  await prisma.bildirim.create({
    data: {
      kullaniciId: girdi.kullaniciId,
      baslik: girdi.baslik,
      mesaj: girdi.mesaj,
      tur: girdi.tur,
      veriJson: girdi.veriJson as any,
    },
  });

  const kullanici = await prisma.kullanici.findUnique({ where: { id: girdi.kullaniciId } });
  if (!kullanici) return;

  // E-posta gönder
  if (process.env.SMTP_USER) {
    try {
      await tasiyi.sendMail({
        from: process.env.SMTP_FROM,
        to: kullanici.email,
        subject: girdi.baslik,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${process.env.APP_NAME || 'Wingo Deneme'}</h1>
            </div>
            <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #111827;">${girdi.baslik}</h2>
              <p style="color: #6B7280;">${girdi.mesaj}</p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      logger.warn('E-posta gönderilemedi:', err);
    }
  }
}

/** Yalnızca öğrenci rolündeki kullanıcılara bildirim gönderir */
export async function ogrenciBildirimGonder(girdi: BildirimGirdisi): Promise<void> {
  const kullanici = await prisma.kullanici.findUnique({
    where: { id: girdi.kullaniciId },
    select: { rol: true },
  });
  if (kullanici?.rol !== Rol.OGRENCI) return;
  await bildirimGonder(girdi);
}

/** Aktif admin hesaplarına bildirim gönderir */
export async function adminlereBildirimGonder(
  girdi: Omit<BildirimGirdisi, 'kullaniciId'>
): Promise<void> {
  const adminler = await prisma.kullanici.findMany({
    where: { rol: { in: [Rol.ADMIN, Rol.SUPER_ADMIN] }, aktif: true },
    select: { id: true },
    take: 50,
  });
  await Promise.all(adminler.map((a) => bildirimGonder({ ...girdi, kullaniciId: a.id })));
}

type SiparisAdminBildirim = {
  siparisId: string;
  kullaniciId: string;
  kullanici?: {
    email: string;
    ogrenciProfil?: { ad: string; soyad?: string | null } | null;
    veliProfil?: { ad: string; soyad?: string | null } | null;
    adminProfil?: { ad: string; soyad?: string | null } | null;
  } | null;
  urunAd: string;
  tutar: number;
  ucretsiz?: boolean;
  sinavAdet?: number;
  paketMi?: boolean;
};

function kullaniciGorunenAd(
  kullanici: SiparisAdminBildirim['kullanici']
): string {
  if (!kullanici) return 'Bir kullanıcı';
  const profil = kullanici.ogrenciProfil || kullanici.veliProfil || kullanici.adminProfil;
  if (profil) {
    const tam = [profil.ad, profil.soyad].filter(Boolean).join(' ').trim();
    if (tam) return tam;
  }
  return kullanici.email;
}

/** Admin paneline yeni sipariş bildirimi */
export async function adminlereSiparisBildirimi(opts: SiparisAdminBildirim): Promise<void> {
  const kullaniciEtiketi = kullaniciGorunenAd(opts.kullanici);
  const tutarMetni =
    opts.ucretsiz || opts.tutar <= 0
      ? 'ücretsiz'
      : `${opts.tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

  let baslik: string;
  let mesaj: string;

  if (opts.sinavAdet && opts.sinavAdet > 1) {
    baslik = opts.ucretsiz ? 'Yeni ücretsiz paket içi sipariş' : 'Yeni paket içi deneme siparişi';
    mesaj = `${kullaniciEtiketi}, «${opts.urunAd}» paketinden ${opts.sinavAdet} deneme siparişi verdi (${tutarMetni}).`;
  } else if (opts.paketMi === false || (opts.sinavAdet === 1 && !opts.paketMi)) {
    baslik = opts.ucretsiz ? 'Yeni ücretsiz deneme siparişi' : 'Yeni deneme siparişi';
    mesaj = `${kullaniciEtiketi}, «${opts.urunAd}» denemesi için sipariş verdi (${tutarMetni}).`;
  } else {
    baslik = opts.ucretsiz ? 'Yeni ücretsiz paket siparişi' : 'Yeni paket siparişi';
    mesaj = `${kullaniciEtiketi}, «${opts.urunAd}» paketi için sipariş verdi (${tutarMetni}).`;
  }

  await adminlereBildirimGonder({
    baslik,
    mesaj,
    tur: 'siparis_admin',
    veriJson: { siparisId: opts.siparisId, kullaniciId: opts.kullaniciId },
  });
}

export async function bildirimlerGetir(kullaniciId: string, sayfa = 1, sayfaBoyutu = 20) {
  const atla = (sayfa - 1) * sayfaBoyutu;

  const [bildirimler, toplam] = await Promise.all([
    prisma.bildirim.findMany({
      where: { kullaniciId },
      orderBy: { olusturuldu: 'desc' },
      skip: atla,
      take: sayfaBoyutu,
    }),
    prisma.bildirim.count({ where: { kullaniciId } }),
  ]);

  return { bildirimler, toplam, sayfa, sayfaBoyutu, toplamSayfa: Math.ceil(toplam / sayfaBoyutu) };
}

export async function bildirimOkundu(bildirimId: string, kullaniciId: string): Promise<void> {
  await prisma.bildirim.update({
    where: { id: bildirimId, kullaniciId },
    data: { okundu: true },
  });
}

export async function tumunuOku(kullaniciId: string): Promise<void> {
  await prisma.bildirim.updateMany({
    where: { kullaniciId, okundu: false },
    data: { okundu: true },
  });
}
