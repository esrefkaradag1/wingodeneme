import { prisma } from '../config/database';
import { cache } from '../config/redis';
import { AppHatasi } from '../middlewares/hata.middleware';
import { existsSync } from 'fs';
import path from 'path';
import { execFile } from 'child_process';

type YokatlasSonuc = {
  yop_kodu?: string;
  uni_adi?: string;
  sehir_adi?: string;
  universite_turu?: string;
  program_adi?: string;
  taban?: Record<string, string>;
  tbs?: Record<string, string>;
};

export type UniversiteAramaFiltreleri = {
  sehir?: string;
  universiteTuru?: string;
  sinavTuru?: 'TYT' | 'AYT' | 'LGS';
  minSiralama?: number;
  maxSiralama?: number;
  minPuan?: number;
  maxPuan?: number;
};

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

function parseSayi(metin?: string | null): number | null {
  if (!metin) return null;
  const temiz = metin.replace(/[^\d.,-]/g, '').replace(/,/g, '.');
  if (!temiz) return null;
  const sayi = Number.parseFloat(temiz);
  return Number.isFinite(sayi) ? sayi : null;
}

function parseTamSayi(metin?: string | null): number | null {
  if (!metin) return null;
  const temiz = metin.replace(/[^\d]/g, '');
  if (!temiz) return null;
  const sayi = Number.parseInt(temiz, 10);
  return Number.isFinite(sayi) ? sayi : null;
}

function enGuncelDeger(kayit?: Record<string, string>): string | null {
  if (!kayit) return null;
  const yillar = Object.keys(kayit).sort((a, b) => Number(b) - Number(a));
  for (const yil of yillar) {
    const deger = kayit[yil];
    if (typeof deger === 'string' && deger.trim().length > 0 && deger !== '-') return deger;
  }
  return null;
}

function pythonYoluGetir(): string {
  const kok = path.resolve(process.cwd(), '..');
  const venvPython = path.join(kok, '.venv-yok', 'bin', 'python');
  if (existsSync(venvPython)) return venvPython;
  return 'python3';
}

async function yokatlasAra(arama: string, filtreler: UniversiteAramaFiltreleri = {}): Promise<YokatlasSonuc[]> {
  const script = path.resolve(process.cwd(), 'scripts', 'yokatlas_search.py');
  const python = pythonYoluGetir();
  const payload = JSON.stringify({
    ...(filtreler.sehir ? { sehir: filtreler.sehir.toLocaleUpperCase('tr-TR') } : {}),
    ...(filtreler.universiteTuru ? { universite_turu: filtreler.universiteTuru } : {}),
    ...(filtreler.sinavTuru
      ? { puan_turu: filtreler.sinavTuru === 'TYT' ? 'tyt' : 'say' }
      : {}),
  });

  return new Promise((resolve) => {
    execFile(python, [script, arama, payload], { timeout: 20000, maxBuffer: 1024 * 1024 * 5 }, (err, stdout) => {
      if (err) {
        resolve([]);
        return;
      }

      try {
        const parsed = JSON.parse(stdout || '[]');
        resolve(Array.isArray(parsed) ? (parsed as YokatlasSonuc[]) : []);
      } catch {
        resolve([]);
      }
    });
  });
}

async function yokatlasSonuclariniKaydet(sonuclar: YokatlasSonuc[]): Promise<void> {
  for (const s of sonuclar) {
    try {
      const uniAd = (s.uni_adi || '').trim();
      const sehir = (s.sehir_adi || '').trim() || 'Bilinmiyor';
      const bolumAd = (s.program_adi || '').trim();
      const yopKodu = (s.yop_kodu || '').trim();
      if (!uniAd || !bolumAd || !yopKodu) continue;

      const uniId = `uni-${slugify(`${uniAd}-${sehir}`)}`;
      
      // Üniversiteyi oluştur veya güncelle
      await prisma.universite.upsert({
        where: { id: uniId },
        update: {
          ad: uniAd,
          sehir,
          tur: s.universite_turu || 'Bilinmiyor',
        },
        create: {
          id: uniId,
          ad: uniAd,
          kisaAd: uniAd.length > 18 ? uniAd.slice(0, 18) : uniAd,
          sehir,
          tur: s.universite_turu || 'Bilinmiyor',
        },
      });

      const tabanPuan = parseSayi(enGuncelDeger(s.taban));
      const basariSirasi = parseTamSayi(enGuncelDeger(s.tbs));

      // Bölümü oluştur veya güncelle
      await prisma.universiteBolum.upsert({
        where: { id: `yok-${yopKodu}` },
        update: {
          bolumAdi: bolumAd,
          minPuan: tabanPuan ?? undefined,
          maxPuan: tabanPuan ?? undefined,
          minSiralama: basariSirasi ?? undefined,
          maxSiralama: basariSirasi ?? undefined,
          yil: new Date().getFullYear(),
          universiteId: uniId,
        },
        create: {
          id: `yok-${yopKodu}`,
          universiteId: uniId,
          bolumAdi: bolumAd,
          sinavTuru: 'AYT', // Varsayılan
          yil: new Date().getFullYear(),
          minPuan: tabanPuan ?? undefined,
          maxPuan: tabanPuan ?? undefined,
          minSiralama: basariSirasi ?? undefined,
          maxSiralama: basariSirasi ?? undefined,
        },
      });
    } catch (err) {
      console.error('YÖK Atlas kayıt hatası:', err);
      // Bir kayıttaki hata tüm işlemi bozmasın
    }
  }
}

export async function universiteAra(arama: string, filtreler: UniversiteAramaFiltreleri = {}) {
  const q = arama.trim();
  const filtreVarmi = Boolean(
    (filtreler.sehir && filtreler.sehir.trim()) ||
    (filtreler.universiteTuru && filtreler.universiteTuru.trim()) ||
    filtreler.sinavTuru ||
    typeof filtreler.minSiralama === 'number' ||
    typeof filtreler.maxSiralama === 'number' ||
    typeof filtreler.minPuan === 'number' ||
    typeof filtreler.maxPuan === 'number'
  );
  if (q.length < 2 && !filtreVarmi) return [];

  const sehir = (filtreler.sehir || '').trim();
  const universiteTuru = (filtreler.universiteTuru || '').trim();
  const sinavTuru = filtreler.sinavTuru;
  const minSiralama = filtreler.minSiralama;
  const maxSiralama = filtreler.maxSiralama;
  const minPuan = typeof filtreler.minPuan === 'number' && filtreler.minPuan <= 700 ? filtreler.minPuan : undefined;
  const maxPuan = typeof filtreler.maxPuan === 'number' && filtreler.maxPuan <= 700 ? filtreler.maxPuan : undefined;

  const cacheAnahtar = `uni:ara:${q}:s:${sehir || '-'}:u:${universiteTuru || '-'}:t:${sinavTuru || '-'}`;
  const cachedVeri = await cache.al(cacheAnahtar);
  if (cachedVeri) return cachedVeri;

  const universiteFiltre: Record<string, unknown> = {
    ...(q.length >= 2
      ? {
          OR: [
            { ad: { contains: q, mode: 'insensitive' } },
            { kisaAd: { contains: q, mode: 'insensitive' } },
            { sehir: { contains: q, mode: 'insensitive' } },
            { bolumler: { some: { bolumAdi: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };
  if (sehir) universiteFiltre.sehir = { equals: sehir, mode: 'insensitive' };
  if (universiteTuru) universiteFiltre.tur = { equals: universiteTuru, mode: 'insensitive' };

  const bolumFiltre: Record<string, unknown> = {
    ...(q.length >= 2
      ? {
          bolumAdi: { contains: q, mode: 'insensitive' },
        }
      : {}),
  };
  if (sinavTuru) bolumFiltre.sinavTuru = sinavTuru;
  if (typeof minSiralama === 'number') bolumFiltre.minSiralama = { gte: minSiralama };
  if (typeof maxSiralama === 'number') bolumFiltre.maxSiralama = { lte: maxSiralama };
  if (typeof minPuan === 'number' || typeof maxPuan === 'number') {
    bolumFiltre.minPuan = {
      ...(typeof minPuan === 'number' ? { gte: minPuan } : {}),
      ...(typeof maxPuan === 'number' ? { lte: maxPuan } : {}),
    };
  }

  // Önce bölümleri ara
  const bolumler = await prisma.universiteBolum.findMany({
    where: {
      AND: [
        bolumFiltre as any,
        {
          universite: {
            sehir: sehir ? { equals: sehir, mode: 'insensitive' } : undefined,
            tur: universiteTuru ? { equals: universiteTuru, mode: 'insensitive' } : undefined,
          }
        }
      ]
    },
    include: { universite: true },
    orderBy: [
      { minSiralama: 'asc' }
    ],
    take: 100,
  });

  // Bölümleri üniversitelere göre grupla
  const uniMap = new Map<string, any>();
  for (const b of bolumler) {
    if (!uniMap.has(b.universiteId)) {
      uniMap.set(b.universiteId, {
        ...b.universite,
        bolumler: [],
      });
    }
    uniMap.get(b.universiteId).bolumler.push(b);
  }

  let sonuclar = Array.from(uniMap.values());

  // Eğer sonuç azsa dış kaynağa başvur
  if ((q.length >= 2 || filtreVarmi) && sonuclar.length < 5) {
    const disKaynakSonuclari = await yokatlasAra(q, filtreler);
    if (disKaynakSonuclari.length > 0) {
      await yokatlasSonuclariniKaydet(disKaynakSonuclari);
      // Tekrar ara
      return universiteAra(arama, filtreler); 
    }
  }

  await cache.yaz(cacheAnahtar, sonuclar, 3600);
  return sonuclar;
}

export async function tahminHesapla(ogrenciId: string, netPuan: number, siralama: number) {
  const hedefler = await prisma.universiteHedef.findMany({
    where: { ogrenciId },
    include: { bolum: { include: { universite: true } } },
  });

  if (hedefler.length === 0) throw new AppHatasi('Hedef üniversite eklenmemiş', 400);

  return hedefler.map((h) => {
    const bolum = h.bolum;
    let ihtimal = 'BELİRSİZ';
    let yuzde = 0;

    if (bolum.minSiralama && bolum.maxSiralama) {
      if (siralama <= bolum.minSiralama) {
        ihtimal = 'ÇOK_YÜKSEK';
        yuzde = 95;
      } else if (siralama <= bolum.maxSiralama) {
        const oran = (bolum.maxSiralama - siralama) / (bolum.maxSiralama - bolum.minSiralama);
        yuzde = Math.round(50 + oran * 40);
        ihtimal = yuzde > 70 ? 'YÜKSEK' : 'ORTA';
      } else if (siralama <= bolum.maxSiralama * 1.3) {
        ihtimal = 'DÜŞÜK';
        yuzde = 20;
      } else {
        ihtimal = 'ÇOK_DÜŞÜK';
        yuzde = 5;
      }
    }

    return {
      bolumId: bolum.id,
      universite: bolum.universite.ad,
      bolum: bolum.bolumAdi,
      minSiralama: bolum.minSiralama,
      maxSiralama: bolum.maxSiralama,
      ogrenciSiralamai: siralama,
      ihtimal,
      yuzde,
    };
  });
}

export async function hedefEkle(ogrenciId: string, bolumId: string, oncelik: number) {
  const bolum = await prisma.universiteBolum.findUnique({ where: { id: bolumId } });
  if (!bolum) throw new AppHatasi('Bölüm bulunamadı', 404);

  return prisma.universiteHedef.upsert({
    where: { id: `${ogrenciId}-${bolumId}` },
    update: { oncelik },
    create: { id: `${ogrenciId}-${bolumId}`, ogrenciId, bolumId, oncelik },
    include: { bolum: { include: { universite: true } } },
  });
}

export async function hedeflerGetir(ogrenciId: string) {
  return prisma.universiteHedef.findMany({
    where: { ogrenciId },
    include: { bolum: { include: { universite: true } } },
    orderBy: { oncelik: 'asc' },
  });
}

export async function hedefSil(ogrenciId: string, bolumId: string) {
  return prisma.universiteHedef.delete({
    where: { id: `${ogrenciId}-${bolumId}` },
  });
}
