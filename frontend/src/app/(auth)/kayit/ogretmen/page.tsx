'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Loader2, GraduationCap, Home } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import AnaSiteyeDonButonu from '@/components/auth/AnaSiteyeDonButonu';
import { isKpssMode } from '@/lib/platform';

const AuthThreeBackground = dynamic(() => import('@/components/auth/AuthThreeBackground'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 -z-10 bg-[#070713]" />,
});

const LGS_BRANSLARI = [
  'Matematik', 'Fen Bilimleri', 'Türkçe',
  'İnkılap Tarihi ve Atatürkçülük', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce',
];
const YKS_BRANSLARI = [
  'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji',
  'Türkçe', 'Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe',
  'Din Kültürü ve Ahlak Bilgisi', 'İngilizce', 'Almanca', 'Fransızca',
];
const KPSS_BRANSLARI = [
  'Türkçe',
  'Matematik',
  'Tarih',
  'Coğrafya',
  'Vatandaşlık',
  'Güncel Bilgiler',
];

const KADEME_SECENEKLERI = [
  { value: 'YKS', label: 'YKS (TYT/AYT)' },
  { value: 'LGS', label: 'LGS' },
  { value: 'KPSS_LISANS', label: 'KPSS Lisans' },
  { value: 'KPSS_ONLISANS', label: 'KPSS Önlisans' },
  { value: 'KPSS_ORTAOGRETIM', label: 'KPSS Ortaöğretim' },
] as const;

type Kademe = (typeof KADEME_SECENEKLERI)[number]['value'];

function kademeBranslari(k: Kademe) {
  if (k === 'LGS') return LGS_BRANSLARI;
  if (k === 'YKS') return YKS_BRANSLARI;
  return KPSS_BRANSLARI;
}

const ogretmenSchema = z.object({
  ad: z.string().min(2, 'Ad en az 2 karakter'),
  soyad: z.string().min(2, 'Soyad en az 2 karakter'),
  email: z.string().email('Geçerli e-posta girin'),
  sifre: z.string().min(8, 'Şifre en az 8 karakter').regex(/[A-Z]/, 'Büyük harf içermeli').regex(/[0-9]/, 'Rakam içermeli'),
  telefon: z.string().optional(),
  ogretimTurleri: z.array(z.enum(['YKS', 'LGS', 'KPSS_LISANS', 'KPSS_ONLISANS', 'KPSS_ORTAOGRETIM'])).min(1, 'En az bir kademe seçin'),
  branslarByTur: z.record(z.array(z.string())).default({}),
}).superRefine((v, ctx) => {
  for (const tur of v.ogretimTurleri) {
    const list = Array.isArray(v.branslarByTur[tur]) ? v.branslarByTur[tur] : [];
    if (list.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['branslarByTur', tur],
        message: `${tur} için en az bir branş seçin`,
      });
    }
  }
});

type OgretmenFormu = z.infer<typeof ogretmenSchema>;

export default function OgretmenKayitSayfasi() {
  const [yukleniyor, setYukleniyor] = useState(false);
  const { girisYap } = useAuthStore();
  const router = useRouter();
  const kpssModu = isKpssMode();
  const gorunurKademeler = useMemo(
    () =>
      kpssModu
        ? KADEME_SECENEKLERI.filter((k) => k.value.startsWith('KPSS'))
        : KADEME_SECENEKLERI.filter((k) => k.value === 'YKS' || k.value === 'LGS'),
    [kpssModu],
  );
  const varsayilanKademe = kpssModu ? 'KPSS_LISANS' : 'YKS';

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<OgretmenFormu>({
    resolver: zodResolver(ogretmenSchema),
    defaultValues: { ogretimTurleri: [varsayilanKademe], branslarByTur: { [varsayilanKademe]: [] } as any },
  });

  const ogretimTurleri = (watch('ogretimTurleri') ?? []) as Kademe[];
  const branslarByTur = (watch('branslarByTur') ?? {}) as Record<string, string[]>;
  const branslarSayisi = useMemo(
    () => [...new Set(Object.values(branslarByTur).flat())].length,
    [branslarByTur],
  );

  const onSubmit = async (veri: OgretmenFormu) => {
    setYukleniyor(true);
    try {
      await authApi.kayitOgretmen({
        ...veri,
        email: veri.email.trim().toLowerCase(),
        ogretimTuru: veri.ogretimTurleri[0],
      });
      toast.basarili('Kayıt başvurunuz alındı!', 'Öğretmen hesabınız yönetici onayından sonra aktif edilecektir. Lütfen bekleyiniz.');
      router.push('/giris');
    } catch (err: unknown) {
      const mesaj = (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || 'Kayıt başarısız';
      toast.hata(mesaj);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <AuthThreeBackground mode={kpssModu ? 'kpss' : 'yks_lgs'} />
      <div className="pointer-events-none absolute inset-0 -z-[5] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(7,7,19,0.6)_100%)]" />
      <AnaSiteyeDonButonu />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <Home className="w-4 h-4" /> Ana sayfa
          </Link>
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-2xl">WingoSınav</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Öğretmen Kaydı</h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">
            Soru üretmek, sınav hazırlamak ve öğrenci performansı takip etmek için öğretmen panelinize erişin.
          </p>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-black/20">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Ad</label>
                <input {...register('ad')} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {errors.ad && <p className="mt-1 text-xs text-red-400">{errors.ad.message}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Soyad</label>
                <input {...register('soyad')} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {errors.soyad && <p className="mt-1 text-xs text-red-400">{errors.soyad.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">E-posta</label>
              <input {...register('email')} type="email" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ornek@email.com" />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Şifre</label>
              <input {...register('sifre')} type="password" autoComplete="new-password" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="En az 8 karakter, büyük harf ve rakam" />
              {errors.sifre && <p className="mt-1 text-xs text-red-400">{errors.sifre.message}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Telefon <span className="text-gray-500">(opsiyonel)</span></label>
              <input {...register('telefon')} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="05xx..." />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Kademe</label>
              <div className="grid grid-cols-2 gap-3">
                {gorunurKademeler.map((k) => {
                  const secili = ogretimTurleri.includes(k.value);
                  return (
                    <label
                      key={k.value}
                      className={`flex flex-col items-center justify-center px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                        secili
                          ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={secili}
                        onChange={() => {
                          const yeni = secili ? ogretimTurleri.filter((x) => x !== k.value) : [...ogretimTurleri, k.value];
                          setValue('ogretimTurleri', yeni as any, { shouldValidate: true });
                          const mevcut = (watch('branslarByTur') ?? {}) as Record<string, string[]>;
                          if (!mevcut[k.value]) {
                            setValue('branslarByTur', { ...mevcut, [k.value]: [] } as any, { shouldValidate: true });
                          }
                        }}
                        className="sr-only"
                      />
                      <span className="font-semibold">{k.label}</span>
                    </label>
                  );
                })}
              </div>
              {errors.ogretimTurleri && <p className="mt-1 text-xs text-red-400">{errors.ogretimTurleri.message as any}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">
                Branşlar {branslarSayisi > 0 && (
                  <span className="text-gray-500">({branslarSayisi} seçili)</span>
                )}
              </label>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 max-h-72 overflow-y-auto space-y-4">
                {ogretimTurleri.length === 0 ? (
                  <p className="text-xs text-gray-400">Önce kademe seçin.</p>
                ) : ogretimTurleri.map((tur) => {
                  const branslar = kademeBranslari(tur);
                  const seciliListe = branslarByTur[tur] ?? [];
                  const hata = (errors as any)?.branslarByTur?.[tur]?.message;
                  return (
                    <div key={tur} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-200">{tur}</span>
                        {hata ? <span className="text-[11px] text-red-400">{hata}</span> : null}
                      </div>
                      <div className="space-y-1">
                        {branslar.map((b) => {
                          const secili = seciliListe.includes(b);
                          return (
                            <label
                              key={b}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm ${
                                secili ? 'bg-amber-500/20 text-amber-100' : 'text-gray-300 hover:bg-white/5'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={secili}
                                onChange={() => {
                                  const yeni = secili ? seciliListe.filter((x) => x !== b) : [...seciliListe, b];
                                  setValue('branslarByTur', { ...branslarByTur, [tur]: yeni } as any, { shouldValidate: true });
                                }}
                                className="rounded border-white/20"
                              />
                              {b}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={yukleniyor}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 mt-2"
            >
              {yukleniyor && <Loader2 className="w-4 h-4 animate-spin" />}
              Öğretmen Hesabı Oluştur
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
            <p>
              Öğrenci misiniz?{' '}
              <Link href="/kayit" className="text-indigo-400 hover:text-indigo-300 font-medium">Öğrenci kaydı</Link>
            </p>
            <p>
              Zaten hesabınız var mı?{' '}
              <Link href="/giris" className="text-indigo-400 hover:text-indigo-300 font-medium">Giriş</Link>
            </p>
            <p>
              <Link href="/sifremi-unuttum" className="text-indigo-300 hover:text-indigo-200 font-medium">
                Şifremi unuttum
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
