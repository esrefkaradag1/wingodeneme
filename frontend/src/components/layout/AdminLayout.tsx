'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Brain,
  Bell,
  LogOut,
  Menu,
  X,
  FileText,
  FolderOpen,
  CreditCard,
  ShoppingBag,
  Settings,
  ShieldCheck,
  BookOpenCheck,
  LifeBuoy,
  Megaphone,
  Mail,
  Wallet,
  Activity,
  Calendar,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { siteLogoGorunum } from '@/lib/site-marka-logo';
import { useRouter } from 'next/navigation';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { api } from '@/lib/api';
import { OgretmenOneriModal } from '@/components/admin/OgretmenOneriModal';

export type AdminNavItem = {
  href: string;
  ikon: LucideIcon;
  etiket: string;
  adminOnly?: boolean;
};

export type AdminNavGrup = {
  id: string;
  baslik: string;
  ogeler: AdminNavItem[];
};

export const adminNavGruplari: AdminNavGrup[] = [
  {
    id: 'genel',
    baslik: 'Genel',
    ogeler: [
      { href: '/panel', ikon: LayoutDashboard, etiket: 'Kontrol Paneli' },
      { href: '/panel/analitik', ikon: BarChart3, etiket: 'Analitik' },
      { href: '/panel/bildirimler', ikon: Bell, etiket: 'Bildirimler' },
    ],
  },
  {
    id: 'icerik',
    baslik: 'İçerik & Sınav',
    ogeler: [
      { href: '/panel/sinavlar', ikon: BookOpen, etiket: 'Sınav Yönetimi' },
      { href: '/panel/sinav-takvimi', ikon: Calendar, etiket: 'Sınav Takvimi' },
      { href: '/panel/sorular', ikon: FileText, etiket: 'Soru Bankası' },
      { href: '/panel/ai', ikon: Brain, etiket: 'AI Soru Üretimi' },
      { href: '/panel/egitim-materyali', ikon: BookOpenCheck, etiket: 'Eğitim Materyali' },
    ],
  },
  {
    id: 'kullanici',
    baslik: 'Kullanıcı & İletişim',
    ogeler: [
      { href: '/panel/kullanicilar', ikon: Users, etiket: 'Kullanıcılar' },
      { href: '/panel/ogretmen-aktivite', ikon: Activity, etiket: 'Öğretmen Takibi', adminOnly: true },
      { href: '/panel/gruplar', ikon: FolderOpen, etiket: 'Gruplar' },
      { href: '/panel/duyurular', ikon: Megaphone, etiket: 'Duyurular' },
      { href: '/panel/ogretmen-onerileri', ikon: Lightbulb, etiket: 'Öğretmen Önerileri', adminOnly: true },
      { href: '/panel/iletisim-formlari', ikon: Mail, etiket: 'İletişim Formları' },
      { href: '/panel/destek', ikon: LifeBuoy, etiket: 'Destek Talepleri' },
    ],
  },
  {
    id: 'sistem',
    baslik: 'Sistem & Finans',
    ogeler: [
      { href: '/panel/site-yonetimi', ikon: Settings, etiket: 'Site Yönetimi' },
      { href: '/panel/paketler', ikon: CreditCard, etiket: 'Paket Yönetimi' },
      { href: '/panel/siparisler', ikon: ShoppingBag, etiket: 'Siparişler' },
      { href: '/panel/ayarlar/odeme', ikon: Wallet, etiket: 'Ödeme Ayarları' },
      { href: '/panel/ayarlar/ai-modeller', ikon: Brain, etiket: 'AI Model Ayarları', adminOnly: true },
      { href: '/panel/rol-izinleri', ikon: ShieldCheck, etiket: 'Rol İzinleri', adminOnly: true },
    ],
  },
];

/** Rol izinleri ve geriye dönük uyumluluk için düz liste */
export const adminNavItems: AdminNavItem[] = adminNavGruplari.flatMap((grup) => grup.ogeler);

/** Menü öğesi başına renkli ikon kutusu (gradient + gölge) */
const navIkonKutuSinifi: Record<string, string> = {
  '/panel': 'from-blue-500 to-indigo-600 shadow-blue-500/35',
  '/panel/analitik': 'from-violet-500 to-purple-600 shadow-violet-500/35',
  '/panel/bildirimler': 'from-amber-400 to-orange-500 shadow-amber-500/35',
  '/panel/sinavlar': 'from-rose-500 to-pink-600 shadow-rose-500/35',
  '/panel/sinav-takvimi': 'from-violet-500 to-purple-600 shadow-violet-500/35',
  '/panel/sorular': 'from-sky-500 to-cyan-600 shadow-sky-500/35',
  '/panel/ai': 'from-fuchsia-500 to-purple-600 shadow-fuchsia-500/35',
  '/panel/egitim-materyali': 'from-emerald-500 to-teal-600 shadow-emerald-500/35',
  '/panel/kullanicilar': 'from-indigo-500 to-blue-600 shadow-indigo-500/35',
  '/panel/ogretmen-aktivite': 'from-emerald-500 to-teal-600 shadow-emerald-500/35',
  '/panel/gruplar': 'from-cyan-500 to-blue-600 shadow-cyan-500/35',
  '/panel/duyurular': 'from-orange-400 to-red-500 shadow-orange-500/35',
  '/panel/ogretmen-onerileri': 'from-amber-400 to-orange-500 shadow-amber-500/35',
  '/panel/iletisim-formlari': 'from-sky-500 to-blue-600 shadow-sky-500/35',
  '/panel/destek': 'from-teal-500 to-emerald-600 shadow-teal-500/35',
  '/panel/site-yonetimi': 'from-slate-500 to-slate-700 shadow-slate-500/30',
  '/panel/paketler': 'from-pink-500 to-rose-600 shadow-pink-500/35',
  '/panel/siparisler': 'from-lime-500 to-green-600 shadow-lime-500/30',
  '/panel/ayarlar/odeme': 'from-yellow-400 to-amber-500 shadow-yellow-500/30',
  '/panel/ayarlar/ai-modeller': 'from-fuchsia-500 to-purple-600 shadow-fuchsia-500/35',
  '/panel/rol-izinleri': 'from-red-500 to-rose-700 shadow-red-500/35',
};

function navIkonKutu(href: string): string {
  return navIkonKutuSinifi[href] ?? 'from-slate-500 to-slate-600 shadow-slate-500/30';
}

function navAktif(pathname: string, href: string): boolean {
  if (href === '/panel') return pathname === '/panel';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  aktif,
  onNavigate,
  rozet,
}: {
  item: AdminNavItem;
  aktif: boolean;
  onNavigate: () => void;
  rozet?: number;
}) {
  const Ikon = item.ikon;
  const ikonKutu = navIkonKutu(item.href);

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onNavigate}
      className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-200
        ${
          aktif
            ? 'bg-indigo-500/12 text-white ring-1 ring-indigo-400/25'
            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
        }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br shadow-lg transition-transform duration-200
          ${ikonKutu}
          ${aktif ? 'scale-105 ring-2 ring-white/25' : 'opacity-95 group-hover:scale-[1.02] group-hover:opacity-100'}`}
      >
        <Ikon className="h-[18px] w-[18px] text-white drop-shadow-sm" strokeWidth={2} />
      </span>
      <span className={`truncate flex-1 ${aktif ? 'font-semibold' : ''}`}>{item.etiket}</span>
      {(rozet ?? 0) > 0 ? (
        <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
          {rozet! > 9 ? '9+' : rozet}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobilAcik, setMobilAcik] = useState(false);
  const [oneriModalAcik, setOneriModalAcik] = useState(false);
  const pathname = usePathname();
  const { kullanici, cikisYap, token } = useAuthStore();
  const router = useRouter();
  const site = useSiteIcerik();
  const logoUrl = site.marka.logoUrl;
  const logoSt = siteLogoGorunum(site.marka);

  const rol = kullanici?.rol;
  const yoneticiMi = rol === 'ADMIN' || rol === 'SUPER_ADMIN';
  const [izinli, setIzinli] = useState<{ tumIzin: boolean; menuler: string[] } | null>(null);

  const { data: panelSayacData } = useQuery({
    queryKey: ['admin-panel-sayaclari'],
    queryFn: () => api.get('/admin/panel-sayaclari').then((r) => r.data),
    enabled: Boolean(token),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const adminRozetler: Record<string, number> = {
    '/panel/ogretmen-onerileri': panelSayacData?.veri?.ogretmenOnerileri ?? 0,
    '/panel/iletisim-formlari': panelSayacData?.veri?.iletisimFormlari ?? 0,
    '/panel/destek': panelSayacData?.veri?.destek ?? 0,
    '/panel/bildirimler': panelSayacData?.veri?.bildirimler ?? 0,
  };

  useEffect(() => {
    let iptal = false;
    if (!token || !rol) return;
    api
      .get('/admin/rol-izinleri/benim')
      .then((r) => {
        if (iptal) return;
        const veri = r.data?.veri;
        if (veri) setIzinli({ tumIzin: !!veri.tumIzin, menuler: Array.isArray(veri.menuler) ? veri.menuler : [] });
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [token, rol]);

  const filtrelenmisGruplar = useMemo(() => {
    const menuGorunur = (item: AdminNavItem) => {
      if (item.adminOnly && !yoneticiMi) return false;
      if (yoneticiMi) return true;
      if (!izinli) return item.href === '/panel';
      if (izinli.tumIzin) return true;
      return izinli.menuler.includes(item.href);
    };

    return adminNavGruplari
      .map((grup) => ({
        ...grup,
        ogeler: grup.ogeler.filter(menuGorunur),
      }))
      .filter((grup) => grup.ogeler.length > 0);
  }, [yoneticiMi, izinli]);

  const cikis = () => {
    cikisYap();
    router.push('/giris');
  };

  const SidebarIcerik = () => (
    <div className="flex h-full flex-col">
      <div className="relative shrink-0 border-b border-white/[0.06] px-5 py-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-violet-600/5" />
        <Link href="/panel" className="relative flex items-center gap-3 hover:opacity-90 transition-opacity">
          {logoUrl ? (
            <img src={logoUrl} alt={site.marka.ad} className={logoSt.className} style={logoSt.style} />
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/30">
                <span className="text-sm font-bold text-white">{site.marka.kisaLogo}</span>
              </div>
              <div>
                <span className="block text-base font-bold leading-tight text-white">{site.marka.ad}</span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Yönetim</span>
              </div>
            </>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {filtrelenmisGruplar.map((grup) => (
          <div key={grup.id}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {grup.baslik}
            </p>
            <div className="space-y-0.5">
              {grup.ogeler.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  aktif={navAktif(pathname, item.href)}
                  onNavigate={() => setMobilAcik(false)}
                  rozet={adminRozetler[item.href]}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
            {kullanici?.ad?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{kullanici?.ad}</p>
            <p className="truncate text-[11px] text-slate-500">
              {kullanici?.rol === 'TEACHER' ? 'Öğretmen' : 'Yönetici'}
            </p>
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
    <div className="flex h-screen bg-slate-100">
      <aside className="relative hidden w-[17.5rem] shrink-0 flex-col border-r border-slate-800/50 bg-[#0c1222] lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
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
          <aside className="absolute bottom-0 left-0 top-0 flex w-[min(100vw-3rem,18rem)] flex-col border-r border-slate-800/50 bg-[#0c1222] shadow-2xl">
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
          <button
            type="button"
            onClick={() => setOneriModalAcik(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Öneride Bulun</span>
          </button>
          <Link href="/" className="text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600">
            ← Siteye dön
          </Link>
        </header>
        <OgretmenOneriModal acik={oneriModalAcik} onKapat={() => setOneriModalAcik(false)} />
        <main className="animate-in fade-in flex-1 overflow-y-auto px-5 py-8 pb-12 duration-500 sm:px-8 sm:py-10 lg:px-10 lg:py-11 xl:px-12 xl:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}