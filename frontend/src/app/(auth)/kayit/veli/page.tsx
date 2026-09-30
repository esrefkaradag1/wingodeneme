'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Users, Mail, Phone, User, GraduationCap, BookOpen, Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import AnaSiteyeDonButonu from '@/components/auth/AnaSiteyeDonButonu';

const sifreKurali = (etiket: string) =>
  z.string()
    .min(8, `${etiket} en az 8 karakter olmalı`)
    .refine((v) => /[A-Z]/.test(v), `${etiket} en az bir büyük harf içermeli`)
    .refine((v) => /[0-9]/.test(v), `${etiket} en az bir rakam içermeli`);

const veliSchema = z.object({
  ad: z.string().min(2, 'Ad en az 2 karakter'),
  soyad: z.string().min(2, 'Soyad en az 2 karakter'),
  email: z.string().email('Geçerli e-posta girin'),
  telefon: z.string().refine((v) => v.replace(/\D/g, '').length >= 10, 'Geçerli telefon girin'),
  sifre: z.string().optional(),
}).superRefine((veri, ctx) => {
  if (!veri.sifre?.trim()) return;
  const sonuc = sifreKurali('Şifre').safeParse(veri.sifre);
  if (!sonuc.success) {
    ctx.addIssue({
      code: 'custom',
      message: sonuc.error.issues[0]?.message || 'Şifre geçersiz',
      path: ['sifre'],
    });
  }
});

type VeliFormu = z.infer<typeof veliSchema>;

export default function VeliKayitSayfasi() {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sifreGoster, setSifreGoster] = useState(false);
  const { girisYap } = useAuthStore();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<VeliFormu>({
    resolver: zodResolver(veliSchema),
  });

  const onSubmit = async (veri: VeliFormu) => {
    setYukleniyor(true);
    try {
      const temizVeri: Record<string, string> = {
        ad: veri.ad.trim(),
        soyad: veri.soyad.trim(),
        email: veri.email.trim().toLowerCase(),
        telefon: veri.telefon.trim(),
      };
      if (veri.sifre?.trim()) temizVeri.sifre = veri.sifre;
      const yanit = await authApi.kayitVeli(temizVeri as unknown as Record<string, unknown>);
      const { kullanici, token, refreshToken } = yanit.data.veri;
      girisYap({ kullanici, token, refreshToken });
      toast.basarili('Veli hesabınız hazır!', 'Giriş bilgileriniz e-posta adresinize gönderildi.');
      router.push('/veli/dashboard');
    } catch (err: unknown) {
      const mesaj = (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || 'Kayıt başarısız';
      toast.hata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  };

  const inputSinifi = (hatali: boolean, ikonlu = true) =>
    `w-full h-11 ${ikonlu ? 'pl-10' : 'px-4'} pr-4 bg-slate-50 border rounded-xl text-edu-ink text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
      hatali ? 'border-red-500/60 focus:ring-red-500/40' : 'border-edu-line focus:border-indigo-500/50 focus:ring-wingo-400/30 hover:border-white/20'
    }`;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 12% 10%, rgba(13, 148, 136, 0.12) 0, transparent 32%), radial-gradient(circle at 90% 8%, rgba(234, 88, 12, 0.08) 0, transparent 28%), #F3FAF8',
        }}
        aria-hidden
      />
      
      <AnaSiteyeDonButonu />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-edu-ink font-bold text-xl tracking-tight">WingoSınav</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-edu-ink tracking-tight">Veli Hesabı Oluştur</h1>
            <p className="text-edu-muted text-sm mt-2 max-w-md mx-auto">
              Deneme sonuçları, analiz ve gelişim özetlerini takip edin.
            </p>

            <div className="inline-flex p-1 mt-5 rounded-xl bg-slate-50 border border-edu-line backdrop-blur-sm">
              <Link href="/kayit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-edu-muted text-xs font-medium hover:text-edu-ink hover:bg-slate-50 transition-colors">
                <GraduationCap className="w-3.5 h-3.5" /> Öğrenci
              </Link>
              <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-wingo-50 text-wingo-700 text-xs font-semibold border border-wingo-200">
                <Users className="w-3.5 h-3.5" /> Veli
              </span>
              <Link href="/kayit/ogretmen" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-edu-muted text-xs font-medium hover:text-edu-ink hover:bg-slate-50 transition-colors">
                <BookOpen className="w-3.5 h-3.5" /> Öğretmen
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-edu-line bg-white backdrop-blur-xl shadow-2xl shadow-slate-200/70 p-6 sm:p-8">
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3 mb-5">
              <p className="text-xs text-slate-400 leading-relaxed">
                Giriş bilgileriniz e-posta adresinize gönderilir. Şifre belirlemezseniz telefon numaranızın son 6 hanesi kullanılır.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1.5">Ad</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input {...register('ad')} className={inputSinifi(!!errors.ad)} placeholder="Mehmet" />
                  </div>
                  {errors.ad && <p className="mt-1 text-xs text-red-400">{errors.ad.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1.5">Soyad</label>
                  <input {...register('soyad')} className={inputSinifi(!!errors.soyad, false)} placeholder="Yılmaz" />
                  {errors.soyad && <p className="mt-1 text-xs text-red-400">{errors.soyad.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5">E-posta</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input {...register('email')} type="email" className={inputSinifi(!!errors.email)} placeholder="veli@email.com" />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input {...register('telefon')} type="tel" className={inputSinifi(!!errors.telefon)} placeholder="05xx xxx xx xx" />
                </div>
                {errors.telefon && <p className="mt-1 text-xs text-red-400">{errors.telefon.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5">Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    {...register('sifre')}
                    type={sifreGoster ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`${inputSinifi(!!errors.sifre)} !pr-10`}
                    placeholder="Boş bırakırsanız telefonun son 6 hanesi"
                  />
                  <button
                    type="button"
                    onClick={() => setSifreGoster((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={sifreGoster ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {sifreGoster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.sifre && <p className="mt-1 text-xs text-red-400">{errors.sifre.message}</p>}
              </div>

              <button
                type="submit"
                disabled={yukleniyor}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-wingo-600 to-wingo-500 hover:from-wingo-700 hover:to-wingo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-wingo-600/20 disabled:opacity-60"
              >
                {yukleniyor && <Loader2 className="w-4 h-4 animate-spin" />}
                Veli Hesabı Oluştur
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/8 text-center text-sm text-slate-500 space-y-2">
              <p>
                Zaten hesabınız var mı?{' '}
                <Link href="/giris" className="text-indigo-400 hover:text-wingo-700 font-medium">Giriş Yapın</Link>
              </p>
              <Link href="/sifremi-unuttum" className="text-slate-500 hover:text-slate-300 text-xs">Şifremi unuttum</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
