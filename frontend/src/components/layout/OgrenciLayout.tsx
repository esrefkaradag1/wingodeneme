'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, X, Bell, ChevronDown, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { authApi, kullaniciApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { siteLogoGorunum } from '@/lib/site-marka-logo';
import { KADEME_TEMA, NAV_RENK_SINIFLARI, navGruplari, ogretimTuruCoz } from '@/lib/ogrenciKademe';

function navAktif(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OgrenciLayout({ children }: { children: React.ReactNode }) {
  const [mobilAcik, setMobilAcik] = useState(false);
  const [profilMenuAcik, setProfilMenuAcik] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { kullanici, cikisYap, girisYap } = useAuthStore();
  const site = useSiteIcerik();
  const logoUrl = site.marka.logoUrl;
  const logoSt = siteLogoGorunum(site.marka);

  const { data: profilData } = useQuery({
    queryKey: ['auth-me', 'ogrenci-layout'],
    queryFn: () => authApi.me(),
    enabled: Boolean(kullanici && kullanici.rol === 'OGRENCI'),
    staleTime: 60_000,
  });

  const { data: sayacData } = useQuery({
    queryKey: ['nav-sayaclari'],
    queryFn: () => kullaniciApi.navSayaclari(),
    enabled: Boolean(kullanici && kullanici.rol === 'OGRENCI'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const navSayaclari: Record<string, number> = {
    '/duyurular': sayacData?.data?.veri?.duyurular ?? 0,
    '/destek': sayacData?.data?.veri?.destek ?? 0,
    '/arkadaslar': sayacData?.data?.veri?.arkadaslar ?? 0,
    '/duello': sayacData?.data?.veri?.duello ?? 0,
  };

  const kademe = ogretimTuruCoz(kullanici, profilData?.data?.veri);
  const tema = KADEME_TEMA[kademe];
  const navGruplariListesi = navGruplari(kademe);
  const lgs = kademe === 'LGS';

  useEffect(() => {
    if (!kullanici || !profilData?.data?.veri) return;
    const op = profilData.data.veri.ogrenciProfil;
    const tur = ogretimTuruCoz(kullanici, profilData.data.veri);
    if (tur && kullanici.ogretimTuru !== tur) {
      girisYap({ kullanici: { ...kullanici, ogretimTuru: tur } });
    }
  }, [profilData, kullanici, girisYap]);

  const cikisYapFn = async () => {
    try {
      await authApi.cikis();
    } catch {
      /* sessizce geç */
    }
    cikisYap();
    toast.bilgi('Çıkış yapıldı');
    router.push('/giris');
  };

  const SidebarIcerik = () => (
    <div className="flex h-full flex-col bg-white/80 backdrop-blur-md border-r border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={site.marka.ad} className={logoSt.className} style={logoSt.style} />
          ) : (
            <>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${
                  lgs ? 'bg-gradient-to-br from-blue-600 to-sky-600' : 'bg-gradient-to-br from-indigo-600 to-violet-600'
                }`}
              >
                <span className="text-white font-bold text-base">{site.marka.kisaLogo || 'W'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-gray-900 text-lg tracking-tight truncate">{site.marka.ad}</span>
                <span className={`text-[9px] font-bold uppercase tracking-[0.1em] -mt-0.5 ${lgs ? 'text-blue-600' : 'text-indigo-500'}`}>
                  {tema.panelAdi}
                </span>
              </div>
            </>
          )}
        </div>
        {logoUrl ? (
          <span className={`mt-3 inline-flex text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${lgs ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}>
            {tema.etiket} öğrenci
          </span>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGruplariListesi.map((grup) => (
          <div key={grup.baslik} className="space-y-1">
            <p className="px-3 pt-1 pb-1 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
              {grup.baslik}
            </p>
            <div className="space-y-0.5">
              {grup.ogeler.map((item) => {
                const aktif = navAktif(pathname, item.href);
                const Ikon = item.ikon;
                const renk = item.renk ? NAV_RENK_SINIFLARI[item.renk] : null;
                const rozetClass = renk
                  ? aktif
                    ? renk.rozetAktif
                    : renk.rozet
                  : aktif
                    ? lgs
                      ? 'bg-blue-600 text-white'
                      : 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-500';
                return (
                  <Link
                    key={`${item.href}-${item.etiket}`}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setMobilAcik(false)}
                    className={`nav-item group ${aktif ? 'active' : ''} ${
                      lgs && aktif ? '!bg-blue-50 !text-blue-700 !border-blue-100' : ''
                    } ${lgs && !aktif ? 'hover:!text-blue-600' : ''}`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${rozetClass}`}
                    >
                      <Ikon className="w-4 h-4" />
                    </span>
                    <span className="truncate flex-1">{item.etiket}</span>
                    {(navSayaclari[item.href] ?? 0) > 0 ? (
                      <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {navSayaclari[item.href] > 9 ? '9+' : navSayaclari[item.href]}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 ${lgs ? 'bg-blue-600' : 'bg-indigo-600'}`}>
            {kullanici?.ad?.charAt(0) || 'Ö'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {kullanici?.ad} {kullanici?.soyad}
            </p>
            <p className="text-[11px] text-gray-500 truncate">{kullanici?.email}</p>
          </div>
          <button type="button" onClick={cikisYapFn} title="Çıkış yap" className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col">
        <SidebarIcerik />
      </aside>

      {mobilAcik ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setMobilAcik(false)} role="presentation" />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(100vw-3rem,17rem)] flex flex-col shadow-2xl">
            <button type="button" className="absolute right-3 top-3 z-10 p-2 rounded-lg bg-white/90 text-gray-600 shadow" onClick={() => setMobilAcik(false)} aria-label="Menüyü kapat">
              <X className="w-5 h-5" />
            </button>
            <SidebarIcerik />
          </aside>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="relative z-40 h-14 shrink-0 flex items-center gap-4 px-4 sm:px-6 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
          <button type="button" onClick={() => setMobilAcik(true)} className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100" aria-label="Menüyü aç">
            <Menu className="w-5 h-5" />
          </button>
          <span className={`hidden sm:inline-flex text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${lgs ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>
            {tema.panelAdi}
          </span>
          <div className="flex-1" />
          <Link href="/duyurular" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors" aria-label="Duyurular">
            <Bell className="w-5 h-5" />
          </Link>
          <div className="relative z-50">
            <button type="button" onClick={() => setProfilMenuAcik((a) => !a)} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-gray-100 transition-colors">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${lgs ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                {kullanici?.ad?.charAt(0) || 'Ö'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
            </button>
            {profilMenuAcik ? (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setProfilMenuAcik(false)} aria-hidden />
                <div className="absolute right-0 top-full mt-2 z-[70] w-52 rounded-xl border border-gray-100 bg-white shadow-2xl py-1 text-sm ring-1 ring-black/5">
                  <Link
                    href="/profil"
                    onClick={() => setProfilMenuAcik(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4" />
                    Profilim
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfilMenuAcik(false);
                      cikisYapFn();
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 border-t border-gray-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Çıkış yap
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </header>
        <main className="relative z-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
