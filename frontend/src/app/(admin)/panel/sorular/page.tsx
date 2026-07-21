'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, api } from '@/lib/api';
import SoruCizimEditoru from '@/components/admin/SoruCizimEditoru';
import SoruZenginMetinEditoru from '@/components/admin/SoruZenginMetinEditoru';
import SoruAiSohbet, { AiOneri } from '@/components/admin/SoruAiSohbet';
import SoruAiGorsel from '@/components/admin/SoruAiGorsel';
import KonuSecici from '@/components/admin/KonuSecici';
import { kpssOgretimTuruMu, kpssOgretimTuruEtiket } from '@/lib/grupOgretimTuru';
import { ALAN_FILTRE_SECENEKLERI, alanFiltreApiParams, alanKonuEtiketi, type AlanTab, getAlanFiltreSecenekleri } from '@/lib/alanFiltre';
import { isKpssMode } from '@/lib/platform';
import {
  Plus, 
  Trash2, 
  Search, 
  Brain, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Users, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
  Layers,
  Tag,
  GraduationCap,
  Sparkles,
  Info,
  BarChart3,
  Upload
} from 'lucide-react';
import { toast } from '@/store/toast.store';
import { confirmAsk } from '@/store/confirm-dialog.store';
import { useAuthStore } from '@/store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';
import { buildMetinHtmlFromParts, parseMetinParcalari } from '@/lib/soru-metin-parcalari';
import {
  cozumDuzMetinAiMetadan,
  duzMetinHtmlSar,
  soruCozumHtmlBirlestir,
  soruListeOnMetin,
} from '@/lib/soruCozumYardim';
import { SoruHtmlMath } from '@/components/admin/SoruHtmlMath';

/** AI bazen `metinHtml: ""` döner; `??` ile eski metin korunmaz (boş string null değil). */
function htmlGorunurMetinVarMi(html: string | undefined | null): boolean {
  const plain = String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 0;
}

interface SoruKullaniciOzet {
  id: string;
  email: string;
  rol: string;
  adminProfil?: { ad: string; soyad: string; brans: string | null } | null;
}

interface Soru {
  id: string;
  konuId?: string;
  siraNo: number;
  metinHtml: string;
  dogruCevap: string;
  zorluk: 'KOLAY' | 'ORTA' | 'ZOR';
  aiUretildi: boolean;
  aiModeli?: string | null;
  kazanim?: string;
  secenekler: Record<string, string>;
  konu: { ad: string; ders: string; ogretimTuru?: string; yksSegment?: string | null };
  ekKonular?: { konu: { id: string; ad: string; ders: string } }[];
  onayDurumu?: 'ONAY_BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI';
  ogretmenGuncelledi?: boolean;
  olusturanId?: string | null;
  duzenleyenId?: string | null;
  duzenleyen?: SoruKullaniciOzet | null;
  olusturan?: SoruKullaniciOzet | null;
  olusturuldu?: string;
  aiMeta?: Record<string, unknown> | null;
  sinav?: { id: string; baslik: string; grup: { id: string; ad: string } };
  uygunGruplar?: { grup: { id: string; ad: string; tur?: string } }[];
}

function soruUygunGrupAdlari(soru: Soru): string[] {
  const etiketler = (soru.uygunGruplar ?? []).map((u) => u.grup?.ad).filter(Boolean) as string[];
  return [...new Set(etiketler)].sort((a, b) => a.localeCompare(b, 'tr'));
}

function kullaniciGorunenAd(k: SoruKullaniciOzet | null | undefined): string | null {
  if (!k) return null;
  const ad = k.adminProfil?.ad?.trim();
  const soyad = k.adminProfil?.soyad?.trim();
  if (ad) return [ad, soyad].filter(Boolean).join(' ');
  return k.email || null;
}

function kullaniciBransEtiketi(k: SoruKullaniciOzet | null | undefined): string | null {
  const brans = k?.adminProfil?.brans?.trim();
  if (!brans) return null;
  return brans.split(',')[0]?.trim() || null;
}

function soruOgretmenSahibiMi(soru: Soru, userId?: string | null): boolean {
  if (!userId) return false;
  if (soru.olusturanId) return soru.olusturanId === userId;
  if (soru.duzenleyenId) return soru.duzenleyenId === userId;
  if (soru.olusturan?.id) return soru.olusturan.id === userId;
  if (soru.duzenleyen?.id) return soru.duzenleyen.id === userId;
  return false;
}

function soruIslemYapilabilir(soru: Soru, ogretmenModu: boolean, userId?: string | null): boolean {
  if (!ogretmenModu) return true;
  return soruOgretmenSahibiMi(soru, userId);
}

function soruUreticiEtiketi(soru: Soru): { etiket: string; sinif: string } {
  if (soru.aiUretildi) {
    const model = String(soru.aiModeli || '').trim();
    if (/referans/i.test(model)) {
      return { etiket: 'Referans tabanlı', sinif: 'bg-sky-50 text-sky-700 border-sky-100' };
    }
    if (/import|scraper|ogm/i.test(model)) {
      return { etiket: model ? `İçe aktarım · ${model}` : 'İçe aktarım', sinif: 'bg-cyan-50 text-cyan-700 border-cyan-100' };
    }
    const kisa = model.includes('/') ? model.split('/').pop()! : model;
    return {
      etiket: kisa ? `AI · ${kisa}` : 'AI üretimi',
      sinif: 'bg-violet-50 text-violet-600 border-violet-100',
    };
  }
  return { etiket: 'Manuel', sinif: 'bg-gray-50 text-gray-500 border-gray-100' };
}

function soruHazirlayanGosterim(soru: Soru): { ad: string; alt: string | null; sinif: string } | null {
  const kaynak = soru.olusturan || soru.duzenleyen;
  const ad = kullaniciGorunenAd(kaynak);
  if (ad) {
    const aiEtiket = soru.aiUretildi ? soruUreticiEtiketi(soru).etiket : null;
    return {
      ad,
      alt: aiEtiket || kullaniciBransEtiketi(kaynak),
      sinif: 'text-amber-800',
    };
  }
  if (soruManuelGuncellendi(soru)) {
    return {
      ad: 'Öğretmen (kayıtsız)',
      alt: soru.aiUretildi ? soruUreticiEtiketi(soru).etiket : null,
      sinif: 'text-amber-600',
    };
  }
  return null;
}

/** @deprecated soruHazirlayanGosterim kullanın */
function soruDuzenleyenGosterim(soru: Soru) {
  return soruHazirlayanGosterim(soru);
}

/** API camelCase; bazı ortamlarda snake_case gelebilir */
function soruManuelGuncellendi(soru: Soru): boolean {
  if (soru.ogretmenGuncelledi === true) return true;
  const raw = (soru as unknown as { ogretmen_guncelledi?: boolean }).ogretmen_guncelledi;
  return raw === true;
}

function soruTumKonulari(soru: Soru): { ad: string; ders: string }[] {
  const liste = [soru.konu];
  for (const ek of soru.ekKonular || []) {
    if (!liste.some((k) => k.ad === ek.konu.ad && k.ders === ek.konu.ders)) {
      liste.push(ek.konu);
    }
  }
  return liste;
}

function soruUretimTarihiGoster(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type FormMufredatTuru = 'HEPSI' | 'YKS' | 'LGS' | 'KPSS_LISANS' | 'KPSS_ONLISANS' | 'KPSS_ORTAOGRETIM';

function formKonuApiParams(
  mufredat: FormMufredatTuru,
  yksKapsam: 'HEPSI' | 'TYT' | 'AYT',
  kpssKapsam: 'HEPSI' | 'GY' | 'GK'
): Record<string, string> {
  const params: Record<string, string> = {};
  if (mufredat === 'HEPSI') return params;
  params.ogretimTuru = mufredat;
  if (mufredat === 'YKS' && yksKapsam !== 'HEPSI') params.yksKapsam = yksKapsam;
  if (kpssOgretimTuruMu(mufredat) && kpssKapsam !== 'HEPSI') params.kpssKapsam = kpssKapsam;
  return params;
}

export default function SorularSayfasi() {
  const kullaniciId = useAuthStore((s) => s.kullanici?.id);
  const ogretmenKisit = useAuthStore((s) =>
    s.kullanici?.rol === 'TEACHER' && s.kullanici.brans && s.kullanici.ogretimTuru
      ? { brans: s.kullanici.brans, ogretimTuru: s.kullanici.ogretimTuru }
      : null
  );
  const [alanTab, setAlanTab] = useState<AlanTab>('HEPSI');
  const [filtreSecenekleri, setFiltreSecenekleri] = useState<typeof ALAN_FILTRE_SECENEKLERI>([]);

  useEffect(() => {
    setFiltreSecenekleri(getAlanFiltreSecenekleri());
  }, []);

  const [kopyalanacakSoruId, setKopyalanacakSoruId] = useState<string | null>(null);
  const [topluKopyalaModalAcik, setTopluKopyalaModalAcik] = useState(false);
  const [targetTytKonuId, setTargetTytKonuId] = useState('');
  const [kpssModu, setKpssModu] = useState(false);

  useEffect(() => {
    setKpssModu(isKpssMode());
  }, []);

  const { data: yksKonularData } = useQuery({
    queryKey: ['yks-konular-kopyalama', kopyalanacakSoruId, topluKopyalaModalAcik],
    queryFn: () => api.get('/sorular/konular', { params: { ogretimTuru: 'YKS' } }),
    enabled: !!kopyalanacakSoruId || topluKopyalaModalAcik,
  });
  const yksKonular = yksKonularData?.data?.veri || [];

  const [aramaMetni, setAramaMetni] = useState('');
  const [debouncedAramaMetni, setDebouncedAramaMetni] = useState('');
  const [secilenDers, setSecilenDers] = useState('');
  const [secilenZorluk, setSecilenZorluk] = useState('');
  const [secilenOnay, setSecilenOnay] = useState('');
  const [secilenHazirlayan, setSecilenHazirlayan] = useState('');
  const [secilenBaslangicTarihi, setSecilenBaslangicTarihi] = useState('');
  const [secilenBitisTarihi, setSecilenBitisTarihi] = useState('');
  const [acikSoruId, setAcikSoruId] = useState<string | null>(null);
  const [yeniSoruForm, setYeniSoruForm] = useState(false);
  const [secilenIds, setSecilenIds] = useState<string[]>([]);
  const [toplukGrupId, setToplukGrupId] = useState('');
  const [topluKazanim, setTopluKazanim] = useState('');
  const [topluUygunGrupIds, setTopluUygunGrupIds] = useState<string[]>([]);
  const [topluUygunGrupAcik, setTopluUygunGrupAcik] = useState(false);
  const [gorunumMode, setGorunumMode] = useState<'table' | 'cards'>('table');
  const [sayfa, setSayfa] = useState(1);
  const sayfaBoyutu = 20;

  // Toplu Soru İthal Etme (JSON) States
  const [formMufredatTuru, setFormMufredatTuru] = useState<FormMufredatTuru>('HEPSI');
  const [formYksKapsam, setFormYksKapsam] = useState<'HEPSI' | 'TYT' | 'AYT'>('HEPSI');
  const [formKpssKapsam, setFormKpssKapsam] = useState<'HEPSI' | 'GY' | 'GK'>('HEPSI');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importKonuId, setImportKonuId] = useState('');
  const [importZorluk, setImportZorluk] = useState('ORTA');
  const [importGrupId, setImportGrupId] = useState('');
  const [importSinavId, setImportSinavId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJsonDosyasiYukle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          toast.hata('JSON formatı geçersiz. Soru listesi bir dizi (array) olmalıdır.');
          return;
        }
        
        // Temel doğrulama
        const validQuestions = parsed.filter((q: any) => {
          const metin = q.metin || q.metinHtml;
          const secenekler = q.secenekler;
          return metin && secenekler && typeof secenekler === 'object';
        });

        if (validQuestions.length === 0) {
          toast.hata('JSON içinde geçerli bir soru yapısı bulunamadı.');
          return;
        }

        setImportedQuestions(validQuestions);
        toast.basarili(`Dosya okundu. ${validQuestions.length} adet soru içe aktarılmaya hazır.`);
      } catch (err) {
        toast.hata('JSON dosyası okunurken hata oluştu. Dosyanın geçerli bir JSON olduğundan emin olun.');
      }
    };
    reader.readAsText(file);
  };

  const topluIthalMutation = useMutation({
    mutationFn: async () => {
      if (!importKonuId) throw new Error('Lütfen bir konu seçin');
      if (importedQuestions.length === 0) throw new Error('İthal edilecek soru bulunamadı');
      
      const modelEtiket = 'ogm-scraper-import';
      const sinavTrim = String(importSinavId || '').trim();
      const grupTrim = String(importGrupId || '').trim();
      
      const { data } = await adminApi.soruBankaToplu({
        konuId: importKonuId,
        zorluk: importZorluk,
        sinavId: sinavTrim || null,
        ...(grupTrim ? { grupId: grupTrim } : {}),
        aiModeli: modelEtiket,
        sorular: importedQuestions.map((s: any) => ({
          metinHtml: s.metin || s.metinHtml || '',
          gorselUrl: s.gorselUrl || null,
          secenekler: s.secenekler || { A: '', B: '', C: '', D: '', E: '' },
          dogruCevap: s.dogruCevap || 'A',
          kazanim: s.kazanim || null,
        })),
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sorular'] });
      setImportModalOpen(false);
      setImportedQuestions([]);
      setImportKonuId('');
      setImportZorluk('ORTA');
      setImportGrupId('');
      setImportSinavId('');
      toast.basarili('Toplu sorular başarıyla sisteme aktarıldı.');
    },
    onError: (err: any) => {
      const mesaj = err?.response?.data?.mesaj || err?.message || 'Toplu soru eklenirken bir hata oluştu.';
      toast.hata(mesaj);
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAramaMetni(aramaMetni);
    }, 500);
    return () => clearTimeout(timer);
  }, [aramaMetni]);

  const [form, setForm] = useState({
    konuId: '',
    grupId: '',
    sinavId: '',
    uygunGrupIds: [] as string[],
    siraNo: 1,
    metinHtml: '',
    aciklamaHtml: '',
    cozumHtml: '',
    dogruCevap: 'A',
    zorluk: 'ORTA',
    kazanim: '',
    secenekler: { A: '', B: '', C: '', D: '', E: '' },
  });

  const [duzenlenenSoruId, setDuzenlenenSoruId] = useState<string | null>(null);
  /** Düzenlenen sorunun konusu — filtre listesinde yokken KonuSecici etiketi için */
  const duzenlenenKonuRef = useRef<{
    id: string;
    ad: string;
    ders: string;
    ogretimTuru?: string;
    yksSegment?: string | null;
  } | null>(null);
  /** Kademe değişince aynı ders+ad ile yeni müfredatta eşleştirmeyi dene */
  const konuEsleRef = useRef<{ ders: string; ad: string } | null>(null);

  const [annotationPng, setAnnotationPng] = useState<string>('');
  const [aktifSekme, setAktifSekme] = useState<'metin' | 'cizim' | 'ai'>('metin');
  const qc = useQueryClient();

  const alanParams = alanFiltreApiParams(alanTab);
  const { data: konularData } = useQuery({
    queryKey: ['konular', alanTab],
    queryFn: () => api.get('/sorular/konular', { params: alanParams }),
  });
  const konular = konularData?.data?.veri || [];

  const { data: formKonularData } = useQuery({
    queryKey: ['konular-soru-form', formMufredatTuru, formYksKapsam, formKpssKapsam],
    queryFn: () =>
      api.get('/sorular/konular', {
        params: formKonuApiParams(formMufredatTuru, formYksKapsam, formKpssKapsam),
      }),
    enabled: yeniSoruForm || importModalOpen,
  });
  const formKonular = formKonularData?.data?.veri || [];

  const formKonularGosterim = useMemo(() => {
    const liste = Array.isArray(formKonular) ? [...formKonular] : [];
    const snap = duzenlenenKonuRef.current;
    if (form.konuId && snap?.id === form.konuId && !liste.some((k: { id: string }) => k.id === form.konuId)) {
      liste.unshift(snap);
    }
    return liste;
  }, [formKonular, form.konuId]);

  // Kademe/müfredat değişince: aynı ders+konu adı yeni listede varsa otomatik seç
  useEffect(() => {
    const hedef = konuEsleRef.current;
    if (!hedef || !yeniSoruForm) return;
    if (form.konuId) {
      konuEsleRef.current = null;
      return;
    }
    if (!formKonular.length) return;
    const eslesen = formKonular.find(
      (k: { ders?: string; ad?: string }) =>
        String(k.ders || '').trim() === hedef.ders && String(k.ad || '').trim() === hedef.ad,
    );
    if (eslesen) {
      setForm((f) => ({ ...f, konuId: eslesen.id }));
      duzenlenenKonuRef.current = {
        id: eslesen.id,
        ad: eslesen.ad,
        ders: eslesen.ders,
        ogretimTuru: eslesen.ogretimTuru,
        yksSegment: eslesen.yksSegment,
      };
    }
    konuEsleRef.current = null;
  }, [formKonular, form.konuId, yeniSoruForm]);

  const { data: sinavlarData } = useQuery({ queryKey: ['admin-sinavlar'], queryFn: () => adminApi.sinavlar() });
  const sinavlar = sinavlarData?.data?.veri || [];

  const { data: gruplarData } = useQuery({ queryKey: ['admin-gruplar'], queryFn: () => adminApi.gruplar() });
  const gruplar = gruplarData?.data?.veri || [];

  const { data: hazirlayanlarData } = useQuery({
    queryKey: ['soru-hazirlayanlar', alanTab, secilenBaslangicTarihi, secilenBitisTarihi],
    queryFn: () =>
      api.get('/sorular/hazirlayanlar', {
        params: {
          ...alanParams,
          baslangicTarihi: secilenBaslangicTarihi || undefined,
          bitisTarihi: secilenBitisTarihi || undefined,
        },
      }),
    enabled: !ogretmenKisit,
  });
  const hazirlayanlar: { id: string; ad: string; soruSayisi: number; sonSoruTarihi?: string | null }[] =
    hazirlayanlarData?.data?.veri || [];

  const { data: sorularData, isLoading } = useQuery({
    queryKey: ['admin-sorular', alanTab, secilenDers, secilenZorluk, secilenOnay, secilenHazirlayan, secilenBaslangicTarihi, secilenBitisTarihi, sayfa, debouncedAramaMetni],
    queryFn: async () => {
      const r = await api.get('/sorular/hepsi', {
        params: { 
          sayfa,
          boyut: sayfaBoyutu,
          ...alanParams,
          ders: secilenDers || undefined, 
          zorluk: secilenZorluk || undefined, 
          onayDurumu: secilenOnay || undefined,
          olusturanId: secilenHazirlayan || undefined,
          baslangicTarihi: secilenBaslangicTarihi || undefined,
          bitisTarihi: secilenBitisTarihi || undefined,
          q: debouncedAramaMetni || undefined
        },
      });
      return r.data;
    },
  });
  const sorular: Soru[] = sorularData?.veri || [];
  const meta = sorularData?.meta || { toplam: 0, toplamSayfa: 1 };

  const handleFormReset = () => {
    setFormMufredatTuru(kpssModu ? (ogretmenKisit && kpssOgretimTuruMu(ogretmenKisit.ogretimTuru) ? ogretmenKisit.ogretimTuru as FormMufredatTuru : 'KPSS_ONLISANS') : 'HEPSI');
    setFormYksKapsam('HEPSI');
    setFormKpssKapsam('HEPSI');
    setForm({
      konuId: '',
      grupId: '',
      sinavId: '',
      uygunGrupIds: [],
      siraNo: 1,
      metinHtml: '',
      aciklamaHtml: '',
      cozumHtml: '',
      dogruCevap: 'A',
      zorluk: 'ORTA',
      kazanim: '',
      secenekler: { A: '', B: '', C: '', D: '', E: '' },
    });
    setDuzenlenenSoruId(null);
    duzenlenenKonuRef.current = null;
    konuEsleRef.current = null;
    setYeniSoruForm(false);
    setAnnotationPng('');
    setAktifSekme('metin');
  };

  /** Yeni soru modalı: önceki düzenlemeden kalan grup/sınav seçimini temizler */
  const yeniSoruFormunuAc = () => {
    // KPSS panelinde kademe seçimi zorunlu netlikte başlasın (Tümü → aynı adlı 3 konu karışıyordu)
    const varsayilanMufredat: FormMufredatTuru = kpssModu
      ? (ogretmenKisit && kpssOgretimTuruMu(ogretmenKisit.ogretimTuru)
          ? (ogretmenKisit.ogretimTuru as FormMufredatTuru)
          : 'KPSS_ONLISANS')
      : 'HEPSI';
    setFormMufredatTuru(varsayilanMufredat);
    setFormYksKapsam('HEPSI');
    setFormKpssKapsam('HEPSI');
    setForm({
      konuId: '',
      grupId: '',
      sinavId: '',
      uygunGrupIds: [],
      siraNo: 1,
      metinHtml: '',
      aciklamaHtml: '',
      cozumHtml: '',
      dogruCevap: 'A',
      zorluk: 'ORTA',
      kazanim: '',
      secenekler: { A: '', B: '', C: '', D: '', E: '' },
    });
    setDuzenlenenSoruId(null);
    duzenlenenKonuRef.current = null;
    konuEsleRef.current = null;
    setAnnotationPng('');
    setAktifSekme('metin');
    setYeniSoruForm(true);
  };

  // AI önerisini form'a uygula
  const aiOneriUygula = (oneri: AiOneri) => {
    setForm((mevcut) => {
      let metinHtml = mevcut.metinHtml;
      if (htmlGorunurMetinVarMi(oneri.metinHtml)) {
        metinHtml = String(oneri.metinHtml).trim();
      } else if (oneri.svgGorsel?.trim()) {
        const svgBlok = `<div class="soru-svg-gorsel">${oneri.svgGorsel.trim()}</div>`;
        metinHtml = metinHtml?.trim() ? `${metinHtml}\n${svgBlok}` : svgBlok;
      }
      const parsed = parseMetinParcalari(metinHtml);
      /* Kısmi şık güncellemesi: boş değerlerle mevcut şıkları silme */
      const secenekler = { ...mevcut.secenekler } as typeof mevcut.secenekler;
      if (oneri.secenekler && typeof oneri.secenekler === 'object') {
        for (const [anahtar, deger] of Object.entries(oneri.secenekler)) {
          if (String(deger ?? '').trim()) {
            (secenekler as Record<string, string>)[anahtar] = String(deger);
          }
        }
      }
      const d = oneri.dogruCevap != null ? String(oneri.dogruCevap).trim().toUpperCase().slice(0, 1) : '';
      const dogruCevap = d && /^[A-E]$/.test(d) ? d : mevcut.dogruCevap;
      const zorlukC =
        oneri.zorluk && ['KOLAY', 'ORTA', 'ZOR'].includes(String(oneri.zorluk))
          ? (oneri.zorluk as typeof mevcut.zorluk)
          : mevcut.zorluk;
      return {
        ...mevcut,
        metinHtml: parsed.soruHtml || metinHtml,
        aciklamaHtml: parsed.aciklamaHtml || mevcut.aciklamaHtml,
        cozumHtml: parsed.cozumHtml || mevcut.cozumHtml,
        secenekler,
        dogruCevap,
        kazanim: oneri.kazanim !== undefined ? (oneri.kazanim ?? '') : mevcut.kazanim,
        zorluk: zorlukC,
      };
    });
    toast.basarili('AI önerisi forma uygulandı. Kaydetmeyi unutmayın.');
  };

  // AI ile üretilen görseli soru metnine ekler (kalıcı URL ile)
  const aiGorselEkle = (url: string) => {
    if (!url) return;
    setForm((mevcut) => {
      const blok = `<div class="soru-ai-gorsel" style="margin:12px 0;"><img alt="Soru görseli" src="${url}" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;" /></div>`;
      const metinHtml = mevcut.metinHtml?.trim() ? `${mevcut.metinHtml}\n${blok}` : blok;
      return { ...mevcut, metinHtml };
    });
    toast.basarili('Görsel soru metnine eklendi. Kaydetmeyi unutmayın.');
  };

  const annotationMetinHtmlUret = (metinHtml: string, pngDataUrl: string) => {
    if (!pngDataUrl) return metinHtml;
    const blok = `<div class="soru-annotation" style="margin-top:10px;"><img alt="Öğretmen notu" src="${pngDataUrl}" style="max-width:100%;height:auto;display:block;" /></div>`;
    if (!metinHtml?.trim()) return blok;
    // daha önce eklenmişse güncelle
    const re = /<div class="soru-annotation"[\s\S]*?<\/div>/i;
    if (re.test(metinHtml)) return metinHtml.replace(re, blok);
    return `${metinHtml}\n${blok}`;
  };

  const uygunGrupToggle = (grupId: string, mevcut: string[]) =>
    mevcut.includes(grupId) ? mevcut.filter((id) => id !== grupId) : [...mevcut, grupId];

  const kaydetTikla = () => {
    if (!String(form.konuId || '').trim()) {
      toast.hata(
        'Kademe değiştirdiyseniz yeni müfredattan bir konu seçmeden kaydedemezsiniz. Aksi halde ders/konu (TYT vb.) değişmez.',
        'Konu seçimi zorunlu',
      );
      return;
    }
    const birlesikMetin = buildMetinHtmlFromParts(form.metinHtml, form.aciklamaHtml, form.cozumHtml);
    const payloadMetin = annotationPng ? annotationMetinHtmlUret(birlesikMetin, annotationPng) : birlesikMetin;
    const payloadForm = payloadMetin !== birlesikMetin ? { ...form, metinHtml: payloadMetin } : { ...form, metinHtml: birlesikMetin };
    if (duzenlenenSoruId) soruGuncelleMutation.mutate({ id: duzenlenenSoruId, payloadForm });
    else soruEkleMutation.mutate(payloadForm);
  };

  const soruEkleMutation = useMutation({
    mutationFn: (payloadForm: typeof form) => {
      const { grupId, sinavId, aciklamaHtml: _a, cozumHtml: _c, uygunGrupIds, ...rest } = payloadForm;
      const payload: Record<string, unknown> = { ...rest, secenekler: payloadForm.secenekler, uygunGrupIds };
      const sinavTemiz = sinavId && String(sinavId).trim() !== '' ? String(sinavId).trim() : '';
      const grupTemiz = grupId && String(grupId).trim() !== '' ? String(grupId).trim() : '';
      if (!sinavTemiz && grupTemiz) payload.grupId = grupTemiz;
      return adminApi.soruEkle(sinavTemiz || 'pool', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sorular'] });
      handleFormReset();
      toast.basarili('Soru kütüphanesine eklendi.');
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        'Soru eklenirken bir hata oluştu.';
      toast.hata(mesaj);
    },
  });

  const soruGuncelleMutation = useMutation({
    mutationFn: ({ id, payloadForm }: { id: string; payloadForm: typeof form }) => {
      const { aciklamaHtml: _a, cozumHtml: _c, ...payload } = payloadForm;
      return adminApi.soruGuncelle(id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sorular'] });
      handleFormReset();
      toast.basarili('Soru başarıyla güncellendi.');
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        'Soru güncellenirken bir hata oluştu.';
      toast.hata(mesaj);
    },
  });

  const onayMutation = useMutation({
    mutationFn: ({ id, onayDurumu }: { id: string; onayDurumu: string }) => adminApi.soruOnayGuncelle(id, { onayDurumu }),
    onSuccess: (_veri, degiskenler) => {
      qc.invalidateQueries({ queryKey: ['admin-sorular'] });
      if (degiskenler?.onayDurumu === 'ONAYLANDI') {
        toast.basarili('Soru onaylandı', 'Soru artık sınavlarda kullanılabilir.');
      }
    },
    onError: () => toast.hata('Onay işlemi başarısız oldu.'),
  });

  const topluOnayMutation = useMutation({
    mutationFn: (onayDurumu: string) => adminApi.soruTopluOnayGuncelle({ soruIds: secilenIds, onayDurumu }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sorular'] });
      setSecilenIds([]);
      toast.basarili('Seçilen sorular onaylandı.');
    },
    onError: () => toast.hata('Toplu onay işlemi başarısız oldu.'),
  });

  const topluSilMutation = useMutation({
    mutationFn: () => adminApi.soruTopluSil({ soruIds: secilenIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sorular'] });
      setSecilenIds([]);
      toast.basarili('Seçilen sorular silindi.');
    },
    onError: () => toast.hata('Toplu silme işlemi başarısız oldu.'),
  });

  const topluKazanimMutation = useMutation({
    mutationFn: (kazanim: string) => adminApi.soruTopluKazanimGuncelle({ soruIds: secilenIds, kazanim }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sorular'] });
      toast.basarili('Seçilen soruların kazanımı güncellendi.');
    },
    onError: (err: any) => {
      const mesaj =
        err?.response?.data?.mesaj ||
        err?.response?.data?.message ||
        err?.message ||
        'Toplu kazanım işlemi başarısız oldu.';
      toast.hata(mesaj);
    },
  });

  const topluUygunGrupMutation = useMutation({
    mutationFn: () => adminApi.soruTopluUygunGrupGuncelle({ soruIds: secilenIds, uygunGrupIds: topluUygunGrupIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sorular'] });
      toast.basarili('Seçilen soruların uygun grup etiketleri güncellendi.');
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        'Uygun grup güncellemesi başarısız oldu.';
      toast.hata(mesaj);
    },
  });

  const topluGrubaAtaMutation = useMutation({
    mutationFn: () =>
      adminApi.sorularGrubaAta({ soruIds: secilenIds, grupId: toplukGrupId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sorular'] });
      setSecilenIds([]);
      setToplukGrupId('');
      toast.basarili('Seçilen sorular seçilen grubun havuzuna taşındı.');
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        'Gruba atama başarısız oldu.';
      toast.hata(mesaj);
    },
  });

  const soruSilMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sorular/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-sorular'] }),
  });

  const tytKopyalaMutation = useMutation({
    mutationFn: () => {
      if (!kopyalanacakSoruId) throw new Error('Soru bulunamadı');
      return adminApi.soruKopyalaTyt(kopyalanacakSoruId, { targetKonuId: targetTytKonuId });
    },
    onSuccess: () => {
      toast.basarili('Soru başarıyla TYT havuzuna kopyalandı.');
      setKopyalanacakSoruId(null);
      setTargetTytKonuId('');
      qc.invalidateQueries({ queryKey: ['admin-sorular'] });
    },
    onError: (err: any) => {
      toast.hata(err?.response?.data?.mesaj || 'Soru kopyalanırken hata oluştu.');
    },
  });

  const topluTytKopyalaMutation = useMutation({
    mutationFn: () => {
      if (secilenIds.length === 0) throw new Error('Seçilen soru bulunamadı');
      return adminApi.soruTopluKopyalaTyt({ soruIds: secilenIds, targetKonuId: targetTytKonuId });
    },
    onSuccess: () => {
      toast.basarili(`${secilenIds.length} soru başarıyla TYT havuzuna kopyalandı.`);
      setTopluKopyalaModalAcik(false);
      setTargetTytKonuId('');
      setSecilenIds([]);
      qc.invalidateQueries({ queryKey: ['admin-sorular'] });
    },
    onError: (err: any) => {
      toast.hata(err?.response?.data?.mesaj || 'Sorular kopyalanırken hata oluştu.');
    },
  });

  const dersler = Array.from(new Set(konular.map((k: any) => String(k.ders)))) as string[];
  dersler.sort();

  const filtreliSorular = sorular; // Artık backend'den filtrelenmiş geliyor

  useEffect(() => {
    setSayfa(1);
  }, [alanTab, secilenDers, secilenZorluk, secilenOnay, secilenHazirlayan, secilenBaslangicTarihi, secilenBitisTarihi, aramaMetni]);

  useEffect(() => {
    setSecilenDers('');
  }, [alanTab]);

  const toggleSoruSecim = (id: string) => {
    const soru = filtreliSorular.find((s) => s.id === id);
    if (soru && ogretmenKisit && !soruIslemYapilabilir(soru, true, kullaniciId)) return;
    setSecilenIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const secilebilirSorular = ogretmenKisit
    ? filtreliSorular.filter((s) => soruIslemYapilabilir(s, true, kullaniciId))
    : filtreliSorular;

  const toggleTumunuSec = () => {
    if (secilenIds.length === secilebilirSorular.length && secilebilirSorular.length > 0) setSecilenIds([]);
    else setSecilenIds(secilebilirSorular.map((s) => s.id));
  };

  return (
    <div className="space-y-10 pb-12">
      {ogretmenKisit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="text-sm">
            <p className="text-amber-900 font-medium">
              Öğretmen modu: <b>{ogretmenKisit.brans}</b> · <b>{ogretmenKisit.ogretimTuru}</b>
            </p>
            <p className="text-amber-800/80 text-xs mt-0.5">
              Yalnızca kendi hazırladığınız soruları görür ve düzenleyebilirsiniz. Diğer öğretmenlerin soruları listelenmez.
            </p>
          </div>
        </div>
      )}
      {/* Header Panel */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4 border border-indigo-500/30">
              <Layers className="w-4 h-4" /> Müfredat Yönetimi
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Soru Bankası</h1>
            <p className="text-slate-400 mt-3 text-base font-medium opacity-90 max-w-xl leading-relaxed">
              Tüm derslere ait soruları buradan yönetebilir, gruplandırabilir ve AI destekli analizlerini kontrol edebilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setImportModalOpen(true)} className="px-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-indigo-200 font-bold text-sm hover:bg-white hover:text-indigo-900 hover:border-white transition-all shadow-xl active:scale-95 flex items-center gap-2">
              <Upload className="w-5 h-5" /> Toplu Soru İthal Et (JSON)
            </button>
            <button onClick={yeniSoruFormunuAc} className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl active:scale-95 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Yeni Soru Oluştur
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      </section>

      {/* Info Alert */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-4 text-amber-800 shadow-sm">
         <Info className="w-5 h-5 shrink-0" />
         <p className="text-xs font-bold leading-relaxed">
            <span className="opacity-70">Sistem Bilgisi:</span> Sınavlarda sadece <span className="underlineDecoration">Onaylandı</span> durumundaki sorular yer alır. AI ile üretilen sorular soru bankasına eklenir; öğretmen onayından sonra sınavlarda kullanılabilir.
         </p>
      </div>

      {/* Filters & Tools */}
      <section className="flex flex-col gap-6">
         <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
               <div className="relative min-w-[320px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} placeholder="Soru veya konu içeriğinde ara..." className="w-full pl-12 pr-5 py-3.5 rounded-2xl bg-white border border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 shadow-sm font-bold text-sm transition-all" />
               </div>
               <div className="h-10 w-px bg-gray-100 hidden lg:block" />
               <div className="flex flex-wrap bg-white border border-gray-100 shadow-sm p-1 rounded-2xl gap-0.5 max-w-full">
                  {filtreSecenekleri.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => {
                        setAlanTab(k.id);
                        setSayfa(1);
                      }}
                      className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all whitespace-nowrap ${
                        alanTab === k.id ? k.aktifSinif : 'text-gray-500 hover:bg-gray-50'
                      }`}
                      title={k.id === 'HEPSI' ? 'Tüm alanlar' : undefined}
                    >
                      {k.etiket}
                    </button>
                  ))}
               </div>
               <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button onClick={() => setGorunumMode('table')} className={`p-2 rounded-lg transition-all ${gorunumMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}><List className="w-4 h-4" /></button>
                  <button onClick={() => setGorunumMode('cards')} className={`p-2 rounded-lg transition-all ${gorunumMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}><LayoutGrid className="w-4 h-4" /></button>
               </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
               {!ogretmenKisit && (
                 <>
                 <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-all">
                   <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">Tarih</span>
                   <input
                     type="date"
                     value={secilenBaslangicTarihi}
                     onChange={(e) => {
                       setSecilenBaslangicTarihi(e.target.value);
                       setSayfa(1);
                     }}
                     className="bg-transparent text-sm font-bold text-gray-700 outline-none"
                     title="Başlangıç tarihi"
                   />
                   <span className="text-gray-300 font-bold">—</span>
                   <input
                     type="date"
                     value={secilenBitisTarihi}
                     onChange={(e) => {
                       setSecilenBitisTarihi(e.target.value);
                       setSayfa(1);
                     }}
                     className="bg-transparent text-sm font-bold text-gray-700 outline-none"
                     title="Bitiş tarihi"
                   />
                   {(secilenBaslangicTarihi || secilenBitisTarihi) && (
                     <button
                       type="button"
                       onClick={() => {
                         setSecilenBaslangicTarihi('');
                         setSecilenBitisTarihi('');
                         setSayfa(1);
                       }}
                       className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider ml-1"
                     >
                       Temizle
                     </button>
                   )}
                 </div>
                 <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-all min-w-[200px]">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">Hazırlayan</span>
                   <select
                     value={secilenHazirlayan}
                     onChange={(e) => {
                       setSecilenHazirlayan(e.target.value);
                       setSayfa(1);
                     }}
                     className="bg-transparent text-sm font-bold text-gray-700 outline-none pr-4 min-w-0 flex-1"
                   >
                     <option value="">Tümü</option>
                     {hazirlayanlar.map((h) => (
                       <option key={h.id} value={h.id}>
                         {h.ad} ({h.soruSayisi})
                       </option>
                     ))}
                   </select>
                 </div>
                 </>
               )}
               <Select label="Ders" value={secilenDers} onChange={setSecilenDers} options={['', ...dersler]} />
               <Select label="Zorluk" value={secilenZorluk} onChange={setSecilenZorluk} options={['', 'KOLAY', 'ORTA', 'ZOR']} />
               <Select label="Onay" value={secilenOnay} onChange={setSecilenOnay} options={['', 'ONAY_BEKLIYOR', 'ONAYLANDI', 'REDDEDILDI']} />
            </div>
         </div>

         {!ogretmenKisit && (secilenBaslangicTarihi || secilenBitisTarihi) && (
           <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
             <div className="flex items-center gap-2 mb-3">
               <Users className="w-4 h-4 text-indigo-600" />
               <p className="text-xs font-bold text-indigo-900 uppercase tracking-widest">
                 Öğretmen soru aktivitesi
                 <span className="font-medium normal-case text-indigo-700 ml-2">
                   ({secilenBaslangicTarihi ? new Date(secilenBaslangicTarihi).toLocaleDateString('tr-TR') : '…'}
                   {' — '}
                   {secilenBitisTarihi ? new Date(secilenBitisTarihi).toLocaleDateString('tr-TR') : '…'})
                 </span>
               </p>
             </div>
             {hazirlayanlar.length > 0 ? (
             <div className="flex flex-wrap gap-2">
               {hazirlayanlar.slice(0, 24).map((h) => (
                 <button
                   key={h.id}
                   type="button"
                   onClick={() => {
                     setSecilenHazirlayan(h.id);
                     setSayfa(1);
                   }}
                   className={`px-3 py-2 rounded-xl border text-left transition-all ${
                     secilenHazirlayan === h.id
                       ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                       : 'bg-white text-gray-800 border-gray-100 hover:border-indigo-200'
                   }`}
                 >
                   <span className="text-xs font-bold block truncate max-w-[180px]">{h.ad}</span>
                   <span className={`text-[10px] font-bold ${secilenHazirlayan === h.id ? 'text-indigo-100' : 'text-indigo-600'}`}>
                     {h.soruSayisi} soru
                     {h.sonSoruTarihi ? ` · son ${soruUretimTarihiGoster(h.sonSoruTarihi)}` : ''}
                   </span>
                 </button>
               ))}
             </div>
             ) : (
               <p className="text-xs font-medium text-indigo-700">Seçilen tarih aralığında soru üretimi yok.</p>
             )}
           </div>
         )}

         {/* Selection Sidebar (Bulk Actions) */}
         <AnimatePresence>
            {secilenIds.length > 0 && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: 20, opacity: 0 }} 
                className="p-5 rounded-3xl bg-indigo-600 text-white shadow-2xl flex flex-col gap-4 overflow-visible relative z-40"
              >
                 {/* Top Bar: Info and Cancel Selection */}
                 <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                       <CheckCircle2 className="w-5 h-5 text-indigo-200" />
                       <span className="text-sm font-bold tracking-tight">{secilenIds.length} Soru Seçildi</span>
                    </div>
                    <button onClick={() => setSecilenIds([])} className="text-xs font-black uppercase tracking-wider text-indigo-200 hover:text-white transition-all">Seçimi İptal Et</button>
                 </div>

                 {/* Bottom Bar: Action Items (Wrapped) */}
                 <div className="flex flex-wrap items-center gap-4 relative z-10">
                    {/* Uygun Gruplar */}
                    <div className="relative flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-indigo-200 shrink-0">Uygun Gruplar:</span>
                      <button
                        type="button"
                        onClick={() => setTopluUygunGrupAcik((v) => !v)}
                        className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:bg-white/20 flex items-center gap-2 min-w-[140px] justify-between"
                      >
                        <span className="truncate">
                          {topluUygunGrupIds.length > 0
                            ? `${topluUygunGrupIds.length} grup`
                            : 'Grup seçin...'}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${topluUygunGrupAcik ? 'rotate-180' : ''}`} />
                      </button>
                      {topluUygunGrupAcik ? (
                        <div className="absolute left-0 bottom-full mb-2 z-[200] w-[260px] max-h-[260px] overflow-y-auto rounded-2xl bg-white text-gray-900 shadow-2xl border border-gray-100 p-3">
                          <UygunGrupCheckboxleri
                            gruplar={gruplar}
                            seciliIds={topluUygunGrupIds}
                            onToggle={(grupId) =>
                              setTopluUygunGrupIds((prev) => uygunGrupToggle(grupId, prev))
                            }
                          />
                        </div>
                      ) : null}
                      <button
                        type="button"
                        disabled={topluUygunGrupMutation.isPending}
                        onClick={() => topluUygunGrupMutation.mutate()}
                        className="px-3 py-2 rounded-xl bg-white text-indigo-600 text-xs font-bold shadow-xl hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {topluUygunGrupMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
                        Etiketle
                      </button>
                    </div>

                    <div className="h-6 w-px bg-white/20" />

                    {/* Taşı / Ata */}
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] uppercase font-bold text-indigo-200 shrink-0">Taşı/Ata:</span>
                       <select value={toplukGrupId} onChange={(e) => setToplukGrupId(e.target.value)} className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:bg-white/20">
                          <option value="">Grup Seçin...</option>
                          {gruplar.map((g: any) => <option key={g.id} value={g.id} className="text-gray-900">{g.ad}</option>)}
                       </select>
                       <button
                         type="button"
                         disabled={!toplukGrupId || secilenIds.length === 0 || topluGrubaAtaMutation.isPending}
                         onClick={() => topluGrubaAtaMutation.mutate()}
                         className="px-4 py-2 rounded-xl bg-white text-indigo-600 text-xs font-bold shadow-xl hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
                       >
                         {topluGrubaAtaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                         Ata
                       </button>
                    </div>

                    <div className="h-6 w-px bg-white/20" />

                    {/* Toplu Onayla */}
                    <button 
                       onClick={() => topluOnayMutation.mutate('ONAYLANDI')}
                       disabled={topluOnayMutation.isPending}
                       className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-xl hover:bg-emerald-600 flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
                    >
                       {topluOnayMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                       Onayla
                    </button>

                    {/* TYT'ye Gönder (Sadece KPSS modunda) */}
                    {kpssModu && (
                      <button 
                         onClick={() => setTopluKopyalaModalAcik(true)}
                         disabled={topluTytKopyalaMutation.isPending}
                         className="px-4 py-2 rounded-xl bg-[#2ABBA7] text-white text-xs font-bold shadow-xl hover:bg-[#1fa897] flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
                      >
                         {topluTytKopyalaMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-4 h-4" />}
                         TYT'ye Gönder
                      </button>
                    )}

                    <div className="h-6 w-px bg-white/20" />

                    {/* Kazanım Ata */}
                    <div className="flex items-center gap-2">
                      <input
                        value={topluKazanim}
                        onChange={(e) => setTopluKazanim(e.target.value)}
                        placeholder="Kazanım metni..."
                        className="w-[200px] bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:bg-white/20 placeholder:text-indigo-200/70"
                      />
                      <button
                        onClick={() => {
                          const k = topluKazanim.trim();
                          if (!k) return toast.uyari('Kazanım metni boş olamaz');
                          topluKazanimMutation.mutate(k);
                        }}
                        disabled={topluKazanimMutation.isPending}
                        className="px-4 py-2 rounded-xl bg-white text-indigo-600 text-xs font-bold shadow-xl hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
                        title="Kazanım Güncelle"
                      >
                        {topluKazanimMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-4 h-4" />}
                        Kazanım
                      </button>
                    </div>

                    <div className="h-6 w-px bg-white/20" />

                    {/* Silme */}
                    <button 
                       onClick={async () => {
                         if (await confirmAsk({ title: 'Toplu Sil', message: `${secilenIds.length} soruyu silmek istediğinize emin misiniz?`, variant: 'destructive' })) {
                           topluSilMutation.mutate();
                         }
                       }}
                       disabled={topluSilMutation.isPending}
                       className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-xl hover:bg-rose-600 flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-95 ml-auto"
                    >
                       {topluSilMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                       Sil
                    </button>
                 </div>
              </motion.div>
            )}
         </AnimatePresence>
      </section>

      {/* Main Table Interface */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden min-h-[500px]">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                     <th className="p-6 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={secilenIds.length === secilebilirSorular.length && secilebilirSorular.length > 0}
                          onChange={toggleTumunuSec}
                          className="w-4 h-4 rounded-md border-gray-200 text-indigo-600 focus:ring-indigo-500"
                        />
                     </th>
                     <th className="p-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-16">No</th>
                     <th className="p-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[300px]">Soru İçeriği</th>
                     <th className="p-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Ders & Konu</th>
                     <th className="p-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Grup / Sınav</th>
                     <th className="p-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Üretici</th>
                     {!ogretmenKisit && (
                       <th className="p-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Hazırlayan</th>
                     )}
                     {!ogretmenKisit && (
                       <th className="p-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Üretim Tarihi</th>
                     )}
                     <th className="p-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Durum</th>
                     <th className="p-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">İşlem</th>
                  </tr>
               </thead>
               <tbody>
                  {isLoading ? (
                    <tr>
                       <td colSpan={ogretmenKisit ? 8 : 10} className="p-20 text-center">
                          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Veriler Okunuyor...</p>
                       </td>
                    </tr>
                  ) : filtreliSorular.map((soru, idx) => {
                    const islemAcik = soruIslemYapilabilir(soru, Boolean(ogretmenKisit), kullaniciId);
                    return (
                    <tr key={soru.id} className={`group border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-all ${acikSoruId === soru.id ? 'bg-indigo-50/30' : ''}`}>
                       <td className="p-6 text-center">
                          <input
                            type="checkbox"
                            checked={secilenIds.includes(soru.id)}
                            disabled={!islemAcik}
                            onChange={() => toggleSoruSecim(soru.id)}
                            className="w-4 h-4 rounded-md border-gray-200 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                          />
                       </td>
                       <td className="p-6">
                          <span className="text-sm font-bold text-slate-400">#{idx + 1}</span>
                       </td>
                       <td className="p-6 cursor-pointer" onClick={() => setAcikSoruId(acikSoruId === soru.id ? null : soru.id)}>
                          <div className="flex flex-col gap-1.5">
                             <p className="text-sm font-bold text-gray-700 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                               {soruListeOnMetin(soru.metinHtml, 160)}
                             </p>
                             <div className="flex items-center gap-3">
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                  soru.zorluk === 'KOLAY' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  soru.zorluk === 'ORTA' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                  'bg-rose-50 text-rose-600 border border-rose-100'
                                }`}>{soru.zorluk}</span>
                                 {soru.aiUretildi ? (
                                   <span className="text-[9px] font-bold bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-widest">
                                     <Sparkles className="w-2.5 h-2.5" /> AI
                                   </span>
                                 ) : null}
                             </div>
                          </div>
                       </td>
                       <td className="p-6">
                          <div>
                             <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none mb-1.5">{soru.konu.ders}</p>
                             {(soru.konu.ogretimTuru || soru.konu.yksSegment) && (
                               <span
                                 className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-100 mb-1 inline-block"
                                 title="Müfredat kademesi (sorunun bağlı olduğu konu). Uygun grup etiketlerinden bağımsızdır."
                               >
                                 {alanKonuEtiketi(soru.konu.ogretimTuru, soru.konu.yksSegment)}
                               </span>
                             )}
                             <div className="flex flex-wrap gap-1 max-w-[180px]">
                               {soruTumKonulari(soru).map((k) => (
                                 <span key={`${k.ders}-${k.ad}`} className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-full">
                                   {k.ad}
                                 </span>
                               ))}
                             </div>
                          </div>
                       </td>
                       <td className="p-6">
                          <div className="space-y-2 max-w-[160px]">
                             {(() => {
                               const uygun = soruUygunGrupAdlari(soru);
                               if (uygun.length > 0) {
                                 return (
                                   <div className="flex flex-wrap gap-1">
                                     {uygun.map((ad) => (
                                       <span
                                         key={ad}
                                         className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100"
                                       >
                                         {ad}
                                       </span>
                                     ))}
                                   </div>
                                 );
                               }
                               if (soru.sinav) {
                                 return (
                                   <div className="space-y-1">
                                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                                         <Tag className="w-3 h-3" /> {soru.sinav.grup.ad}
                                      </span>
                                      <span className="text-[10px] font-bold text-gray-400 block truncate max-w-[120px]">
                                         {soru.sinav.baslik}
                                      </span>
                                   </div>
                                 );
                               }
                               return (
                                 <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Belirtilmedi</span>
                               );
                             })()}
                             {soru.sinav && soruUygunGrupAdlari(soru).length > 0 ? (
                               <span className="text-[9px] font-bold text-gray-400 block truncate">
                                 Havuz: {soru.sinav.grup.ad}
                               </span>
                             ) : null}
                          </div>
                       </td>
                       <td className="p-6">
                          {(() => {
                            const u = soruUreticiEtiketi(soru);
                            return (
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border inline-block max-w-[140px] truncate ${u.sinif}`}>
                                {u.etiket}
                              </span>
                            );
                          })()}
                       </td>
                       {!ogretmenKisit && (
                       <td className="p-6">
                          {(() => {
                            const d = soruDuzenleyenGosterim(soru);
                            if (!d) {
                              return <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">—</span>;
                            }
                            return (
                              <div className="max-w-[140px]">
                                <p className={`text-xs font-bold truncate ${d.sinif}`}>{d.ad}</p>
                                {d.alt ? (
                                  <p className="text-[10px] font-bold text-gray-400 truncate mt-0.5">{d.alt}</p>
                                ) : null}
                              </div>
                            );
                          })()}
                       </td>
                       )}
                       {!ogretmenKisit && (
                       <td className="p-6 whitespace-nowrap">
                          <p className="text-xs font-bold text-gray-700">{soruUretimTarihiGoster(soru.olusturuldu)}</p>
                       </td>
                       )}
                       <td className="p-6">
                          <StatusBadge 
                            status={soru.onayDurumu || 'ONAYLANDI'} 
                            guncellendi={soruManuelGuncellendi(soru)} 
                          />
                       </td>
                       <td className="p-6">
                          <div className="flex items-center justify-center gap-2">
                            {islemAcik ? (
                              <>
                            {(soru.onayDurumu || 'ONAYLANDI') !== 'ONAYLANDI' &&
                              !(
                                ogretmenKisit &&
                                soru.sinav?.baslik &&
                                soru.sinav.baslik !== 'Soru Bankası (Grup)'
                              ) && (
                              <button
                                type="button"
                                title="Soruyu onayla"
                                disabled={onayMutation.isPending}
                                onClick={() => onayMutation.mutate({ id: soru.id, onayDurumu: 'ONAYLANDI' })}
                                className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-200 shadow-sm transition-all disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Soruyu düzenle"
                              onClick={() => {
                              const parsed = parseMetinParcalari(soru.metinHtml);
                               const cozumAlan =
                                 parsed.cozumHtml || cozumDuzMetinAiMetadan(soru.aiMeta);
                               // Mevcut konuId'yi koru — filtre listesinde yoksa bile kayıp olmasın
                               // (önceki findKonu eşlemesi KPSS panelinde TYT konularını bulamayıp boş bırakıyordu)
                               const konuTur = String(soru.konu.ogretimTuru || '').toUpperCase();
                               const mufredatBaslangic: FormMufredatTuru =
                                 konuTur === 'YKS' || konuTur === 'LGS' || kpssOgretimTuruMu(konuTur)
                                   ? (konuTur as FormMufredatTuru)
                                   : 'HEPSI';
                               setFormMufredatTuru(mufredatBaslangic);
                               setFormYksKapsam(
                                 String(soru.konu.yksSegment || '').toUpperCase() === 'TYT' ||
                                   String(soru.konu.yksSegment || '').toUpperCase().startsWith('AYT')
                                   ? (String(soru.konu.yksSegment || '').toUpperCase() === 'TYT' ? 'TYT' : 'AYT')
                                   : 'HEPSI',
                               );
                               setFormKpssKapsam('HEPSI');
                               duzenlenenKonuRef.current = soru.konuId
                                 ? {
                                     id: soru.konuId,
                                     ad: soru.konu.ad,
                                     ders: soru.konu.ders,
                                     ogretimTuru: soru.konu.ogretimTuru,
                                     yksSegment: soru.konu.yksSegment,
                                   }
                                 : null;
                               konuEsleRef.current = null;
                               setForm({
                                 konuId: soru.konuId || '',
                                 grupId: soru.sinav?.grup.id || '',
                                 sinavId: soru.sinav?.id || '',
                                 uygunGrupIds: (soru.uygunGruplar ?? []).map((u) => u.grup.id),
                                 siraNo: soru.siraNo,
                                 metinHtml: parsed.soruHtml,
                                 aciklamaHtml: parsed.aciklamaHtml,
                                 cozumHtml: cozumAlan,
                                 dogruCevap: soru.dogruCevap,
                                 zorluk: soru.zorluk,
                                 kazanim: soru.kazanim || '',
                                 secenekler: { ...soru.secenekler } as any,
                               });

                               setDuzenlenenSoruId(soru.id);
                               setYeniSoruForm(true);
                             }} className="p-2 rounded-xl bg-white border border-gray-100 text-gray-500 hover:text-amber-600 hover:border-amber-200 shadow-sm transition-all"><MoreVertical className="w-4 h-4" /></button>
                             {kpssModu && (
                               <button type="button" onClick={() => setKopyalanacakSoruId(soru.id)} className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-teal-600 hover:border-teal-100 shadow-sm transition-all" title="TYT'ye Gönder"><Upload className="w-4 h-4" /></button>
                             )}
                             <button type="button" onClick={() => setAcikSoruId(acikSoruId === soru.id ? null : soru.id)} className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all" title="Önizle"><BarChart3 className="w-4 h-4" /></button>
                             <button type="button" onClick={async () => {
                                if (await confirmAsk({ title: 'Soru Sil', message: 'Bu soruyu silmek istediğinize emin misiniz?' })) {
                                   soruSilMutation.mutate(soru.id);
                                }
                             }} className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-rose-500 hover:border-rose-100 shadow-sm transition-all" title="Sil"><Trash2 className="w-4 h-4" /></button>
                               </>
                             ) : (
                               <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1 rounded-lg bg-gray-50 border border-gray-100" title="Bu soru başka öğretmene ait">
                                 Salt okunur
                               </span>
                             )}
                          </div>
                       </td>
                    </tr>
                  );})}
               </tbody>
            </table>
         </div>
         {filtreliSorular.length === 0 && !isLoading && (
            <div className="py-24 text-center">
               <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6 text-gray-300">
                  <GraduationCap className="w-8 h-8" />
               </div>
               <h3 className="text-base font-bold text-gray-900">Sonuç Bulunamadı</h3>
               <p className="text-sm text-gray-400 mt-2">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
            </div>
         )}
      </section>

      {/* Pagination Controls */}
      {!isLoading && meta.toplamSayfa > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            Toplam {meta.toplam} Soru • Sayfa {sayfa} / {meta.toplamSayfa}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSayfa(p => Math.max(1, p - 1))}
              disabled={sayfa === 1}
              className="px-6 py-2.5 rounded-xl border border-gray-100 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              Önceki
            </button>
            <div className="flex items-center gap-1">
              {[...Array(meta.toplamSayfa)].map((_, i) => {
                const p = i + 1;
                // Sadece aktif sayfanın etrafındaki 3 sayfayı göster
                if (p === 1 || p === meta.toplamSayfa || (p >= sayfa - 1 && p <= sayfa + 1)) {
                  return (
                    <button 
                      key={p} 
                      onClick={() => setSayfa(p)}
                      className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${sayfa === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border border-gray-50 text-gray-400 hover:bg-gray-50'}`}
                    >
                      {p}
                    </button>
                  );
                }
                if (p === sayfa - 2 || p === sayfa + 2) return <span key={p} className="px-1 text-gray-300">...</span>;
                return null;
              })}
            </div>
            <button 
              onClick={() => setSayfa(p => Math.min(meta.toplamSayfa, p + 1))}
              disabled={sayfa === meta.toplamSayfa}
              className="px-6 py-2.5 rounded-xl border border-gray-100 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
      
      {/* Detail Overlay / Modal for Soru */}
      <AnimatePresence>
         {acikSoruId && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl md:rounded-[40px] shadow-2xl relative my-2 md:my-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-3rem)] overflow-y-auto">
                  <button onClick={() => setAcikSoruId(null)} className="absolute top-3 right-3 sm:top-5 sm:right-5 md:top-6 md:right-6 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all z-10">✕</button>
                  <div className="p-4 sm:p-6 md:p-10 space-y-5 sm:space-y-6 md:space-y-8">
                     {(() => {
                        const soru = sorular.find(s => s.id === acikSoruId);
                        if (!soru) return null;
                        const parsed = parseMetinParcalari(soru.metinHtml);
                        const cozumHtmlGoster = soruCozumHtmlBirlestir(soru.metinHtml, soru.aiMeta);
                        const duzenleyen = soruDuzenleyenGosterim(soru);
                        const mathSinif =
                          'prose prose-indigo max-w-none overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_table]:w-full [&_table]:table [&_table]:border-collapse [&_table]:text-sm [&_table]:my-3 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1.5';
                        return (
                          <>
                            <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-50 pb-5 sm:pb-6 md:pb-8 pr-10 sm:pr-12">
                               <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-xl shadow-indigo-100">?</div>
                               <div>
                                  <h3 className="text-lg font-bold text-gray-900">Soru Analizi</h3>
                                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">
                                    {soru.konu.ders}
                                    {' · '}
                                    {soruTumKonulari(soru).map((k) => k.ad).join(' · ')}
                                  </p>
                               </div>
                            </div>
                            <div className={`bg-gray-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-gray-100 ${mathSinif}`}>
                              <SoruHtmlMath html={parsed.soruHtml || soru.metinHtml} />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {Object.entries(soru.secenekler).map(([key, val]) => (
                                 <div key={key} className={`p-4 rounded-2xl border flex items-start gap-4 transition-all min-w-0 ${key === soru.dogruCevap ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-white border-gray-100 text-gray-600'}`}>
                                    <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm ${key === soru.dogruCevap ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{key}</div>
                                    <div className={`min-w-0 flex-1 text-sm font-bold ${mathSinif}`}>
                                      <SoruHtmlMath html={duzMetinHtmlSar(String(val ?? ''))} />
                                    </div>
                                 </div>
                               ))}
                            </div>

                            {(parsed.aciklamaHtml || cozumHtmlGoster) && (
                              <div className="space-y-4 pt-3">
                                {parsed.aciklamaHtml && (
                                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Açıklama</p>
                                    <div className={`prose prose-sm prose-indigo max-w-none ${mathSinif}`}>
                                      <SoruHtmlMath html={parsed.aciklamaHtml} />
                                    </div>
                                  </div>
                                )}
                                {cozumHtmlGoster && (
                                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2">Cevap Anlatımı / Çözüm</p>
                                    <div className={`prose prose-sm prose-emerald max-w-none ${mathSinif}`}>
                                      <SoruHtmlMath html={cozumHtmlGoster} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="pt-5 sm:pt-6 md:pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-50">
                               <div className="flex items-center gap-4 sm:gap-6">
                                  <div className="text-center">
                                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Zorluk Seviyesi</p>
                                     <p className="text-xs font-bold text-slate-800 uppercase">{soru.zorluk}</p>
                                  </div>
                                  <div className="w-px h-8 bg-gray-100" />
                                  <div className="text-center">
                                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Onay Durumu</p>
                                     <StatusBadge status={soru.onayDurumu || 'ONAYLANDI'} guncellendi={soruManuelGuncellendi(soru)} />
                                     {(soru.onayDurumu || 'ONAYLANDI') !== 'ONAYLANDI' &&
                                       soruIslemYapilabilir(soru, Boolean(ogretmenKisit), kullaniciId) &&
                                       !(
                                         ogretmenKisit &&
                                         soru.sinav?.baslik &&
                                         soru.sinav.baslik !== 'Soru Bankası (Grup)'
                                       ) && (
                                       <button
                                         type="button"
                                         disabled={onayMutation.isPending}
                                         onClick={() => onayMutation.mutate({ id: soru.id, onayDurumu: 'ONAYLANDI' })}
                                         className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600 shadow-sm transition-all disabled:opacity-50"
                                       >
                                         <CheckCircle2 className="w-3.5 h-3.5" /> Onayla
                                       </button>
                                     )}
                                  </div>
                                  {duzenleyen && !ogretmenKisit && (
                                    <>
                                      <div className="w-px h-8 bg-gray-100" />
                                      <div className="text-center">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Düzenleyen</p>
                                        <p className="text-xs font-bold text-amber-800">{duzenleyen.ad}</p>
                                        {duzenleyen.alt && (
                                          <p className="text-[10px] font-bold text-gray-400 mt-0.5">{duzenleyen.alt}</p>
                                        )}
                                      </div>
                                    </>
                                  )}
                               </div>
                               <button onClick={() => setAcikSoruId(null)} className="w-full sm:w-auto px-6 sm:px-8 py-3 rounded-2xl bg-gray-900 text-white font-bold text-xs uppercase tracking-widest hover:bg-black transition-all">Pencereyi Kapat</button>
                            </div>
                          </>
                        )
                     })()}
                  </div>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>

      {/* Soru Yönetim Paneli (Slide-in) */}
      <AnimatePresence>
         {yeniSoruForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
               <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="w-full max-w-2xl h-full bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] flex flex-col">
                  {/* Header */}
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-100">
                           {duzenlenenSoruId ? <MoreVertical className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                        </div>
                        <div>
                           <h2 className="text-xl font-bold text-gray-900">{duzenlenenSoruId ? 'Soruyu Düzenle' : 'Yeni Soru Oluştur'}</h2>
                           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Soru Bankasına Kaydet</p>
                        </div>
                     </div>
                     <button onClick={handleFormReset} className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 shadow-sm transition-all">✕</button>
                  </div>

                  {/* Form Body */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                     <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                        <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Müfredat filtresi</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kademe</label>
                            <select
                              value={formMufredatTuru}
                              onChange={(e) => {
                                const onceki =
                                  formKonularGosterim.find((k: { id: string }) => k.id === form.konuId) ||
                                  duzenlenenKonuRef.current;
                                if (onceki?.ders && onceki?.ad) {
                                  konuEsleRef.current = {
                                    ders: String(onceki.ders).trim(),
                                    ad: String(onceki.ad).trim(),
                                  };
                                }
                                setFormMufredatTuru(e.target.value as FormMufredatTuru);
                                setForm((f) => ({ ...f, konuId: '' }));
                              }}
                              className="w-full px-4 py-2.5 rounded-xl bg-white border border-indigo-100 font-bold text-xs outline-none focus:border-indigo-500"
                            >
                              <option value="HEPSI">Tümü (dikkat: KPSS kademeleri ayrı konular — rozete bakın)</option>
                              <option value="YKS">YKS</option>
                              <option value="LGS">LGS</option>
                              <option value="KPSS_LISANS">KPSS Lisans</option>
                              <option value="KPSS_ONLISANS">KPSS Önlisans</option>
                              <option value="KPSS_ORTAOGRETIM">KPSS Ortaöğretim</option>
                            </select>
                          </div>
                          {formMufredatTuru === 'YKS' && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">YKS müfredat</label>
                              <select
                                value={formYksKapsam}
                                onChange={(e) => {
                                  const onceki =
                                    formKonularGosterim.find((k: { id: string }) => k.id === form.konuId) ||
                                    duzenlenenKonuRef.current;
                                  if (onceki?.ders && onceki?.ad) {
                                    konuEsleRef.current = {
                                      ders: String(onceki.ders).trim(),
                                      ad: String(onceki.ad).trim(),
                                    };
                                  }
                                  setFormYksKapsam(e.target.value as 'HEPSI' | 'TYT' | 'AYT');
                                  setForm((f) => ({ ...f, konuId: '' }));
                                }}
                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-indigo-100 font-bold text-xs outline-none focus:border-indigo-500"
                              >
                                <option value="HEPSI">TYT + AYT (tümü)</option>
                                <option value="TYT">TYT</option>
                                <option value="AYT">AYT</option>
                              </select>
                            </div>
                          )}
                          {kpssOgretimTuruMu(formMufredatTuru) && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                KPSS müfredat ({kpssOgretimTuruEtiket(formMufredatTuru)})
                              </label>
                              <select
                                value={formKpssKapsam}
                                onChange={(e) => {
                                  const onceki =
                                    formKonularGosterim.find((k: { id: string }) => k.id === form.konuId) ||
                                    duzenlenenKonuRef.current;
                                  if (onceki?.ders && onceki?.ad) {
                                    konuEsleRef.current = {
                                      ders: String(onceki.ders).trim(),
                                      ad: String(onceki.ad).trim(),
                                    };
                                  }
                                  setFormKpssKapsam(e.target.value as 'HEPSI' | 'GY' | 'GK');
                                  setForm((f) => ({ ...f, konuId: '' }));
                                }}
                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-indigo-100 font-bold text-xs outline-none focus:border-indigo-500"
                              >
                                <option value="HEPSI">Genel Yetenek + Genel Kültür</option>
                                <option value="GY">Genel Yetenek</option>
                                <option value="GK">Genel Kültür</option>
                              </select>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-indigo-800/70">
                          Listedeki mavi/yeşil «KPSS ÖL / LİS / OÖ» rozeti, sorunun bağlandığı müfredat kademesidir.
                          Sağdaki mor grup etiketleri (uygun gruplar) bundan bağımsızdır — grup seçmek kademe rozetini değiştirmez.
                          Kademeyi değiştirdikten sonra mutlaka yeni müfredattan bir konu seçin; aksi halde ders/konu kaydı değişmez.
                          AI soru üretimi ile aynı konu havuzu. Liste üstündeki YKS/LGS sekmesi konu seçimini etkilemez.
                          {formKonular.length > 0 ? ` ${formKonular.length} konu listeleniyor.` : ''}
                        </p>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2 sm:col-span-1">
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Konu Seçimi</label>
                           <KonuSecici
                             konular={formKonularGosterim}
                             value={form.konuId}
                             onChange={(konuId) => {
                               const secilen = formKonularGosterim.find((k: { id: string }) => k.id === konuId);
                               if (secilen) {
                                 duzenlenenKonuRef.current = {
                                   id: secilen.id,
                                   ad: secilen.ad,
                                   ders: secilen.ders,
                                   ogretimTuru: secilen.ogretimTuru,
                                   yksSegment: secilen.yksSegment,
                                 };
                               }
                               setForm({ ...form, konuId });
                             }}
                             placeholder={!form.konuId ? 'Konu ara veya seç… (zorunlu)' : 'Konu ara veya seç...'}
                             className={!form.konuId ? 'ring-2 ring-amber-300 rounded-2xl' : ''}
                             oncelikliKapsam={
                               formMufredatTuru === 'YKS' && formYksKapsam !== 'HEPSI'
                                 ? formYksKapsam
                                 : null
                             }
                           />
                           {!form.konuId && (
                             <p className="text-[11px] font-semibold text-amber-700">
                               Konu seçilmeden kaydetmek ders/konuyu güncellemez.
                             </p>
                           )}
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Zorluk</label>
                           <select value={form.zorluk} onChange={(e) => setForm({ ...form, zorluk: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 focus:border-indigo-500 font-bold text-xs outline-none">
                              <option value="KOLAY">KOLAY</option>
                              <option value="ORTA">ORTA</option>
                              <option value="ZOR">ZOR</option>
                           </select>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                          Uygun Öğrenci Grupları / Sınav Türleri
                        </label>
                        <p className="text-[11px] text-gray-500 ml-1">
                          Bu sorunun hangi gruplarda kullanılabileceğini işaretleyin (birden fazla seçilebilir).
                          Bu seçim listedeki «KPSS ÖL / LİS / OÖ» müfredat rozetini değiştirmez; rozet yukarıdaki kademe + konu seçimine bağlıdır.
                        </p>
                        <UygunGrupCheckboxleri
                          gruplar={gruplar}
                          seciliIds={form.uygunGrupIds}
                          onToggle={(grupId) =>
                            setForm((prev) => ({
                              ...prev,
                              uygunGrupIds: uygunGrupToggle(grupId, prev.uygunGrupIds),
                            }))
                          }
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Soru Bankası / Sınava Atama (Opsiyonel)</label>
                        <div className="grid grid-cols-2 gap-4">
                           <select value={form.grupId} onChange={(e) => setForm({ ...form, grupId: e.target.value })} className="px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs outline-none">
                              <option value="">Grup (Havuz)...</option>
                              {gruplar.map((g: any) => <option key={g.id} value={g.id}>{g.ad}</option>)}
                           </select>
                           <select value={form.sinavId} onChange={(e) => setForm({ ...form, sinavId: e.target.value })} className="px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs outline-none">
                              <option value="">Sınava Ata (Banka değil)...</option>
                              {sinavlar.map((s: any) => <option key={s.id} value={s.id}>{s.baslik}</option>)}
                           </select>
                        </div>
                     </div>

                     {/* Sekme başlıkları */}
                     <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
                        {[
                           { id: 'metin' as const, etiket: '📝 Soru Metni' },
                           { id: 'cizim' as const, etiket: '🎨 Çizim & Şekil' },
                           { id: 'ai'    as const, etiket: '✨ AI Yardımcı' },
                        ].map((s) => (
                           <button
                              key={s.id}
                              type="button"
                              onClick={() => setAktifSekme(s.id)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                 aktifSekme === s.id
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                              }`}
                           >
                              {s.etiket}
                           </button>
                        ))}
                     </div>

                     {aktifSekme === 'metin' && (
                        <div className="space-y-4">
                           <SoruZenginMetinEditoru
                             key={`metin-${duzenlenenSoruId || 'yeni'}`}
                             label="Soru Metni"
                             value={form.metinHtml}
                             onChange={(metinHtml) => setForm((f) => ({ ...f, metinHtml }))}
                             placeholder="Soru metnini yazın; kelime seçip araç çubuğundan biçimlendirin…"
                             minHeight={180}
                           />

                              <div className="p-6 rounded-3xl bg-slate-50 border border-dashed border-gray-200 min-h-[100px] relative overflow-hidden group">
                                 <div className="absolute top-[2px] right-4 opacity-50">
                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Canlı Önizleme</span>
                                 </div>
                                 <div className="prose prose-sm prose-indigo max-w-none text-gray-600 font-medium leading-relaxed [&_u]:underline [&_em]:italic [&_strong]:font-bold">
                                   {form.metinHtml?.trim() ? (
                                     <SoruHtmlMath html={form.metinHtml} />
                                   ) : (
                                     <p className="text-gray-300 italic">Önizleme burada görünecek...</p>
                                   )}
                                 </div>
                              </div>

                           <div className="grid grid-cols-1 gap-4">
                             <SoruZenginMetinEditoru
                               label="Soru Açıklaması (opsiyonel)"
                               value={form.aciklamaHtml}
                               onChange={(aciklamaHtml) => setForm((f) => ({ ...f, aciklamaHtml }))}
                               placeholder="Soruya kısa açıklama / ipucu…"
                               minHeight={100}
                             />
                             <SoruZenginMetinEditoru
                               label="Cevap Anlatımı / Çözüm (opsiyonel)"
                               value={form.cozumHtml}
                               onChange={(cozumHtml) => setForm((f) => ({ ...f, cozumHtml }))}
                               placeholder="Çözüm anlatımı…"
                               minHeight={140}
                             />
                           </div>
                        </div>
                     )}

                     {aktifSekme === 'cizim' && (
                        <div className="space-y-4">
                           <SoruAiGorsel
                              ders={formKonularGosterim.find((k: any) => k.id === form.konuId)?.ders}
                              konu={formKonularGosterim.find((k: any) => k.id === form.konuId)?.ad}
                              onEkle={aiGorselEkle}
                           />
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Çizim Editörü</label>
                              {annotationPng
                                 ? <span className="text-[10px] font-bold text-emerald-600">✓ Soruya eklenecek</span>
                                 : <span className="text-[10px] font-bold text-gray-400">Henüz çizim yok</span>}
                           </div>
                           <SoruCizimEditoru
                              onPngDegisti={(png) => setAnnotationPng(png || '')}
                              yukseklik={420}
                           />
                           <p className="text-[11px] text-gray-500 px-1 leading-relaxed">
                              Resim yükleyebilir, <b>Seç / taşı</b> ile nesneyi sürükleyebilir; seçiliyken alttan genişlik, yükseklik ve (resimde) oran kilidini ayarlayabilirsiniz. Kısayol: Ctrl+Z geri, Ctrl+Shift+Z ileri. Kayıtta çizim soru metnine eklenir.
                           </p>
                        </div>
                     )}

                     {aktifSekme === 'ai' && (
                        <div className="space-y-4">
                           <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Mevcut soru kökü (referans)</p>
                              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                                 {form.metinHtml?.trim() ? (
                                   <SoruHtmlMath html={form.metinHtml} />
                                 ) : (
                                   <p className="text-gray-400 italic text-sm">Henüz soru kökü yok.</p>
                                 )}
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                 {(['A', 'B', 'C', 'D', 'E'] as const).map((s) => {
                                   const metin = (form.secenekler as Record<string, string>)[s];
                                   if (!metin?.trim()) return null;
                                   return (
                                     <p key={s} className="text-[11px] text-gray-600 truncate">
                                       <span className={`font-black mr-1 ${form.dogruCevap === s ? 'text-emerald-600' : 'text-gray-400'}`}>{s})</span>
                                       {metin}
                                     </p>
                                   );
                                 })}
                              </div>
                           </div>
                           <div className="h-[480px]">
                              <SoruAiSohbet
                                soruId={duzenlenenSoruId}
                                mevcutDurum={{
                                  metinHtml: buildMetinHtmlFromParts(form.metinHtml, form.aciklamaHtml, form.cozumHtml),
                                  secenekler: form.secenekler as Record<string, string>,
                                  dogruCevap: form.dogruCevap,
                                  kazanim: form.kazanim,
                                  zorluk: form.zorluk,
                                }}
                                onUygula={aiOneriUygula}
                              />
                           </div>
                        </div>
                     )}

                     <div className="space-y-4">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Seçenekler & Doğru Cevap</label>
                        <div className="space-y-3">
                           {['A', 'B', 'C', 'D', 'E'].map(sık => (
                              <div key={sık} className="flex items-center gap-3">
                                 <button onClick={() => setForm({ ...form, dogruCevap: sık })} className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${form.dogruCevap === sık ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{sık}</button>
                                 <input value={(form.secenekler as any)[sık]} onChange={(e) => setForm({ ...form, secenekler: { ...form.secenekler, [sık]: e.target.value } })} placeholder={`${sık} seçeneği metni...`} className="flex-1 px-5 py-2.5 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-indigo-400 font-bold text-xs" />
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Footer */}
                  <div className="p-8 border-t border-gray-100 bg-gray-50/30 flex items-center justify-end gap-4">
                     <button onClick={handleFormReset} className="px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all">İptal</button>
                     <button 
                        onClick={kaydetTikla}
                        disabled={soruEkleMutation.isPending || soruGuncelleMutation.isPending}
                        className="px-10 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                     >
                        {(soruEkleMutation.isPending || soruGuncelleMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : (duzenlenenSoruId ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                        {duzenlenenSoruId ? 'Değişiklikleri Kaydet' : 'Soruyu Oluştur'}
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Toplu Soru İthal Etme Modalı */}
      <AnimatePresence>
         {importModalOpen && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl relative my-8 max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><Upload className="w-5 h-5" /></div>
                        <div>
                           <h3 className="text-lg font-bold text-gray-900">Toplu Soru İçe Aktar (JSON)</h3>
                           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">OGM / EBA Scraper Dosyası</p>
                        </div>
                     </div>
                     <button onClick={() => { setImportModalOpen(false); setImportedQuestions([]); }} className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 shadow-sm transition-all">✕</button>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                     {importedQuestions.length === 0 ? (
                       <div 
                         onClick={() => fileInputRef.current?.click()}
                         className="border-3 border-dashed border-gray-200 hover:border-indigo-500 rounded-3xl p-12 text-center cursor-pointer transition-all hover:bg-indigo-50/10 group"
                       >
                          <Upload className="w-12 h-12 text-gray-300 group-hover:text-indigo-500 mx-auto mb-4 transition-colors" />
                          <h4 className="text-base font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">JSON Dosyasını Seçin</h4>
                          <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto leading-relaxed">
                             Python kazıyıcısı tarafından oluşturulan <b>ogm_questions.json</b> dosyasını sürükleyip bırakın veya tıklayarak seçin.
                          </p>
                          <input 
                            type="file"
                            ref={fileInputRef}
                            onChange={handleJsonDosyasiYukle}
                            accept=".json"
                            className="hidden"
                          />
                       </div>
                     ) : (
                       <div className="space-y-6">
                          {/* Target Settings */}
                          <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-lg space-y-4">
                             <div className="flex items-center gap-2 text-indigo-300 text-xs font-black uppercase tracking-widest">
                                <Sparkles className="w-4 h-4" /> Hedef Seçenekleri & Ayarlar
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Müfredat</label>
                                   <select
                                     value={formMufredatTuru}
                                     onChange={(e) => {
                                       setFormMufredatTuru(e.target.value as FormMufredatTuru);
                                       setImportKonuId('');
                                     }}
                                     className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-xs outline-none focus:bg-white/20"
                                   >
                                      <option value="HEPSI" className="text-slate-950">Tümü</option>
                                      <option value="YKS" className="text-slate-950">YKS</option>
                                      <option value="LGS" className="text-slate-950">LGS</option>
                                      <option value="KPSS_LISANS" className="text-slate-950">KPSS Lisans</option>
                                      <option value="KPSS_ONLISANS" className="text-slate-950">KPSS Önlisans</option>
                                      <option value="KPSS_ORTAOGRETIM" className="text-slate-950">KPSS Ortaöğretim</option>
                                   </select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">İthal Edilecek Konu (Zorunlu)</label>
                                   <select 
                                     value={importKonuId}
                                     onChange={(e) => setImportKonuId(e.target.value)}
                                     className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-xs outline-none focus:bg-white/20"
                                   >
                                      <option value="" className="text-slate-950">Konu Seçin...</option>
                                      {formKonular.map((k: any) => (
                                        <option key={k.id} value={k.id} className="text-slate-950">{k.ders} - {k.ad}</option>
                                      ))}
                                   </select>
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Zorluk Derecesi</label>
                                   <select 
                                     value={importZorluk}
                                     onChange={(e) => setImportZorluk(e.target.value)}
                                     className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-xs outline-none focus:bg-white/20"
                                   >
                                      <option value="KOLAY" className="text-slate-950">KOLAY</option>
                                      <option value="ORTA" className="text-slate-950">ORTA</option>
                                      <option value="ZOR" className="text-slate-950">ZOR</option>
                                   </select>
                                </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Grup Havuzuna Ekle (Opsiyonel)</label>
                                   <select 
                                     value={importGrupId}
                                     onChange={(e) => setImportGrupId(e.target.value)}
                                     className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-xs outline-none focus:bg-white/20"
                                   >
                                      <option value="" className="text-slate-950">Grup Seçin...</option>
                                      {gruplar.map((g: any) => (
                                        <option key={g.id} value={g.id} className="text-slate-950">{g.ad}</option>
                                      ))}
                                   </select>
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Doğrudan Sınava Ekle (Opsiyonel)</label>
                                   <select 
                                     value={importSinavId}
                                     onChange={(e) => setImportSinavId(e.target.value)}
                                     className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-xs outline-none focus:bg-white/20"
                                   >
                                      <option value="" className="text-slate-950">Sınav Seçin...</option>
                                      {sinavlar.map((s: any) => (
                                        <option key={s.id} value={s.id} className="text-slate-950">{s.baslik}</option>
                                      ))}
                                   </select>
                                </div>
                             </div>
                          </div>

                          {/* Questions Preview List */}
                          <div className="space-y-3">
                             <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Yüklenecek Soruların Listesi ({importedQuestions.length})</span>
                                <button onClick={() => setImportedQuestions([])} className="text-xs font-bold text-rose-500 hover:text-rose-700">Farklı Dosya Seç</button>
                             </div>
                             <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                                {importedQuestions.map((q: any, i: number) => (
                                  <div key={i} className="p-4 bg-gray-50/50 hover:bg-gray-50 transition flex items-start gap-4">
                                     <div className="w-6 h-6 rounded-lg bg-gray-200 text-gray-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                                     <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-gray-700 line-clamp-2">{q.metin || q.metinHtml}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                           <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded">Şık: {q.dogruCevap || 'A'}</span>
                                           <span className="text-[9px] font-bold text-slate-400">{Object.keys(q.secenekler || {}).length} Seçenekli</span>
                                           {q.gorselUrl && <span className="text-[9px] font-bold text-indigo-500 flex items-center gap-1">🖼️ Görselli</span>}
                                           {q.kazanim && <span className="text-[9px] font-bold text-violet-500 truncate max-w-[200px]">🎯 {q.kazanim}</span>}
                                        </div>
                                     </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>
                     )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex items-center justify-end gap-3 shrink-0">
                     <button onClick={() => { setImportModalOpen(false); setImportedQuestions([]); }} className="px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest text-gray-400 hover:text-gray-900 transition">İptal</button>
                     <button 
                       onClick={() => topluIthalMutation.mutate()}
                       disabled={topluIthalMutation.isPending || importedQuestions.length === 0 || !importKonuId}
                       className="px-8 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
                     >
                        {topluIthalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Sisteme Aktar ({importedQuestions.length} Soru)
                     </button>
                  </div>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>

      {/* KPSS'den TYT'ye Soru Kopyalama Modalı */}
      <AnimatePresence>
         {kopyalanacakSoruId && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="w-full max-w-lg bg-white rounded-3xl shadow-2xl relative my-8 flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><Upload className="w-5 h-5" /></div>
                        <div>
                           <h3 className="text-lg font-bold text-gray-900">TYT Havuzuna Gönder</h3>
                           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">KPSS Sorusu Kopyalama</p>
                        </div>
                     </div>
                     <button onClick={() => { setKopyalanacakSoruId(null); setTargetTytKonuId(''); }} className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 shadow-sm transition-all">✕</button>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hedef YKS/TYT Konusu</label>
                        <select
                          value={targetTytKonuId}
                          onChange={(e) => setTargetTytKonuId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                        >
                          <option value="">-- Lütfen bir konu seçin --</option>
                          {yksKonular.map((k: any) => (
                            <option key={k.id} value={k.id}>
                              [{k.ders}] {k.ad} {k.uniteAdi ? `(${k.uniteAdi})` : ''}
                            </option>
                          ))}
                        </select>
                     </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex items-center justify-end gap-3 shrink-0">
                     <button onClick={() => { setKopyalanacakSoruId(null); setTargetTytKonuId(''); }} className="px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest text-gray-400 hover:text-gray-900 transition">İptal</button>
                     <button
                       onClick={() => tytKopyalaMutation.mutate()}
                       disabled={tytKopyalaMutation.isPending || !targetTytKonuId}
                       className="px-8 py-3.5 rounded-2xl bg-[#2ABBA7] text-white font-bold text-xs uppercase tracking-widest hover:bg-[#1fa897] shadow-xl shadow-teal-100 active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
                     >
                        {tytKopyalaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        TYT'ye Gönder
                     </button>
                  </div>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>

      {/* KPSS'den TYT'ye Toplu Soru Kopyalama Modalı */}
      <AnimatePresence>
         {topluKopyalaModalAcik && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="w-full max-w-lg bg-white rounded-3xl shadow-2xl relative my-8 flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><Upload className="w-5 h-5" /></div>
                        <div>
                           <h3 className="text-lg font-bold text-gray-900">Seçilenleri TYT Havuzuna Gönder</h3>
                           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">{secilenIds.length} Soru Kopyalanacak</p>
                        </div>
                     </div>
                     <button onClick={() => { setTopluKopyalaModalAcik(false); setTargetTytKonuId(''); }} className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 shadow-sm transition-all">✕</button>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hedef YKS/TYT Konusu</label>
                        <select
                          value={targetTytKonuId}
                          onChange={(e) => setTargetTytKonuId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                        >
                          <option value="">-- Lütfen bir konu seçin --</option>
                          {yksKonular.map((k: any) => (
                            <option key={k.id} value={k.id}>
                              [{k.ders}] {k.ad} {k.uniteAdi ? `(${k.uniteAdi})` : ''}
                            </option>
                          ))}
                        </select>
                     </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex items-center justify-end gap-3 shrink-0">
                     <button onClick={() => { setTopluKopyalaModalAcik(false); setTargetTytKonuId(''); }} className="px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest text-gray-400 hover:text-gray-900 transition">İptal</button>
                     <button
                       onClick={() => topluTytKopyalaMutation.mutate()}
                       disabled={topluTytKopyalaMutation.isPending || !targetTytKonuId}
                       className="px-8 py-3.5 rounded-2xl bg-[#2ABBA7] text-white font-bold text-xs uppercase tracking-widest hover:bg-[#1fa897] shadow-xl shadow-teal-100 active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
                     >
                        {topluTytKopyalaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Kopyala ve Gönder
                     </button>
                  </div>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status, guncellendi }: { status: string; guncellendi?: boolean }) {
  const map: any = {
    ONAYLANDI: { s: 'Onaylandı', c: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    ONAY_BEKLIYOR: { s: 'Bekliyor', c: 'bg-amber-50 text-amber-600 border-amber-100' },
    REDDEDILDI: { s: 'Reddedildi', c: 'bg-rose-50 text-rose-600 border-rose-100' }
  };
  const { s, c } = map[status] || map.ONAYLANDI;
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest border w-fit ${c}`}>{s}</span>
      {guncellendi && (
        <span className="text-[8px] font-black bg-violet-600 text-white px-1.5 py-0.5 rounded-md flex items-center gap-1 w-fit shadow-sm shadow-violet-200">
          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" /> GÜNCELLENDİ
        </span>
      )}
    </div>
  );
}

function UygunGrupCheckboxleri({
  gruplar,
  seciliIds,
  onToggle,
}: {
  gruplar: { id: string; ad: string }[];
  seciliIds: string[];
  onToggle: (grupId: string) => void;
}) {
  if (!gruplar.length) {
    return <p className="text-xs text-gray-400 font-bold">Henüz grup tanımlanmamış.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {gruplar.map((g) => {
        const secili = seciliIds.includes(g.id);
        return (
          <label
            key={g.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-xs font-bold ${
              secili
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-indigo-100'
            }`}
          >
            <input
              type="checkbox"
              checked={secili}
              onChange={() => onToggle(g.id)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="truncate">{g.ad}</span>
          </label>
        );
      })}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-all">
       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">{label}</span>
       <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 outline-none pr-4">
          {options.map(opt => <option key={opt} value={opt}>{opt || 'Tümü'}</option>)}
       </select>
    </div>
  );
}
