'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  Users,
  BookOpen,
  CheckCircle,
  Activity,
  Plus,
  Loader2,
  Brain,
  FileText,
  BarChart3,
  Settings,
  Megaphone,
  ArrowUpRight,
  ChevronRight,
  LayoutGrid,
  Calendar,
  Trophy,
  Clock,
  Target,
  TrendingUp,
  PieChart,
  Globe,
  RefreshCw,
  ExternalLink,
  Bell,
  Send,
  Bot,
  User,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from '@/store/toast.store';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isKpssMode } from '@/lib/platform';


const hizliErisim = [
  {
    href: '/panel/ai',
    baslik: 'AI soru üretimi',
    aciklama: 'Otomatik soru ve çözüm',
    ikon: Brain,
    vurgu: 'from-violet-500 to-fuchsia-500 shadow-violet-500/30',
  },
  {
    href: '/panel/sinavlar/yeni',
    baslik: 'Yeni sınav',
    aciklama: 'Oluştur ve yayınla',
    ikon: Plus,
    vurgu: 'from-sky-500 to-blue-600 shadow-sky-500/25',
  },
  {
    href: '/panel/sorular',
    baslik: 'Soru bankası',
    aciklama: 'Düzenle ve ara',
    ikon: FileText,
    vurgu: 'from-cyan-500 to-teal-500 shadow-cyan-500/20',
  },
  {
    href: '/panel/sinavlar',
    baslik: 'Sınav yönetimi',
    aciklama: 'Listele ve düzenle',
    ikon: BookOpen,
    vurgu: 'from-amber-500 to-orange-500 shadow-amber-500/25',
  },
  {
    href: '/panel/kullanicilar',
    baslik: 'Kullanıcılar',
    aciklama: 'Öğrenci ve roller',
    ikon: Users,
    vurgu: 'from-slate-600 to-slate-800 shadow-slate-500/25',
  },
  {
    href: '/panel/analitik',
    baslik: 'Analitik',
    aciklama: 'Detaylı raporlar',
    ikon: BarChart3,
    vurgu: 'from-emerald-500 to-green-600 shadow-emerald-500/25',
  },
  {
    href: '/panel/site-yonetimi',
    baslik: 'Site yönetimi',
    aciklama: 'Marka ve içerik',
    ikon: Settings,
    vurgu: 'from-stone-500 to-stone-700 shadow-stone-500/20',
  },
  {
    href: '/panel/duyurular',
    baslik: 'Duyurular',
    aciklama: 'Bildirim gönder',
    ikon: Megaphone,
    vurgu: 'from-pink-500 to-rose-500 shadow-pink-500/25',
  },
] as const;

function GlassPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-[1.35rem] border border-white/60 bg-white/55 shadow-[0_8px_40px_rgba(139,92,246,0.08)] backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Yarım daire gauge — genel doğruluk yüzdesi */
function BasariGauge({ yuzde }: { yuzde: number }) {
  const p = Math.min(100, Math.max(0, yuzde));
  const r = 68;
  const c = Math.PI * r;
  const dash = (p / 100) * c;
  return (
    <div className="relative flex flex-col items-center pt-1">
      <svg width="180" height="100" viewBox="0 0 180 100" className="drop-shadow-sm" aria-hidden>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        <path
          d="M 22 88 A 68 68 0 0 1 158 88"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 22 88 A 68 68 0 0 1 158 88"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute bottom-0 text-center">
        <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-800">{p}%</p>
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Genel doğruluk</p>
      </div>
    </div>
  );
}

type AnalitikVeri = {
  toplamKullanici?: number;
  toplamSinav?: number;
  toplamKatilim?: number;
  aktifSinavlar?: number;
  toplamKatilimKaydi?: number;
  bekleyenKatilim?: number;
  devamEdenKatilim?: number;
  ortalamaNet?: number;
  ortalamaDogruYuzdesi?: number;
  sonHaftaGunluk?: { tarih: string; katilim: number; etiket: string }[];
  sonOnDortGunOrtalamaNet?: { tarih: string; ortNet: number; etiket: string }[];
  enIyiBes?: {
    netPuan: number;
    hamPuan: number;
    sinav: { baslik: string; id: string };
    ogrenci: { ad: string; soyad: string; avatarUrl: string | null };
  }[];
  yaklasanSinavlar?: {
    id: string;
    baslik: string;
    baslangicZamani: string;
    bitisZamani: string;
    aktif: boolean;
  }[];
  sonHaftaKatilimlar?: { olusturuldu: string; _count: number }[];
};

function PanelOsymBlok() {
  const qc = useQueryClient();
  const [kpssModu, setKpssModu] = useState(false);

  useEffect(() => {
    setKpssModu(isKpssMode());
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'osym', 'durum'],
    queryFn: () => adminApi.osymDurum(),
  });
  const tara = useMutation({
    mutationFn: (duyuruAktar: boolean) => adminApi.osymTara(duyuruAktar),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin', 'osym'] });
      const kay = res.data?.veri?.kaynaklar as Array<{ kod: string; degisti: boolean }> | undefined;
      toast.basarili(
        kay?.map((k) => `${k.kod === 'YKS_KILAVUZ_2026' ? 'YKS' : 'ÖSYM'}: ${k.degisti ? 'değişiklik' : 'aynı'}`).join(' · ') ||
          'Tarama tamamlandı',
      );
    },
    onError: () => toast.hata('Tarama başarısız. Ağ veya ÖSYM erişimini kontrol edin.'),
  });

  const kaynaklar = (data?.data?.veri as { kaynaklar?: any[] } | undefined)?.kaynaklar ?? [];
  const yks = kaynaklar.find((x: any) => x.kod === 'YKS_KILAVUZ_2026');
  const ana = kaynaklar.find((x: any) => x.kod === 'OSYM_ANASAYFA');
  const duyurular = (ana?.duyurular as Array<{ baslik: string; href: string; tarih?: string }> | undefined) ?? [];

  return (
    <GlassPanel className="flex flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{kpssModu ? 'ÖSYM / KPSS takip' : 'ÖSYM / YKS takip'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {kpssModu 
                ? 'Anasayfada yeni bağlantılar → isteğe bağlı duyuru.' 
                : 'Kılavuz sayfası hash; anasayfada yeni bağlantılar → isteğe bağlı duyuru.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={tara.isPending}
            onClick={() => tara.mutate(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-50"
          >
            {tara.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Tara
          </button>
          <button
            type="button"
            disabled={tara.isPending}
            onClick={() => tara.mutate(false)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Sadece kontrol
          </button>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        Kesin tarihler için{' '}
        <a href="https://www.osym.gov.tr/" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
          osym.gov.tr
        </a>
        .
      </p>
      {isLoading ? (
        <div className="flex flex-1 min-h-[140px] items-center justify-center mt-4">
          <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 flex-1">
          {!kpssModu && yks && (
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">YKS kılavuzu</p>
              <p className="text-sm text-slate-800 mt-1 line-clamp-2">{yks?.baslik || 'Henüz tarama yok'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                {yks?.degisti ? (
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-900">İçerik farkı olabilir</span>
                ) : (
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">Hash uyumu</span>
                )}
                {yks?.sonKontrol && (
                  <span className="text-slate-500">{new Date(yks.sonKontrol).toLocaleString('tr-TR')}</span>
                )}
              </div>
              {yks?.url && (
                <a
                  href={yks.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                >
                  Sayfayı aç <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
          <div className={cn("rounded-xl border border-slate-100 bg-white/80 p-3", kpssModu ? "sm:col-span-2" : "")}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
              <Bell className="h-3 w-3" /> Duyurular
            </p>
            {duyurular.length ? (
              <ul className="mt-2 space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {duyurular.slice(0, 12).map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {d.tarih ? (
                      <span className="mt-0.5 shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {d.tarih}
                      </span>
                    ) : null}
                    <a
                      href={d.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 hover:underline leading-snug line-clamp-2 flex items-center gap-1"
                      title={d.baslik}
                    >
                      <span className="min-w-0">{d.baslik}</span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 mt-2">Tarama sonrası duyurular burada listelenecek.</p>
            )}
            <a
              href="https://www.osym.gov.tr/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Tüm duyurular <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

type MesajRol = 'user' | 'assistant';
type SohbetMesaj = { role: MesajRol; content: string };

function PanelYzAsistan() {
  const [kpssModu, setKpssModu] = useState(false);

  useEffect(() => {
    setKpssModu(isKpssMode());
  }, []);

  const [mesajlar, setMesajlar] = useState<SohbetMesaj[]>([]);

  useEffect(() => {
    setMesajlar([
      {
        role: 'assistant',
        content: kpssModu
          ? 'KPSS, sınav takvimi veya platform işleyişi hakkında sorun. Kesin ÖSYM tarihleri için osym.gov.tr’yi kontrol edin.'
          : 'YKS, sınav takvimi veya platform işleyişi hakkında sorun. Kesin ÖSYM tarihleri için osym.gov.tr’yi kontrol edin.',
      }
    ]);
  }, [kpssModu]);

  const [girdi, setGirdi] = useState('');
  const altRef = useRef<HTMLDivElement>(null);

  const gonder = useMutation({
    mutationFn: async (ms: SohbetMesaj[]) => {
      const r = await adminApi.yardimAsistaniMesaj(ms.map((m) => ({ role: m.role, content: m.content })));
      return r.data?.veri?.yanit as string;
    },
    onSuccess: (yanit) => setMesajlar((m) => [...m, { role: 'assistant', content: yanit || 'Yanıt yok.' }]),
    onError: () => toast.hata('YZ yanıt veremedi. OPENROUTER anahtarını kontrol edin.'),
  });

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mesajlar, gonder.isPending]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = girdi.trim();
    if (!t || gonder.isPending) return;
    const userMsg: SohbetMesaj = { role: 'user', content: t };
    const yeni = [...mesajlar, userMsg];
    setMesajlar(yeni);
    setGirdi('');
    gonder.mutate(yeni);
  }

  return (
    <GlassPanel className="flex flex-col p-5 sm:p-6 h-full min-h-[360px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">YZ yardımcı</h2>
          <p className="text-[11px] text-slate-500">Sınav, müfredat, ÖSYM bilgilendirme</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-3 max-h-[220px] min-h-[120px]">
        {mesajlar.map((m, i) => (
          <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'flex-row-reverse' : '')}>
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px]',
                m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-violet-100 text-violet-700',
              )}
            >
              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div
              className={cn(
                'rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[88%]',
                m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-100 text-slate-800',
              )}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {gonder.isPending && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-violet-600" /> Düşünüyor…
          </div>
        )}
        <div ref={altRef} />
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={girdi}
          onChange={(e) => setGirdi(e.target.value)}
          placeholder={kpssModu ? "Örn: KPSS başvurusu ne zaman?" : "Örn: YKS başvurusu ne zaman?"}
          className="input-field flex-1 rounded-xl py-2.5 text-sm"
          disabled={gonder.isPending}
        />
        <button
          type="submit"
          disabled={gonder.isPending || !girdi.trim()}
          className="btn-primary shrink-0 rounded-xl px-4 py-2.5 inline-flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </GlassPanel>
  );
}

export default function AdminPanel() {
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['admin-analitik', 'panel'],
    queryFn: () => adminApi.analitik(),
    placeholderData: (prev) => prev,
  });

  const raw = data?.data?.veri as AnalitikVeri | undefined;
  const analitik = raw;

  const haftaVerisi = analitik?.sonHaftaGunluk?.length
    ? analitik.sonHaftaGunluk
    : (analitik?.sonHaftaKatilimlar ?? []).map((x) => ({
        tarih: '',
        katilim: typeof x._count === 'number' ? x._count : (x as { _count?: { _all?: number } })._count?._all ?? 0,
        etiket: String(x.olusturuldu),
      }));

  const netSerisi = analitik?.sonOnDortGunOrtalamaNet ?? [];
  const grafikBosHafta = haftaVerisi.length === 0 || haftaVerisi.every((d) => d.katilim === 0);
  const netGrafikBos = netSerisi.length === 0 || netSerisi.every((d) => d.ortNet === 0);

  if (isLoading && !isPlaceholderData) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-9 w-9 animate-spin text-violet-500" />
        <p className="text-sm text-slate-500">Panel hazırlanıyor…</p>
      </div>
    );
  }

  const aktifSayi =
    typeof analitik?.aktifSinavlar === 'number'
      ? analitik.aktifSinavlar.toLocaleString('tr-TR')
      : String(analitik?.aktifSinavlar ?? '0');

  const ozetKartlar = [
    {
      ikon: Users,
      label: 'Öğrenci',
      deger: analitik?.toplamKullanici?.toLocaleString('tr-TR') ?? '0',
      link: '/panel/kullanicilar',
      renk: 'bg-blue-500/15 text-blue-700 ring-blue-500/20',
    },
    {
      ikon: BookOpen,
      label: 'Sınav',
      deger: analitik?.toplamSinav?.toLocaleString('tr-TR') ?? '0',
      link: '/panel/sinavlar',
      renk: 'bg-violet-500/15 text-violet-700 ring-violet-500/20',
    },
    {
      ikon: CheckCircle,
      label: 'Tamamlanan',
      deger: analitik?.toplamKatilim?.toLocaleString('tr-TR') ?? '0',
      link: '/panel/analitik',
      renk: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/20',
    },
    {
      ikon: Activity,
      label: 'Aktif sınav',
      deger: aktifSayi,
      link: '/panel/sinavlar',
      renk: 'bg-orange-500/15 text-orange-700 ring-orange-500/20',
    },
  ];

  const katilimDurumu = [
    {
      etiket: 'Sınava katılan (kayıt)',
      deger: analitik?.toplamKatilimKaydi ?? 0,
      renk: 'from-indigo-500 to-violet-600',
    },
    {
      etiket: 'Bekleyen',
      deger: analitik?.bekleyenKatilim ?? 0,
      renk: 'from-amber-400 to-orange-500',
    },
    {
      etiket: 'Devam eden',
      deger: analitik?.devamEdenKatilim ?? 0,
      renk: 'from-sky-400 to-blue-500',
    },
  ];

  const enIyi = analitik?.enIyiBes ?? [];
  const yaklasan = analitik?.yaklasanSinavlar ?? [];
  const ortNet = typeof analitik?.ortalamaNet === 'number' ? analitik.ortalamaNet : 0;
  const ortDogru = typeof analitik?.ortalamaDogruYuzdesi === 'number' ? analitik.ortalamaDogruYuzdesi : 0;

  return (
    <div className="relative mx-auto w-full max-w-[1400px]">
      {/* Arka plan — cam panel öncesi degrade bant */}
      <div
        className="pointer-events-none absolute inset-0 -top-4 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_100%_80%_at_50%_-20%,rgba(196,181,253,0.45)_0%,transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_20%,rgba(251,207,232,0.35)_0%,transparent_50%),radial-gradient(ellipse_70%_40%_at_0%_80%,rgba(147,197,253,0.35)_0%,transparent_45%)] opacity-90"
        aria-hidden
      />

      <div className="space-y-8 pb-16 pt-0 sm:space-y-10 sm:pb-20">
        {/* Üst: selamlama + CTA */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/90">Yönetim özeti</p>
            <h1 className="mt-1 text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Kontrol paneli
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
              Katılım, başarı ve sınav takvimini tek ekranda izleyin; hızlı eylemler aşağıda.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/panel/sinavlar/yeni"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-105 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Sınav oluştur
            </Link>
            <Link
              href="/panel/ai"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 text-sm font-semibold text-violet-900 shadow-md backdrop-blur-md transition hover:bg-white active:scale-[0.98]"
            >
              <Brain className="h-4 w-4" />
              AI soru üret
            </Link>
          </div>
        </div>

        {/* Renkli özet KPI */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {ozetKartlar.map((k, i) => {
            const I = k.ikon;
            return (
              <Link key={i} href={k.link} className="group">
                <GlassPanel className="h-full p-5 transition hover:bg-white/70 hover:shadow-lg sm:p-6">
                  <div className={cn('inline-flex rounded-xl p-2 ring-1', k.renk)}>
                    <I className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-slate-900">{k.deger}</p>
                  <p className="text-sm font-medium text-slate-700">{k.label}</p>
                  <ArrowUpRight className="mt-2 h-4 w-4 text-slate-300 transition group-hover:text-violet-500" />
                </GlassPanel>
              </Link>
            );
          })}
        </div>

        {/* İkinci metrik şeridi — katılım durumu + ortalama net */}
        <div className="grid gap-4 md:grid-cols-3">
          {katilimDurumu.map((x, i) => (
            <GlassPanel key={i} className="flex items-center justify-between gap-4 p-5 sm:p-6">
              <div>
                <p className="text-xs font-medium text-slate-500">{x.etiket}</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900">
                  {typeof x.deger === 'number' ? x.deger.toLocaleString('tr-TR') : x.deger}
                </p>
              </div>
              <div
                className={cn(
                  'h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br opacity-90 shadow-md',
                  x.renk,
                )}
              />
            </GlassPanel>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <PanelOsymBlok />
          <PanelYzAsistan />
        </div>

        <div className="grid gap-6 lg:gap-8 xl:grid-cols-12">
          {/* Sol kolon: grafikler */}
          <div className="space-y-6 xl:col-span-8">
            <GlassPanel className="p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-2 text-white shadow-lg shadow-indigo-500/20">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Son 7 gün — katılım</h2>
                    <p className="text-xs text-slate-500">Tamamlanan sınav girişleri (günlük)</p>
                  </div>
                </div>
              </div>
              {grafikBosHafta ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200/80 bg-gradient-to-b from-violet-50/50 to-white py-10">
                  <PieChart className="mb-2 h-10 w-10 text-violet-300" />
                  <p className="text-sm font-medium text-slate-700">Henüz günlük veri yok</p>
                  <p className="mt-1 max-w-xs text-center text-xs text-slate-500">
                    Tamamlanan sınavlar arttıkça çubuklar burada görünecek.
                  </p>
                </div>
              ) : (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={haftaVerisi} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" vertical={false} opacity={0.6} />
                      <XAxis
                        dataKey="etiket"
                        tick={{ fontSize: 10, fill: '#7c3aed' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }}
                        contentStyle={{
                          borderRadius: '14px',
                          border: '1px solid #ede9fe',
                          boxShadow: '0 12px 40px rgba(139, 92, 246, 0.12)',
                        }}
                      />
                      <Bar dataKey="katilim" name="Katılım" fill="url(#barPink)" radius={[8, 8, 0, 0]} maxBarSize={40} />
                      <defs>
                        <linearGradient id="barPink" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" />
                          <stop offset="100%" stopColor="#818cf8" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassPanel>

            <GlassPanel className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 p-2 text-white shadow-lg shadow-pink-500/25">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Ortalama net eğilimi</h2>
                  <p className="text-xs text-slate-500">Son 14 gün — tamamlanan sınavlar (günlük ortalama net)</p>
                </div>
              </div>
              {netGrafikBos ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-pink-200/80 bg-pink-50/40 py-8 text-sm text-slate-600">
                  Net verisi birikmesi bekleniyor
                </div>
              ) : (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={netSerisi} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f472b6" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#f472b6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" vertical={false} />
                      <XAxis dataKey="etiket" tick={{ fontSize: 10, fill: '#9d174d' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '14px',
                          border: '1px solid #fce7f3',
                          boxShadow: '0 12px 40px rgba(244, 114, 182, 0.15)',
                        }}
                      />
                      <Area type="monotone" dataKey="ortNet" stroke="#ec4899" strokeWidth={2} fill="url(#areaNet)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassPanel>
          </div>

          {/* Sağ kolon: gauge + ortalama net kartı */}
          <div className="space-y-6 xl:col-span-4">
            <GlassPanel className="p-6 sm:p-7">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-fuchsia-500" />
                <h2 className="text-sm font-semibold text-slate-900">Genel başarı</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">Tüm tamamlanan sınavlardaki doğru / toplam soru</p>
              <BasariGauge yuzde={ortDogru} />
              <div className="mt-6 rounded-2xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-4 ring-1 ring-white/60">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Ortalama net</p>
                <p className="mt-1 font-mono text-3xl font-bold text-slate-900">{ortNet}</p>
                <p className="text-xs text-slate-500">Tamamlanan sınav kayıtları üzerinden</p>
              </div>
            </GlassPanel>

            <GlassPanel className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-white/60 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 px-5 py-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-slate-900">En yüksek başarı</h2>
                </div>
                <Link href="/panel/analitik" className="text-xs font-semibold text-violet-600 hover:underline">
                  Tümü
                </Link>
              </div>
              <ul className="divide-y divide-violet-100/80">
                {enIyi.length === 0 ? (
                  <li className="px-5 py-8 text-center text-sm text-slate-500">Henüz sıralanacak kayıt yok</li>
                ) : (
                  enIyi.map((row, idx) => (
                    <li key={`${row.sinav.id}-${idx}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-violet-50/40">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white shadow">
                        {idx + 1}
                      </span>
                      {row.ogrenci.avatarUrl ? (
                        <div
                          className="h-9 w-9 shrink-0 rounded-full bg-cover bg-center ring-2 ring-white"
                          style={{ backgroundImage: `url(${row.ogrenci.avatarUrl})` }}
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-300 to-pink-300 text-xs font-bold uppercase text-violet-950 ring-2 ring-white">
                          {(row.ogrenci.ad?.[0] ?? '') + (row.ogrenci.soyad?.[0] ?? '')}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {row.ogrenci.ad} {row.ogrenci.soyad}
                        </p>
                        <p className="truncate text-xs text-slate-500">{row.sinav.baslik}</p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-violet-700">
                        {row.netPuan.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </GlassPanel>

            <GlassPanel className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sky-500" />
                <h2 className="text-sm font-semibold text-slate-900">Yaklaşan sınavlar</h2>
              </div>
              <ul className="space-y-2.5">
                {yaklasan.length === 0 ? (
                  <li className="rounded-xl bg-slate-50/80 py-6 text-center text-sm text-slate-500">
                    Planlanmış sınav yok
                  </li>
                ) : (
                  yaklasan.map((s) => (
                    <Link
                      key={s.id}
                      href={`/panel/sinavlar`}
                      className="flex items-start gap-3 rounded-xl border border-white/80 bg-white/50 p-3 transition hover:bg-white/90 hover:shadow-md"
                    >
                      <div className="mt-0.5 rounded-lg bg-sky-500/15 p-1.5 text-sky-600">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-slate-900">{s.baslik}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {format(new Date(s.baslangicZamani), "d MMM yyyy HH:mm", { locale: tr })}
                          {s.aktif ? (
                            <span className="ml-2 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              Aktif
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  ))
                )}
              </ul>
            </GlassPanel>
          </div>
        </div>

        {/* AI hero + hızlı erişim */}
        <GlassPanel className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-5">
            <Link
              href="/panel/ai"
              className="group relative flex flex-col justify-between bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 p-7 text-white sm:p-8 lg:col-span-2"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]"
                aria-hidden
              />
              <div className="relative">
                <Brain className="h-10 w-10 opacity-90" strokeWidth={1.25} />
                <h2 className="mt-4 text-xl font-bold">AI soru stüdyosu</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/90">
                  Konu ve zorluk seç; çoktan seçmeli ve çözümü birlikte üret.
                </p>
              </div>
              <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold">
                Panele git
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
            <div className="border-t border-white/40 bg-white/40 p-6 backdrop-blur-md sm:p-7 lg:col-span-3 lg:border-l lg:border-t-0">
              <div className="mb-5 flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-violet-600" />
                <h2 className="text-sm font-semibold text-slate-900">Hızlı erişim</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {hizliErisim.map((item) => {
                  const Ikon = item.ikon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex flex-col rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm transition hover:bg-white hover:shadow-md"
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md',
                          item.vurgu,
                        )}
                      >
                        <Ikon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-tight text-slate-900">{item.baslik}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{item.aciklama}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
