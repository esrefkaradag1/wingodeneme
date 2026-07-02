'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  UserPlus,
  BookOpen,
  BarChart3,
  Calendar,
  Map,
  Bell,
  LifeBuoy,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { siteLogoGorunum } from '@/lib/site-marka-logo';
import { VeliOgrenciProvider, useVeliOgrenci, veliOgrenciYolu } from '@/contexts/VeliOgrenciContext';
import { VELI_NAV_RENK, type VeliNavRenk } from '@/components/veli/VeliUI';

const VELI_NAV: Array<{ href: string; ikon: typeof LayoutDashboard; etiket: string; renk: VeliNavRenk }> = [
  { href: '/veli/dashboard', ikon: LayoutDashboard, etiket: 'Genel bakış', renk: 'violet' },
  { href: '/veli/dashboard#ogrenci-bagla', ikon: UserPlus, etiket: 'Öğrenci bağla', renk: 'emerald' },
];

function ogrenciNav(ogrenciId: string) {
  return [
    { href: veliOgrenciYolu(ogrenciId), ikon: LayoutDashboard, etiket: 'Öğrenci özeti', renk: 'indigo' as VeliNavRenk },
    { href: veliOgrenciYolu(ogrenciId, '/sinavlar'), ikon: BookOpen, etiket: 'Sınavlar', renk: 'sky' as VeliNavRenk },
    { href: veliOgrenciYolu(ogrenciId, '/analiz'), ikon: BarChart3, etiket: 'Analiz & Raporlar', renk: 'emerald' as VeliNavRenk },
    { href: veliOgrenciYolu(ogrenciId, '/study-plan'), ikon: Map, etiket: 'Çalışma Planı', renk: 'green' as VeliNavRenk },
    { href: veliOgrenciYolu(ogrenciId, '/takvim'), ikon: Calendar, etiket: 'Sınav Takvimi', renk: 'rose' as VeliNavRenk },
    { href: veliOgrenciYolu(ogrenciId, '/duyurular'), ikon: Bell, etiket: 'Duyurular', renk: 'amber' as VeliNavRenk },
    { href: veliOgrenciYolu(ogrenciId, '/destek'), ikon: LifeBuoy, etiket: 'Destek', renk: 'teal' as VeliNavRenk },
  ];
}

function navAktif(pathname: string, href: string): boolean {
  if (href.includes('#')) return pathname === '/veli/dashboard';
  if (href.match(/\/veli\/ogrenci\/[^/]+$/)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: { href: string; ikon: typeof LayoutDashboard; etiket: string; renk: VeliNavRenk };
  pathname: string;
  onClick: () => void;
}) {
  const aktif = navAktif(pathname, item.href);
  const Ikon = item.ikon;
  const renk = VELI_NAV_RENK[item.renk];
  const rozet = aktif ? renk.rozetAktif : renk.rozet;

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onClick}
      className={`nav-item group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        aktif ? 'bg-violet-50 text-violet-900 border border-violet-100' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
      }`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-transform group-hover:scale-105 ${rozet}`}>
        <Ikon className="w-4 h-4" />
      </span>
      <span className="truncate">{item.etiket}</span>
      {aktif ? <span className={`ml-auto w-1.5 h-1.5 rounded-full ${renk.nokta}`} /> : null}
    </Link>
  );
}

function VeliLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobilAcik, setMobilAcik] = useState(false);
  const [profilAcik, setProfilAcik] = useState(false);
  const [hazir, setHazir] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { kullanici, token, cikisYap } = useAuthStore();
  const site = useSiteIcerik();
  const logoUrl = site.marka.logoUrl;
  const logoSt = siteLogoGorunum(site.marka);
  const { ogrenciler, seciliOgrenciId, seciliOgrenci, ogrenciSec } = useVeliOgrenci();

  useEffect(() => {
    const persistApi = useAuthStore.persist;
    const finish = () => setHazir(true);
    if (!persistApi) {
      finish();
      return;
    }
    if (persistApi.hasHydrated()) {
      finish();
      return;
    }
    return persistApi.onFinishHydration(finish);
  }, []);

  useEffect(() => {
    if (!hazir) return;
    if (!token) {
      router.replace('/giris');
      return;
    }
    if (kullanici?.rol && kullanici.rol !== 'VELI') {
      router.replace(
        kullanici.rol === 'ADMIN' || kullanici.rol === 'SUPER_ADMIN' || kullanici.rol === 'TEACHER'
          ? '/panel'
          : '/dashboard',
      );
    }
  }, [hazir, token, kullanici?.rol, router]);

  const cikisYapFn = async () => {
    try {
      await authApi.cikis();
    } catch {
      /* sessiz */
    }
    cikisYap();
    toast.bilgi('Çıkış yapıldı');
    router.push('/giris');
  };

  if (!hazir || !token || !kullanici || kullanici.rol !== 'VELI') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Yönlendiriliyor…
      </div>
    );
  }

  const ogrenciMenusu = seciliOgrenciId ? ogrenciNav(seciliOgrenciId) : [];

  const SidebarIcerik = () => (
    <div className="flex h-full flex-col bg-white/90 backdrop-blur-xl border-r border-gray-100">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={site.marka.ad} className={logoSt.className} style={logoSt.style} />
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <span className="text-white font-bold text-base">{site.marka.kisaLogo || 'W'}</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-base tracking-tight truncate">{site.marka.ad}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-violet-600">Veli Paneli</p>
              </div>
            </>
          )}
        </div>
        <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-100">
          <Eye className="w-3 h-3" /> İzleme modu
        </span>
      </div>

      {ogrenciler.length > 0 && (
        <div className="px-3 pt-4 pb-1">
          <label htmlFor="veli-ogrenci-sec" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 mb-1.5">
            Öğrenci
          </label>
          <div className="relative">
            <select
              id="veli-ogrenci-sec"
              value={seciliOgrenciId ?? ''}
              onChange={(e) => {
                if (e.target.value) ogrenciSec(e.target.value);
              }}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/80 text-gray-900 text-sm px-3 py-2.5 pr-9 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 outline-none transition-all"
            >
              {ogrenciler.length > 1 && <option value="" disabled>Seçin…</option>}
              {ogrenciler.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.ad} {o.soyad}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {seciliOgrenci && (
            <p className="text-[11px] text-gray-500 mt-1.5 px-1 truncate">
              {[seciliOgrenci.sinif && `${seciliOgrenci.sinif}. sınıf`, seciliOgrenci.okul].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Veli</p>
          <div className="space-y-0.5 mt-1">
            {VELI_NAV.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onClick={() => setMobilAcik(false)} />
            ))}
          </div>
        </div>

        {ogrenciMenusu.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Öğrenci</p>
            <div className="space-y-0.5 mt-1">
              {ogrenciMenusu.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onClick={() => setMobilAcik(false)} />
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50/50 border border-violet-100/80 p-3">
          <p className="text-sm font-semibold text-gray-900 truncate">{kullanici.ad} {kullanici.soyad}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{kullanici.email}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8f7fc]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.06),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(236,72,153,0.04),_transparent_50%)]" />

      <aside className="hidden lg:flex w-[17rem] shrink-0 flex-col relative z-10">
        <SidebarIcerik />
      </aside>

      {mobilAcik ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setMobilAcik(false)} role="presentation" />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(100vw-3rem,17rem)] flex flex-col shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 p-2 rounded-lg bg-white/90 text-gray-600 shadow"
              onClick={() => setMobilAcik(false)}
              aria-label="Menüyü kapat"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarIcerik />
          </aside>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col min-w-0 relative z-10">
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-gray-200/80 bg-white/85 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMobilAcik(true)}
            className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100"
            aria-label="Menüyü aç"
          >
            <Menu className="w-5 h-5" />
          </button>

          <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-violet-100 text-violet-800">
            Veli Paneli
          </span>

          {seciliOgrenci && pathname.startsWith('/veli/ogrenci/') && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-gray-500 truncate max-w-[200px] lg:max-w-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {seciliOgrenci.ad} {seciliOgrenci.soyad}
            </span>
          )}

          <div className="flex-1" />

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfilAcik((a) => !a)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {kullanici.ad?.charAt(0) || 'V'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
            </button>
            {profilAcik ? (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setProfilAcik(false)} aria-hidden />
                <div className="absolute right-0 top-full mt-2 z-[70] w-52 rounded-xl border border-gray-100 bg-white shadow-2xl py-1 text-sm ring-1 ring-black/5">
                  <div className="px-4 py-2.5 border-b border-gray-50">
                    <p className="font-semibold text-gray-900 truncate">{kullanici.ad} {kullanici.soyad}</p>
                    <p className="text-xs text-gray-500 truncate">{kullanici.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfilAcik(false);
                      cikisYapFn();
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Çıkış yap
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function VeliLayout({ children }: { children: React.ReactNode }) {
  return (
    <VeliOgrenciProvider>
      <VeliLayoutInner>{children}</VeliLayoutInner>
    </VeliOgrenciProvider>
  );
}
