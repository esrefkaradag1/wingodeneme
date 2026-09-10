'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarX,
  Check,
  Clock,
  Copy,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  School,
  ShieldAlert,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { authApi, kocApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { cn } from '@/lib/utils';
import { PanelYoluSaglayici, type PanelYolu } from '@/components/panel/PanelYolu';

type Kapsam = 'KOC' | 'KURUM';

type NavOge = {
  href: string;
  etiket: string;
  ikon: LucideIcon;
  /** Yönetici panelindeki gibi renkli gradient ikon kutusu */
  renk: string;
};

type NavGrup = {
  id: string;
  baslik: string;
  ogeler: NavOge[];
};

type DurumBilgisi = {
  profilVar: boolean;
  erisim: boolean;
  sebep: string | null;
  mesaj: string | null;
  koc?: {
    ad: string;
    soyad: string;
    tip: 'BIREYSEL' | 'KURUMSAL' | 'KURUM_OGRETMENI';
    kurumAdi?: string | null;
    referansKod: string;
    basvuruDurum: string;
    demoBitis: string | null;
    basvuruTarihi: string;
    kararNotu: string | null;
    kurumYoneticisi: boolean;
    kurumOgretmeni: boolean;
  };
};

/** Panele girebilen roller — TEACHER yalnızca koç yetkisi verilmişse (API doğrular) */
const PANEL_ROLLERI = ['KOC', 'TEACHER'];

function navAktif(pathname: string, href: string): boolean {
  if (href.endsWith('/dashboard')) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  oge,
  aktif,
  onNavigate,
}: {
  oge: NavOge;
  aktif: boolean;
  onNavigate: () => void;
}) {
  const Ikon = oge.ikon;
  return (
    <Link
      href={oge.href}
      prefetch={false}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-200',
        aktif
          ? 'bg-indigo-500/12 text-white ring-1 ring-indigo-400/25'
          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br shadow-lg transition-transform duration-200',
          oge.renk,
          aktif ? 'scale-105 ring-2 ring-white/25' : 'opacity-95 group-hover:scale-[1.02] group-hover:opacity-100'
        )}
      >
        <Ikon className="h-[18px] w-[18px] text-white drop-shadow-sm" strokeWidth={2} />
      </span>
      <span className={cn('flex-1 truncate', aktif && 'font-semibold')}>{oge.etiket}</span>
    </Link>
  );
}

export function PanelKabugu({ kapsam, children }: { kapsam: Kapsam; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { kullanici, token, cikisYap } = useAuthStore();
  const [mobilAcik, setMobilAcik] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);

  const temelYol: PanelYolu = kapsam === 'KURUM' ? '/kurum' : '/koc';

  useEffect(() => {
    if (!token) {
      router.replace('/giris');
      return;
    }
    if (kullanici?.rol && !PANEL_ROLLERI.includes(kullanici.rol)) {
      router.replace('/giris');
    }
  }, [token, kullanici?.rol, router]);

  const { data: durum } = useQuery({
    queryKey: ['koc-durum'],
    queryFn: async () => (await kocApi.durum()).data.veri as DurumBilgisi,
    enabled: !!token && !!kullanici?.rol && PANEL_ROLLERI.includes(kullanici.rol),
    retry: false,
  });

  const tip = durum?.koc?.tip;
  const kurumsalHesap = tip === 'KURUMSAL' || tip === 'KURUM_OGRETMENI';

  // Bireysel koç kurum panelinde, kurum hesabı koç panelinde duramaz
  useEffect(() => {
    if (!tip) return;
    if (kapsam === 'KOC' && kurumsalHesap) router.replace('/kurum/dashboard');
    if (kapsam === 'KURUM' && !kurumsalHesap) router.replace('/koc/dashboard');
  }, [tip, kurumsalHesap, kapsam, router]);

  // Koç yetkisi hiç verilmemiş öğretmen kendi paneline döner
  useEffect(() => {
    if (durum?.sebep === 'YETKI_YOK' && kullanici?.rol === 'TEACHER') {
      toast.hata('Koç paneli yetkiniz yok. Yönetici panelinden koç yetkisi verilmelidir.');
      router.replace('/panel');
    }
  }, [durum?.sebep, kullanici?.rol, router]);

  const { data: ozet } = useQuery({
    queryKey: ['koc-ozet-kabuk'],
    queryFn: async () => (await kocApi.ozet()).data.veri as {
      koc: { referansKod: string };
    },
    enabled: !!token && durum?.erisim === true,
    retry: false,
  });

  const referansKod =
    ozet?.koc?.referansKod ||
    durum?.koc?.referansKod ||
    (kullanici as { referansKod?: string } | null)?.referansKod;

  const erisimVar = durum?.erisim !== false;
  const kurumYoneticisi = durum?.koc?.kurumYoneticisi === true;

  const navGruplari: NavGrup[] = useMemo(() => {
    if (!erisimVar) return [];

    if (kapsam === 'KURUM') {
      if (!kurumYoneticisi) {
        return [
          {
            id: 'genel',
            baslik: 'Genel',
            ogeler: [
              {
                href: '/kurum/dashboard',
                etiket: 'Öğrencilerim',
                ikon: Users,
                renk: 'from-indigo-500 to-blue-600 shadow-indigo-500/35',
              },
              {
                href: '/kurum/toplu',
                etiket: 'Sınıf analizi',
                ikon: BarChart3,
                renk: 'from-violet-500 to-purple-600 shadow-violet-500/35',
              },
            ],
          },
        ];
      }

      return [
        {
          id: 'genel',
          baslik: 'Genel',
          ogeler: [
            {
              href: '/kurum/dashboard',
              etiket: 'Genel bakış',
              ikon: LayoutDashboard,
              renk: 'from-blue-500 to-indigo-600 shadow-blue-500/35',
            },
            {
              href: '/kurum/toplu',
              etiket: 'Toplu analiz',
              ikon: BarChart3,
              renk: 'from-violet-500 to-purple-600 shadow-violet-500/35',
            },
          ],
        },
        {
          id: 'yonetim',
          baslik: 'Kurum Yönetimi',
          ogeler: [
            {
              href: '/kurum/ogrenciler',
              etiket: 'Öğrenciler',
              ikon: Users,
              renk: 'from-indigo-500 to-blue-600 shadow-indigo-500/35',
            },
            {
              href: '/kurum/siniflar',
              etiket: 'Sınıflar',
              ikon: School,
              renk: 'from-cyan-500 to-blue-600 shadow-cyan-500/35',
            },
            {
              href: '/kurum/ogretmenler',
              etiket: 'Öğretmenler',
              ikon: GraduationCap,
              renk: 'from-emerald-500 to-teal-600 shadow-emerald-500/35',
            },
          ],
        },
      ];
    }

    return [
      {
        id: 'genel',
        baslik: 'Genel',
        ogeler: [
          {
            href: '/koc/dashboard',
            etiket: 'Öğrencilerim',
            ikon: Users,
            renk: 'from-teal-500 to-emerald-600 shadow-teal-500/35',
          },
          {
            href: '/koc/toplu',
            etiket: 'Toplu analiz',
            ikon: BarChart3,
            renk: 'from-violet-500 to-purple-600 shadow-violet-500/35',
          },
        ],
      },
    ];
  }, [erisimVar, kapsam, kurumYoneticisi]);

  const baslik = kapsam === 'KURUM' ? durum?.koc?.kurumAdi || 'Kurum paneli' : 'Koç paneli';
  const rozet =
    kapsam === 'KURUM' ? (kurumYoneticisi ? 'Kurum Yönetimi' : 'Kurum Öğretmeni') : 'Bireysel Koç';

  const kodKopyala = async () => {
    if (!referansKod) return;
    try {
      await navigator.clipboard.writeText(referansKod);
      setKopyalandi(true);
      toast.basarili('Referans kodu kopyalandı');
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      toast.hata('Kopyalanamadı');
    }
  };

  const cikis = async () => {
    try {
      await authApi.cikis();
    } catch {
      /* ignore */
    }
    cikisYap();
    router.push('/giris');
  };

  const SidebarIcerik = () => (
    <div className="flex h-full flex-col">
      <div className="relative shrink-0 border-b border-white/[0.06] px-5 py-5">
        <div
          className={cn(
            'pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent',
            kapsam === 'KURUM' ? 'from-indigo-600/10 to-violet-600/5' : 'from-teal-600/10'
          )}
        />
        <Link
          href={`${temelYol}/dashboard`}
          className="relative flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-lg',
              kapsam === 'KURUM'
                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-900/30'
                : 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-900/30'
            )}
          >
            {kapsam === 'KURUM' ? (
              <School className="h-5 w-5 text-white" />
            ) : (
              <GraduationCap className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <span className="block truncate text-base font-bold leading-tight text-white">{baslik}</span>
            <span
              className={cn(
                'mt-0.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider',
                kapsam === 'KURUM'
                  ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400'
                  : 'border-teal-500/20 bg-teal-500/10 text-teal-400'
              )}
            >
              {rozet}
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navGruplari.map((grup) => (
          <div key={grup.id}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {grup.baslik}
            </p>
            <div className="space-y-0.5">
              {grup.ogeler.map((oge) => (
                <NavLink
                  key={oge.href}
                  oge={oge}
                  aktif={navAktif(pathname, oge.href)}
                  onNavigate={() => setMobilAcik(false)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-white/[0.06] p-3">
        {referansKod && erisimVar && (
          <button
            type="button"
            onClick={kodKopyala}
            title="Öğrencilerinize bu kodu verin"
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
          >
            {kopyalandi ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Referans kodu
              </span>
              <span className="block truncate text-xs font-semibold text-slate-200">{referansKod}</span>
            </span>
          </button>
        )}

        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold text-white',
              kapsam === 'KURUM' ? 'from-indigo-500 to-violet-600' : 'from-teal-500 to-emerald-600'
            )}
          >
            {kullanici?.ad?.charAt(0) || 'K'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {[kullanici?.ad, kullanici?.soyad].filter(Boolean).join(' ') || 'Kullanıcı'}
            </p>
            <p className="truncate text-[11px] text-slate-500">{rozet}</p>
          </div>
          <button
            type="button"
            onClick={cikis}
            title="Çıkış yap"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PanelYoluSaglayici deger={temelYol}>
      <div className="flex h-screen bg-slate-100 text-slate-900">
        <aside
          className={cn(
            'relative hidden w-[17.5rem] shrink-0 flex-col border-r border-slate-800/50 lg:flex',
            kapsam === 'KURUM' ? 'bg-[#0c1222]' : 'bg-[#081a17]'
          )}
        >
          <div
            className={cn(
              'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] via-transparent to-transparent',
              kapsam === 'KURUM' ? 'from-indigo-900/20' : 'from-teal-900/10'
            )}
          />
          <div className="relative flex h-full flex-col">
            <SidebarIcerik />
          </div>
        </aside>

        {mobilAcik ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setMobilAcik(false)}
              role="presentation"
            />
            <aside
              className={cn(
                'absolute bottom-0 left-0 top-0 flex w-[min(100vw-3rem,18rem)] flex-col border-r border-slate-800/50 shadow-2xl',
                kapsam === 'KURUM' ? 'bg-[#0c1222]' : 'bg-[#081a17]'
              )}
            >
              <button
                type="button"
                className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                onClick={() => setMobilAcik(false)}
                aria-label="Menüyü kapat"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarIcerik />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200/80 bg-white/80 px-5 backdrop-blur-md sm:px-8 lg:px-10">
            <button
              type="button"
              onClick={() => setMobilAcik(true)}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1" />
            {referansKod && erisimVar && (
              <button
                type="button"
                onClick={kodKopyala}
                title="Öğrencilerinize bu kodu verin"
                className={cn(
                  'hidden items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition sm:inline-flex',
                  kapsam === 'KURUM'
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                    : 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100'
                )}
              >
                {kopyalandi ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {referansKod}
              </button>
            )}
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600"
            >
              ← Siteye dön
            </Link>
          </header>

          <main className="animate-in fade-in flex-1 overflow-y-auto px-5 py-8 pb-12 duration-500 sm:px-8 sm:py-10 lg:px-10 lg:py-11 xl:px-12 xl:py-12">
            {durum && durum.erisim === false ? <ErisimKapaliEkrani durum={durum} /> : children}
          </main>
        </div>
      </div>
    </PanelYoluSaglayici>
  );
}

/** Başvuru onay bekliyor / reddedildi / pasif / demo bitti ekranı */
function ErisimKapaliEkrani({ durum }: { durum: DurumBilgisi }) {
  const sunum: Record<string, { ikon: typeof Clock; renk: string; baslik: string }> = {
    BEKLEMEDE: { ikon: Clock, renk: 'text-amber-600 bg-amber-50 border-amber-200', baslik: 'Başvurunuz inceleniyor' },
    REDDEDILDI: { ikon: ShieldAlert, renk: 'text-rose-600 bg-rose-50 border-rose-200', baslik: 'Başvurunuz onaylanmadı' },
    PASIF: { ikon: ShieldAlert, renk: 'text-slate-600 bg-slate-100 border-slate-200', baslik: 'Hesabınız pasif' },
    DEMO_BITTI: { ikon: CalendarX, renk: 'text-orange-600 bg-orange-50 border-orange-200', baslik: 'Demo süreniz doldu' },
  };
  const s = sunum[durum.sebep || ''] || {
    ikon: ShieldAlert,
    renk: 'text-slate-600 bg-slate-100 border-slate-200',
    baslik: 'Panel erişimi kapalı',
  };
  const Ikon = s.ikon;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border ${s.renk}`}>
        <Ikon className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-900">{s.baslik}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        {durum.mesaj || 'Panel erişiminiz şu anda kapalı.'}
      </p>

      {durum.koc && (
        <div className="mx-auto mt-6 grid max-w-md gap-2 text-left">
          <div className="flex justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm">
            <span className="text-slate-500">Hesap</span>
            <span className="font-semibold text-slate-900">
              {durum.koc.kurumAdi || [durum.koc.ad, durum.koc.soyad].filter(Boolean).join(' ')}
            </span>
          </div>
          <div className="flex justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm">
            <span className="text-slate-500">Başvuru tarihi</span>
            <span className="font-semibold text-slate-900">
              {new Date(durum.koc.basvuruTarihi).toLocaleDateString('tr-TR')}
            </span>
          </div>
          {durum.koc.kararNotu && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm">
              <p className="text-slate-500">Yönetici notu</p>
              <p className="mt-0.5 font-medium text-slate-800">{durum.koc.kararNotu}</p>
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500">Sorularınız için destek ekibiyle iletişime geçebilirsiniz.</p>
    </div>
  );
}
