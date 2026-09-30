'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { getAppMode } from '@/lib/platform';
import AuthKabugu, { authBirincilButon, authInputSinifi } from '@/components/auth/AuthKabugu';

const talepSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
});

const onaySchema = z
  .object({
    email: z.string().email('Geçerli bir e-posta girin'),
    kod: z.string().min(6, 'Doğrulama kodu 6 haneli olmalı').max(6),
    yeniSifre: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
    yeniSifreTekrar: z.string().min(6, 'Şifre tekrarı gerekli'),
  })
  .refine((v) => v.yeniSifre === v.yeniSifreTekrar, {
    message: 'Şifreler eşleşmiyor',
    path: ['yeniSifreTekrar'],
  });

type TalepFormu = z.infer<typeof talepSchema>;
type OnayFormu = z.infer<typeof onaySchema>;

export default function SifremiUnuttumSayfasi() {
  const [adim, setAdim] = useState<'talep' | 'onay'>('talep');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mode, setMode] = useState<'kpss' | 'yks_lgs'>('yks_lgs');
  const router = useRouter();

  useEffect(() => {
    setMode(getAppMode());
  }, []);

  const marka = useMemo(
    () => (mode === 'kpss' ? { ad: 'WingoKPSS', harf: 'K' } : { ad: 'WingoSınav', harf: 'W' }),
    [mode],
  );
  const kpss = mode === 'kpss';
  const vurgu = kpss ? 'text-emerald-300 hover:text-emerald-200' : 'text-[#8FE4D8] hover:text-[#2ABBA7]';

  const talepForm = useForm<TalepFormu>({ resolver: zodResolver(talepSchema) });
  const onayForm = useForm<OnayFormu>({ resolver: zodResolver(onaySchema) });

  const talepGonder = async (veri: TalepFormu) => {
    setYukleniyor(true);
    try {
      const yanit = await authApi.sifremiUnuttumTalep(veri.email);
      toast.basarili('Kod gönderildi', yanit.data.mesaj || 'E-postanızı kontrol edin.');
      onayForm.setValue('email', veri.email.trim().toLowerCase());
      setAdim('onay');
    } catch (err: unknown) {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || 'İşlem başarısız';
      toast.hata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  };

  const onayGonder = async (veri: OnayFormu) => {
    setYukleniyor(true);
    try {
      const yanit = await authApi.sifremiUnuttumOnayla({
        email: veri.email,
        kod: veri.kod,
        yeniSifre: veri.yeniSifre,
      });
      toast.basarili('Şifre güncellendi', yanit.data.mesaj || 'Yeni şifrenizle giriş yapabilirsiniz.');
      router.push('/giris');
    } catch (err: unknown) {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || 'İşlem başarısız';
      toast.hata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <AuthKabugu
      mode={mode}
      markaAd={marka.ad}
      markaHarf={marka.harf}
      solBaslik="Şifrenizi güvenle yenileyin"
      solAlt="E-posta adresinize gelen kod ile yeni şifrenizi belirleyin. Kod birkaç dakika geçerlidir."
      solFiligranSol="Şifre"
      solFiligranSag="Sıfırla"
    >
      <div className="w-full max-w-md mx-auto lg:mx-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-edu-ink">Şifremi Unuttum</h1>
        <p className="mt-2 text-sm text-edu-muted leading-relaxed">
          {adim === 'talep'
            ? 'Hesabınıza kayıtlı e-posta adresine sıfırlama kodu gönderilir.'
            : 'Kodunuzu girin ve yeni şifrenizi belirleyin.'}
        </p>

        <div className="mt-7">
          {adim === 'talep' ? (
            <form onSubmit={talepForm.handleSubmit(talepGonder)} className="space-y-5">
              <div>
                <label htmlFor="sifre-email" className="mb-1.5 block text-sm font-medium text-edu-muted">
                  E-posta Adresi
                </label>
                <input
                  id="sifre-email"
                  {...talepForm.register('email')}
                  type="email"
                  autoComplete="email"
                  className={authInputSinifi(kpss, !!talepForm.formState.errors.email)}
                  placeholder="ornek@email.com"
                />
                {talepForm.formState.errors.email && (
                  <p className="mt-1.5 text-sm text-red-400">{talepForm.formState.errors.email.message}</p>
                )}
              </div>
              <button type="submit" disabled={yukleniyor} className={authBirincilButon(kpss)}>
                {yukleniyor && <Loader2 className="w-4 h-4 animate-spin" />}
                Kod Gönder
              </button>
            </form>
          ) : (
            <form onSubmit={onayForm.handleSubmit(onayGonder)} className="space-y-4">
              <input type="hidden" {...onayForm.register('email')} />
              <div>
                <label htmlFor="sifre-kod" className="mb-1.5 block text-sm font-medium text-edu-muted">
                  Doğrulama kodu
                </label>
                <input
                  id="sifre-kod"
                  {...onayForm.register('kod')}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className={`${authInputSinifi(kpss, !!onayForm.formState.errors.kod)} tracking-widest text-center text-lg`}
                  placeholder="000000"
                />
                {onayForm.formState.errors.kod && (
                  <p className="mt-1.5 text-sm text-red-400">{onayForm.formState.errors.kod.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="sifre-yeni" className="mb-1.5 block text-sm font-medium text-edu-muted">
                  Yeni şifre
                </label>
                <input
                  id="sifre-yeni"
                  {...onayForm.register('yeniSifre')}
                  type="password"
                  autoComplete="new-password"
                  className={authInputSinifi(kpss, !!onayForm.formState.errors.yeniSifre)}
                />
                {onayForm.formState.errors.yeniSifre && (
                  <p className="mt-1.5 text-sm text-red-400">{onayForm.formState.errors.yeniSifre.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="sifre-tekrar" className="mb-1.5 block text-sm font-medium text-edu-muted">
                  Yeni şifre (tekrar)
                </label>
                <input
                  id="sifre-tekrar"
                  {...onayForm.register('yeniSifreTekrar')}
                  type="password"
                  autoComplete="new-password"
                  className={authInputSinifi(kpss, !!onayForm.formState.errors.yeniSifreTekrar)}
                />
                {onayForm.formState.errors.yeniSifreTekrar && (
                  <p className="mt-1.5 text-sm text-red-400">{onayForm.formState.errors.yeniSifreTekrar.message}</p>
                )}
              </div>
              <button type="submit" disabled={yukleniyor} className={authBirincilButon(kpss)}>
                {yukleniyor && <Loader2 className="w-4 h-4 animate-spin" />}
                Şifreyi Güncelle
              </button>
              <button
                type="button"
                onClick={() => setAdim('talep')}
                className="w-full text-sm text-edu-muted hover:text-edu-muted transition-colors cursor-pointer"
              >
                Kodu tekrar gönder
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-edu-muted">
          <Link href="/giris" className={`font-semibold ${vurgu}`}>
            Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </AuthKabugu>
  );
}
