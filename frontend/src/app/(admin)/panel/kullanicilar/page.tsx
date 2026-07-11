'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, authApi } from '@/lib/api';
import {
  Search,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from '@/store/toast.store';
import { confirmAsk } from '@/store/confirm-dialog.store';
import { useAuthStore } from '@/store/auth.store';
import axios from 'axios';
import {
  OGRENCI_SINIF_SECENEKLERI,
  KPSS_OGRENCI_SECENEKLERI,
  legacySinifNorm,
  siniftanOgretimTuru,
  sinifEtiketi,
  ogretimTuruCoz,
  kpssOgretimTuruMu,
} from '@/lib/ogrenciKademe';
import { branslarParse } from '@/lib/ogretmenSinirlama';
import { AranabilirSelect } from '@/components/ui/AranabilirSelect';
import { isKpssMode } from '@/lib/platform';

/** Öğrenci form seçiminden öğretim türünü çözer (KPSS dahil). */
function ogrenciTurCoz(sinif?: string | null): string {
  if (kpssOgretimTuruMu(sinif)) return sinif;
  return siniftanOgretimTuru(sinif) ?? 'YKS';
}

/** Tek bir öğretim türü değerini okunur etikete çevirir. */
function turEtiketiTekil(tur?: string | null): string {
  if (!tur) return '';
  const s = String(tur).toUpperCase();
  if (kpssOgretimTuruMu(s)) return sinifEtiketi(s);
  if (s === 'LGS') return 'LGS';
  if (s === 'YKS') return 'YKS';
  return s;
}

/**
 * Öğretmen/admin için TÜR sütununda platforma uygun öğretim türlerini gösterir.
 * KPSS panelinde yalnızca KPSS türleri, YKS/LGS panelinde yalnızca YKS/LGS türleri listelenir;
 * böylece KPSS'te ders veren bir öğretmen "YKS" gibi kafa karıştırıcı görünmez.
 */
function ogretmenTurEtiketi(
  profil: { ogretimTuru?: string | null; ogretimTurleri?: string[] | null } | null | undefined,
  kpss: boolean,
): string {
  if (!profil) return '—';
  const hepsi = (profil.ogretimTurleri?.length ? profil.ogretimTurleri : [profil.ogretimTuru])
    .filter((t): t is string => Boolean(t))
    .map((t) => String(t).toUpperCase());
  const benzersiz = Array.from(new Set(hepsi));
  const platformTurleri = benzersiz.filter((t) => (kpss ? kpssOgretimTuruMu(t) : !kpssOgretimTuruMu(t)));
  const gosterilecek = platformTurleri.length ? platformTurleri : benzersiz;
  const etiketler = Array.from(new Set(gosterilecek.map(turEtiketiTekil).filter(Boolean)));
  return etiketler.length ? etiketler.join(', ') : '—';
}

interface IliskiliKullanici {
  id: string;
  email: string;
}

interface OgrenciProfil {
  ad: string;
  soyad: string;
  okul?: string | null;
  sehir?: string | null;
  sinif?: string | null;
  ogretimTuru: string;
  veli?: {
    ad: string;
    soyad: string;
    kullanici: IliskiliKullanici;
  } | null;
}

interface VeliProfil {
  ad: string;
  soyad: string;
  telefon?: string | null;
  ogrenciler?: Array<{
    ad: string;
    soyad: string;
    kullanici: IliskiliKullanici;
  }>;
}

interface AdminProfil {
  ad: string;
  soyad: string;
  brans?: string | null;
  ogretimTuru?: string | null;
  ogretimTurleri?: string[] | null;
}

interface Kullanici {
  id: string;
  email: string;
  telefon?: string | null;
  rol: string;
  aktif: boolean;
  olusturuldu: string;
  emailDogrulandi: boolean;
  ogrenciProfil?: OgrenciProfil | null;
  veliProfil?: VeliProfil | null;
  adminProfil?: AdminProfil | null;
}

const rolRenkleri: Record<string, string> = {
  OGRENCI: 'bg-blue-100 text-blue-700',
  VELI: 'bg-green-100 text-green-700',
  TEACHER: 'bg-amber-100 text-amber-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  SUPER_ADMIN: 'bg-red-100 text-red-700',
};

const ROL_ETIKETLERI: Record<string, string> = {
  OGRENCI: 'Öğrenci',
  VELI: 'Veli',
  TEACHER: 'Öğretmen',
  ADMIN: 'Yönetici',
  SUPER_ADMIN: 'Süper Yönetici',
};

const KADEME_SECENEKLERI = [
  { value: 'YKS', label: 'YKS (TYT/AYT)' },
  { value: 'LGS', label: 'LGS' },
  { value: 'KPSS_LISANS', label: 'KPSS Lisans' },
  { value: 'KPSS_ONLISANS', label: 'KPSS Önlisans' },
  { value: 'KPSS_ORTAOGRETIM', label: 'KPSS Ortaöğretim' },
] as const;

type Kademe = (typeof KADEME_SECENEKLERI)[number]['value'];

// Hardcoded fallback — API yetersiz kaldığında kullanılır
const YEDEK_BRANSLAR: Record<string, string[]> = {
  YKS: ['Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce', 'Almanca', 'Fransızca'],
  LGS: ['Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İnkılap Tarihi ve Atatürkçülük', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce'],
  KPSS_LISANS: ['Türkçe', 'Matematik', 'Tarih', 'Coğrafya', 'Vatandaşlık', 'Güncel Bilgiler'],
  KPSS_ONLISANS: ['Türkçe', 'Matematik', 'Tarih', 'Coğrafya', 'Vatandaşlık', 'Güncel Bilgiler'],
  KPSS_ORTAOGRETIM: ['Türkçe', 'Matematik', 'Tarih', 'Coğrafya', 'Vatandaşlık', 'Güncel Bilgiler'],
};

function metinNorm(v: string): string {
  return v
    .toLocaleLowerCase('tr-TR')
    .replace(/[\s()/_-]+/g, '')
    .replace(/[^a-z0-9çğıöşü]/gi, '');
}

const KADEME_NORM_SET = new Set(
  KADEME_SECENEKLERI.flatMap((k) => [metinNorm(k.value), metinNorm(k.label)])
);

function tekrarKademeGorunumuTemizle(liste: string[]): string[] {
  return liste.filter((item) => !KADEME_NORM_SET.has(metinNorm(item)));
}

function kademeTekrariGrupMu(grupAdi: string, kademeDegeri: string, kademeEtiketi: string): boolean {
  const grupNorm = metinNorm(grupAdi);
  return grupNorm === metinNorm(kademeDegeri) || grupNorm === metinNorm(kademeEtiketi);
}

// Artık backend'teki gruplardan geliyor; yetersizse yedek liste kullanılır
function kademeBranslari(k: Kademe, bransHaritasi: Record<string, string[]> | undefined): string[] {
  // KPSS varyantlarını tek çatı altında topla
  if (k.startsWith('KPSS')) {
    const apiList = tekrarKademeGorunumuTemizle([
      ...(bransHaritasi?.['KPSS_ONLISANS'] || []),
      ...(bransHaritasi?.['KPSS_ORTAOGRETIM'] || []),
      ...(bransHaritasi?.['KPSS'] || []),
    ]).filter((v, i, a) => a.indexOf(v) === i);
    if (apiList.length >= 3) return apiList.sort((a, b) => a.localeCompare(b, 'tr'));
    return YEDEK_BRANSLAR['KPSS_ONLISANS'];
  }
  const apiList = tekrarKademeGorunumuTemizle(bransHaritasi?.[k] || []);
  // API'den en az 3 branş geliyorsa onu kullan, yoksa yedek listeye düş
  if (apiList.length >= 3) return apiList;
  return YEDEK_BRANSLAR[k] || apiList;
}

function gorunenAd(k: Kullanici): string {
  if (k.ogrenciProfil) return `${k.ogrenciProfil.ad} ${k.ogrenciProfil.soyad}`;
  if (k.veliProfil) return `${k.veliProfil.ad} ${k.veliProfil.soyad}`;
  if (k.adminProfil) return `${k.adminProfil.ad} ${k.adminProfil.soyad}`;
  return '';
}

function kullaniciSecenekEtiketi(k: Kullanici): string {
  const ad = gorunenAd(k).trim();
  return ad ? `${ad} — ${k.email}` : k.email;
}

function basHarf(k: Kullanici): string {
  const ad = gorunenAd(k);
  if (ad.trim()) return ad.trim().charAt(0).toUpperCase();
  return k.email.charAt(0).toUpperCase();
}

function baglantiMetni(k: Kullanici): string {
  if (k.rol === 'OGRENCI' && k.ogrenciProfil?.veli) {
    const veli = k.ogrenciProfil.veli;
    return `${veli.ad} ${veli.soyad} (${veli.kullanici.email})`;
  }
  if (k.rol === 'VELI' && k.veliProfil?.ogrenciler?.length) {
    return k.veliProfil.ogrenciler
      .map((ogrenci) => `${ogrenci.ad} ${ogrenci.soyad} (${ogrenci.kullanici.email})`)
      .join(', ');
  }
  return '—';
}

type FormState = {
  email: string;
  sifre: string;
  rol: string;
  ad: string;
  soyad: string;
  telefon: string;
  sinif: string;
  ogretimTuru: string;
  ogretimTurleri: string[];
  branslarByTur: Record<string, string[]>;
  okul: string;
  branslar: string[];
  grupIds: string[];
  aktif: boolean;
  veliEmail: string;
  ogrenciEmail: string;
};

const bosForm = (): FormState => ({
  email: '',
  sifre: '',
  rol: 'OGRENCI',
  ad: '',
  soyad: '',
  telefon: '',
  sinif: '',
  ogretimTuru: 'YKS',
  ogretimTurleri: ['YKS'],
  branslarByTur: {},
  okul: '',
  branslar: [],
  grupIds: [],
  aktif: true,
  veliEmail: '',
  ogrenciEmail: '',
});

export default function KullanicilarSayfasi() {
  const queryClient = useQueryClient();
  const benimRol = useAuthStore((s) => s.kullanici?.rol);
  const benimId = useAuthStore((s) => s.kullanici?.id);

  const [sayfa, setSayfa] = useState(1);
  const [arama, setArama] = useState('');
  const [debouncedArama, setDebouncedArama] = useState('');
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Kullanici | null>(null);
  const [form, setForm] = useState<FormState>(bosForm());
  const [secilenIds, setSecilenIds] = useState<string[]>([]);
  const [hizliVeliSecim, setHizliVeliSecim] = useState('');
  const [hizliOgrenciSecim, setHizliOgrenciSecim] = useState('');
  const [kpssModu, setKpssModu] = useState(false);

  useEffect(() => {
    setKpssModu(isKpssMode());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedArama(arama);
      setSayfa(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [arama]);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['admin-kullanicilar', sayfa, debouncedArama],
    queryFn: () => adminApi.kullanicilar({ sayfa, q: debouncedArama }),
    placeholderData: (prev) => prev,
  });

  const { data: veliListeData, isLoading: veliListeYukleniyor } = useQuery({
    queryKey: ['admin-kullanicilar', 'eslestir', 'VELI'],
    queryFn: () => adminApi.kullanicilar({ rol: 'VELI', boyut: 500, sayfa: 1 }),
    staleTime: 60_000,
  });

  const { data: ogrenciListeData, isLoading: ogrenciListeYukleniyor } = useQuery({
    queryKey: ['admin-kullanicilar', 'eslestir', 'OGRENCI'],
    queryFn: () => adminApi.kullanicilar({ rol: 'OGRENCI', boyut: 500, sayfa: 1 }),
    staleTime: 60_000,
  });

  // Branş seçenekleri: backend'teki gruplardan gelir
  const { data: bransSecenekleriData } = useQuery({
    queryKey: ['brans-secenekleri'],
    queryFn: () => adminApi.bransSecenekleri(),
    staleTime: 120_000,
  });
  const bransSecenekleri: Record<string, string[]> = bransSecenekleriData?.data?.veri || {};

  // Öğretmen grup ataması için tüm gruplar
  const { data: tumGruplarData } = useQuery({
    queryKey: ['admin-gruplar'],
    queryFn: () => adminApi.gruplar(),
    staleTime: 60_000,
  });
  const tumGruplar: { id: string; ad: string; tur: string }[] = tumGruplarData?.data?.veri || [];

  const ogretmenGrupSunumu = useMemo(() => {
    const harita: Record<string, { gorunurGruplar: { id: string; ad: string; tur: string }[]; otomatikGrupIds: string[] }> = {};

    for (const tur of form.ogretimTurleri) {
      const turLabel = KADEME_SECENEKLERI.find((k) => k.value === tur)?.label || tur;
      const turGruplari = tumGruplar.filter((g) => g.tur === tur);
      const tekrarGruplari = turGruplari.filter((g) => kademeTekrariGrupMu(g.ad, tur, turLabel));
      const gorunurGruplar = turGruplari.filter((g) => !kademeTekrariGrupMu(g.ad, tur, turLabel));
      const otomatikGrupIds = gorunurGruplar.length === 0 && tekrarGruplari.length === 1 ? [tekrarGruplari[0].id] : [];
      harita[tur] = { gorunurGruplar, otomatikGrupIds };
    }

    return harita;
  }, [form.ogretimTurleri, tumGruplar]);

  const efektifOgretmenGrupIds = useMemo(
    () => [...new Set([...form.grupIds, ...Object.values(ogretmenGrupSunumu).flatMap((x) => x.otomatikGrupIds)])],
    [form.grupIds, ogretmenGrupSunumu]
  );

  const kullanicilar: Kullanici[] = data?.data?.veri || [];
  const veliListesi: Kullanici[] = veliListeData?.data?.veri || [];
  const ogrenciListesi: Kullanici[] = ogrenciListeData?.data?.veri || [];
  const meta = data?.data?.meta || { toplam: 0, toplamSayfa: 1 };
  const filtreliKullanicilar = kullanicilar;

  const kaydetMutation = useMutation({
    mutationFn: (veri: Record<string, unknown>) =>
      duzenlenen
        ? adminApi.kullaniciGuncelle(duzenlenen.id, veri)
        : adminApi.kullaniciOlustur(veri),
    onSuccess: () => {
      toast.basarili(duzenlenen ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu');
      setModalAcik(false);
      setDuzenlenen(null);
      setForm(bosForm());
      queryClient.invalidateQueries({ queryKey: ['admin-kullanicilar'] });
    },
    onError: (e: unknown) => {
      if (axios.isAxiosError(e) && e.response?.data?.mesaj) {
        toast.hata(String(e.response.data.mesaj));
        return;
      }
      toast.hata('İşlem başarısız');
    },
  });

  const sifreSifirlaMailMutation = useMutation({
    mutationFn: (email: string) => authApi.sifremiUnuttumTalep(email),
    onSuccess: (res) => {
      toast.basarili('Sıfırlama kodu gönderildi', res.data.mesaj || 'Kullanıcı e-postasını kontrol edebilir.');
    },
    onError: (e: unknown) => {
      if (axios.isAxiosError(e) && e.response?.data?.mesaj) {
        toast.hata(String(e.response.data.mesaj));
        return;
      }
      toast.hata('Sıfırlama e-postası gönderilemedi');
    },
  });

  const rolDegistirMutation = useMutation({
    mutationFn: ({ id, rol }: { id: string; rol: string }) =>
      adminApi.kullaniciGuncelle(id, { rol }),
    onSuccess: () => {
      toast.basarili('Rol güncellendi');
      queryClient.invalidateQueries({ queryKey: ['admin-kullanicilar'] });
    },
    onError: (e: unknown) => {
      if (axios.isAxiosError(e) && e.response?.data?.mesaj) {
        toast.hata(String(e.response.data.mesaj));
        return;
      }
      toast.hata('Rol değiştirilemedi');
    },
  });

  const veliEslestirMutation = useMutation({
    mutationFn: (veri: { veliEmail: string; ogrenciEmail: string }) =>
      adminApi.veliOgrenciEslestir(veri),
    onSuccess: () => {
      toast.basarili('Veli ve öğrenci eşleştirildi');
      setHizliVeliSecim('');
      setHizliOgrenciSecim('');
      queryClient.invalidateQueries({ queryKey: ['admin-kullanicilar'] });
    },
    onError: (e: unknown) => {
      if (axios.isAxiosError(e) && e.response?.data?.mesaj) {
        toast.hata(String(e.response.data.mesaj));
        return;
      }
      toast.hata('Eşleştirme başarısız');
    },
  });

  const veliBaglantiKaldirMutation = useMutation({
    mutationFn: ({ veliId, ogrenciEmail }: { veliId: string; ogrenciEmail: string }) =>
      adminApi.kullaniciGuncelle(veliId, { ogrenciEmailKaldir: ogrenciEmail }),
    onSuccess: () => {
      toast.basarili('Veli bağlantısı kaldırıldı');
      queryClient.invalidateQueries({ queryKey: ['admin-kullanicilar'] });
      setModalAcik(false);
      setDuzenlenen(null);
    },
    onError: (e: unknown) => {
      if (axios.isAxiosError(e) && e.response?.data?.mesaj) {
        toast.hata(String(e.response.data.mesaj));
        return;
      }
      toast.hata('Bağlantı kaldırılamadı');
    },
  });

  const silMutation = useMutation({
    mutationFn: (id: string) => adminApi.kullaniciSil(id),
    onSuccess: () => {
      toast.basarili('Kullanıcı silindi');
      queryClient.invalidateQueries({ queryKey: ['admin-kullanicilar'] });
    },
    onError: (e: unknown) => {
      if (axios.isAxiosError(e) && e.response?.data?.mesaj) {
        toast.hata(String(e.response.data.mesaj));
        return;
      }
      toast.hata('Silinemedi');
    },
  });

  const topluSilMutation = useMutation({
    mutationFn: (ids: string[]) => adminApi.kullaniciTopluSil({ kullaniciIds: ids }),
    onSuccess: (res) => {
      toast.basarili(res.data.mesaj || 'Kullanıcılar silindi');
      setSecilenIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-kullanicilar'] });
    },
    onError: (e: unknown) => {
      if (axios.isAxiosError(e) && e.response?.data?.mesaj) {
        toast.hata(String(e.response.data.mesaj));
        return;
      }
      toast.hata('Silinemedi');
    },
  });

  const toggleSecim = (id: string) => {
    if (id === benimId) return;
    setSecilenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTumunuSec = () => {
    const tumIdler = filtreliKullanicilar
      .filter((k) => k.id !== benimId)
      .map((k) => k.id);
    if (secilenIds.length === tumIdler.length) {
      setSecilenIds([]);
    } else {
      setSecilenIds(tumIdler);
    }
  };

  const modalAc = (k?: Kullanici) => {
    if (k) {
      setDuzenlenen(k);
      const op = k.ogrenciProfil;
      setForm({
        email: k.email,
        sifre: '',
        rol: k.rol,
        ad: op?.ad || k.veliProfil?.ad || k.adminProfil?.ad || '',
        soyad: op?.soyad || k.veliProfil?.soyad || k.adminProfil?.soyad || '',
        telefon: k.telefon || k.veliProfil?.telefon || '',
        sinif: kpssOgretimTuruMu(op?.ogretimTuru)
          ? (op?.ogretimTuru as string)
          : legacySinifNorm(op?.ogretimTuru, op?.sinif) || '',
        ogretimTuru: k.adminProfil?.ogretimTuru || (op ? ogretimTuruCoz(null, { ogrenciProfil: op }) : 'YKS'),
        ogretimTurleri: (k.adminProfil as any)?.ogretimTurleri?.length ? (k.adminProfil as any).ogretimTurleri : [k.adminProfil?.ogretimTuru || 'YKS'],
        branslarByTur: (k.adminProfil as any)?.ogretmenBranslar || {},
        okul: op?.okul || '',
        branslar: branslarParse(k.adminProfil?.brans),
        grupIds: ((k.adminProfil as any)?.ogretmenGruplari || []).map((og: any) => og.grupId),
        aktif: k.aktif,
        veliEmail: op?.veli?.kullanici?.email || '',
        ogrenciEmail: '',
      });
    } else {
      setDuzenlenen(null);
      setForm(bosForm());
    }
    setModalAcik(true);
  };

  const formGonder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!duzenlenen) {
      if (!form.sifre || form.sifre.length < 6) {
        toast.hata('Şifre en az 6 karakter olmalı');
        return;
      }
      const veri: Record<string, unknown> = {
        email: form.email.trim(),
        sifre: form.sifre,
        rol: form.rol,
        ad: form.ad.trim(),
        soyad: form.soyad.trim(),
      };
      if (form.telefon.trim()) veri.telefon = form.telefon.trim();
      if (form.rol === 'OGRENCI') {
        if (!form.sinif) {
          toast.hata(kpssModu ? 'Öğrenci için KPSS türü seçin' : 'Öğrenci için sınıf seçin');
          return;
        }
        if (kpssOgretimTuruMu(form.sinif)) {
          veri.ogretimTuru = form.sinif;
        } else {
          veri.sinif = form.sinif;
          veri.ogretimTuru = siniftanOgretimTuru(form.sinif) ?? 'YKS';
        }
        if (form.okul.trim()) veri.okul = form.okul.trim();
        if (form.veliEmail.trim()) veri.veliEmail = form.veliEmail.trim();
      }
      if (form.rol === 'TEACHER') {
        if (!Array.isArray((form as any).ogretimTurleri) || (form as any).ogretimTurleri.length === 0) {
          toast.hata('En az bir kademe seçin');
          return;
        }
        if (efektifOgretmenGrupIds.length === 0) {
          toast.hata('En az bir grup seçmelisiniz');
          return;
        }
        // geriye uyum: birleşik brans listesi
        veri.branslar = form.branslar;
        veri.ogretimTuru = (form as any).ogretimTurleri[0] || form.ogretimTuru;
        veri.ogretimTurleri = (form as any).ogretimTurleri;
        veri.branslarByTur = (form as any).branslarByTur;
        veri.grupIds = efektifOgretmenGrupIds;
      }
      kaydetMutation.mutate(veri);
      return;
    }

    const veri: Record<string, unknown> = {
      email: form.email.trim(),
      ad: form.ad.trim(),
      soyad: form.soyad.trim(),
      aktif: form.aktif,
    };
    if (form.sifre.length >= 6) veri.sifre = form.sifre;
    if (form.telefon.trim()) veri.telefon = form.telefon.trim();
    else veri.telefon = '';
    if (form.rol && form.rol !== duzenlenen.rol) {
      veri.rol = form.rol;
    }
    if ((form.rol || duzenlenen.rol) === 'OGRENCI') {
      if (!form.sinif) {
        toast.hata(kpssModu ? 'Öğrenci için KPSS türü seçin' : 'Öğrenci için sınıf seçin');
        return;
      }
      if (kpssOgretimTuruMu(form.sinif)) {
        veri.sinif = null;
        veri.ogretimTuru = form.sinif;
      } else {
        veri.sinif = form.sinif;
        veri.ogretimTuru = siniftanOgretimTuru(form.sinif) ?? 'YKS';
      }
      veri.okul = form.okul.trim() || '';
      veri.veliEmail = form.veliEmail.trim();
    }
    if ((form.rol || duzenlenen.rol) === 'VELI' && form.ogrenciEmail.trim()) {
      veri.ogrenciEmail = form.ogrenciEmail.trim();
    }
    if ((form.rol || duzenlenen.rol) === 'TEACHER') {
      if (!Array.isArray((form as any).ogretimTurleri) || (form as any).ogretimTurleri.length === 0) {
        toast.hata('En az bir kademe seçin');
        return;
      }
      if (efektifOgretmenGrupIds.length === 0) {
        toast.hata('En az bir grup seçmelisiniz');
        return;
      }
      veri.branslar = form.branslar;
      veri.ogretimTuru = (form as any).ogretimTurleri[0] || form.ogretimTuru;
      veri.ogretimTurleri = (form as any).ogretimTurleri;
      veri.branslarByTur = (form as any).branslarByTur;
      veri.grupIds = efektifOgretmenGrupIds;
    }
    kaydetMutation.mutate(veri);
  };

  const superAdmin = benimRol === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-gray-500 mt-1">Toplam {meta.toplam.toLocaleString('tr-TR')} kullanıcı</p>
        </div>
        <button type="button" onClick={() => modalAc()} className="btn-primary inline-flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Yeni kullanıcı
        </button>
      </div>

      <div className="card p-4 sm:p-5 border border-indigo-100 bg-indigo-50/40">
        <h2 className="text-sm font-semibold text-gray-900">Veli ↔ Öğrenci eşleştir</h2>
        <p className="text-xs text-gray-600 mt-1 mb-4">
          Listeden veli ve öğrenci seçerek eşleştirin. Detaylı düzenleme için kullanıcı satırındaki kalem ikonunu kullanın.
        </p>
        <form
          className="flex flex-col sm:flex-row gap-3 sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!hizliVeliSecim || !hizliOgrenciSecim) {
              toast.hata('Veli ve öğrenci seçimi gerekli');
              return;
            }
            veliEslestirMutation.mutate({
              veliEmail: hizliVeliSecim,
              ogrenciEmail: hizliOgrenciSecim,
            });
          }}
        >
          <div className="flex-1 min-w-0">
            <label htmlFor="hizli-veli-secim" className="block text-xs font-medium text-gray-700 mb-1">
              Veli seçin
            </label>
            <select
              id="hizli-veli-secim"
              value={hizliVeliSecim}
              onChange={(e) => setHizliVeliSecim(e.target.value)}
              className="input-field w-full"
              disabled={veliEslestirMutation.isPending || veliListeYukleniyor}
            >
              <option value="">
                {veliListeYukleniyor ? 'Veliler yükleniyor…' : 'Veli seçin…'}
              </option>
              {veliListesi.map((k) => (
                <option key={k.id} value={k.email}>
                  {kullaniciSecenekEtiketi(k)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label htmlFor="hizli-ogrenci-secim" className="block text-xs font-medium text-gray-700 mb-1">
              Öğrenci seçin
            </label>
            <select
              id="hizli-ogrenci-secim"
              value={hizliOgrenciSecim}
              onChange={(e) => setHizliOgrenciSecim(e.target.value)}
              className="input-field w-full"
              disabled={veliEslestirMutation.isPending || ogrenciListeYukleniyor}
            >
              <option value="">
                {ogrenciListeYukleniyor ? 'Öğrenciler yükleniyor…' : 'Öğrenci seçin…'}
              </option>
              {ogrenciListesi.map((k) => (
                <option key={k.id} value={k.email}>
                  {kullaniciSecenekEtiketi(k)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={veliEslestirMutation.isPending || veliListeYukleniyor || ogrenciListeYukleniyor}
            className="btn-primary shrink-0 inline-flex items-center justify-center gap-2"
          >
            {veliEslestirMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Eşleştiriliyor…
              </>
            ) : (
              'Eşleştir'
            )}
          </button>
        </form>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Ad, soyad veya e-posta ara..."
          className="input-field pl-10"
        />
      </div>

      <AnimatePresence>
        {secilenIds.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="p-4 rounded-2xl bg-indigo-600 text-white shadow-xl flex items-center justify-between gap-4 sticky top-4 z-30"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-200" />
                <span className="font-bold">{secilenIds.length} kullanıcı seçildi</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSecilenIds([])}
                className="px-4 py-2 text-sm font-bold text-indigo-100 hover:text-white transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={async () => {
                  if (
                    await confirmAsk({
                      title: 'Toplu Sil',
                      message: `Seçilen ${secilenIds.length} kullanıcı silinsin mi? Bu işlem geri alınamaz.`,
                      variant: 'destructive',
                      onayMetni: 'Evet, Hepsini Sil',
                    })
                  ) {
                    topluSilMutation.mutate(secilenIds);
                  }
                }}
                disabled={topluSilMutation.isPending}
                className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {topluSilMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Seçilenleri Sil
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card p-0 overflow-hidden relative">
        {isLoading && !isPlaceholderData && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        )}

        {(kullanicilar.length > 0 || isPlaceholderData) && (
          <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            <table className="w-full min-w-[880px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="w-12 px-6 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={
                        secilenIds.length > 0 &&
                        secilenIds.length === filtreliKullanicilar.filter((k) => k.id !== benimId).length
                      }
                      onChange={toggleTumunuSec}
                    />
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Kullanıcı</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">E-posta</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Bağlantı</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tür</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Branş</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Kayıt Tarihi</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Durümun</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase w-36">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtreliKullanicilar.map((kullanici) => (
                  <tr
                    key={kullanici.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      secilenIds.includes(kullanici.id) ? 'bg-indigo-50/50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={secilenIds.includes(kullanici.id)}
                        disabled={kullanici.id === benimId}
                        onChange={() => toggleSecim(kullanici.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                          {basHarf(kullanici)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{gorunenAd(kullanici) || '—'}</p>
                          <p className="text-xs text-gray-500">
                            {kullanici.ogrenciProfil?.okul || kullanici.ogrenciProfil?.sehir || ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{kullanici.email}</td>
                    <td className="px-6 py-4">
                      <select
                        value={kullanici.rol}
                        disabled={
                          kullanici.id === benimId ||
                          (kullanici.rol === 'SUPER_ADMIN' && !superAdmin) ||
                          rolDegistirMutation.isPending
                        }
                        onChange={async (e) => {
                          const yeniRol = e.target.value;
                          if (yeniRol === kullanici.rol) return;
                          const ok = await confirmAsk({
                            title: 'Rolü değiştir',
                            message: `${kullanici.email} kullanıcısının rolü "${yeniRol}" olarak değiştirilsin mi?`,
                            onayMetni: 'Değiştir',
                            iptalMetni: 'İptal',
                          });
                          if (!ok) {
                            e.target.value = kullanici.rol;
                            return;
                          }
                          rolDegistirMutation.mutate({ id: kullanici.id, rol: yeniRol });
                        }}
                        className={`badge cursor-pointer outline-none border-0 px-2 py-1 rounded-md ${rolRenkleri[kullanici.rol] || 'bg-gray-100 text-gray-600'}`}
                      >
                        <option value="OGRENCI">{ROL_ETIKETLERI.OGRENCI}</option>
                        <option value="VELI">{ROL_ETIKETLERI.VELI}</option>
                        <option value="TEACHER">{ROL_ETIKETLERI.TEACHER}</option>
                        <option value="ADMIN">{ROL_ETIKETLERI.ADMIN}</option>
                        {(superAdmin || kullanici.rol === 'SUPER_ADMIN') && (
                          <option value="SUPER_ADMIN">{ROL_ETIKETLERI.SUPER_ADMIN}</option>
                        )}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[220px]">
                      <span className="line-clamp-2" title={baglantiMetni(kullanici)}>
                        {baglantiMetni(kullanici)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {kullanici.ogrenciProfil
                        ? (() => {
                            const op = kullanici.ogrenciProfil;
                            const tur = ogretimTuruCoz(null, { ogrenciProfil: op });
                            if (kpssOgretimTuruMu(tur)) return sinifEtiketi(tur);
                            const s = legacySinifNorm(op.ogretimTuru, op.sinif);
                            return s ? `${sinifEtiketi(s)} · ${tur}` : tur;
                          })()
                        : ogretmenTurEtiketi(kullanici.adminProfil, kpssModu)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {branslarParse(kullanici.adminProfil?.brans).join(', ') || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(kullanici.olusturuldu), 'd MMM yyyy', { locale: tr })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {kullanici.rol === 'TEACHER' && !kullanici.aktif ? (
                        <span className="badge bg-amber-100 text-amber-700 animate-pulse">Onay Bekliyor</span>
                      ) : (
                        <span className={`badge ${kullanici.aktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {kullanici.aktif ? 'Aktif' : 'Pasif'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {kullanici.rol === 'TEACHER' && !kullanici.aktif && (
                          <button
                            type="button"
                            title="Onayla"
                            onClick={async () => {
                              if (await confirmAsk({
                                title: 'Öğretmeni Onayla',
                                message: `${kullanici.email} kullanıcısının öğretmen hesabı onaylansın mı?`,
                                onayMetni: 'Onayla',
                              })) {
                                adminApi.kullaniciGuncelle(kullanici.id, { aktif: true })
                                  .then(() => {
                                    toast.basarili('Öğretmen onaylandı');
                                    queryClient.invalidateQueries({ queryKey: ['admin-kullanicilar'] });
                                  })
                                  .catch((err: any) => {
                                    toast.hata(err?.response?.data?.mesaj || 'Onaylama başarısız');
                                  });
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Düzenle"
                          onClick={() => modalAc(kullanici)}
                          className="p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Sil"
                          disabled={kullanici.id === benimId || silMutation.isPending}
                          onClick={async () => {
                            if (kullanici.id === benimId) return;
                            if (
                              !(await confirmAsk({
                                title: 'Kullanıcıyı sil',
                                message: `${kullanici.email} silinsin mi? Bu işlem geri alınamaz.`,
                                variant: 'destructive',
                                onayMetni: 'Sil',
                                iptalMetni: 'İptal',
                              }))
                            )
                              return;
                            silMutation.mutate(kullanici.id);
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtreliKullanicilar.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Kullanıcı bulunamadı</p>
          </div>
        )}
      </div>

      {meta.toplamSayfa > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setSayfa((s) => Math.max(1, s - 1))}
            disabled={sayfa === 1}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            {sayfa} / {meta.toplamSayfa}
          </span>
          <button
            type="button"
            onClick={() => setSayfa((s) => Math.min(meta.toplamSayfa, s + 1))}
            disabled={sayfa === meta.toplamSayfa}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {modalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalAcik(false)} />
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {duzenlenen ? 'Kullanıcıyı düzenle' : 'Yeni kullanıcı'}
            </h2>
            <form onSubmit={formGonder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                  className="input-field w-full"
                  disabled={!!duzenlenen && duzenlenen.id === benimId}
                >
                  <option value="OGRENCI">Öğrenci</option>
                  <option value="VELI">Veli</option>
                  <option value="TEACHER">Öğretmen</option>
                  <option value="ADMIN">Yönetici</option>
                  {superAdmin && <option value="SUPER_ADMIN">Süper yönetici</option>}
                </select>
              </div>
              {!duzenlenen && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={form.sifre}
                    onChange={(e) => setForm((f) => ({ ...f, sifre: e.target.value }))}
                    className="input-field w-full"
                    placeholder="En az 6 karakter"
                  />
                </div>
              )}
              {duzenlenen && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yeni şifre <span className="text-gray-400 font-normal">(boş bırakılırsa değişmez)</span>
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={form.sifre}
                    onChange={(e) => setForm((f) => ({ ...f, sifre: e.target.value }))}
                    className="input-field w-full"
                  />
                  <button
                    type="button"
                    disabled={sifreSifirlaMailMutation.isPending}
                    onClick={() => sifreSifirlaMailMutation.mutate(form.email.trim())}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    {sifreSifirlaMailMutation.isPending ? 'Gönderiliyor…' : 'E-posta ile sıfırlama kodu gönder'}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                  <input
                    required
                    value={form.ad}
                    onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
                  <input
                    required
                    value={form.soyad}
                    onChange={(e) => setForm((f) => ({ ...f, soyad: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
              </div>
              {(duzenlenen ? !!duzenlenen.ogrenciProfil : form.rol === 'OGRENCI') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {kpssModu ? 'KPSS Türü' : 'Sınıf'}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      {kpssModu
                        ? 'Öğrencinin hazırlandığı KPSS kademesini seçin'
                        : '6–8. sınıf → LGS paneli · 9–12 ve mezun → YKS paneli'}
                    </p>
                    <select
                      required
                      value={form.sinif}
                      onChange={(e) => setForm((f) => ({ ...f, sinif: e.target.value }))}
                      className="input-field w-full"
                    >
                      <option value="">{kpssModu ? 'KPSS türü seçin' : 'Sınıf seçin'}</option>
                      {(kpssModu ? KPSS_OGRENCI_SECENEKLERI : OGRENCI_SINIF_SECENEKLERI).map((s) => (
                        <option key={s.value} value={s.value}>{s.etiket}</option>
                      ))}
                    </select>
                    {form.sinif && (
                      <p className={`mt-2 text-xs font-semibold ${
                        kpssOgretimTuruMu(form.sinif)
                          ? 'text-teal-600'
                          : siniftanOgretimTuru(form.sinif) === 'LGS'
                            ? 'text-blue-600'
                            : 'text-indigo-600'
                      }`}>
                        Panel: {kpssOgretimTuruMu(form.sinif)
                          ? `${sinifEtiketi(form.sinif)} Paneli`
                          : siniftanOgretimTuru(form.sinif) === 'LGS'
                            ? 'LGS Paneli'
                            : 'YKS Paneli'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Okul (isteğe bağlı)</label>
                    <input
                      value={form.okul}
                      onChange={(e) => setForm((f) => ({ ...f, okul: e.target.value }))}
                      className="input-field w-full"
                    />
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
                    <p className="text-sm font-semibold text-gray-900">Veli eşleştirme</p>
                    <p className="text-xs text-gray-600">
                      {duzenlenen
                        ? 'Listeden veli seçin. "Veli yok" seçeneği mevcut bağlantıyı kaldırır.'
                        : 'İsteğe bağlı — listeden veli seçerek eşleştirebilirsiniz.'}
                    </p>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Veli</label>
                    <AranabilirSelect
                      value={form.veliEmail}
                      onChange={(veliEmail) => setForm((f) => ({ ...f, veliEmail }))}
                      disabled={veliListeYukleniyor}
                      placeholder={veliListeYukleniyor ? 'Veliler yükleniyor…' : 'Veli ara veya seç…'}
                      bosSecenek={{
                        value: '',
                        etiket: duzenlenen ? '— Veli yok —' : '— Veli seçmeyin —',
                      }}
                      secenekler={veliListesi.map((k) => ({
                        value: k.email,
                        etiket: kullaniciSecenekEtiketi(k),
                      }))}
                    />
                  </div>
                </>
              )}
              {(duzenlenen ? duzenlenen.rol === 'VELI' : form.rol === 'VELI') && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Öğrenci eşleştirme</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Listeden bağlamak istediğiniz öğrenciyi seçin ve kaydedin.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Öğrenci</label>
                    <AranabilirSelect
                      value={form.ogrenciEmail}
                      onChange={(ogrenciEmail) => setForm((f) => ({ ...f, ogrenciEmail }))}
                      disabled={ogrenciListeYukleniyor}
                      placeholder={ogrenciListeYukleniyor ? 'Öğrenciler yükleniyor…' : 'Öğrenci ara veya seç…'}
                      bosSecenek={{ value: '', etiket: 'Öğrenci seçin…' }}
                      secenekler={ogrenciListesi.map((k) => ({
                        value: k.email,
                        etiket: kullaniciSecenekEtiketi(k),
                      }))}
                    />
                  </div>
                  {duzenlenen?.veliProfil?.ogrenciler && duzenlenen.veliProfil.ogrenciler.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Bağlı öğrenciler</p>
                      <ul className="space-y-2">
                        {duzenlenen.veliProfil.ogrenciler.map((ogrenci) => (
                          <li
                            key={ogrenci.kullanici.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm"
                          >
                            <span className="text-gray-800 truncate">
                              {ogrenci.ad} {ogrenci.soyad}{' '}
                              <span className="text-gray-500">({ogrenci.kullanici.email})</span>
                            </span>
                            <button
                              type="button"
                              className="text-xs font-medium text-red-600 hover:text-red-800 shrink-0"
                              disabled={veliBaglantiKaldirMutation.isPending}
                              onClick={async () => {
                                const ok = await confirmAsk({
                                  title: 'Bağlantıyı kaldır',
                                  message: `${ogrenci.ad} ${ogrenci.soyad} öğrencisinin veli bağlantısı kaldırılsın mı?`,
                                  onayMetni: 'Kaldır',
                                  iptalMetni: 'İptal',
                                });
                                if (!ok || !duzenlenen) return;
                                veliBaglantiKaldirMutation.mutate({
                                  veliId: duzenlenen.id,
                                  ogrenciEmail: ogrenci.kullanici.email,
                                });
                              }}
                            >
                              Kaldır
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {form.rol === 'TEACHER' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kademeler ve Gruplar{' '}
                      {efektifOgretmenGrupIds.length > 0 && (
                        <span className="text-gray-500 font-normal">({efektifOgretmenGrupIds.length} grup seçili)</span>
                      )}
                    </label>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-4">
                      {/* Kademe seçimi */}
                      <div className="grid grid-cols-2 gap-2">
                        {KADEME_SECENEKLERI.map((k) => {
                          const secili = form.ogretimTurleri.includes(k.value);
                          return (
                            <label
                              key={k.value}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                                secili ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={secili}
                                onChange={() =>
                                  setForm((f) => {
                                    const yeniTurler = secili
                                      ? f.ogretimTurleri.filter((x) => x !== k.value)
                                      : [...f.ogretimTurleri, k.value];
                                    // Seçili kademe kaldırılırsa o kademedeki grup seçimlerini de temizle
                                    const yeniGrupIds = secili
                                      ? f.grupIds.filter((gid) => {
                                          const grup = tumGruplar.find((g) => g.id === gid);
                                          return grup && grup.tur !== k.value;
                                        })
                                      : f.grupIds;
                                    const yeniHarita = { ...f.branslarByTur };
                                    if (secili) delete yeniHarita[k.value];
                                    const birlesik = [...new Set(Object.values(yeniHarita).flat())];
                                    return {
                                      ...f,
                                      ogretimTurleri: yeniTurler,
                                      ogretimTuru: yeniTurler[0] || f.ogretimTuru,
                                      grupIds: yeniGrupIds,
                                      branslarByTur: yeniHarita,
                                      branslar: birlesik,
                                    };
                                  })
                                }
                                className="rounded border-gray-300"
                              />
                              <span className="font-medium">{k.label}</span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Her seçili kademe için DB grupları */}
                      {form.ogretimTurleri.length === 0 ? (
                        <p className="text-xs text-gray-500">Grupları ve branşları görüntülemek için kademe seçin.</p>
                      ) : (
                        form.ogretimTurleri.map((tur) => {
                          const turLabel = KADEME_SECENEKLERI.find((k) => k.value === tur)?.label || tur;
                          const branslar = kademeBranslari(tur as Kademe, bransSecenekleri);
                          const grupSunumu = ogretmenGrupSunumu[tur] || { gorunurGruplar: [], otomatikGrupIds: [] };
                          const turGruplari = grupSunumu.gorunurGruplar;
                          const seciliBranslar = form.branslarByTur[tur] || [];

                          return (
                            <div key={tur} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0 space-y-3">
                              <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md inline-block">
                                {turLabel}
                              </div>
                              
                              {/* Branş Seçimi */}
                              <div className="space-y-1.5">
                                <span className="block text-xs font-semibold text-gray-700">Yetkili Dersler:</span>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 bg-white rounded-lg border border-gray-100 max-h-36 overflow-y-auto">
                                  {branslar.map((b) => {
                                    const bSecili = seciliBranslar.includes(b);
                                    return (
                                      <label
                                        key={b}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                                          bSecili ? 'bg-indigo-50 text-indigo-900 font-medium' : 'hover:bg-gray-50 text-gray-600'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={bSecili}
                                          onChange={() =>
                                            setForm((f) => {
                                              const yeniHarita = { ...f.branslarByTur };
                                              if (!yeniHarita[tur]) yeniHarita[tur] = [];
                                              if (yeniHarita[tur].includes(b)) {
                                                yeniHarita[tur] = yeniHarita[tur].filter((x) => x !== b);
                                              } else {
                                                yeniHarita[tur] = [...yeniHarita[tur], b];
                                              }
                                              const birlesik = [...new Set(Object.values(yeniHarita).flat())];
                                              return {
                                                ...f,
                                                branslarByTur: yeniHarita,
                                                branslar: birlesik,
                                              };
                                            })
                                          }
                                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                        />
                                        <span className="truncate">{b}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                {seciliBranslar.length === 0 && (
                                  <p className="text-[10px] text-amber-600">Lütfen en az bir branş seçin.</p>
                                )}
                                <p className="text-[10px] text-gray-400">
                                  Kademe yukarıda seçildiği için burada yalnızca o kademeye ait dersler listelenir.
                                </p>
                              </div>

                              {/* Sınıf/Grup Seçimi */}
                              {turGruplari.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="block text-xs font-semibold text-gray-700">Yetkili Sınıflar / Gruplar:</span>
                                  <div className="space-y-1 p-2 bg-white rounded-lg border border-gray-100 max-h-36 overflow-y-auto">
                                    {turGruplari.map((g) => {
                                      const secili = form.grupIds.includes(g.id);
                                      return (
                                        <label
                                          key={g.id}
                                          className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                                            secili ? 'bg-indigo-50 text-indigo-900 font-medium' : 'hover:bg-gray-50 text-gray-600'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={secili}
                                            onChange={() =>
                                              setForm((f) => {
                                                const yeniGrupIds = secili
                                                  ? f.grupIds.filter((x) => x !== g.id)
                                                  : [...f.grupIds, g.id];
                                                return {
                                                  ...f,
                                                  grupIds: yeniGrupIds,
                                                };
                                              })
                                            }
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                          />
                                          <span>{g.ad}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {turGruplari.length === 0 && grupSunumu.otomatikGrupIds.length > 0 && (
                                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                                  Bu kademe tek havuzla eşleştiği için grup yetkisi otomatik uygulanır.
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                    {efektifOgretmenGrupIds.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">En az bir grup seçmelisiniz.</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">
                      Seçilen gruplar öğretmenin soru üretebileceği konu havuzlarını belirler.
                    </p>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon (isteğe bağlı)</label>
                <input
                  value={form.telefon}
                  onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              {duzenlenen && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.aktif}
                    onChange={(e) => setForm((f) => ({ ...f, aktif: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Hesap aktif</span>
                </label>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalAcik(false);
                    setDuzenlenen(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  İptal
                </button>
                <button type="submit" disabled={kaydetMutation.isPending} className="btn-primary flex-1">
                  {kaydetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
