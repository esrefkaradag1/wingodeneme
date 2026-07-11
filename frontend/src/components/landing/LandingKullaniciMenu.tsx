'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  LayoutGrid,
  User,
  KeyRound,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { branslarParse } from '@/lib/ogretmenSinirlama';

function rolEtiketi(rol?: string): string {
  switch (rol) {
    case 'OGRENCI':
      return 'Öğrenci hesabı';
    case 'VELI':
      return 'Veli hesabı';
    case 'TEACHER':
      return 'Öğretmen hesabı';
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return 'Yönetici hesabı';
    default:
      return 'Hesap';
  }
}

function panelHref(rol?: string): string {
  if (rol === 'VELI') return '/veli/dashboard';
  if (rol === 'ADMIN' || rol === 'SUPER_ADMIN' || rol === 'TEACHER') return '/panel';
  return '/dashboard';
}

function profilHref(rol?: string): string | null {
  if (rol === 'OGRENCI') return '/profil';
  return null;
}

type MenuOge = { href: string; etiket: string; ikon: typeof LayoutGrid };

function menuOgeleri(rol?: string): MenuOge[] {
  const ogeler: MenuOge[] = [
    { href: panelHref(rol), etiket: 'Panelim', ikon: LayoutGrid },
  ];
  const profil = profilHref(rol);
  if (profil) {
    ogeler.push({ href: profil, etiket: 'Profilim', ikon: User });
    ogeler.push({ href: profil, etiket: 'Hesap bilgileri', ikon: KeyRound });
  }
  return ogeler;
}

function kullaniciAdi(ad?: string, soyad?: string, email?: string): string {
  const tam = [ad, soyad].filter(Boolean).join(' ').trim();
  if (tam) return tam.toUpperCase();
  return (email?.split('@')[0] || 'KULLANICI').toUpperCase();
}

function kullaniciBasHarf(ad?: string, email?: string): string {
  if (ad?.trim()) return ad.trim().charAt(0).toUpperCase();
  return email?.charAt(0).toUpperCase() || 'K';
}

export function LandingKullaniciMenu({
  mobil,
  onNavigate,
  variant = 'default',
}: {
  mobil?: boolean;
  onNavigate?: () => void;
  variant?: 'default' | 'kpss';
}) {
  const router = useRouter();
  const { kullanici, token, girisYap, cikisYap } = useAuthStore();
  const [acik, setAcik] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [mounted, setMounted] = useState(false);
  const kapsayiciRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!acik) return;
    const disTikla = (e: MouseEvent) => {
      if (kapsayiciRef.current && !kapsayiciRef.current.contains(e.target as Node)) {
        setAcik(false);
      }
    };
    document.addEventListener('mousedown', disTikla);
    return () => document.removeEventListener('mousedown', disTikla);
  }, [acik]);

  const yenile = useCallback(async () => {
    if (!token) return;
    setYenileniyor(true);
    try {
      const yanit = await authApi.me();
      const u = yanit.data.veri;
      if (!u) return;
      girisYap({
        kullanici: {
          id: u.id,
          email: u.email,
          rol: u.rol,
          ad: u.ogrenciProfil?.ad ?? u.veliProfil?.ad ?? u.adminProfil?.ad,
          soyad: u.ogrenciProfil?.soyad ?? u.veliProfil?.soyad ?? u.adminProfil?.soyad,
          avatarUrl: u.ogrenciProfil?.avatarUrl,
          brans: u.brans ?? u.adminProfil?.brans ?? undefined,
          branslar: u.branslar ?? branslarParse(u.adminProfil?.brans),
          izinliDersler: u.izinliDersler,
          ogretimTuru: (u.ogrenciProfil?.ogretimTuru ?? u.adminProfil?.ogretimTuru) as
            | 'YKS'
            | 'LGS'
            | 'KPSS_LISANS'
            | 'KPSS_ONLISANS'
            | 'KPSS_ORTAOGRETIM'
            | undefined,
        },
      });
      toast.basarili('Profil güncellendi');
    } catch {
      toast.hata('Profil yenilenemedi');
    } finally {
      setYenileniyor(false);
    }
  }, [token, girisYap]);

  const cikisYapFn = async () => {
    setAcik(false);
    onNavigate?.();
    try {
      await authApi.cikis();
    } catch {
      /* sessiz */
    }
    cikisYap();
    toast.bilgi('Çıkış yapıldı');
    router.push('/');
    router.refresh();
  };

  if (!mounted || !token || !kullanici) return null;

  const ogeler = menuOgeleri(kullanici.rol);
  const adGoster = kullaniciAdi(kullanici.ad, kullanici.soyad, kullanici.email);
  const basHarf = kullaniciBasHarf(kullanici.ad, kullanici.email);

  const avatarSinif =
    variant === 'kpss'
      ? 'bg-gradient-to-br from-[#2ABBA7] to-teal-600 shadow-teal-500/20'
      : 'bg-gradient-to-br from-[#7C6BFF] to-[#2ABBA7] shadow-indigo-500/20';

  if (mobil) {
    return (
      <div className="mx-2 space-y-1">
        <div className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-2">
          <p className="text-sm font-bold text-white truncate">{adGoster}</p>
          <p className="text-xs text-slate-500 mt-0.5">{rolEtiketi(kullanici.rol)}</p>
        </div>
        {ogeler.map((oge) => {
          const Ikon = oge.ikon;
          return (
            <Link
              key={oge.etiket}
              href={oge.href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 font-medium hover:bg-white/[0.06] hover:text-white transition-all"
            >
              <Ikon className="w-4 h-4 text-slate-500" />
              {oge.etiket}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={yenile}
          disabled={yenileniyor}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 font-medium hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${yenileniyor ? 'animate-spin' : ''}`} />
          Yenile
        </button>
        <button
          type="button"
          onClick={cikisYapFn}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 font-semibold hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>
      </div>
    );
  }

  return (
    <div ref={kapsayiciRef} className="relative">
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-all duration-200"
        aria-expanded={acik}
        aria-haspopup="menu"
      >
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md ${avatarSinif}`}>
          {basHarf}
        </span>
        <span className="hidden xl:block max-w-[100px] truncate text-slate-300">
          {kullanici.ad || kullanici.email?.split('@')[0]}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${acik ? 'rotate-180' : ''}`} />
      </button>

      {acik && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-[60] w-[min(100vw-2rem,17.5rem)] rounded-2xl border border-white/[0.1] bg-[#0F1629]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden"
        >
          <div className="flex items-start justify-between gap-3 px-4 py-3.5 border-b border-white/[0.08]">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate tracking-wide">{adGoster}</p>
              <p className="text-xs text-slate-500 mt-0.5">{rolEtiketi(kullanici.rol)}</p>
            </div>
            <button
              type="button"
              onClick={yenile}
              disabled={yenileniyor}
              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${yenileniyor ? 'animate-spin' : ''}`} />
              Yenile
            </button>
          </div>

          <div className="py-1.5">
            {ogeler.map((oge) => {
              const Ikon = oge.ikon;
              return (
                <Link
                  key={oge.etiket}
                  href={oge.href}
                  role="menuitem"
                  onClick={() => setAcik(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <Ikon className="w-4 h-4 text-slate-500 shrink-0" />
                  {oge.etiket}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-white/[0.08] py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={cikisYapFn}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
