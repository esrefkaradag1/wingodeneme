'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  GraduationCap,
  Users,
  Building2,
  UserRound,
  Shield,
  UserPlus,
  ExternalLink,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import { branslarParse } from '@/lib/ogretmenSinirlama';
import { getAppMode } from '@/lib/platform';
import { guvenliReturnUrl, kayitUrlWithReturn, ogrenciGirisSonrasiHedef } from '@/lib/returnUrl';
import AuthKabugu, { authBirincilButon, authInputSinifi } from '@/components/auth/AuthKabugu';

const HATIRLA_ANAHTAR = 'wingo_giris_email';

const girisSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  sifre: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

type GirisFormu = z.infer<typeof girisSchema>;

type RolSecim = 'ogrenci' | 'veli' | 'koc' | 'kurum' | 'panel';

const ROLLER: {
  id: RolSecim;
  etiket: string;
  icon: typeof GraduationCap;
  alt: string;
  kayitHref?: string;
  kayitEtiket?: string;
}[] = [
  {
    id: 'ogrenci',
    etiket: 'Öğrenci',
    icon: GraduationCap,
    alt: 'Deneme sınavlarını çözün, netlerinizi ve konu analizlerinizi görün.',
    kayitHref: '/kayit',
    kayitEtiket: 'Öğrenci kaydı',
  },
  {
    id: 'veli',
    etiket: 'Veli',
    icon: Users,
    alt: 'Çocuğunuzun deneme sonuçlarını ve gelişimini takip edin.',
    kayitHref: '/kayit/veli',
    kayitEtiket: 'Veli kaydı',
  },
  {
    id: 'koc',
    etiket: 'Koç',
    icon: UserRound,
    alt: 'Öğrencilerinizi bağlayın, analiz ve sonuç paneline giriş yapın.',
    kayitHref: '/kayit/koc',
    kayitEtiket: 'Koç kaydı',
  },
  {
    id: 'kurum',
    etiket: 'Kurum',
    icon: Building2,
    alt: 'Okul / dershane paneli — sınıflar, öğretmenler ve toplu analiz.',
    kayitHref: '/kayit/kurum',
    kayitEtiket: 'Kurum başvurusu',
  },
  {
    id: 'panel',
    etiket: 'Panel',
    icon: Shield,
    alt: 'Yönetici veya soru yazarı hesabınızla yönetim paneline girin.',
    kayitHref: '/kayit/ogretmen',
    kayitEtiket: 'Öğretmen kaydı',
  },
];

function GirisSayfasiIcerik() {
  const [sifreGoster, setSifreGoster] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [beniHatirla, setBeniHatirla] = useState(true);
  const [rol, setRol] = useState<RolSecim>('ogrenci');
  const { girisYap, token, kullanici } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = guvenliReturnUrl(searchParams.get('returnUrl'));
  const [mode, setMode] = useState<'kpss' | 'yks_lgs'>('yks_lgs');

  const rolHedefi = (rolKod?: string, kocTipi?: string) => {
    const ogrenciDonus = ogrenciGirisSonrasiHedef(rolKod, returnUrl);
    if (ogrenciDonus) return ogrenciDonus;
    if (rolKod === 'ADMIN' || rolKod === 'SUPER_ADMIN' || rolKod === 'TEACHER') return '/panel';
    if (rolKod === 'VELI') return '/veli/dashboard';
    if (rolKod === 'KOC') {
      return kocTipi === 'KURUMSAL' || kocTipi === 'KURUM_OGRETMENI' ? '/kurum/dashboard' : '/koc/dashboard';
    }
    return '/dashboard';
  };

  useEffect(() => {
    setMode(getAppMode());
  }, []);

  const marka = useMemo(
    () => (mode === 'kpss' ? { ad: 'WingoKPSS', harf: 'K' } : { ad: 'WingoSınav', harf: 'W' }),
    [mode],
  );

  const kpss = mode === 'kpss';
  const seciliRol = ROLLER.find((r) => r.id === rol) || ROLLER[0];

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<GirisFormu>({
    resolver: zodResolver(girisSchema),
    defaultValues: { email: '', sifre: '' },
  });

  useEffect(() => {
    try {
      const kayitli = localStorage.getItem(HATIRLA_ANAHTAR);
      if (kayitli) {
        setValue('email', kayitli);
        setBeniHatirla(true);
      }
    } catch {
      /* ignore */
    }
  }, [setValue]);

  useEffect(() => {
    if (!token) return;
    const mevcutRol = kullanici?.rol;
    if (mevcutRol) {
      router.replace(rolHedefi(mevcutRol, (kullanici as { kocTipi?: string } | null)?.kocTipi));
      return;
    }
    authApi
      .me()
      .then((r) => {
        const u = r.data.veri;
        if (u) {
          girisYap({
            kullanici: {
              id: u.id,
              email: u.email,
              rol: u.rol,
              ad: (u.ogrenciProfil || u.veliProfil || u.adminProfil || u.kocProfil)?.ad,
              soyad: (u.ogrenciProfil || u.veliProfil || u.adminProfil || u.kocProfil)?.soyad,
              avatarUrl: u.ogrenciProfil?.avatarUrl,
              brans: u.brans ?? u.adminProfil?.brans ?? undefined,
              branslar: u.branslar ?? branslarParse(u.adminProfil?.brans),
              izinliDersler: u.izinliDersler,
              ogretimTuru: (u.ogrenciProfil?.ogretimTuru ?? u.adminProfil?.ogretimTuru) as 'YKS' | 'LGS' | undefined,
              referansKod: u.kocProfil?.referansKod,
              kocTipi: u.kocProfil?.tip,
            },
          });
          router.replace(rolHedefi(u.rol, u.kocProfil?.tip));
        }
      })
      .catch(() => {
        /* token geçersiz */
      });
  }, [token, kullanici?.rol, router, girisYap, returnUrl]);

  const onSubmit = async (veri: GirisFormu) => {
    setYukleniyor(true);
    try {
      const yanit = await authApi.giris(veri.email, veri.sifre);
      const { kullanici: k, token: t, refreshToken } = yanit.data.veri;
      try {
        if (beniHatirla) localStorage.setItem(HATIRLA_ANAHTAR, veri.email.trim().toLowerCase());
        else localStorage.removeItem(HATIRLA_ANAHTAR);
      } catch {
        /* ignore */
      }
      girisYap({ kullanici: k, token: t, refreshToken });
      toast.basarili('Hoş geldiniz!', `Merhaba ${k.ad || ''}`);
      router.push(rolHedefi(k.rol, k.kocTipi));
    } catch (err: unknown) {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } }; message?: string })?.response?.data?.mesaj ||
        (err as { message?: string })?.message ||
        'Giriş başarısız';
      toast.hata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  };

  const kayitHref =
    seciliRol.id === 'ogrenci' && returnUrl
      ? kayitUrlWithReturn(returnUrl)
      : seciliRol.kayitHref || '/kayit';

  const vurgu =
    kpss ? 'text-emerald-300 hover:text-emerald-200' : 'text-[#8FE4D8] hover:text-[#2ABBA7]';

  return (
    <AuthKabugu
      mode={mode}
      markaAd={marka.ad}
      markaHarf={marka.harf}
      solBaslik={kpss ? 'KPSS yolculuğunuz burada' : 'Sınava hazırlığın akıllı hali'}
      solAlt="Aynı e-posta ve şifre ile rolünüze uygun panele yönlendirilirsiniz. Hesap türünüzü seçerek size özel kısa bilgiyi görün."
      solFiligranSol={kpss ? 'KPSS' : 'YKS'}
      solFiligranSag={kpss ? 'Deneme' : 'LGS'}
    >
      <div className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-none">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Tekrar Hoş Geldiniz!</h1>
        <p className="mt-2 text-sm text-white/45 leading-relaxed">{seciliRol.alt}</p>

        {/* Rol seçici */}
        <div
          className="mt-6 grid grid-cols-5 gap-2"
          role="tablist"
          aria-label="Hesap türü"
        >
          {ROLLER.map((r) => {
            const Icon = r.icon;
            const aktif = rol === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={aktif}
                onClick={() => setRol(r.id)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-2.5 sm:py-3 transition-all cursor-pointer ${
                  aktif
                    ? kpss
                      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200 shadow-[0_0_0_1px_rgba(52,211,153,0.15)]'
                      : 'border-[#2ABBA7]/55 bg-[#2ABBA7]/10 text-[#8FE4D8] shadow-[0_0_0_1px_rgba(42,187,167,0.2)]'
                    : 'border-white/10 bg-white/[0.03] text-white/45 hover:border-white/20 hover:text-white/70'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${aktif ? '' : 'opacity-80'}`} />
                <span className="text-[10px] sm:text-[11px] font-semibold leading-none">{r.etiket}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
          <div>
            <label htmlFor="giris-email" className="mb-1.5 block text-sm font-medium text-white/70">
              E-posta Adresi
            </label>
            <input
              id="giris-email"
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="ornek@email.com"
              className={authInputSinifi(kpss, !!errors.email)}
            />
            {errors.email && <p className="mt-1.5 text-sm text-red-400">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="giris-sifre" className="mb-1.5 block text-sm font-medium text-white/70">
              Şifre
            </label>
            <div className="relative">
              <input
                id="giris-sifre"
                {...register('sifre')}
                type={sifreGoster ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className={`${authInputSinifi(kpss, !!errors.sifre)} pr-11`}
              />
              <button
                type="button"
                onClick={() => setSifreGoster((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                aria-label={sifreGoster ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {sifreGoster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.sifre && <p className="mt-1.5 text-sm text-red-400">{errors.sifre.message}</p>}
            {rol === 'veli' && (
              <p className="mt-2 text-xs text-white/35 leading-relaxed">
                Veli şifresi kayıtta belirlenir; belirtilmezse telefonun son 6 hanesi kullanılır.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={beniHatirla}
                onChange={(e) => setBeniHatirla(e.target.checked)}
                className={`h-4 w-4 rounded border-white/20 bg-white/5 ${
                  kpss ? 'accent-emerald-500' : 'accent-[#2ABBA7]'
                }`}
              />
              <span className="text-sm text-white/55">Beni hatırla</span>
            </label>
            <Link href="/sifremi-unuttum" className={`text-sm transition-colors ${vurgu}`}>
              Şifremi unuttum?
            </Link>
          </div>

          <button type="submit" disabled={yukleniyor} className={`${authBirincilButon(kpss)} mt-1`}>
            {yukleniyor ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Giriş Yap'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0c0c16] px-3 text-xs uppercase tracking-wider text-white/35">veya</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={kayitHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-transparent px-3 py-3 text-sm font-medium text-white/75 transition hover:border-white/25 hover:bg-white/[0.04] hover:text-white cursor-pointer"
          >
            <UserPlus className="h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">{seciliRol.kayitEtiket || 'Kayıt ol'}</span>
          </Link>
          <a
            href="https://wingolink.com.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-transparent px-3 py-3 text-sm font-medium text-white/75 transition hover:border-white/25 hover:bg-white/[0.04] hover:text-white cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 shrink-0 opacity-70" />
            Wingolink
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          Hesabınız yok mu?{' '}
          <Link href={kayitHref} className={`font-semibold ${vurgu}`}>
            {seciliRol.kayitEtiket || 'Kayıt ol'}
          </Link>
        </p>
      </div>
    </AuthKabugu>
  );
}

export default function GirisSayfasi() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070713]" />}>
      <GirisSayfasiIcerik />
    </Suspense>
  );
}
