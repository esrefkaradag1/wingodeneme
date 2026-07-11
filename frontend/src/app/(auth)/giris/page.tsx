'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import { branslarParse } from '@/lib/ogretmenSinirlama';
import { getAppMode } from '@/lib/platform';
import AnaSiteyeDonButonu from '@/components/auth/AnaSiteyeDonButonu';
import { guvenliReturnUrl, kayitUrlWithReturn, ogrenciGirisSonrasiHedef } from '@/lib/returnUrl';

const AuthThreeBackground = dynamic(() => import('@/components/auth/AuthThreeBackground'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 -z-10 bg-[#070713]" />,
});

const girisSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  sifre: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

type GirisFormu = z.infer<typeof girisSchema>;

function GirisSayfasiIcerik() {
  const [sifreGoster, setSifreGoster] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const { girisYap, token, kullanici } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = guvenliReturnUrl(searchParams.get('returnUrl'));
  const [mode, setMode] = useState<'kpss' | 'yks_lgs'>('yks_lgs');

  const rolHedefi = (rol?: string) => {
    const ogrenciDonus = ogrenciGirisSonrasiHedef(rol, returnUrl);
    if (ogrenciDonus) return ogrenciDonus;
    if (rol === 'ADMIN' || rol === 'SUPER_ADMIN' || rol === 'TEACHER') return '/panel';
    if (rol === 'VELI') return '/veli/dashboard';
    return '/dashboard';
  };

  useEffect(() => {
    setMode(getAppMode());
  }, []);

  const marka = useMemo(
    () => (mode === 'kpss' ? { ad: 'WingoKPSS', harf: 'K' } : { ad: 'WingoSınav', harf: 'W' }),
    [mode],
  );

  useEffect(() => {
    // Oturum varsa giriş sayfasına girilse bile yönlendir (yenilemede persist çalışır).
    if (!token) return;
    const rol = kullanici?.rol;
    if (rol) {
      router.replace(rolHedefi(rol));
      return;
    }
    // kullanıcı profilini yeniden çek (token yenileme/ilk yüklemede)
    authApi.me()
      .then((r) => {
        const u = r.data.veri;
        if (u) {
          girisYap({
            kullanici: {
              id: u.id,
              email: u.email,
              rol: u.rol,
              ad: (u.ogrenciProfil || u.veliProfil || u.adminProfil)?.ad,
              soyad: (u.ogrenciProfil || u.veliProfil || u.adminProfil)?.soyad,
              avatarUrl: u.ogrenciProfil?.avatarUrl,
              brans: u.brans ?? u.adminProfil?.brans ?? undefined,
              branslar: u.branslar ?? branslarParse(u.adminProfil?.brans),
              izinliDersler: u.izinliDersler,
              ogretimTuru: (u.ogrenciProfil?.ogretimTuru ?? u.adminProfil?.ogretimTuru) as 'YKS' | 'LGS' | undefined,
            },
          });
          router.replace(rolHedefi(u.rol));
        }
      })
      .catch(() => {
        // token geçersizse login sayfasında kalır
      });
  }, [token, kullanici?.rol, router, girisYap, returnUrl]);

  const { register, handleSubmit, formState: { errors } } = useForm<GirisFormu>({
    resolver: zodResolver(girisSchema),
  });

  const onSubmit = async (veri: GirisFormu) => {
    setYukleniyor(true);
    try {
      const yanit = await authApi.giris(veri.email, veri.sifre);
      const { kullanici, token, refreshToken } = yanit.data.veri;
      girisYap({ kullanici, token, refreshToken });
      toast.basarili('Hoş geldiniz!', `Merhaba ${kullanici.ad || ''}`);

      router.push(rolHedefi(kullanici.rol));
    } catch (err: any) {
      const mesaj = err?.response?.data?.mesaj || err?.message || 'Giriş başarısız';
      toast.hata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  };

  const kpss = mode === 'kpss';
  const vurguRenk = kpss ? 'emerald' : 'indigo';

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 text-white">
      <AuthThreeBackground mode={mode} />

      {/* Okunabilirlik için hafif vinyet */}
      <div className="pointer-events-none absolute inset-0 -z-[5] bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(7,7,19,0.55)_100%)]" />

      <AnaSiteyeDonButonu />

      <div className="w-full max-w-md animate-[fadeUp_0.7s_ease-out]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-5">
            <div
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                kpss
                  ? 'bg-gradient-to-br from-emerald-400 to-sky-500 shadow-emerald-500/30'
                  : 'bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/30'
              }`}
            >
              <span className="text-white font-black text-xl">{marka.harf}</span>
              <span className="absolute inset-0 rounded-2xl ring-1 ring-white/25" />
            </div>
            <span className="text-white font-extrabold text-2xl tracking-tight">{marka.ad}</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Tekrar Hoş Geldiniz
          </h1>
          <p className="text-white/50 mt-2">Hesabınıza giriş yapın</p>
        </div>

        {/* Cam kart */}
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-white/25 via-white/10 to-transparent shadow-2xl">
          <div className="rounded-3xl bg-white/[0.06] backdrop-blur-2xl p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">E-posta</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="ornek@email.com"
                    className={`w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:bg-white/[0.07] transition-all ${
                      kpss ? 'focus:ring-emerald-400/70' : 'focus:ring-indigo-400/70'
                    }`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    {...register('sifre')}
                    type={sifreGoster ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:bg-white/[0.07] transition-all ${
                      kpss ? 'focus:ring-emerald-400/70' : 'focus:ring-indigo-400/70'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setSifreGoster(!sifreGoster)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                  >
                    {sifreGoster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.sifre && <p className="mt-1 text-sm text-red-400">{errors.sifre.message}</p>}
                <p className="mt-2 text-xs text-white/40 leading-relaxed">
                  Veli hesaplarında şifre kayıt sırasında belirlenir; belirtilmezse telefon numarasının son 6 hanesi kullanılır.
                </p>
                <div className="mt-2 text-right">
                  <Link
                    href="/sifremi-unuttum"
                    className={`text-sm transition-colors ${
                      kpss ? 'text-emerald-300 hover:text-emerald-200' : 'text-indigo-300 hover:text-indigo-200'
                    }`}
                  >
                    Şifremi unuttum
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={yukleniyor}
                className={`group w-full text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 ${
                  kpss
                    ? 'bg-gradient-to-r from-emerald-500 to-sky-500 hover:shadow-emerald-500/40 hover:brightness-110'
                    : 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:shadow-indigo-500/40 hover:brightness-110'
                }`}
              >
                {yukleniyor ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Giriş Yap
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/10 text-center text-sm text-white/50 space-y-2">
              <div>
                Hesabınız yok mu?{' '}
                <Link
                  href={returnUrl ? kayitUrlWithReturn(returnUrl) : '/kayit'}
                  className={`font-semibold ${vurguRenk === 'emerald' ? 'text-emerald-300 hover:text-emerald-200' : 'text-indigo-300 hover:text-indigo-200'}`}
                >
                  Öğrenci Kaydı
                </Link>
              </div>
              <div className="flex items-center justify-center gap-3 text-xs">
                <Link
                  href="/kayit/veli"
                  className="text-white/60 hover:text-white font-medium transition-colors"
                >
                  Veli Kaydı
                </Link>
                <span className="text-white/20">•</span>
                <Link href="/kayit/ogretmen" className="text-amber-300 hover:text-amber-200 font-medium transition-colors">
                  Öğretmen Kaydı
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default function GirisSayfasi() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070713]" />}>
      <GirisSayfasiIcerik />
    </Suspense>
  );
}
