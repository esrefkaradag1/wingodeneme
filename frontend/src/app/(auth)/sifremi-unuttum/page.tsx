'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import AnaSiteyeDonButonu from '@/components/auth/AnaSiteyeDonButonu';

const talepSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
});

const onaySchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  kod: z.string().min(6, 'Doğrulama kodu 6 haneli olmalı').max(6),
  yeniSifre: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
  yeniSifreTekrar: z.string().min(6, 'Şifre tekrarı gerekli'),
}).refine((v) => v.yeniSifre === v.yeniSifreTekrar, {
  message: 'Şifreler eşleşmiyor',
  path: ['yeniSifreTekrar'],
});

type TalepFormu = z.infer<typeof talepSchema>;
type OnayFormu = z.infer<typeof onaySchema>;

export default function SifremiUnuttumSayfasi() {
  const [adim, setAdim] = useState<'talep' | 'onay'>('talep');
  const [yukleniyor, setYukleniyor] = useState(false);
  const router = useRouter();

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
      const mesaj = (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || 'İşlem başarısız';
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
      const mesaj = (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || 'İşlem başarısız';
      toast.hata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <AnaSiteyeDonButonu />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <span className="text-white font-bold text-2xl">WingoSınav</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Şifremi Unuttum</h1>
          <p className="text-gray-400 mt-1">
            {adim === 'talep' ? 'E-posta adresinize sıfırlama kodu gönderilir.' : 'Kodu girin ve yeni şifrenizi belirleyin.'}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          {adim === 'talep' ? (
            <form onSubmit={talepForm.handleSubmit(talepGonder)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">E-posta</label>
                <input
                  {...talepForm.register('email')}
                  type="email"
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ornek@email.com"
                />
                {talepForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-400">{talepForm.formState.errors.email.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={yukleniyor}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {yukleniyor && <Loader2 className="w-4 h-4 animate-spin" />}
                Kod Gönder
              </button>
            </form>
          ) : (
            <form onSubmit={onayForm.handleSubmit(onayGonder)} className="space-y-4">
              <input type="hidden" {...onayForm.register('email')} />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Doğrulama kodu</label>
                <input
                  {...onayForm.register('kod')}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="000000"
                />
                {onayForm.formState.errors.kod && (
                  <p className="mt-1 text-sm text-red-400">{onayForm.formState.errors.kod.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Yeni şifre</label>
                <input
                  {...onayForm.register('yeniSifre')}
                  type="password"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {onayForm.formState.errors.yeniSifre && (
                  <p className="mt-1 text-sm text-red-400">{onayForm.formState.errors.yeniSifre.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Yeni şifre (tekrar)</label>
                <input
                  {...onayForm.register('yeniSifreTekrar')}
                  type="password"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {onayForm.formState.errors.yeniSifreTekrar && (
                  <p className="mt-1 text-sm text-red-400">{onayForm.formState.errors.yeniSifreTekrar.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={yukleniyor}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {yukleniyor && <Loader2 className="w-4 h-4 animate-spin" />}
                Şifreyi Güncelle
              </button>
              <button
                type="button"
                onClick={() => setAdim('talep')}
                className="w-full text-sm text-gray-400 hover:text-gray-200"
              >
                Kodu tekrar gönder
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-400">
            <Link href="/giris" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Giriş sayfasına dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
