'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { aiApi, adminApi, api } from '@/lib/api';
import {
  Brain, Sparkles, BookOpen, Loader2, Check,
  Zap, FlaskConical, BookMarked, Shapes, ChevronDown,
  Upload, FileText, Image, X, ChevronRight, Tag, Save, Users,
  GraduationCap
} from 'lucide-react';
import { toast } from '@/store/toast.store';
import { useAuthStore } from '@/store/auth.store';
import { ogretmenIzinliDersEtiketi, ogretmenBransEtiketi } from '@/lib/ogretmenSinirlama';
import { OGRETMEN_TALIMAT_MAX } from '@/lib/ogretmenTalimat';
import { buildMetinHtmlFromParts } from '@/lib/soru-metin-parcalari';
import { SoruHtmlMath } from '@/components/admin/SoruHtmlMath';
import { duzMetinHtmlSar } from '@/lib/soruCozumYardim';
import KonuCokluSecici from '@/components/admin/KonuCokluSecici';
import { grupKonuOgretimTuru, grupEtiketTuru, grupListeEtiketi, kpssOgretimTuruMu, kpssOgretimTuruEtiket, KPSS_KADEME_SECENEKLERI, type OgretimTuruKpss } from '@/lib/grupOgretimTuru';
import { bagliGruplariFiltrele } from '@/lib/grupYolu';
import {
  MODEL_BILGILERI as VARSAYILAN_MODEL_BILGILERI,
  MODEL_SECENEKLERI as VARSAYILAN_MODEL_SECENEKLERI,
  MODEL_SLUG_GUNCELLE,
  modelTahmin,
  type OpenRouterModelMeta,
} from '@/lib/openrouterModeller';

/** Backend 422 doğrulama hatalarını toast metnine çevirir */
function axios422Ozet(e: unknown): string | null {
  if (!axios.isAxiosError(e) || e.response?.status !== 422) return null;
  const d = e.response.data as { mesaj?: string; hatalar?: { sira: number; mesajlar: string[] }[] };
  const satirlar = d.hatalar?.map((h) => `Soru ${h.sira}: ${h.mesajlar.join('; ')}`) ?? [];
  if (satirlar.length === 0) return d.mesaj ?? null;
  return [d.mesaj, ...satirlar].filter(Boolean).join(' — ');
}

const renkBadge: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-700',
};

interface UretilenSoru {
  /** POST /ai/soru-uret veya referans+konu yanıtında DB kaydından gelir — otomatik banka kaydı için işaret */
  id?: string;
  metin?: string;
  metinHtml?: string;
  svgGorsel?: string;
  gorselUrl?: string;
  secenekler: { A: string; B: string; C: string; D: string; E: string };
  dogruCevap: string;
  kazanim?: string;
  cozumAciklamasi?: string;
}

interface KonuItem {
  id: string;
  ad: string;
  ders: string;
  ogretimTuru?: string;
  uniteAdi?: string | null;
  yksSegment?: string | null;
}

interface GrupItem {
  id: string;
  ad: string;
  tur: string;
  aktif?: boolean;
  parentId?: string | null;
  tamYol?: string;
  /** Aynı ad+tür birden fazla grupta varsa ayırt etmek için */
  listeEtiketi?: string;
}

interface ReferansAnalizi {
  dersAdi: string;
  konular: string[];
  zorlukSeviyesi: string;
  soruTipleri: string[];
  ogretimTuru: string;
  formatNotu: string;
  ornek_soru_sayisi: number;
  gorselGerekli?: boolean;
  kaynakGorsel?: boolean;
  referans_sorular?: { ozet: string; soruDetay?: string }[];
  sayfa_sayisi?: number;
  tespit_edilen_soru_sayisi?: number;
  tam_metin_okundu?: boolean;
}

const REFERANS_DERS_SECENEKLERI = [
  'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Türk Dili ve Edebiyatı',
  'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce',
  'Fen Bilimleri', 'İnkılap Tarihi ve Atatürkçülük',
];

function referansKaynakAdindanDersTahmin(kaynak: string): string | null {
  if (!kaynak?.trim()) return null;
  const s = kaynak
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[_\s]+/g, '-');
  const kalip: Array<[string, RegExp]> = [
    ['İnkılap Tarihi ve Atatürkçülük', /inkilap|inkılap|ataturkculuk|atatürkçülük/i],
    ['Coğrafya', /cografya|coğrafya|cog-|cogr-/i],
    ['Fen Bilimleri', /fen-bilim|fenbilim|fen-bilimleri|\/fen\//i],
    ['Din Kültürü ve Ahlak Bilgisi', /din-kultur|dinkultur|din-kulturu/i],
    ['Türk Dili ve Edebiyatı', /turk-dili|edebiyat|turkce|türkçe/i],
    ['Matematik', /matematik|mat-|mat\./i],
    ['Geometri', /geometri|geo-/i],
    ['Fizik', /fizik/i],
    ['Kimya', /kimya/i],
    ['Biyoloji', /biyoloji/i],
    ['Felsefe', /felsefe|psikoloji|sosyoloji|mantik|mantık/i],
    ['Tarih', /(?:^|[-/])tarih(?:[-/]|$)|tarih-/i],
    ['İngilizce', /ingilizce|english/i],
  ];
  for (const [ders, rx] of kalip) {
    if (rx.test(s)) return ders;
  }
  return null;
}

function referansDersTahminEt(analiz: ReferansAnalizi, kaynakAdi?: string): ReferansAnalizi {
  const kaynakDers = kaynakAdi ? referansKaynakAdindanDersTahmin(kaynakAdi) : null;
  if (kaynakDers) return { ...analiz, dersAdi: kaynakDers };

  const ana = analiz.dersAdi?.split(',')[0].trim() || '';
  const icerikMetni = [
    ...(analiz.konular || []),
    ...(analiz.soruTipleri || []),
    analiz.formatNotu || '',
    ...(analiz.referans_sorular || []).map((r) => r.ozet + ' ' + (r.soruDetay || '')),
  ].join(' ');

  const kalip: Array<[string, RegExp]> = [
    ['Coğrafya', /coğrafya|cografya|harita|izohips|nüfus|iklim|yer şekil|enlem|boylam|akarsu|göl|kıta|sanayi|tarım|turizm/i],
    ['Tarih', /tarih|osmanlı|selçuklu|ilkçağ|ortaçağ|soğuk savaş/i],
    ['İnkılap Tarihi ve Atatürkçülük', /inkılap|inkilap|atatürkçülük|atatürk|mondros|sevr|lozan/i],
    ['Fen Bilimleri', /fen bilim|fen bilimleri|dna|genetik|mitoz|mayoz|ekosistem|mevsim|iklim|gölge|dünya|güneş|ay|ekvator/i],
    ['Geometri', /geometri|üçgen|ucgen|açı|aci|çember|alan|hacim|şekil|sekil/i],
    ['Matematik', /matematik|türev|integral|fonksiyon|polinom|logaritma|limit|olasılık/i],
    ['Fizik', /fizik|kuvvet|devre|hız|enerji|elektrik|optik/i],
    ['Kimya', /kimya|mol|asit|baz|organik|periyodik|tepkime/i],
    ['Biyoloji', /biyoloji|hücre|hucre|genetik|ekosistem|canlı|canli/i],
    ['Türkçe', /türkçe|turkce|paragraf|anlam|dil bilgisi|edebiyat/i],
  ];
  for (const [ders, rx] of kalip) {
    if (rx.test(icerikMetni)) return { ...analiz, dersAdi: ders };
  }

  if (ana && ana.toLowerCase() !== 'genel') return analiz;
  if (referansGorselOnerilir(analiz) && !/fizik|kimya|biyoloji|fen bilim|gölge|dünya|güneş|ay|ekvator|iklim/i.test(icerikMetni)) {
    return { ...analiz, dersAdi: 'Geometri' };
  }
  return analiz;
}

function referansAnaliziGuvenli(analiz: unknown, kaynakAdi?: string): ReferansAnalizi | null {
  if (!analiz || typeof analiz !== 'object') return null;
  const a = analiz as Record<string, unknown>;
  const dersAdi = typeof a.dersAdi === 'string' ? a.dersAdi.trim() : '';
  if (!dersAdi) return null;
  const konular = Array.isArray(a.konular)
    ? a.konular.map(String).filter(Boolean)
    : typeof a.konu === 'string'
      ? [a.konu]
      : ['Genel'];
  const soruTipleri = Array.isArray(a.soruTipleri)
    ? a.soruTipleri.map(String).filter(Boolean)
    : typeof a.soruTipi === 'string'
      ? [a.soruTipi]
      : ['çoktan seçmeli'];
  return referansDersTahminEt({
    dersAdi,
    konular: konular.length ? konular : ['Genel'],
    zorlukSeviyesi: typeof a.zorlukSeviyesi === 'string' ? a.zorlukSeviyesi : 'ORTA',
    soruTipleri: soruTipleri.length ? soruTipleri : ['çoktan seçmeli'],
    ogretimTuru: typeof a.ogretimTuru === 'string' ? a.ogretimTuru : 'YKS',
    formatNotu: typeof a.formatNotu === 'string' ? a.formatNotu : 'ÖSYM tarzı, 5 şık',
    ornek_soru_sayisi: typeof a.ornek_soru_sayisi === 'number' ? a.ornek_soru_sayisi : 1,
    gorselGerekli: typeof a.gorselGerekli === 'boolean' ? a.gorselGerekli : undefined,
    kaynakGorsel: a.kaynakGorsel === true,
    referans_sorular: Array.isArray(a.referans_sorular)
      ? (a.referans_sorular as { ozet?: string; soruDetay?: string }[])
        .filter((r) => r && typeof r.ozet === 'string')
        .map((r) => ({ ozet: r.ozet as string, soruDetay: r.soruDetay }))
      : undefined,
    sayfa_sayisi: typeof a.sayfa_sayisi === 'number' ? a.sayfa_sayisi : undefined,
    tespit_edilen_soru_sayisi:
      typeof a.tespit_edilen_soru_sayisi === 'number' ? a.tespit_edilen_soru_sayisi : 1,
    tam_metin_okundu: typeof a.tam_metin_okundu === 'boolean' ? a.tam_metin_okundu : undefined,
  }, kaynakAdi);
}

function referansGorselOnerilir(analiz: ReferansAnalizi | null): boolean {
  if (!analiz) return false;
  if (analiz.kaynakGorsel === true) return true;
  if (analiz.gorselGerekli === true) return true;
  if (analiz.gorselGerekli === false) return false;
  const metin = [
    analiz.dersAdi,
    ...(analiz.konular || []),
    ...(analiz.soruTipleri || []),
    analiz.formatNotu || '',
  ]
    .join(' ')
    .toLowerCase();
  return /grafik|pasta|sütun|sutun|çubuk|geometri|şekil|diyagram|tablo|görsel|chart|açı|veri analiz/.test(metin);
}

/**
 * Üstteki «Grup» boş kalırsa (Tüm gruplar), kayıtta grupId gönderilmezdi ve sorular «Genel Banka» olurdu.
 * Konunun öğretim türü + YKS segmenti / müfredat filtresi ile uygun öğrenci grubunu seçer (örn. tek YKS grubu → o havuz).
 */
function bankaKaydiIcinEtkinGrupId(
  konu: KonuItem | undefined,
  gruplar: GrupItem[],
  yksKapsam: 'HEPSI' | 'TYT' | 'AYT'
): string | undefined {
  if (!konu?.ogretimTuru) return undefined;
  const uygun = gruplar.filter((g) => grupKonuOgretimTuru(g, g.tamYol) === konu.ogretimTuru);
  if (uygun.length === 0) return undefined;
  if (uygun.length === 1) return uygun[0].id;

  const adNorm = (s: string) => s.toLocaleLowerCase('tr-TR');

  if (konu.ogretimTuru === 'YKS') {
    let anahtar: 'ayt' | 'tyt' | null = null;
    if (yksKapsam === 'AYT') anahtar = 'ayt';
    else if (yksKapsam === 'TYT') anahtar = 'tyt';
    else {
      const seg = konu.yksSegment || '';
      if (seg && seg !== 'TYT') anahtar = 'ayt';
      else if (seg === 'TYT') anahtar = 'tyt';
    }
    if (anahtar) {
      const adaGore = uygun.find((g) => adNorm(g.ad).includes(anahtar));
      if (adaGore) return adaGore.id;
    }
  }

  return uygun[0].id;
}

function escapeHtmlMetin(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plainToHtmlParagraphs(t: string): string {
  const raw = String(t || '').trim();
  if (!raw) return '';
  const escaped = escapeHtmlMetin(raw);
  const parts = escaped.split(/\r?\n+/g).map((x) => x.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.map((p) => `<p>${p}</p>`).join('\n');
}

/** Soru bankasına kayıt için metin + SVG birleştir */
function uretilenSoruyuMetinHtml(s: UretilenSoru): string {
  let html = (s.metinHtml || '').trim();
  if (!html && s.metin) {
    const raw = String(s.metin).trim();
    // API çoğunlukla <p>…</p> HTML döndürür; yeniden kaçışlamak LaTeX’i &lt;p&gt; yapar.
    if (/<[a-z][\s\S]*>/i.test(raw)) {
      html = raw;
    } else {
      html = plainToHtmlParagraphs(raw);
    }
  }
  if (!html) html = '<p></p>';
  if (s.svgGorsel && !html.includes('<svg')) {
    html += `<div class="soru-svg-gorsel">${s.svgGorsel}</div>`;
  }
  return html;
}

function cozumEksikSiraListesi(sorular: UretilenSoru[]): number[] {
  const eksik: number[] = [];
  sorular.forEach((s, i) => {
    if (!String(s.cozumAciklamasi || '').trim()) eksik.push(i + 1);
  });
  return eksik;
}

export default function AIPaneli() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const ogretmenKisit = useAuthStore((s) =>
    s.kullanici?.rol === 'TEACHER' &&
      (s.kullanici.brans || (s.kullanici.branslar?.length ?? 0) > 0) &&
      s.kullanici.ogretimTuru
      ? {
        brans: s.kullanici.brans ?? s.kullanici.branslar?.join(', ') ?? '',
        branslar: s.kullanici.branslar,
        ogretimTuru: s.kullanici.ogretimTuru,
        izinliDersler: s.kullanici.izinliDersler,
      }
      : null
  );
  const ogretmenDersEtiketi = ogretmenKisit
    ? ogretmenIzinliDersEtiketi(ogretmenKisit.brans, ogretmenKisit.izinliDersler)
    : '';
  const [aktifSekme, setAktifSekme] = useState<'normal' | 'referans'>('normal');
  const [form, setForm] = useState({
    grupId: '',
    konuIds: [] as string[],
    sinavId: '',
    sayi: 5,
    zorluk: 'ORTA',
    modelOverride: '' as string,
    gorselMod: 'oto' as 'oto' | 'svg' | 'dalle' | 'yok',
    ogretmenTalimat: '',
  });
  const [uretilmisSorular, setUretilmisSorular] = useState<UretilenSoru[]>([]);
  const [kullanılanModel, setKullanılanModel] = useState<(OpenRouterModelMeta & { model: string }) | null>(null);
  const [kullanilanKaynaklar, setKullanilanKaynaklar] = useState<{ id: string; dokumanId: string; dokumanBaslik: string; benzerlik: number }[]>([]);
  const [acikCozumIdx, setAcikCozumIdx] = useState<number | null>(null);

  // Referans modu state'leri
  const dosyaInputRef = useRef<HTMLInputElement>(null);
  const [referansDosya, setReferansDosya] = useState<File | null>(null);
  const [referansOnizleme, setReferansOnizleme] = useState<string | null>(null);
  const [referansAnalizi, setReferansAnalizi] = useState<ReferansAnalizi | null>(null);
  const [referansKaynakAdi, setReferansKaynakAdi] = useState('');
  const [referansYuklemeTipi, setReferansYuklemeTipi] = useState<'dosya' | 'url'>('dosya');
  const [referansKaynakUrl, setReferansKaynakUrl] = useState('');

  const [referansForm, setReferansForm] = useState({
    sayi: 5,
    zorluk: 'ORTA',
    gorselMod: 'oto' as 'oto' | 'svg' | 'yok',
    grupId: '',
    konuIds: [] as string[],
    sinavId: '',
    /** PDF’de tespit edilen her soru için birer özgün varyasyon */
    tamVaryasyon: true,
    /** benzer: aynı kurgu/format, ozgun: farklı kurgu */
    uretimTarzi: 'benzer' as 'benzer' | 'ozgun',
    /** bağımsız çözdürme ile sıkı doğrulama */
    sikiDogrulama: true,
    /** sorulara atanacak toplu kazanım etiketi */
    hedefKazanim: '',
  });
  const [yksKapsamNormal, setYksKapsamNormal] = useState<'HEPSI' | 'TYT' | 'AYT'>('HEPSI');
  const [yksKapsamReferans, setYksKapsamReferans] = useState<'HEPSI' | 'TYT' | 'AYT'>('HEPSI');
  const [kpssKapsamNormal, setKpssKapsamNormal] = useState<'HEPSI' | 'GY' | 'GK'>('HEPSI');
  const [kpssKapsamReferans, setKpssKapsamReferans] = useState<'HEPSI' | 'GY' | 'GK'>('HEPSI');
  const [kpssKademeNormal, setKpssKademeNormal] = useState<OgretimTuruKpss>('KPSS_LISANS');
  const [kpssKademeReferans, setKpssKademeReferans] = useState<OgretimTuruKpss>('KPSS_LISANS');

  const { data: sinavlarData } = useQuery({
    queryKey: ['admin-sinavlar'],
    queryFn: () => api.get('/admin/sinavlar'),
  });
  const sinavlar = sinavlarData?.data?.veri || [];

  const { data: gruplarData } = useQuery({
    queryKey: ['admin-gruplar'],
    queryFn: () => adminApi.gruplar(),
  });
  const gruplar: GrupItem[] = useMemo(() => {
    const raw: GrupItem[] = bagliGruplariFiltrele(gruplarData?.data?.veri || []).filter(
      (g: GrupItem) => g.aktif !== false
    );
    const byId = new Map(raw.map((g) => [g.id, g]));
    const yolAdi = (g: GrupItem): string => {
      const parcalar = [String(g.ad).trim()];
      let cur = g;
      const seen = new Set<string>([g.id]);
      while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.parentId)) {
        cur = byId.get(cur.parentId)!;
        seen.add(cur.id);
        parcalar.unshift(String(cur.ad).trim());
      }
      return parcalar.join(' › ');
    };
    const anahtar = (g: GrupItem) =>
      `${yolAdi(g).toLocaleLowerCase('tr-TR')}|${grupKonuOgretimTuru(g, yolAdi(g)) || grupEtiketTuru(g, yolAdi(g)) || g.tur}`;
    const say = new Map<string, number>();
    for (const g of raw) say.set(anahtar(g), (say.get(anahtar(g)) || 0) + 1);
    const sira = new Map<string, number>();
    return raw
      .map((g) => {
        const k = anahtar(g);
        const coklu = (say.get(k) || 0) > 1;
        const i = (sira.get(k) || 0) + 1;
        sira.set(k, i);
        const yol = yolAdi(g);
        const temel = grupListeEtiketi(g, yol);
        const listeEtiketi = coklu ? `${temel} · #${i}` : temel;
        return { ...g, tamYol: yol, listeEtiketi };
      })
      .sort((a, b) => (a.listeEtiketi || a.ad).localeCompare(b.listeEtiketi || b.ad, 'tr'));
  }, [gruplarData]);

  const secilenGrup = useMemo(
    () => gruplar.find((g) => g.id === form.grupId),
    [gruplar, form.grupId]
  );
  const secilenGrupKonuTuru = useMemo(
    () => (secilenGrup ? grupKonuOgretimTuru(secilenGrup, secilenGrup.tamYol) : undefined),
    [secilenGrup]
  );
  const kpssUstGrupNormal = Boolean(secilenGrup?.tur === 'KPSS' && !secilenGrupKonuTuru);
  const efektifNormalKonuTuru = secilenGrupKonuTuru ?? (secilenGrup?.tur === 'KPSS' ? kpssKademeNormal : undefined);

  useEffect(() => {
    if (!secilenGrup) return;
    const t = grupKonuOgretimTuru(secilenGrup, secilenGrup.tamYol);
    if (t && kpssOgretimTuruMu(t)) setKpssKademeNormal(t);
  }, [secilenGrup?.id, secilenGrup?.tamYol]);

  const { data: konularData } = useQuery({
    queryKey: [
      'konular',
      aktifSekme,
      form.grupId,
      referansForm.grupId,
      yksKapsamNormal,
      yksKapsamReferans,
      kpssKapsamNormal,
      kpssKapsamReferans,
      kpssKademeNormal,
      kpssKademeReferans,
    ],
    queryFn: async () => {
      const gId = aktifSekme === 'referans' ? referansForm.grupId : form.grupId;
      const yks = aktifSekme === 'referans' ? yksKapsamReferans : yksKapsamNormal;
      const kpssKap = aktifSekme === 'referans' ? kpssKapsamReferans : kpssKapsamNormal;
      const kpssKademe = aktifSekme === 'referans' ? kpssKademeReferans : kpssKademeNormal;
      const params: Record<string, string> = {};
      const g = gruplar.find((x) => x.id === gId);
      const cozulen = grupKonuOgretimTuru(g, g?.tamYol);
      const konuTuru = cozulen ?? (g?.tur === 'KPSS' ? kpssKademe : undefined);
      if (konuTuru) {
        params.ogretimTuru = konuTuru;
        if (konuTuru === 'YKS' && yks !== 'HEPSI') params.yksKapsam = yks;
        if (kpssOgretimTuruMu(konuTuru) && kpssKap !== 'HEPSI') params.kpssKapsam = kpssKap;
      }
      return api.get('/sorular/konular', { params });
    },
  });
  const konular: KonuItem[] = konularData?.data?.veri || [];

  const seciliKonuNormal = useMemo(
    () => konular.find((k) => k.id === form.konuIds[0]),
    [konular, form.konuIds]
  );
  const fizikKonuSecili = useMemo(
    () => (seciliKonuNormal?.ders || '').toLowerCase().includes('fizik'),
    [seciliKonuNormal]
  );

  useEffect(() => {
    if (fizikKonuSecili && form.gorselMod === 'yok') {
      setForm((f) => ({ ...f, gorselMod: 'oto' }));
    }
  }, [fizikKonuSecili, form.konuIds, form.gorselMod]);

  /** Referans analizinden branşa uygun konu otomatik eşleştir */
  useEffect(() => {
    if (aktifSekme !== 'referans' || !referansAnalizi || referansForm.konuIds.length > 0 || konular.length === 0) return;
    const ders = referansAnalizi.dersAdi.split(',')[0].trim();
    const dersLower = ders.toLocaleLowerCase('tr-TR');
    const konuEtiketleri = (referansAnalizi.konular || []).map((k) => k.toLocaleLowerCase('tr-TR')).filter((k) => k !== 'genel' && k.length > 2);

    // 1. Önce aynı ders adındaki konuları bul (case-insensitive)
    const dersKonular = konular.filter((k) => k.ders.toLocaleLowerCase('tr-TR') === dersLower);
    if (dersKonular.length > 0) {
      // Spesifik konu anahtar kelimesi ile eşleştir
      const konuEslesen = dersKonular.find((k) =>
        konuEtiketleri.some((et) =>
          k.ad.toLocaleLowerCase('tr-TR').includes(et) || et.includes(k.ad.toLocaleLowerCase('tr-TR'))
        )
      );
      if (konuEslesen) {
        setReferansForm((p) => ({ ...p, konuIds: [konuEslesen.id] }));
        return;
      }
      setReferansForm((p) => ({ ...p, konuIds: [dersKonular[0].id] }));
      return;
    }

    // 2. Kısmi ders adı eşleşmesi (ör. "Fen Bilimleri" ↔ "Fen")
    const kısmiDers = konular.filter((k) => {
      const kDers = k.ders.toLocaleLowerCase('tr-TR');
      return kDers.includes(dersLower) || dersLower.includes(kDers);
    });
    if (kısmiDers.length > 0) {
      const konuEslesen = kısmiDers.find((k) =>
        konuEtiketleri.some((et) =>
          k.ad.toLocaleLowerCase('tr-TR').includes(et) || et.includes(k.ad.toLocaleLowerCase('tr-TR'))
        )
      );
      setReferansForm((p) => ({ ...p, konuIds: [(konuEslesen || kısmiDers[0]).id] }));
      return;
    }

    // 3. Anahtar kelime eşleşmesi (tüm konularda)
    const keywordMatch = konular.find((k) =>
      konuEtiketleri.some((et) =>
        k.ad.toLocaleLowerCase('tr-TR').includes(et) || et.includes(k.ad.toLocaleLowerCase('tr-TR'))
      )
    );
    if (keywordMatch) {
      setReferansForm((p) => ({ ...p, konuIds: [keywordMatch.id] }));
    }
  }, [aktifSekme, referansAnalizi, referansForm.konuIds, konular]);

  const secilenKonu = konular.find((k) => k.id === form.konuIds[0]);

  const sinavlarGrubaGore = useMemo(() => {
    if (!form.grupId) return sinavlar;
    return sinavlar.filter((s: { grupId?: string }) => s.grupId === form.grupId);
  }, [sinavlar, form.grupId]);

  const secilenReferansGrup = useMemo(
    () => gruplar.find((g) => g.id === referansForm.grupId),
    [gruplar, referansForm.grupId]
  );
  const secilenReferansGrupKonuTuru = useMemo(
    () => (secilenReferansGrup ? grupKonuOgretimTuru(secilenReferansGrup, secilenReferansGrup.tamYol) : undefined),
    [secilenReferansGrup]
  );
  const kpssUstGrupReferans = Boolean(secilenReferansGrup?.tur === 'KPSS' && !secilenReferansGrupKonuTuru);
  const efektifReferansKonuTuru =
    secilenReferansGrupKonuTuru ?? (secilenReferansGrup?.tur === 'KPSS' ? kpssKademeReferans : undefined);

  useEffect(() => {
    if (!secilenReferansGrup) return;
    const t = grupKonuOgretimTuru(secilenReferansGrup, secilenReferansGrup.tamYol);
    if (t && kpssOgretimTuruMu(t)) setKpssKademeReferans(t);
  }, [secilenReferansGrup?.id, secilenReferansGrup?.tamYol]);
  const referansSinavlarGrubaGore = useMemo(() => {
    if (!referansForm.grupId) return sinavlar;
    return sinavlar.filter((s: { grupId?: string }) => s.grupId === referansForm.grupId);
  }, [sinavlar, referansForm.grupId]);

  const { data: panelModelleri } = useQuery({
    queryKey: ['ai-panel-modeller'],
    queryFn: async () => {
      const r = await api.get<{
        basarili: boolean;
        veri: { modeller: (OpenRouterModelMeta & { id: string })[]; sonSenkron: string | null };
      }>('/ai/modeller');
      return r.data.veri.modeller || [];
    },
    staleTime: 60_000,
  });

  const modelSecenekleri = useMemo(() => {
    const kaynak = panelModelleri?.length ? panelModelleri : VARSAYILAN_MODEL_SECENEKLERI;
    return kaynak.map((m) => ({ ...m, model: m.id }));
  }, [panelModelleri]);

  const modelBilgileri = useMemo(() => {
    const map: Record<string, OpenRouterModelMeta & { model: string }> = { ...VARSAYILAN_MODEL_BILGILERI };
    for (const m of modelSecenekleri) map[m.id] = m;
    return map;
  }, [modelSecenekleri]);

  const tahminModel = useMemo(
    () => secilenKonu ? modelTahmin(secilenKonu.ders, form.zorluk) : null,
    [secilenKonu, form.zorluk]
  );
  const aktifModel = form.modelOverride
    ? modelBilgileri[MODEL_SLUG_GUNCELLE[form.modelOverride] || form.modelOverride]
    : tahminModel;

  const soruUretMutation = useMutation({
    mutationFn: () => {
      const gorselMod = form.gorselMod === 'oto' ? undefined : form.gorselMod;
      const ogretimTuru = efektifNormalKonuTuru || secilenKonu?.ogretimTuru || 'YKS';
      return aiApi.soruUret({
        konuId: form.konuIds[0],
        ders: secilenKonu?.ders || '',
        konu: secilenKonu?.ad || '',
        ogretimTuru,
        uniteAdi: secilenKonu?.uniteAdi || undefined,
        sayi: form.sayi,
        zorluk: form.zorluk,
        ...(form.modelOverride
          ? { modelOverride: MODEL_SLUG_GUNCELLE[form.modelOverride] || form.modelOverride }
          : {}),
        ...(gorselMod ? { gorselMod } : {}),
        ...(form.ogretmenTalimat.trim() ? { ogretmenTalimat: form.ogretmenTalimat.trim() } : {}),
      });
    },
    onSuccess: (res) => {
      const veri = res.data?.veri;
      const sorularArr = Array.isArray(veri?.sorular) ? veri.sorular : Array.isArray(veri) ? veri : [];
      setUretilmisSorular(sorularArr);
      if (veri?.kullanılanModel) setKullanılanModel(veri.kullanılanModel);
      else if (aktifModel) setKullanılanModel(aktifModel);
      const kaynakSayisi = Array.isArray(veri?.kullanilanKaynaklar) ? veri.kullanilanKaynaklar.length : 0;
      setKullanilanKaynaklar(Array.isArray(veri?.kullanilanKaynaklar) ? veri.kullanilanKaynaklar : []);
      const mesaj = `${sorularArr.length} soru üretildi!` + (kaynakSayisi > 0 ? ` 📚 ${kaynakSayisi} kaynak kullanıldı.` : '');
      toast.basarili(mesaj);
    },
    onError: (e: unknown) => {
      const ozet = axios422Ozet(e);
      if (ozet) {
        toast.hata(ozet);
        return;
      }
      if (axios.isAxiosError(e) && e.response?.data && typeof (e.response.data as { mesaj?: string }).mesaj === 'string') {
        toast.hata((e.response.data as { mesaj: string }).mesaj);
        return;
      }
      toast.hata('Soru üretimi başarısız — AI servisini veya doğrulama kurallarını kontrol edin');
    },
  });

  // Referans dosya seç
  const dosyaSec = useCallback((dosya: File) => {
    setReferansDosya(dosya);
    setReferansAnalizi(null);
    setUretilmisSorular([]);
    if (dosya.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setReferansOnizleme(e.target?.result as string);
      reader.readAsDataURL(dosya);
    } else {
      setReferansOnizleme(null);
    }
  }, []);

  // Referans analiz mutation
  const referansAnalizMutation = useMutation({
    mutationFn: async () => {
      if (referansYuklemeTipi === 'dosya') {
        if (!referansDosya) throw new Error('Dosya seçilmedi');
        const fd = new FormData();
        fd.append('dosya', referansDosya);
        const res = await api.post('/referans/analiz', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 300000,
        });
        return res.data;
      } else {
        if (!referansKaynakUrl.trim()) throw new Error('URL adresi girilmedi');
        const res = await api.post('/referans/analiz', { kaynakUrl: referansKaynakUrl.trim() }, {
          timeout: 300000,
        });
        return res.data;
      }
    },
    onSuccess: (veri) => {
      const ham = veri.veri?.analiz;
      const dosyaAdi = typeof veri.veri?.dosyaAdi === 'string' ? veri.veri.dosyaAdi : '';
      setReferansKaynakAdi(dosyaAdi);
      const analiz = referansAnaliziGuvenli(ham, dosyaAdi);
      setReferansAnalizi(analiz);
      if (!analiz) {
        toast.hata('Analiz yanıtı okunamadı', 'Dosyayı tekrar yükleyip deneyin.');
        return;
      }
      // ogretimTuru'na göre doğru grubu otomatik seç (LGS / YKS)
      const uygunGrup = analiz.ogretimTuru
        ? gruplar.find((g) => grupKonuOgretimTuru(g, g.tamYol) === analiz.ogretimTuru || g.tur === analiz.ogretimTuru)
        : undefined;
      setReferansForm((f) => ({
        ...f,
        zorluk: analiz.zorlukSeviyesi || f.zorluk,
        konuIds: [], // sıfırla — yeni analize göre otomatik eşleşecek
        grupId: uygunGrup ? uygunGrup.id : f.grupId,
        gorselMod:
          analiz.kaynakGorsel || referansGorselOnerilir(analiz)
            ? 'svg'
            : f.gorselMod === 'yok'
              ? 'yok'
              : f.gorselMod,
      }));
      if (referansGorselOnerilir(analiz)) {
        toast.basarili('Referans analiz edildi', 'Grafik/şekilli soru tespit edildi — SVG ile üretilecek.');
      } else {
        toast.basarili('Referans analiz edildi!');
      }
    },
    onError: (e: { response?: { data?: { mesaj?: string } } }) =>
      toast.hata(e?.response?.data?.mesaj || 'Analiz başarısız — dosya formatını kontrol edin'),
  });

  // Referans tabanlı soru üretimi
  const kaydetKonuIds = aktifSekme === 'normal' ? form.konuIds : referansForm.konuIds;
  const kaydetKonuId = kaydetKonuIds[0];
  const kaydetZorluk = aktifSekme === 'normal' ? form.zorluk : referansForm.zorluk;
  const kaydetSinavId = aktifSekme === 'normal' ? form.sinavId : referansForm.sinavId;
  const kaydetGrupId = aktifSekme === 'normal' ? form.grupId : referansForm.grupId;
  const eksikCozumSiralar = useMemo(() => cozumEksikSiraListesi(uretilmisSorular), [uretilmisSorular]);
  const cozumZorunluSaglandi = eksikCozumSiralar.length === 0;
  /** API üretim sonrası sorular zaten DB’ye yazılmışsa (sunucu `id` döner); tekrar toplu kayda gerek yok */
  const sorularBankayaOtomatikKaydedildi = useMemo(
    () =>
      uretilmisSorular.length > 0 &&
      uretilmisSorular.every((s) => {
        const id = (s as UretilenSoru).id;
        return typeof id === 'string' && id.trim().length > 0;
      }),
    [uretilmisSorular]
  );
  const kaydetKonuEtiketi = useMemo(() => {
    const ids = aktifSekme === 'normal' ? form.konuIds : referansForm.konuIds;
    return ids
      .map((id) => konular.find((x) => x.id === id))
      .filter(Boolean)
      .map((k) => `${k!.ders} — ${k!.ad}`)
      .join(' · ');
  }, [konular, aktifSekme, form.konuIds, referansForm.konuIds]);

  const soruBankasinaKaydetMutation = useMutation({
    mutationFn: async () => {
      if (!kaydetKonuId) {
        throw new Error('Önce ders/konu seçin (üretim formundan veya referansta "Konuya Kaydet").');
      }
      if (uretilmisSorular.length === 0) return null;
      const eksik = cozumEksikSiraListesi(uretilmisSorular);
      if (eksik.length > 0) {
        throw new Error(`Çözüm Açıklaması zorunlu. Eksik sorular: ${eksik.join(', ')}`);
      }
      const modelEtiket = kullanılanModel?.model || kullanılanModel?.ad || 'panel-ai';
      const sinavTrim = String(kaydetSinavId || '').trim();
      const kullGrupTrim = String(kaydetGrupId || '').trim();
      const kayitKonu = konular.find((x) => x.id === kaydetKonuId);
      const yksKap = aktifSekme === 'referans' ? yksKapsamReferans : yksKapsamNormal;
      const etkinGrupId =
        kullGrupTrim ||
        (!sinavTrim && kayitKonu ? bankaKaydiIcinEtkinGrupId(kayitKonu, gruplar, yksKap) || '' : '');

      const { data } = await adminApi.soruBankaToplu({
        konuIds: kaydetKonuIds,
        konuId: kaydetKonuId,
        zorluk: kaydetZorluk,
        sinavId: sinavTrim || null,
        ...(etkinGrupId ? { grupId: etkinGrupId } : {}),
        aiModeli: modelEtiket,
        sorular: uretilmisSorular.map((s) => ({
          metinHtml: buildMetinHtmlFromParts(
            uretilenSoruyuMetinHtml(s),
            '',
            plainToHtmlParagraphs(s.cozumAciklamasi || '')
          ),
          gorselUrl: s.gorselUrl || null,
          secenekler: s.secenekler,
          dogruCevap: s.dogruCevap,
          kazanim: referansForm.hedefKazanim.trim() || s.kazanim || null,
        })),
      });
      return data as {
        veri?: { kalite?: { onayDurumu?: string } };
      };
    },
    onSuccess: (yanit) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sorular'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sinavlar'] });
      queryClient.invalidateQueries({ queryKey: ['admin-gruplar'] });
      const onayBekliyor = yanit?.veri?.kalite?.onayDurumu === 'ONAY_BEKLIYOR';
      const ek =
        onayBekliyor
          ? ' Onay bekliyor; öğrenci sınavlarında görünmesi için Sorular sayfasından onaylayın.'
          : '';
      toast.basarili(
        'Soru bankasına kaydedildi',
        `${uretilmisSorular.length} soru ${kaydetKonuIds.length > 1 ? `${kaydetKonuIds.length} konuda` : `«${kaydetKonuEtiketi || 'seçili konu'}» altında`} listelenecek.${ek}`
      );
      router.push('/panel/sorular');
    },
    onError: (e: unknown) => {
      const ozet = axios422Ozet(e);
      if (ozet) {
        toast.hata(ozet);
        return;
      }
      if (axios.isAxiosError(e) && e.response?.data && typeof (e.response.data as { mesaj?: string }).mesaj === 'string') {
        toast.hata((e.response.data as { mesaj: string }).mesaj);
        return;
      }
      const msg = e instanceof Error ? e.message : 'Kayıt başarısız';
      toast.hata(msg);
    },
  });

  const referansSoruMutation = useMutation({
    mutationFn: async () => {
      if (!referansAnalizi) throw new Error('Önce referansı analiz edin');
      const gorselMod =
        referansForm.gorselMod === 'oto' && referansAnalizi && referansGorselOnerilir(referansAnalizi)
          ? 'svg'
          : referansForm.gorselMod;
      const res = await api.post('/referans/soru-uret', {
        analiz: referansAnalizi,
        sayi: referansForm.sayi,
        zorluk: referansForm.zorluk,
        gorselMod,
        konuId: referansForm.konuIds[0] || undefined,
        sinavId: referansForm.sinavId || undefined,
        grupId: referansForm.grupId || undefined,
        tamVaryasyon: referansForm.tamVaryasyon,
        uretimTarzi: referansForm.uretimTarzi,
        sikiDogrulama: referansForm.sikiDogrulama,
        kaynakAdi: referansKaynakAdi || undefined,
      }, { timeout: 600000 });
      return res.data;
    },
    onSuccess: (veri) => {
      const sorularArr = veri.veri?.sorular || [];
      setUretilmisSorular(sorularArr);
      setKullanılanModel({ model: 'referans', ad: 'Referans Tabanlı', renk: 'blue', ikon: '📎', aciklama: '' });
      toast.basarili(`${sorularArr.length} özgün soru üretildi!`);
    },
    onError: (e: unknown) => {
      const ozet = axios422Ozet(e);
      if (ozet) {
        toast.hata(ozet);
        return;
      }
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        const mesaj = (e.response?.data as { mesaj?: string })?.mesaj;
        if (status === 429) {
          toast.hata(
            mesaj || 'OpenRouter istek limiti aşıldı',
            '5 soru SVG ile birden fazla AI çağrısı gerektirir. 1–2 dakika bekleyip tekrar deneyin veya soru sayısını 2–3’e düşürün.'
          );
          return;
        }
        if (mesaj) {
          toast.hata(mesaj);
          return;
        }
      }
      toast.hata('Soru üretimi başarısız');
    },
  });

  return (
    <div className="space-y-6">
      {ogretmenKisit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="text-sm">
            <p className="text-amber-900 font-medium">
              Öğretmen modu: <b>{ogretmenBransEtiketi(ogretmenKisit.brans, ogretmenKisit.branslar)}</b> · <b>{ogretmenKisit.ogretimTuru}</b>
            </p>
            <p className="text-amber-800/80 text-xs mt-0.5">
              İzinli dersler: <b>{ogretmenDersEtiketi}</b>. Bu derslerin konularında soru üretebilir ve bankayı görebilirsiniz
              {(ogretmenKisit.branslar?.includes('Matematik') || ogretmenKisit.brans === 'Matematik') ? ' (Matematik öğretmenleri Geometri dahil)' : ''}.
            </p>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Soru Üretimi</h1>
          <p className="text-gray-500 mt-1">
            Ai üzerinden sınav formatında soru taslakları üretin
          </p>
        </div>
        {/* Sekme Seçici */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-1 gap-1">
          <button
            onClick={() => setAktifSekme('normal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${aktifSekme === 'normal' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Sparkles className="w-4 h-4" /> Serbest Üretim
          </button>
          <button
            onClick={() => setAktifSekme('referans')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${aktifSekme === 'referans' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Upload className="w-4 h-4" /> Referans Tabanlı
          </button>
        </div>
      </div>

   
      {/* ═══════════════════════ REFERANS SEKMESİ ══════════════════════════ */}
      {aktifSekme === 'referans' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sol: Dosya yükleme + analiz */}
          <div className="space-y-4">
            <div className="card">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Upload className="w-5 h-5 text-indigo-600" />
                Referans Materyali Belirle
              </h2>

              {/* Yükleme Tipi Seçici */}
              <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
                <button
                  onClick={() => { setReferansYuklemeTipi('dosya'); setReferansAnalizi(null); setUretilmisSorular([]); }}
                  className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition ${referansYuklemeTipi === 'dosya' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Dosya Yükle
                </button>
                <button
                  onClick={() => { setReferansYuklemeTipi('url'); setReferansAnalizi(null); setUretilmisSorular([]); }}
                  className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition ${referansYuklemeTipi === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  URL ile Besle
                </button>
              </div>

              {referansYuklemeTipi === 'dosya' ? (
                <>
                  <p className="text-xs text-gray-500 mb-4">
                    <strong>PDF:</strong> Tüm sayfalar okunur; kitapçıktaki sorular tek tek tespit edilir ve
                    her biri için <strong>benzersiz yeni varyasyon</strong> üretilir (orijinal metin kopyalanmaz).
                    <span className="block mt-1">Görsel dosyada tek sayfa analizi yapılır.</span>
                  </p>

                  {/* Drag-drop alan */}
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                      ${referansDosya ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'}`}
                    onClick={() => dosyaInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f) dosyaSec(f);
                    }}
                  >
                    <input
                      ref={dosyaInputRef}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) dosyaSec(f); }}
                    />
                    {referansDosya ? (
                      <div className="flex items-center justify-center gap-3">
                        {referansDosya.type.startsWith('image/') ? (
                          <Image className="w-8 h-8 text-indigo-500" />
                        ) : (
                          <FileText className="w-8 h-8 text-indigo-500" />
                        )}
                        <div className="text-left">
                          <p className="text-sm font-medium text-indigo-800">{referansDosya.name}</p>
                          <p className="text-xs text-indigo-500">{(referansDosya.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setReferansDosya(null); setReferansOnizleme(null); setReferansAnalizi(null); }}
                          className="ml-auto p-1 rounded hover:bg-indigo-100 text-indigo-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 font-medium">PDF veya görsel sürükle / tıkla</p>
                        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, PDF — maks. 30 MB</p>
                      </>
                    )}
                  </div>

                  {/* Görsel önizleme */}
                  {referansOnizleme && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 max-h-64">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={referansOnizleme} alt="Referans önizleme" className="w-full object-contain max-h-64" />
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    <strong>Eğitim siteleri:</strong> OGM Materyal, EBA veya soru yayın sitelerinden <strong>içinde soruların olduğu nihai test linkini</strong> buraya yapıştırın. Sınıf/Ders arama sayfaları soru içermez.
                  </p>
                  
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4"/> OGM Materyal'den Test Linki Alma
                    </p>
                    <p className="text-xs text-indigo-700">
                      OGM Soru Bankasını yeni sekmede açın, bir test oluşturun ve o testin tarayıcıdaki linkini kopyalayıp aşağıdaki kutuya yapıştırın.
                    </p>
                    <a
                      href="https://ogmmateryal.eba.gov.tr/soru-bankasi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors text-center inline-block"
                    >
                      Yeni Sekmede OGM'yi Aç ve Test Oluştur
                    </a>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-gray-600">Referans URL Adresi</span>
                    <input
                      type="url"
                      value={referansKaynakUrl}
                      onChange={(e) => setReferansKaynakUrl(e.target.value)}
                      placeholder="Örn: https://ogmmateryal.eba.gov.tr/soru-bankasi/test?id=..."
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm bg-white"
                    />
                  </label>

                  <label className="block mt-4">
                    <span className="text-xs font-semibold text-gray-600">Kazanım Etiketi (Opsiyonel)</span>
                    <input
                      type="text"
                      value={referansForm.hedefKazanim}
                      onChange={(e) => setReferansForm({ ...referansForm, hedefKazanim: e.target.value })}
                      placeholder="Örn: 12.1.1. Doğa olaylarının etkilerini açıklar."
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm bg-white"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Bu kutuya girdiğiniz metin, oluşturulan <strong>tüm</strong> soruların kazanım alanına etiket olarak yazılacaktır.</p>
                  </label>
                </div>
              )}

              <button
                onClick={() => referansAnalizMutation.mutate()}
                disabled={
                  referansAnalizMutation.isPending ||
                  (referansYuklemeTipi === 'dosya' ? !referansDosya : !referansKaynakUrl.trim())
                }
                className="w-full btn-primary mt-4 flex items-center justify-center gap-2"
              >
                {referansAnalizMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Referans URL taranıp analiz ediliyor (birkaç dakika sürebilir)...</>
                ) : (
                  <><Brain className="w-4 h-4" /> Referansı Analiz Et</>
                )}
              </button>
            </div>

            {/* Analiz sonucu */}
            {referansAnalizi && (
              <div className="card border-2 border-indigo-200">
                <h3 className="font-semibold text-indigo-900 flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4 text-green-500" /> Analiz Tamamlandı
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-24 shrink-0">Ders:</span>
                    <select
                      className="input input-sm max-w-xs"
                      value={referansAnalizi.dersAdi.split(',')[0].trim()}
                      onChange={(e) => {
                        const yeniDers = e.target.value;
                        setReferansAnalizi((a) => (a ? { ...a, dersAdi: yeniDers } : a));
                        setReferansForm((f) => ({ ...f, konuIds: [] }));
                      }}
                    >
                      {REFERANS_DERS_SECENEKLERI.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {referansKaynakAdi && referansKaynakAdindanDersTahmin(referansKaynakAdi) && (
                      <span className="text-xs text-indigo-600">Dosya adından düzeltildi</span>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-24 shrink-0 mt-0.5">Konular:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(referansAnalizi.konular ?? []).map((k) => (
                        <span key={k} className="badge bg-indigo-100 text-indigo-700 text-xs flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />{k}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-24 shrink-0">Sınav türü:</span>
                    <span className="badge bg-gray-100 text-gray-700 text-xs">{referansAnalizi.ogretimTuru}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-24 shrink-0">Zorluk:</span>
                    <span className="badge bg-yellow-100 text-yellow-700 text-xs">{referansAnalizi.zorlukSeviyesi}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-24 shrink-0 mt-0.5">Soru tipleri:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(referansAnalizi.soruTipleri ?? []).map((t) => (
                        <span key={t} className="badge bg-green-100 text-green-700 text-xs">{t}</span>
                      ))}
                    </div>
                  </div>
                  {(referansAnalizi.sayfa_sayisi != null || referansAnalizi.tespit_edilen_soru_sayisi != null) && (
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600 pt-1 border-t border-indigo-100 mt-2">
                      {referansAnalizi.sayfa_sayisi != null && (
                        <span><strong>Sayfa:</strong> {referansAnalizi.sayfa_sayisi}</span>
                      )}
                      {referansAnalizi.tespit_edilen_soru_sayisi != null && (
                        <span><strong>Tespit edilen soru:</strong> {referansAnalizi.tespit_edilen_soru_sayisi}</span>
                      )}
                      {referansAnalizi.tam_metin_okundu === false && (
                        <span className="text-amber-700">Uzun PDF: metin boyut sınırında kesildi; yine de sayfa grupları taranır.</span>
                      )}
                    </div>
                  )}
                  {/* Otomatik eşleştirilen konu */}
                  {(() => {
                    const seciliRKonu = konular.find((k) => k.id === referansForm.konuIds[0]);
                    const seciliRGrup = gruplar.find((g) => g.id === referansForm.grupId);
                    if (seciliRKonu) {
                      return (
                        <div className="flex items-center gap-2 pt-2 border-t border-indigo-100 mt-2">
                          <span className="text-gray-500 w-24 shrink-0">Eşleştirme:</span>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {seciliRGrup && (
                              <span className="badge bg-blue-100 text-blue-700 text-xs">{seciliRGrup.listeEtiketi ?? seciliRGrup.ad}</span>
                            )}
                            <span className="badge bg-emerald-100 text-emerald-700 text-xs flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />{seciliRKonu.ders} — {seciliRKonu.ad}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2 pt-2 border-t border-indigo-100 mt-2">
                        <span className="text-gray-500 w-24 shrink-0">Eşleştirme:</span>
                        <span className="text-xs text-amber-600">Veritabanında uygun konu bulunamadı — aşağıdan manuel seçebilirsiniz.</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Üretim parametreleri */}
                <div className="mt-4 pt-4 border-t border-indigo-100 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Üretim Ayarları</h4>
                  <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-gray-300"
                      checked={referansForm.tamVaryasyon}
                      onChange={(e) => setReferansForm({ ...referansForm, tamVaryasyon: e.target.checked })}
                    />
                    <span>
                      <strong>PDF tam varyasyon:</strong> Tespit edilen her soru için birer özgün soru üret
                      <span className="block text-xs text-gray-500 font-normal mt-0.5">
                        Kapalıysa aşağıdaki &quot;Soru sayısı&quot; kadar genel üretim yapılır (görsel referansta kullanın).
                      </span>
                    </span>
                  </label>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-500" /> Grup <span className="text-gray-400 font-normal">(opsiyonel — banka kaydı)</span>
                    </label>
                    <select
                      value={referansForm.grupId}
                      onChange={(e) => {
                        const grupId = e.target.value;
                        setYksKapsamReferans('HEPSI');
                        setKpssKapsamReferans('HEPSI');
                        setReferansForm((prev) => ({
                          ...prev,
                          grupId,
                          konuIds: [],
                          sinavId: '',
                        }));
                      }}
                      className="input-field py-2 text-sm"
                    >
                      <option value="">Tüm gruplar</option>
                      {gruplar.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.listeEtiketi ?? `${g.ad} (${g.tur})`}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Grup, soruların hangi öğrenci havuzuna kaydedileceğini belirler. Üretim için zorunlu değildir.
                    </p>
                  </div>
                  {kpssUstGrupReferans && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">KPSS Kademesi</label>
                      <select
                        value={kpssKademeReferans}
                        onChange={(e) => {
                          setKpssKademeReferans(e.target.value as OgretimTuruKpss);
                          setReferansForm((p) => ({ ...p, konuIds: [] }));
                        }}
                        className="input-field py-2 text-sm"
                      >
                        {KPSS_KADEME_SECENEKLERI.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {efektifReferansKonuTuru === 'YKS' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">YKS müfredat</label>
                      <select
                        value={yksKapsamReferans}
                        onChange={(e) => {
                          setYksKapsamReferans(e.target.value as 'HEPSI' | 'TYT' | 'AYT');
                          setReferansForm((p) => ({ ...p, konuIds: [] }));
                        }}
                        className="input-field py-2 text-sm"
                      >
                        <option value="HEPSI">TYT + AYT (tümü)</option>
                        <option value="TYT">TYT</option>
                        <option value="AYT">AYT</option>
                      </select>
                    </div>
                  )}
                  {kpssOgretimTuruMu(efektifReferansKonuTuru) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        KPSS müfredat ({kpssOgretimTuruEtiket(efektifReferansKonuTuru)})
                      </label>
                      <select
                        value={kpssKapsamReferans}
                        onChange={(e) => {
                          setKpssKapsamReferans(e.target.value as 'HEPSI' | 'GY' | 'GK');
                          setReferansForm((p) => ({ ...p, konuIds: [] }));
                        }}
                        className="input-field py-2 text-sm"
                      >
                        <option value="HEPSI">GY + GK (tümü)</option>
                        <option value="GY">Genel Yetenek</option>
                        <option value="GK">Genel Kültür</option>
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Soru sayısı
                      </label>
                      <select
                        value={referansForm.sayi}
                        onChange={(e) => setReferansForm({ ...referansForm, sayi: parseInt(e.target.value) || 5 })}
                        className="input-field py-2 text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map((n) => (
                          <option key={n} value={n}>{n} soru</option>
                        ))}
                      </select>
                      {referansForm.tamVaryasyon && (referansAnalizi.tespit_edilen_soru_sayisi ?? 0) > 0 && (
                        <p className="text-xs text-indigo-600 mt-1">
                          PDF'de {referansAnalizi.tespit_edilen_soru_sayisi} soru tespit edildi — tam varyasyonda her biri için özgün soru üretilir.
                          Bu sayıyı değiştirmek için &quot;PDF tam varyasyon&quot; seçeneğini kapatabilirsiniz.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Zorluk</label>
                      <select
                        value={referansForm.zorluk}
                        onChange={(e) => setReferansForm({ ...referansForm, zorluk: e.target.value })}
                        className="input-field py-2 text-sm"
                      >
                        <option value="KOLAY">Kolay</option>
                        <option value="ORTA">Orta</option>
                        <option value="ZOR">Zor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Görsel</label>
                      <select
                        value={referansForm.gorselMod}
                        onChange={(e) =>
                          setReferansForm({ ...referansForm, gorselMod: e.target.value as 'oto' | 'svg' | 'yok' })
                        }
                        className="input-field py-2 text-sm"
                      >
                        <option value="oto">📐 Otomatik (grafik/şekil varsa SVG)</option>
                        <option value="svg">📐 Her zaman SVG şekil</option>
                        <option value="yok">📝 Sadece metin</option>
                      </select>
                      {referansGorselOnerilir(referansAnalizi) && referansForm.gorselMod !== 'yok' ? (
                        <p className="text-xs text-indigo-600 mt-1">Referansta grafik/şekil var — üretimde SVG kullanılacak.</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Konuya Kaydet <span className="text-gray-400 font-normal">(birden fazla seçilebilir)</span>
                      </label>
                      <KonuCokluSecici
                        konular={konular}
                        value={referansForm.konuIds}
                        onChange={(konuIds) => setReferansForm({ ...referansForm, konuIds })}
                        placeholder="Konu seçin — bankada tümünde görünür"
                      />
                      {konular.length === 0 && ogretmenKisit && (
                        <p className="text-xs text-amber-700 mt-1">
                          Branşlarınıza ({ogretmenBransEtiketi(ogretmenKisit?.brans, ogretmenKisit?.branslar)}) kayıtlı konu bulunamadı.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Üretim stili</label>
                      <select
                        value={referansForm.uretimTarzi}
                        onChange={(e) => setReferansForm({ ...referansForm, uretimTarzi: e.target.value as 'benzer' | 'ozgun' })}
                        className="input-field py-2 text-sm"
                      >
                        <option value="benzer">Benzer (aynı kurgu, farklı sayılar)</option>
                        <option value="ozgun">Özgün (farklı kurgu)</option>
                      </select>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-700 mt-6">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-gray-300"
                        checked={referansForm.sikiDogrulama}
                        onChange={(e) => setReferansForm({ ...referansForm, sikiDogrulama: e.target.checked })}
                      />
                      <span>
                        <strong>Sıkı doğrulama:</strong> Matematik/Fen sorularında bağımsız çözdürerek doğru şıkkı teyit et
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sınava Ekle <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                    <select
                      value={referansForm.sinavId}
                      onChange={(e) => setReferansForm({ ...referansForm, sinavId: e.target.value })}
                      className="input-field py-2 text-sm"
                    >
                      <option value="">Grup havuzu / genel banka</option>
                      {referansSinavlarGrubaGore.map((s: { id: string; baslik: string }) => (
                        <option key={s.id} value={s.id}>{s.baslik}</option>
                      ))}
                    </select>
                    {referansForm.grupId && !referansForm.sinavId && (
                      <p className="text-xs text-indigo-600 mt-1">
                        Üretim sırasında konuya kayıt seçiliyse sorular bu gruba ait havuz sınavına yazılır.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => referansSoruMutation.mutate()}
                    disabled={referansSoruMutation.isPending}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                  >
                    {referansSoruMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Özgün sorular üretiliyor...</>
                    ) : (
                      <><ChevronRight className="w-4 h-4" /> {referansForm.tamVaryasyon && (referansAnalizi.tespit_edilen_soru_sayisi ?? 0) > 0 ? referansAnalizi.tespit_edilen_soru_sayisi : referansForm.sayi} Özgün Soru Üret</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sağ: Üretilen sorular önizleme (paylaşılan bileşen aşağıda) */}
          <div className="card flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Üretilen Özgün Sorular</h2>
              {uretilmisSorular.length > 0 && (
                <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {uretilmisSorular.length} soru
                </span>
              )}
            </div>
            <SoruBankasiKayitCagrisi
              uretilmisSayisi={uretilmisSorular.length}
              konuEtiketi={kaydetKonuEtiketi}
              konuSecili={kaydetKonuIds.length > 0}
              kayitPending={soruBankasinaKaydetMutation.isPending}
              cozumZorunluSaglandi={cozumZorunluSaglandi}
              eksikCozumSiralar={eksikCozumSiralar}
              otomatikBankaKaydi={sorularBankayaOtomatikKaydedildi}
              onKaydet={() => soruBankasinaKaydetMutation.mutate()}
            />
            {uretilmisSorular.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 min-h-64 text-gray-300">
                <BookOpen className="w-12 h-12 mb-3" />
                <p className="text-sm">Referansı analiz edip soru üretin</p>
              </div>
            ) : (
              <SoruOnizleme sorular={uretilmisSorular} acikCozumIdx={acikCozumIdx} setAcikCozumIdx={setAcikCozumIdx} />
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════ NORMAL SEKME ════════════════════════════ */}
      {aktifSekme === 'normal' && <>
    
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Soru üretme formu */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-violet-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Üretim Parametreleri</h2>
            </div>

            {/* Grup seçimi — konu öğretim türü + sınav listesi ile hizalanır */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Grup <span className="text-gray-400 font-normal">(opsiyonel)</span>
              </label>
              <select
                value={form.grupId}
                onChange={(e) => {
                  const grupId = e.target.value;
                  setYksKapsamNormal('HEPSI');
                  setKpssKapsamNormal('HEPSI');
                  setForm((prev) => ({
                    ...prev,
                    grupId,
                    konuIds: [],
                    sinavId: '',
                  }));
                }}
                className="input-field"
              >
                <option value="">Tüm gruplar</option>
                {gruplar.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.listeEtiketi ?? `${g.ad} (${g.tur})`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Grup seçildiğinde yalnızca bu öğretim türündeki konular ve o grubun sınavları listelenir.
                «Tüm gruplar» bıraksanız bile, soru kaydında seçtiğiniz konunun öğretim türüne uygun grup havuzu otomatik
                kullanılır (aynı Tür’de tek grup varsa doğrudan o). Yalnızca ilgili türde hiç grubunuz yoksa sorular Genel Banka’ya düşer.
              </p>
            </div>

            {kpssUstGrupNormal && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KPSS Kademesi</label>
                <select
                  value={kpssKademeNormal}
                  onChange={(e) => {
                    setKpssKademeNormal(e.target.value as OgretimTuruKpss);
                    setForm((f) => ({ ...f, konuIds: [] }));
                  }}
                  className="input-field"
                >
                  {KPSS_KADEME_SECENEKLERI.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Üst KPSS grubu seçildi — müfredat için kademe belirleyin (Lisans, Önlisans veya Ortaöğretim).
                </p>
              </div>
            )}

            {efektifNormalKonuTuru === 'YKS' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">YKS müfredat</label>
                <select
                  value={yksKapsamNormal}
                  onChange={(e) => {
                    setYksKapsamNormal(e.target.value as 'HEPSI' | 'TYT' | 'AYT');
                    setForm((f) => ({ ...f, konuIds: [] }));
                  }}
                  className="input-field"
                >
                  <option value="HEPSI">TYT + AYT (tümü)</option>
                  <option value="TYT">TYT</option>
                  <option value="AYT">AYT</option>
                </select>
              </div>
            )}

            {kpssOgretimTuruMu(efektifNormalKonuTuru) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KPSS müfredat ({kpssOgretimTuruEtiket(efektifNormalKonuTuru)})
                </label>
                <select
                  value={kpssKapsamNormal}
                  onChange={(e) => {
                    setKpssKapsamNormal(e.target.value as 'HEPSI' | 'GY' | 'GK');
                    setForm((f) => ({ ...f, konuIds: [] }));
                  }}
                  className="input-field"
                >
                  <option value="HEPSI">Genel Yetenek + Genel Kültür (tümü)</option>
                  <option value="GY">Genel Yetenek (Türkçe, Matematik, Geometri)</option>
                  <option value="GK">Genel Kültür (Tarih, Coğrafya, Vatandaşlık, Güncel)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  ÖSYM KPSS Tablo-1 dağılımına uygun konu listesi (Türkçe 30, Matematik 30, Tarih 27, Coğrafya 18, Vatandaşlık 9, Güncel 6).
                </p>
              </div>
            )}

            {/* Konu Seçimi — çoklu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ders / Konu * <span className="text-gray-400 font-normal">(birden fazla seçilebilir)</span>
              </label>
              <KonuCokluSecici
                konular={konular}
                value={form.konuIds}
                onChange={(konuIds) => setForm({ ...form, konuIds })}
                placeholder="Konu seçin — ilk seçilen ana konu (AI üretimi)"
              />
              {form.grupId && !efektifNormalKonuTuru && (
                <p className="text-xs text-amber-600 mt-1">
                  Bu üst grup için doğrudan konu filtresi uygulanmaz. Alt grup seçin (ör. KPSS › Lisans) veya
                  üst KPSS grubunda kademe seçin.
                </p>
              )}
              {form.grupId && efektifNormalKonuTuru && konular.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Bu grup için konu bulunamadı. KPSS gruplarında müfredat yüklenmemiş olabilir — yöneticiye
                  «kpss-konulari-yukle» scriptini çalıştırmasını söyleyin veya &quot;Tüm gruplar&quot; deneyin.
                </p>
              )}
              {fizikKonuSecili ? (
                <p className="text-xs text-indigo-700 mt-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                  Fizik seçildi: ÖSYM tarzı <strong>şekilli soru</strong> (devre, kuvvet diyagramı, basınç/taşırma, grafik) otomatik üretilir.
                  Ayrıntılı talimat yazın; görsel modda «Otomatik» veya «SVG Şekil» kullanın.
                </p>
              ) : null}
            </div>

            {/* Soru sayısı + zorluk + model */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Soru Sayısı</label>
                <input
                  type="number"
                  value={form.sayi}
                  onChange={(e) => setForm({ ...form, sayi: parseInt(e.target.value) || 1 })}
                  className="input-field"
                  min="1" max="20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zorluk</label>
                <select
                  value={form.zorluk}
                  onChange={(e) => setForm({ ...form, zorluk: e.target.value })}
                  className="input-field"
                >
                  <option value="KOLAY">Kolay</option>
                  <option value="ORTA">Orta</option>
                  <option value="ZOR">Zor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Modeli
                {aktifModel && !form.modelOverride && (
                  <span className="text-gray-400 font-normal ml-1">(önerilen: {aktifModel.ad})</span>
                )}
              </label>
              <select
                value={form.modelOverride}
                onChange={(e) => setForm({ ...form, modelOverride: e.target.value })}
                className="input-field"
              >
                <option value="">Otomatik (derse göre)</option>
                {modelSecenekleri.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.ikon} {m.ad} — {m.aciklama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Görsel Modu</label>
              <select
                value={form.gorselMod}
                onChange={(e) => setForm({ ...form, gorselMod: e.target.value as typeof form.gorselMod })}
                className="input-field"
              >
                <option value="oto">Otomatik (konuya göre SVG)</option>
                <option value="svg">SVG Şekil / Grafik (zorunlu)</option>
                <option value="yok">Görsel yok (yalnızca metin)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Fizik, geometri, fen, coğrafya ve grafik konularında «Otomatik» veya «SVG» önerilir.
                Şekilli sorularda kalite kontrolü ve Gemini Pro SVG modeli devreye girer.
              </p>
            </div>

            {/* Sınava Ekle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sınava Ekle <span className="text-gray-400 font-normal">(opsiyonel)</span>
              </label>
              <select
                value={form.sinavId}
                onChange={(e) => setForm({ ...form, sinavId: e.target.value })}
                className="input-field"
              >
                <option value="">Sadece soru bankasına ekle</option>
                {sinavlarGrubaGore.map((s: { id: string; baslik: string }) => (
                  <option key={s.id} value={s.id}>{s.baslik}</option>
                ))}
              </select>
              {form.grupId && !form.sinavId && (
                <p className="text-xs text-indigo-600 mt-1">
                  Seçili gruba ait «Soru Bankası (Grup)» havuzuna kaydedilir (ilk kayıtta otomatik oluşur).
                </p>
              )}
            </div>

            {/* Öğretmen talimatı */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Öğretmen Talimatı <span className="text-gray-400 font-normal">(opsiyonel)</span>
              </label>
              <textarea
                value={form.ogretmenTalimat}
                onChange={(e) => setForm({ ...form, ogretmenTalimat: e.target.value })}
                placeholder="Örn: ÖSYM/TYT tarzı ikinci dereceden denklem sorusu; parabol grafiği svg ile verilsin, tepe noktası ve kollar net olsun. Kökler rasyonel, diskriminant pozitif. Şıklar tipik işaret/kök karışıklığından gelsin; çözüm adım adım yazılsın."
                className="input-field min-h-[120px]"
                maxLength={OGRETMEN_TALIMAT_MAX}
              />
              <p className="text-xs text-gray-400 mt-1 flex justify-between gap-2">
                <span>Bu metin modele <strong>zorunlu kısıt</strong> olarak eklenir; görsel ve şık kuralları burada net yazın.</span>
                <span className="shrink-0 tabular-nums">{form.ogretmenTalimat.length}/{OGRETMEN_TALIMAT_MAX}</span>
              </p>
            </div>

            <button
              onClick={() => soruUretMutation.mutate()}
              disabled={soruUretMutation.isPending || form.konuIds.length === 0}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
              {soruUretMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> AI Soru Üretiyor...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> {form.sayi} Soru Üret</>
              )}
            </button>
          </div>

          {/* Üretilen sorular önizleme */}
          <div className="card flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Üretilen Sorular</h2>
              <div className="flex items-center gap-2">
                {kullanılanModel && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${renkBadge[kullanılanModel.renk]}`}>
                    {kullanılanModel.ikon} {kullanılanModel.ad}
                  </span>
                )}
                {kullanilanKaynaklar.length > 0 && (
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1"
                    title={kullanilanKaynaklar.map((k) => `${k.dokumanBaslik} (${(k.benzerlik * 100).toFixed(0)}%)`).join('\n')}
                  >
                    📚 {kullanilanKaynaklar.length} kaynak
                  </span>
                )}
                {uretilmisSorular.length > 0 && (
                  <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                    <Check className="w-3 h-3" /> {uretilmisSorular.length} soru
                  </span>
                )}
              </div>
            </div>

            <SoruBankasiKayitCagrisi
              uretilmisSayisi={uretilmisSorular.length}
              konuEtiketi={kaydetKonuEtiketi}
              konuSecili={kaydetKonuIds.length > 0}
              kayitPending={soruBankasinaKaydetMutation.isPending}
              cozumZorunluSaglandi={cozumZorunluSaglandi}
              eksikCozumSiralar={eksikCozumSiralar}
              otomatikBankaKaydi={sorularBankayaOtomatikKaydedildi}
              onKaydet={() => soruBankasinaKaydetMutation.mutate()}
            />

            {uretilmisSorular.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 min-h-48 text-gray-300">
                <BookOpen className="w-12 h-12 mb-3" />
                <p className="text-sm">Üretilen sorular burada görünür</p>
                <p className="text-xs mt-1 text-gray-200">Konu seçip &ldquo;Soru Üret&rdquo; butonuna tıklayın</p>
              </div>
            ) : (
              <SoruOnizleme sorular={uretilmisSorular} acikCozumIdx={acikCozumIdx} setAcikCozumIdx={setAcikCozumIdx} />
            )}
          </div>
        </div>
      </>}


    </div>
  );
}

/** /panel/sorular ile aynı kayıt: konu (ders grubu + konu adı) + opsiyonel sınav */
function SoruBankasiKayitCagrisi({
  uretilmisSayisi,
  konuEtiketi,
  konuSecili,
  kayitPending,
  cozumZorunluSaglandi,
  eksikCozumSiralar,
  otomatikBankaKaydi,
  onKaydet,
}: {
  uretilmisSayisi: number;
  konuEtiketi: string;
  konuSecili: boolean;
  kayitPending: boolean;
  cozumZorunluSaglandi: boolean;
  eksikCozumSiralar: number[];
  /** Sunucu üretim sırasında soruları DB’ye yazdıysa (API `id` döndü) */
  otomatikBankaKaydi: boolean;
  onKaydet: () => void;
}) {
  if (uretilmisSayisi === 0) return null;
  const manuelKayitEngeli = !konuSecili || !cozumZorunluSaglandi;
  return (
    <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-600 flex-1 min-w-[12rem]">
          <span className="font-medium text-gray-800">Soru bankasına kayıt:</span>{' '}
          {konuSecili && konuEtiketi ? (
            <>
              <span className="text-gray-500">Konular:</span>{' '}
              <span className="text-indigo-700 font-medium">{konuEtiketi}</span>
              {otomatikBankaKaydi && (
                <span className="text-emerald-700"> — Üretimle birlikte sunucuda kaydedildi.</span>
              )}
            </>
          ) : (
            <span className="text-amber-700">
              Üretim formundan konu seçin (referansta &quot;Konuya Kaydet&quot; alanı).
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onKaydet}
          disabled={otomatikBankaKaydi || kayitPending || manuelKayitEngeli}
          className={
            otomatikBankaKaydi
              ? 'flex items-center gap-2 text-sm py-2 px-4 shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-medium cursor-default'
              : 'btn-primary flex items-center gap-2 text-sm py-2 px-4 shrink-0 disabled:opacity-50'
          }
        >
          {kayitPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : otomatikBankaKaydi ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {otomatikBankaKaydi ? 'Kaydedildi' : 'Soru bankasına kaydet'}
        </button>
      </div>

      {!cozumZorunluSaglandi && !otomatikBankaKaydi && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="font-semibold">Çözüm Açıklaması zorunlu.</span>{' '}
          Eksik sorular: <span className="font-mono">{eksikCozumSiralar.join(', ')}</span>
        </div>
      )}
    </div>
  );
}

// ── Paylaşılan soru önizleme bileşeni ───────────────────────────
function SoruOnizleme({
  sorular,
  acikCozumIdx,
  setAcikCozumIdx,
}: {
  sorular: UretilenSoru[];
  acikCozumIdx: number | null;
  setAcikCozumIdx: (i: number | null) => void;
}) {
  return (
    <div className="space-y-4 overflow-y-auto max-h-[700px] pr-1">
      {sorular.map((soru, i) => {
        const metinBirlesik = uretilenSoruyuMetinHtml(soru);
        return (
          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span className="text-xs text-gray-500 flex-1">
                {soru.svgGorsel || metinBirlesik.includes('<svg') ? '📐 SVG' : soru.gorselUrl ? '🎨 Görsel' : '📝 Metin'}
              </span>
            </div>

            <div className="p-4 bg-white">
              <SoruHtmlMath
                html={metinBirlesik}
                className="text-sm text-gray-800 leading-relaxed mb-3 [&_.soru-svg-gorsel]:my-3 [&_.soru-svg-gorsel]:flex [&_.soru-svg-gorsel]:justify-center [&_.soru-svg-gorsel]:bg-gray-50 [&_.soru-svg-gorsel]:rounded-lg [&_.soru-svg-gorsel]:p-3 [&_.soru-svg-gorsel]:border [&_.soru-svg-gorsel]:border-gray-100 [&_svg]:max-w-full [&_svg]:h-auto"
              />
              {soru.svgGorsel && !metinBirlesik.includes('<svg') && (
                <div className="my-3 flex justify-center bg-gray-50 rounded-lg p-3 border border-gray-100"
                  dangerouslySetInnerHTML={{ __html: soru.svgGorsel }} />
              )}
              {soru.gorselUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={soru.gorselUrl} alt="" className="my-3 max-w-full max-h-56 rounded-lg border mx-auto block" />
              )}
              <div className="space-y-1.5 mt-3">
                {['A', 'B', 'C', 'D', 'E'].map((sik) => {
                  const m = (soru.secenekler as Record<string, string>)?.[sik];
                  if (!m) return null;
                  const dogru = sik === soru.dogruCevap;
                  return (
                    <div
                      key={sik}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg text-sm ${dogru ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-transparent'
                        }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dogru ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}
                      >
                        {sik}
                      </span>
                      <SoruHtmlMath
                        html={duzMetinHtmlSar(m)}
                        className={`flex-1 min-w-0 ${dogru ? 'text-green-800 font-medium' : 'text-gray-700'}`}
                      />
                    </div>
                  );
                })}
              </div>
              {soru.kazanim && (
                <p className="text-xs text-indigo-600 mt-3 bg-indigo-50 rounded p-2 border border-indigo-100">📚 {soru.kazanim}</p>
              )}
            </div>

            {soru.cozumAciklamasi && (
              <button
                onClick={() => setAcikCozumIdx(acikCozumIdx === i ? null : i)}
                className="w-full flex items-center justify-between px-3.5 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 hover:bg-gray-100"
              >
                <span>💡 Çözüm Açıklaması</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${acikCozumIdx === i ? 'rotate-180' : ''}`} />
              </button>
            )}
            {acikCozumIdx === i && soru.cozumAciklamasi && (
              <div className="px-3.5 py-3 bg-yellow-50 border-t border-yellow-100 text-xs text-yellow-800 leading-relaxed space-y-2">
                <p className="font-semibold text-gray-700">
                  Doğru şık: <span className="tabular-nums font-bold text-gray-900">{soru.dogruCevap}</span>
                </p>
                <SoruHtmlMath html={plainToHtmlParagraphs(soru.cozumAciklamasi)} className="text-yellow-900" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
