import { Response, NextFunction } from 'express';
import { OdemeDurumu, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { bildirimGonder } from '../services/bildirim.service';
import { satinAlimPaketHaklariniUygula } from '../services/paket-erisim.service';

const DURUMLAR: OdemeDurumu[] = ['BEKLEMEDE', 'TAMAMLANDI', 'IPTAL_EDILDI', 'IADE_EDILDI', 'HATA'] as any;

function parseDurum(v: unknown): OdemeDurumu | null {
  if (typeof v !== 'string') return null;
  return DURUMLAR.includes(v as OdemeDurumu) ? (v as OdemeDurumu) : null;
}

const siparisInclude = {
  kullanici: {
    include: {
      ogrenciProfil: true,
      veliProfil: true,
      adminProfil: true,
    }
  },
  paket: true,
  sinav: { select: { id: true, baslik: true, tur: true, ucret: true, indirimliUcret: true } },
};

/** Özet: durum sayıları + tamamlanan gelir */
export async function siparisOzetController(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const simdi = new Date();
    const buAyBaslangic = new Date(simdi.getFullYear(), simdi.getMonth(), 1);
    const bugunBaslangic = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());

    const [bekleyen, tamamlanan, iptal, hata, iade, gelirAgg, bugunGelirAgg, buAyGelirAgg] = await Promise.all([
      prisma.satinAlim.count({ where: { durum: 'BEKLEMEDE' } }),
      prisma.satinAlim.count({ where: { durum: 'TAMAMLANDI' } }),
      prisma.satinAlim.count({ where: { durum: 'IPTAL_EDILDI' } }),
      prisma.satinAlim.count({ where: { durum: 'HATA' } }),
      prisma.satinAlim.count({ where: { durum: 'IADE_EDILDI' as OdemeDurumu } }),
      prisma.satinAlim.aggregate({
        where: { durum: 'TAMAMLANDI' },
        _sum: { miktar: true },
      }),
      prisma.satinAlim.aggregate({
        where: { durum: 'TAMAMLANDI', odemeZamani: { gte: bugunBaslangic } },
        _sum: { miktar: true },
      }),
      prisma.satinAlim.aggregate({
        where: { durum: 'TAMAMLANDI', odemeZamani: { gte: buAyBaslangic } },
        _sum: { miktar: true },
      }),
    ]);
    res.json({
      basarili: true,
      veri: {
        bekleyen,
        tamamlanan,
        iptal,
        hata,
        iade,
        toplamSiparis: bekleyen + tamamlanan + iptal + hata + iade,
        tamamlananGelir: gelirAgg._sum.miktar ?? 0,
        bugunGelir: bugunGelirAgg._sum.miktar ?? 0,
        buAyGelir: buAyGelirAgg._sum.miktar ?? 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ basarili: false, mesaj: 'Sipariş özeti alınamadı', hata: err.message });
  }
}

export async function siparisListesiController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sayfa = Math.max(1, parseInt(String(req.query.sayfa || '1'), 10) || 1);
    const sayfaBoyutu = Math.min(100, Math.max(5, parseInt(String(req.query.boyut || '20'), 10) || 20));
    const atla = (sayfa - 1) * sayfaBoyutu;
    const durumFiltre = parseDurum(req.query.durum);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const where: Prisma.SatinAlimWhereInput = {};
    if (durumFiltre) where.durum = durumFiltre;
    if (q) {
      where.OR = [
        { kullanici: { email: { contains: q, mode: 'insensitive' } } },
        { referansNo: { contains: q, mode: 'insensitive' } },
        { id: { contains: q } },
      ];
    }

    const [kayitlar, toplam] = await Promise.all([
      prisma.satinAlim.findMany({
        where,
        skip: atla,
        take: sayfaBoyutu,
        orderBy: { olusturuldu: 'desc' },
        include: siparisInclude,
      }),
      prisma.satinAlim.count({ where }),
    ]);

    res.json({
      basarili: true,
      veri: kayitlar,
      meta: { sayfa, sayfaBoyutu, toplam, toplamSayfa: Math.ceil(toplam / sayfaBoyutu) || 1 },
    });
  } catch (err: any) {
    res.status(500).json({ basarili: false, mesaj: 'Sipariş listesi alınamadı', hata: err.message });
  }
}

export async function siparisDetayController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const siparis = await prisma.satinAlim.findUnique({
      where: { id },
      include: siparisInclude,
    });
    if (!siparis) {
      res.status(404).json({ basarili: false, mesaj: 'Sipariş bulunamadı' });
      return;
    }
    res.json({ basarili: true, veri: siparis });
  } catch (err) {
    next(err);
  }
}

async function durumDegisikligiBildir(
  kullaniciId: string,
  eski: OdemeDurumu,
  yeni: OdemeDurumu,
  urunAd: string,
  miktar: number
): Promise<void> {
  if (eski === yeni) return;
  if (yeni === 'TAMAMLANDI') {
    await bildirimGonder({
      kullaniciId,
      baslik: 'Ödemeniz onaylandı',
      mesaj: `«${urunAd}» için ödemeniz tamamlandı (${miktar.toLocaleString('tr-TR')} ₺). İyi çalışmalar!`,
      tur: 'siparis_tamamlandi',
      veriJson: { durum: yeni },
    });
  } else if (yeni === 'IPTAL_EDILDI') {
    await bildirimGonder({
      kullaniciId,
      baslik: 'Sipariş iptal edildi',
      mesaj: `«${urunAd}» siparişiniz iptal olarak işaretlendi. Sorularınız için destek ile iletişime geçebilirsiniz.`,
      tur: 'siparis_iptal',
      veriJson: { durum: yeni },
    });
  } else if (yeni === 'HATA') {
    await bildirimGonder({
      kullaniciId,
      baslik: 'Ödeme kaydında sorun',
      mesaj: `«${urunAd}» siparişinizde bir sorun işaretlendi. Lütfen destek ile iletişime geçin.`,
      tur: 'siparis_hata',
      veriJson: { durum: yeni },
    });
  }
}

export async function siparisGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { durum, notlar, referansNo, odemeMetodu, faturaBilgileri } = req.body as Record<string, unknown>;

    const mevcut = await prisma.satinAlim.findUnique({
      where: { id },
      include: {
        paket: { select: { ad: true } },
        sinav: { select: { baslik: true } },
      },
    });
    if (!mevcut) {
      res.status(404).json({ basarili: false, mesaj: 'Sipariş bulunamadı' });
      return;
    }

    const yeniDurum = durum !== undefined ? parseDurum(durum) : null;
    if (durum !== undefined && yeniDurum === null) {
      res.status(400).json({ basarili: false, mesaj: 'Geçersiz durum' });
      return;
    }

    const data: Prisma.SatinAlimUpdateInput = {};
    if (yeniDurum !== null) {
      data.durum = yeniDurum;
      if (yeniDurum === 'TAMAMLANDI' && !mevcut.odemeZamani) {
        data.odemeZamani = new Date();
      }
    }
    if (typeof notlar === 'string') data.notlar = notlar.trim() || null;
    if (typeof odemeMetodu === 'string') (data as any).odemeMetodu = odemeMetodu;
    if (faturaBilgileri !== undefined) (data as any).faturaBilgileri = faturaBilgileri;

    if (referansNo !== undefined) {
      if (referansNo === null || referansNo === '') data.referansNo = null;
      else if (typeof referansNo === 'string') data.referansNo = referansNo.trim();
    }

    if (Object.keys(data).length === 0) {
      const sadece = await prisma.satinAlim.findUnique({ where: { id }, include: siparisInclude });
      res.json({ basarili: true, veri: sadece });
      return;
    }

    const guncellenmis = await prisma.satinAlim.update({
      where: { id },
      data,
      include: siparisInclude,
    });

    if (yeniDurum !== null && yeniDurum !== mevcut.durum) {
      const urunAd = mevcut.sinav?.baslik ?? mevcut.paket?.ad ?? 'Sipariş';
      await durumDegisikligiBildir(
        mevcut.kullaniciId,
        mevcut.durum,
        yeniDurum!,
        urunAd,
        mevcut.miktar
      );
      if (yeniDurum === 'TAMAMLANDI' && mevcut.durum !== 'TAMAMLANDI') {
        await satinAlimPaketHaklariniUygula(id);
      }
    }

    res.json({ basarili: true, veri: guncellenmis });
  } catch (err) {
    next(err);
  }
}

/** Havale / manuel kayıt: bekleyen sipariş oluşturur */
export async function siparisManuelOlusturController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { kullaniciId, email, paketId, miktar, notlar, referansNo } = req.body as Record<string, unknown>;

    if (!paketId || typeof paketId !== 'string') {
      res.status(400).json({ basarili: false, mesaj: 'paketId gerekli' });
      return;
    }

    let uid: string | null = typeof kullaniciId === 'string' && kullaniciId.trim() ? kullaniciId.trim() : null;
    if (!uid && typeof email === 'string' && email.includes('@')) {
      const ku = await prisma.kullanici.findFirst({
        where: { email: { equals: email.trim(), mode: 'insensitive' } },
        select: { id: true },
      });
      uid = ku?.id ?? null;
    }
    if (!uid) {
      res.status(400).json({ basarili: false, mesaj: 'Geçerli kullaniciId veya kayıtlı e-posta gerekli' });
      return;
    }

    const paket = await prisma.paket.findUnique({ where: { id: paketId } });
    if (!paket) {
      res.status(404).json({ basarili: false, mesaj: 'Paket bulunamadı' });
      return;
    }

    const fiyat = paket.indirimliFiyat != null && paket.indirimliFiyat > 0 ? paket.indirimliFiyat : paket.fiyat;
    let tutar = typeof miktar === 'number' && !Number.isNaN(miktar) ? miktar : fiyat;
    if (typeof miktar === 'string' && miktar.trim()) {
      const p = parseFloat(miktar.replace(',', '.'));
      if (!Number.isNaN(p)) tutar = p;
    }

    let ref =
      typeof referansNo === 'string' && referansNo.trim()
        ? referansNo.trim()
        : `MANUEL-${Date.now().toString(36).toUpperCase()}`;

    if (typeof referansNo === 'string' && referansNo.trim()) {
      const refClash = await prisma.satinAlim.findUnique({ where: { referansNo: ref } });
      if (refClash) {
        res.status(409).json({ basarili: false, mesaj: 'Bu referans numarası başka bir siparişte kullanılıyor' });
        return;
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const clash = await prisma.satinAlim.findUnique({ where: { referansNo: ref } });
        if (!clash) break;
        ref = `MANUEL-${Date.now().toString(36).toUpperCase()}-${i}`;
      }
    }

    const olusturulan = await prisma.satinAlim.create({
      data: {
        kullaniciId: uid,
        paketId: paket.id,
        miktar: tutar,
        durum: 'BEKLEMEDE',
        referansNo: ref,
        notlar: typeof notlar === 'string' && notlar.trim() ? notlar.trim() : 'Panel üzerinden manuel sipariş',
      },
      include: siparisInclude,
    });

    await bildirimGonder({
      kullaniciId: uid,
      baslik: 'Sipariş kaydınız oluşturuldu',
      mesaj: `«${paket.ad}» için siparişiniz alındı. Ödeme onayından sonra erişiminiz açılacaktır.`,
      tur: 'siparis_beklemede',
      veriJson: { siparisId: olusturulan.id },
    });

    res.status(201).json({ basarili: true, veri: olusturulan });
  } catch (err) {
    next(err);
  }
}
