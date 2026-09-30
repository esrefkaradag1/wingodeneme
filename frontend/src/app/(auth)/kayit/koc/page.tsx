'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Phone, User, Lock, Eye, EyeOff, GraduationCap, Building2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import AnaSiteyeDonButonu from '@/components/auth/AnaSiteyeDonButonu';

const kocSchema = z.object({
  ad: z.string().min(2, 'Ad en az 2 karakter'),
  soyad: z.string().min(2, 'Soyad en az 2 karakter'),
  email: z.string().email('Geçerli e-posta girin'),
  telefon: z
    .string()
    .min(1, 'Telefon zorunlu')
    .refine((v) => {
      const r = v.replace(/\D/g, '');
      const son = r.startsWith('90') && r.length === 12 ? r.slice(2) : r.startsWith('0') ? r.slice(1) : r;
      return son.length === 10 && son.startsWith('5');
    }, 'Geçerli cep telefonu girin (5XX XXX XX XX)'),
  sifre: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .refine((v) => /[A-Z]/.test(v), 'Şifre en az bir büyük harf içermeli')
    .refine((v) => /[0-9]/.test(v), 'Şifre en az bir rakam içermeli'),
});

type KocFormu = z.infer<typeof kocSchema>;

export default function KocKayitSayfasi() {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sifreGoster, setSifreGoster] = useState(false);
  const { girisYap } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KocFormu>({ resolver: zodResolver(kocSchema) });

  const onSubmit = async (veri: KocFormu) => {
    setYukleniyor(true);
    try {
      const yanit = await authApi.kayitKoc({
        ad: veri.ad.trim(),
        soyad: veri.soyad.trim(),
        email: veri.email.trim().toLowerCase(),
        sifre: veri.sifre,
        telefon: veri.telefon?.trim() || undefined,
        tip: 'BIREYSEL',
      });
      const { kullanici, token, refreshToken } = yanit.data.veri;
      girisYap({ kullanici, token, refreshToken });
      toast.basarili(
        'Koç hesabınız hazır!',
        kullanici.referansKod
          ? `Referans kodunuz: ${kullanici.referansKod}`
          : 'Öğrencilerinizi panelden takip edebilirsiniz.',
      );
      router.push('/koc/dashboard');
    } catch (err: unknown) {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || 'Kayıt başarısız';
      toast.hata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  };

  const inputSinifi = (hatali: boolean) =>
    `w-full rounded-xl border bg-slate-50 pl-10 pr-3 py-3 text-sm text-edu-ink outline-none placeholder:text-slate-400 ${
      hatali ? 'border-red-400/60' : 'border-edu-line focus:border-teal-400/50'
    }`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-edu-bg text-edu-ink">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 12% 10%, rgba(13, 148, 136, 0.12) 0, transparent 32%), radial-gradient(circle at 90% 8%, rgba(234, 88, 12, 0.08) 0, transparent 28%), #F3FAF8',
        }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
        <AnaSiteyeDonButonu />
        <div className="mt-6 rounded-3xl border border-edu-line bg-black/40 p-6 backdrop-blur-md sm:p-8">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-300">
            <GraduationCap className="h-3.5 w-3.5" /> Bireysel koç
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Koç kaydı</h1>
          <p className="mt-2 text-sm text-slate-400">
            Özel ders öğretmeni veya bireysel koçsanız burası size göre. Öğrencilerinizi referans kodunuzla
            bağlayın, deneme sonuçlarını ve analizlerini takip edin. Hesabınız anında açılır.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">Ad</span>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input {...register('ad')} className={inputSinifi(!!errors.ad)} />
                </div>
                {errors.ad && <p className="mt-1 text-xs text-red-300">{errors.ad.message}</p>}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">Soyad</span>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input {...register('soyad')} className={inputSinifi(!!errors.soyad)} />
                </div>
                {errors.soyad && <p className="mt-1 text-xs text-red-300">{errors.soyad.message}</p>}
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">E-posta</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input type="email" {...register('email')} className={inputSinifi(!!errors.email)} />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email.message}</p>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Telefon *</span>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  {...register('telefon')}
                  type="tel"
                  inputMode="numeric"
                  placeholder="05XX XXX XX XX"
                  className={inputSinifi(!!errors.telefon)}
                />
              </div>
              {errors.telefon && <p className="mt-1 text-xs text-red-300">{errors.telefon.message}</p>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Şifre</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={sifreGoster ? 'text' : 'password'}
                  {...register('sifre')}
                  className={`${inputSinifi(!!errors.sifre)} pr-10`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  onClick={() => setSifreGoster((v) => !v)}
                >
                  {sifreGoster ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.sifre && <p className="mt-1 text-xs text-red-300">{errors.sifre.message}</p>}
            </label>

            <button
              type="submit"
              disabled={yukleniyor}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-wingo-600 py-3 text-sm font-bold text-white hover:bg-teal-400 disabled:opacity-60"
            >
              {yukleniyor ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Hesap oluştur
            </button>
          </form>

          <Link
            href="/kayit/kurum"
            className="mt-5 flex items-center gap-3 rounded-2xl border border-edu-line bg-slate-50 p-4 transition hover:border-indigo-400/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wingo-600/20 text-wingo-700">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="text-xs">
              <span className="block font-bold text-edu-ink">Okul, dershane veya kurs musunuz?</span>
              <span className="block text-slate-400">
                Kurum başvurusu yapın; onay sonrası kendi öğretmenlerinizi ve sınıflarınızı yönetin.
              </span>
            </span>
          </Link>

          <p className="mt-5 text-center text-xs text-slate-500">
            Zaten hesabınız var mı?{' '}
            <Link href="/giris" className="font-semibold text-teal-300 hover:underline">
              Giriş yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
