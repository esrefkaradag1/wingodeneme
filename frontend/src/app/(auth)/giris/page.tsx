'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import { branslarParse } from '@/lib/ogretmenSinirlama';
import AnaSiteyeDonButonu from '@/components/auth/AnaSiteyeDonButonu';

const girisSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  sifre: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

type GirisFormu = z.infer<typeof girisSchema>;

export default function GirisSayfasi() {
  const [sifreGoster, setSifreGoster] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const { girisYap, token, kullanici } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Oturum varsa giriş sayfasına girilse bile yönlendir (yenilemede persist çalışır).
    if (!token) return;
    const rol = kullanici?.rol;
    if (rol === 'ADMIN' || rol === 'SUPER_ADMIN' || rol === 'TEACHER') router.replace('/panel');
    else if (rol === 'VELI') router.replace('/veli/dashboard');
    else if (rol) router.replace('/dashboard');
    else {
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
            if (u.rol === 'ADMIN' || u.rol === 'SUPER_ADMIN' || u.rol === 'TEACHER') router.replace('/panel');
            else if (u.rol === 'VELI') router.replace('/veli/dashboard');
            else router.replace('/dashboard');
          }
        })
        .catch(() => {
          // token geçersizse login sayfasında kalır
        });
    }
  }, [token, kullanici?.rol, router, girisYap]);

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

      if (kullanici.rol === 'ADMIN' || kullanici.rol === 'SUPER_ADMIN' || kullanici.rol === 'TEACHER') {
        router.push('/panel');
      } else if (kullanici.rol === 'VELI') {
        router.push('/veli/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const mesaj = err?.response?.data?.mesaj || err?.message || 'Giriş başarısız';
      toast.hata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <AnaSiteyeDonButonu />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <span className="text-white font-bold text-2xl">WingoSınav</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Tekrar Hoş Geldiniz</h1>
          <p className="text-gray-400 mt-1">Hesabınıza giriş yapın</p>
        </div>

        {/* Form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">E-posta</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="ornek@email.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Şifre</label>
              <div className="relative">
                <input
                  {...register('sifre')}
                  type={sifreGoster ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setSifreGoster(!sifreGoster)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {sifreGoster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.sifre && <p className="mt-1 text-sm text-red-400">{errors.sifre.message}</p>}
              <p className="mt-2 text-xs text-gray-500">
                Veli hesaplarında şifre kayıt sırasında belirlenir; belirtilmezse telefon numarasının son 6 hanesi kullanılır.
              </p>
              <div className="mt-2 text-right">
                <Link href="/sifremi-unuttum" className="text-sm text-indigo-400 hover:text-indigo-300">
                  Şifremi unuttum
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={yukleniyor}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {yukleniyor && <Loader2 className="w-4 h-4 animate-spin" />}
              Giriş Yap
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400 space-y-1.5">
            <div>
              Hesabınız yok mu?{' '}
              <Link href="/kayit" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Öğrenci Kaydı
              </Link>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs">
              <Link href="/kayit/veli" className="text-indigo-300 hover:text-indigo-200 font-medium">
                Veli Kaydı
              </Link>
              <span className="text-gray-600">•</span>
              <Link href="/kayit/ogretmen" className="text-amber-300 hover:text-amber-200 font-medium">
                Öğretmen Kaydı
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
