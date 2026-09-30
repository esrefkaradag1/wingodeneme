'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  School,
  User,
  Users,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import AnaSiteyeDonButonu from '@/components/auth/AnaSiteyeDonButonu';

const kurumSchema = z.object({
  kurumAdi: z.string().min(2, 'Kurum adı gerekli'),
  ad: z.string().min(2, 'Yetkili adı en az 2 karakter'),
  soyad: z.string().min(2, 'Yetkili soyadı en az 2 karakter'),
  email: z.string().email('Geçerli e-posta girin'),
  telefon: z.string().min(10, 'Telefon gerekli'),
  sehir: z.string().optional(),
  beklenenOgrenci: z.string().optional(),
  basvuruNotu: z.string().optional(),
  sifre: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .refine((v) => /[A-Z]/.test(v), 'Şifre en az bir büyük harf içermeli')
    .refine((v) => /[0-9]/.test(v), 'Şifre en az bir rakam içermeli'),
});

type KurumFormu = z.infer<typeof kurumSchema>;

const AVANTAJLAR = [
  { ikon: GraduationCap, metin: 'Kendi öğretmen hesaplarınızı açın, sınıflara atayın' },
  { ikon: Users, metin: 'Öğrencilerinizi ekleyin veya kurum kodunuzla bağlayın' },
  { ikon: School, metin: 'Sınıf bazlı karşılaştırma ve bireysel analizleri görün' },
];

export default function KurumBasvuruSayfasi() {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sifreGoster, setSifreGoster] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);
  const { girisYap } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KurumFormu>({ resolver: zodResolver(kurumSchema) });

  const onSubmit = async (veri: KurumFormu) => {
    setYukleniyor(true);
    try {
      const yanit = await authApi.kayitKurum({
        kurumAdi: veri.kurumAdi.trim(),
        ad: veri.ad.trim(),
        soyad: veri.soyad.trim(),
        email: veri.email.trim().toLowerCase(),
        sifre: veri.sifre,
        telefon: veri.telefon.trim(),
        sehir: veri.sehir?.trim() || undefined,
        beklenenOgrenci: veri.beklenenOgrenci?.trim() || undefined,
        basvuruNotu: veri.basvuruNotu?.trim() || undefined,
      });
      const { kullanici, token, refreshToken } = yanit.data.veri;
      girisYap({ kullanici, token, refreshToken });
      setGonderildi(true);
      toast.basarili('Başvurunuz alındı', 'Yönetici onayından sonra kurum paneliniz açılacak.');
    } catch (err: unknown) {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || 'Başvuru gönderilemedi';
      toast.hata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  };

  const inputSinifi = (hatali: boolean) =>
    `w-full rounded-xl border bg-slate-50 pl-10 pr-3 py-3 text-sm text-edu-ink outline-none placeholder:text-slate-400 ${
      hatali ? 'border-red-400/60' : 'border-edu-line focus:border-wingo-400'
    }`;

  if (gonderildi) {
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
          <div className="rounded-3xl border border-edu-line bg-black/40 p-8 text-center backdrop-blur-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Başvurunuz alındı</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">
              Kurum başvurunuz yönetici incelemesine gönderildi. Onaylandığında bildirim alacak ve kurum
              panelinize erişebileceksiniz.
            </p>
            <button
              onClick={() => router.push('/kurum/dashboard')}
              className="mt-6 w-full rounded-xl bg-wingo-600 py-3 text-sm font-bold text-edu-ink hover:bg-wingo-700"
            >
              Başvuru durumumu gör
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-wingo-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-wingo-700">
            <Building2 className="h-3.5 w-3.5" /> Kurumsal
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Kurum başvurusu</h1>
          <p className="mt-2 text-sm text-slate-400">
            Okul, dershane ve kurslar için. Başvurunuz yönetici tarafından onaylandığında kurum paneliniz açılır.
          </p>

          <ul className="mt-4 space-y-2">
            {AVANTAJLAR.map((a) => (
              <li key={a.metin} className="flex items-start gap-2 text-xs text-slate-300">
                <a.ikon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-wingo-700" />
                {a.metin}
              </li>
            ))}
          </ul>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Kurum adı</span>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input {...register('kurumAdi')} className={inputSinifi(!!errors.kurumAdi)} />
              </div>
              {errors.kurumAdi && <p className="mt-1 text-xs text-red-300">{errors.kurumAdi.message}</p>}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">Yetkili adı</span>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input {...register('ad')} className={inputSinifi(!!errors.ad)} />
                </div>
                {errors.ad && <p className="mt-1 text-xs text-red-300">{errors.ad.message}</p>}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">Yetkili soyadı</span>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input {...register('soyad')} className={inputSinifi(!!errors.soyad)} />
                </div>
                {errors.soyad && <p className="mt-1 text-xs text-red-300">{errors.soyad.message}</p>}
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Kurumsal e-posta</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input type="email" {...register('email')} className={inputSinifi(!!errors.email)} />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email.message}</p>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Telefon</span>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input {...register('telefon')} className={inputSinifi(!!errors.telefon)} />
              </div>
              {errors.telefon && <p className="mt-1 text-xs text-red-300">{errors.telefon.message}</p>}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">Şehir</span>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input {...register('sehir')} className={inputSinifi(false)} />
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">Beklenen öğrenci</span>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="number" min={1} {...register('beklenenOgrenci')} className={inputSinifi(false)} />
                </div>
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Başvuru notu (opsiyonel)</span>
              <textarea
                {...register('basvuruNotu')}
                rows={2}
                placeholder="Kurumunuz, kademeleriniz ve beklentileriniz hakkında kısa bilgi"
                className="w-full rounded-xl border border-edu-line bg-slate-50 px-3 py-3 text-sm text-edu-ink outline-none placeholder:text-slate-400 focus:border-wingo-400"
              />
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-wingo-600 py-3 text-sm font-bold text-edu-ink hover:bg-wingo-700 disabled:opacity-60"
            >
              {yukleniyor ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Başvuruyu gönder
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Bireysel koç musunuz?{' '}
            <Link href="/kayit/koc" className="font-semibold text-teal-300 hover:underline">
              Koç kaydı
            </Link>
            {' · '}
            <Link href="/giris" className="font-semibold text-wingo-700 hover:underline">
              Giriş yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
