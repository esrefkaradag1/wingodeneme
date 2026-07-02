'use client';

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Loader2, ChevronRight, ChevronLeft, Users, GraduationCap,
  User, School, Mail, Lock, MapPin, Building2, Target, BookOpen, Phone,
  Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import { OGRENCI_SINIF_SECENEKLERI, siniftanOgretimTuru } from '@/lib/ogrenciKademe';
import AnaSiteyeDonButonu from '@/components/auth/AnaSiteyeDonButonu';

const sifreKurali = (etiket: string) =>
  z.string()
    .min(8, `${etiket} en az 8 karakter olmalı`)
    .refine((v) => /[A-Z]/.test(v), `${etiket} en az bir büyük harf içermeli`)
    .refine((v) => /[0-9]/.test(v), `${etiket} en az bir rakam içermeli`);

const kayitSchema = z.object({
  ad: z.string().min(2, 'Ad en az 2 karakter'),
  soyad: z.string().min(2, 'Soyad en az 2 karakter'),
  email: z.string().email('Geçerli e-posta girin'),
  sifre: sifreKurali('Şifre'),
  telefon: z.string().optional(),
  okul: z.string().optional(),
  sehir: z.string().optional(),
  sinif: z.string().min(1, 'Sınıf seçin'),
  ogretimTuru: z.enum(['YKS', 'LGS']).optional(),
  hedefUniversite: z.string().optional(),
  hedefBolum: z.string().optional(),
  veliEmail: z.union([z.literal(''), z.string().email('Geçerli veli e-postası')]).optional(),
  veliTelefon: z.string().optional(),
  veliAd: z.string().optional(),
  veliSoyad: z.string().optional(),
  veliSifre: z.string().optional(),
  veliMevcutHesap: z.boolean().optional(),
}).superRefine((veri, ctx) => {
  const veliEmail = (veri.veliEmail || '').trim();
  if (!veliEmail) return;

  if (!veri.veliMevcutHesap) {
    if (!veri.veliAd || veri.veliAd.trim().length < 2) {
      ctx.addIssue({ code: 'custom', message: 'Veli adı en az 2 karakter', path: ['veliAd'] });
    }
    if (!veri.veliSoyad || veri.veliSoyad.trim().length < 2) {
      ctx.addIssue({ code: 'custom', message: 'Veli soyadı en az 2 karakter', path: ['veliSoyad'] });
    }
    const telRakam = (veri.veliTelefon || '').replace(/\D/g, '');
    if (telRakam.length < 10) {
      ctx.addIssue({ code: 'custom', message: 'Veli telefonu geçerli olmalı (10+ hane)', path: ['veliTelefon'] });
    }
    if (veri.veliSifre?.trim()) {
      const sifreSonuc = sifreKurali('Veli şifresi').safeParse(veri.veliSifre);
      if (!sifreSonuc.success) {
        ctx.addIssue({
          code: 'custom',
          message: sifreSonuc.error.issues[0]?.message || 'Veli şifresi geçersiz',
          path: ['veliSifre'],
        });
      }
    }
  }
});

const POPULER_UNIVERSITELER = [
  'İstanbul Teknik Üniversitesi', 'Orta Doğu Teknik Üniversitesi', 'Boğaziçi Üniversitesi',
  'Hacettepe Üniversitesi', 'Koç Üniversitesi', 'Bilkent Üniversitesi', 'Sabancı Üniversitesi',
  'İstanbul Üniversitesi', 'Yıldız Teknik Üniversitesi', 'Ege Üniversitesi', 'Dokuz Eylül Üniversitesi',
  'Ankara Üniversitesi', 'Marmara Üniversitesi', 'Gazi Üniversitesi', 'Gebze Teknik Üniversitesi',
  'Bursa Uludağ Üniversitesi', 'Akdeniz Üniversitesi', 'Çukurova Üniversitesi', 'Selçuk Üniversitesi',
  'Erciyes Üniversitesi', 'Atatürk Üniversitesi'
];

const POPULER_LISELER = [
  'Galatasaray Lisesi', 'İstanbul Erkek Lisesi', 'Ankara Fen Lisesi', 'Kabataş Erkek Lisesi',
  'İstanbul Atatürk Fen Lisesi', 'İzmir Fen Lisesi', 'Bursa TOFAŞ Fen Lisesi', 'Çapa Fen Lisesi',
  'Cağaloğlu Anadolu Lisesi', 'Hüseyin Avni Sözen Anadolu Lisesi', 'Kadıköy Anadolu Lisesi',
  'Adana Fen Lisesi', 'Ankara Atatürk Lisesi', 'İzmir Atatürk Lisesi', 'Kayseri Fen Lisesi',
  'Gaziantep Fen Lisesi', 'Denizli Erbakır Fen Lisesi', 'Kocaeli Fen Lisesi', 'Sakarya Cevat Ayhan Fen Lisesi',
  'Özel Beylikdüzü Key Koleji Anadolu Lisesi', 'Özel Özgün Bilgi Anadolu Lisesi', 'Bilgin Özel Anadolu Lisesi'
];

const POPULER_BOLUMLER = [
  'Bilgisayar Mühendisliği', 'Elektrik-Elektronik Mühendisliği', 'Makine Mühendisliği',
  'Endüstri Mühendisliği', 'Tıp', 'Diş Hekimliği', 'Hukuk', 'Psikoloji', 'Mimarlık',
  'İşletme', 'Eczacılık', 'Öğretmenlik', 'Moleküler Biyoloji ve Genetik', 'İnşaat Mühendisliği',
];

type KayitFormu = z.infer<typeof kayitSchema>;

const ADIM1_ALANLARI = ['ad', 'soyad', 'email', 'sifre'] as const;
const ADIM2_ALANLARI = ['sinif'] as const;
const ADIM3_ALANLARI = ['veliAd', 'veliSoyad', 'veliEmail', 'veliTelefon', 'veliSifre'] as const;

const ALAN_ETIKET: Record<string, string> = {
  ad: 'Ad',
  soyad: 'Soyad',
  email: 'E-posta',
  sifre: 'Şifre',
  sinif: 'Sınıf',
  veliAd: 'Veli adı',
  veliSoyad: 'Veli soyadı',
  veliEmail: 'Veli e-posta',
  veliTelefon: 'Veli telefon',
  veliSifre: 'Veli şifresi',
};

const ADIMLAR = [
  { no: 1, baslik: 'Kişisel', alt: 'Hesap bilgileri', icon: User },
  { no: 2, baslik: 'Eğitim', alt: 'Okul ve hedef', icon: School },
  { no: 3, baslik: 'Veli', alt: 'İsteğe bağlı', icon: Users },
] as const;

function inputSinifi(hatali: boolean, ikonlu = true) {
  return `w-full h-11 ${ikonlu ? 'pl-10' : 'px-4'} pr-4 bg-slate-950/50 border rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
    hatali ? 'border-red-500/60 focus:ring-red-500/40' : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/30 hover:border-white/20'
  }`;
}

function selectSinifi(hatali: boolean) {
  return `w-full h-11 px-4 bg-slate-950/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
    hatali ? 'border-red-500/60 focus:ring-red-500/40' : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/30 hover:border-white/20'
  }`;
}

function FormAlan({
  label, hint, error, required, icon: Icon, children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-sm font-medium text-slate-200">
        {label}
        {required && <span className="text-indigo-400">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-500 -mt-0.5">{hint}</p>}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        )}
        {children}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function AdimGostergesi({ adim }: { adim: number }) {
  const yuzde = ((adim - 1) / (ADIMLAR.length - 1)) * 100;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {ADIMLAR.map((a) => {
          const aktif = a.no === adim;
          const tamam = a.no < adim;
          const Icon = a.icon;
          return (
            <div key={a.no} className={`flex flex-col items-center gap-1.5 flex-1 ${a.no < ADIMLAR.length ? '' : ''}`}>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  aktif
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105'
                    : tamam
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-white/5 text-slate-500 border border-white/10'
                }`}
              >
                {tamam ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <div className="text-center hidden sm:block">
                <p className={`text-xs font-semibold ${aktif ? 'text-white' : tamam ? 'text-indigo-300' : 'text-slate-500'}`}>
                  {a.baslik}
                </p>
                <p className="text-[10px] text-slate-500">{a.alt}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${yuzde}%` }}
        />
      </div>
      <p className="text-center text-xs text-slate-500 mt-2 sm:hidden">Adım {adim} / 3 — {ADIMLAR[adim - 1].baslik}</p>
    </div>
  );
}

function SifreKurallari({ sifre }: { sifre: string }) {
  const kurallar = [
    { ok: sifre.length >= 8, metin: 'En az 8 karakter' },
    { ok: /[A-Z]/.test(sifre), metin: 'Bir büyük harf (A-Z)' },
    { ok: /[0-9]/.test(sifre), metin: 'Bir rakam (0-9)' },
  ];
  if (!sifre) return null;
  return (
    <ul className="mt-2 space-y-1">
      {kurallar.map((k) => (
        <li key={k.metin} className={`flex items-center gap-1.5 text-xs ${k.ok ? 'text-emerald-400' : 'text-slate-500'}`}>
          <CheckCircle2 className={`w-3 h-3 ${k.ok ? 'opacity-100' : 'opacity-30'}`} />
          {k.metin}
        </li>
      ))}
    </ul>
  );
}

function adimHatalari(errors: FieldErrors<KayitFormu>, alanlar: readonly (keyof KayitFormu)[]) {
  return alanlar
    .filter((alan) => errors[alan]?.message)
    .map((alan) => ({
      alan,
      etiket: ALAN_ETIKET[alan] || alan,
      mesaj: String(errors[alan]?.message),
    }));
}

function HataOzeti({ hatalar }: { hatalar: { etiket: string; mesaj: string }[] }) {
  if (hatalar.length === 0) return null;
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3" role="alert">
      <p className="flex items-center gap-1.5 text-red-300 text-sm font-medium mb-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Lütfen şu alanları düzeltin
      </p>
      <ul className="space-y-1">
        {hatalar.map((h) => (
          <li key={h.etiket} className="text-red-400/90 text-xs flex gap-1.5">
            <span className="text-red-300 font-medium shrink-0">{h.etiket}:</span>
            <span>{h.mesaj}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function KayitSayfasi() {
  const [adim, setAdim] = useState(1);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sifreGoster, setSifreGoster] = useState(false);
  const [veliSifreGoster, setVeliSifreGoster] = useState(false);
  const [hedefListeAcik, setHedefListeAcik] = useState(false);
  const { girisYap } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    setError,
    formState: { errors },
  } = useForm<KayitFormu>({
    resolver: zodResolver(kayitSchema),
    defaultValues: { sinif: '', veliMevcutHesap: false },
    mode: 'onTouched',
  });

  const sinif = watch('sinif');
  const sifre = watch('sifre') || '';
  const veliEmail = watch('veliEmail');
  const veliMevcutHesap = watch('veliMevcutHesap');
  const veliBilgisiVar = Boolean((veliEmail || '').trim());
  const ogretimTuru = useMemo(() => siniftanOgretimTuru(sinif) ?? 'YKS', [sinif]);

  useEffect(() => {
    const tur = siniftanOgretimTuru(sinif);
    if (tur) setValue('ogretimTuru', tur);
  }, [sinif, setValue]);

  const apiHatasiniAlanaYaz = (mesaj: string) => {
    const m = mesaj.toLowerCase();
    if (/e-posta.*kayıtlı|email.*kayıtlı|zaten kayıtlı/.test(m)) {
      setError('email', { type: 'server', message: mesaj });
      setAdim(1);
      return true;
    }
    if (/veli e-posta|veli.*hesap/.test(m)) {
      setError('veliEmail', { type: 'server', message: mesaj });
      setAdim(3);
      return true;
    }
    if (/veli.*telefon|telefon.*veli/.test(m)) {
      setError('veliTelefon', { type: 'server', message: mesaj });
      setAdim(3);
      return true;
    }
    if (/veli.*şifre|veli.*sifre|yeni veli/.test(m)) {
      setError('veliSifre', { type: 'server', message: mesaj });
      setAdim(3);
      return true;
    }
    if (/şifre|sifre|password/.test(m)) {
      setError('sifre', { type: 'server', message: mesaj });
      setAdim(1);
      return true;
    }
    return false;
  };

  const onInvalid = (formErrors: FieldErrors<KayitFormu>) => {
    if (ADIM1_ALANLARI.some((a) => formErrors[a])) {
      setAdim(1);
    } else if (ADIM2_ALANLARI.some((a) => formErrors[a])) {
      setAdim(2);
    } else if (ADIM3_ALANLARI.some((a) => formErrors[a])) {
      setAdim(3);
    }
    toast.hata('Kayıt tamamlanamadı. İşaretli alanları kontrol edin.');
  };

  const devamAdim1 = async () => {
    const gecerli = await trigger([...ADIM1_ALANLARI]);
    if (gecerli) setAdim(2);
    else toast.hata('Kişisel bilgilerde eksik veya hatalı alan var.');
  };

  const devamAdim2 = async () => {
    const gecerli = await trigger([...ADIM2_ALANLARI]);
    if (gecerli) setAdim(3);
    else toast.hata('Sınıf seçimi zorunludur.');
  };

  const onSubmit = async (veri: KayitFormu) => {
    setYukleniyor(true);
    try {
      const tur = siniftanOgretimTuru(veri.sinif) ?? 'YKS';
      const payload: Record<string, unknown> = {
        ...veri,
        ogretimTuru: tur,
        email: veri.email.trim().toLowerCase(),
      };
      const veliEmailNorm = typeof veri.veliEmail === 'string' ? veri.veliEmail.trim().toLowerCase() : '';
      if (veliEmailNorm) {
        payload.veliEmail = veliEmailNorm;
        if (veri.veliMevcutHesap) {
          delete payload.veliAd;
          delete payload.veliSoyad;
          delete payload.veliTelefon;
          delete payload.veliSifre;
        } else {
          payload.veliTelefon = veri.veliTelefon;
          if (veri.veliSifre?.trim()) {
            payload.veliSifre = veri.veliSifre;
          } else {
            delete payload.veliSifre;
          }
        }
      } else {
        delete payload.veliEmail;
        delete payload.veliAd;
        delete payload.veliSoyad;
        delete payload.veliTelefon;
        delete payload.veliSifre;
      }
      delete payload.veliMevcutHesap;
      if (veri.ogretimTuru === 'LGS') {
        delete payload.hedefBolum;
      }
      const yanit = await authApi.kayit(payload);
      const { kullanici, token, refreshToken } = yanit.data.veri;
      girisYap({ kullanici, token, refreshToken });
      toast.basarili('Hesabınız oluşturuldu!', 'WingoSınav\'a hoş geldiniz');
      router.push('/dashboard');
    } catch (err: any) {
      const mesaj = err?.response?.data?.mesaj || err?.message || 'Kayıt başarısız';
      const alanaYazildi = apiHatasiniAlanaYaz(mesaj);
      toast.hata(alanaYazildi ? mesaj : `Kayıt başarısız: ${mesaj}`);
    } finally {
      setYukleniyor(false);
    }
  };

  const btnBirincil = 'h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed';
  const btnIkincil = 'h-11 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium flex items-center justify-center gap-2 transition-all border border-white/10';

  return (
    <div className="min-h-screen bg-[#0a0f1e] relative overflow-hidden">
      <AnaSiteyeDonButonu />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.25),transparent)]" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl">
          {/* Üst başlık */}
          <div className="text-center mb-6 sm:mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">WingoSınav</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Öğrenci Hesabı Oluştur</h1>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              Deneme çöz, analiz gör, hedefinle ilerle.
            </p>

            {/* Kayıt türü sekmeleri */}
            <div className="inline-flex p-1 mt-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-200 text-xs font-semibold border border-indigo-500/30">
                <GraduationCap className="w-3.5 h-3.5" /> Öğrenci
              </span>
              <Link href="/kayit/veli" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-slate-400 text-xs font-medium hover:text-white hover:bg-white/5 transition-colors">
                <Users className="w-3.5 h-3.5" /> Veli
              </Link>
              <Link href="/kayit/ogretmen" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-slate-400 text-xs font-medium hover:text-white hover:bg-white/5 transition-colors">
                <BookOpen className="w-3.5 h-3.5" /> Öğretmen
              </Link>
            </div>
          </div>

          {/* Form kartı */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-2xl shadow-black/20 p-6 sm:p-8">
            <AdimGostergesi adim={adim} />

            <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
              {/* Adım 1 */}
              {adim === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-1">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">Kişisel Bilgiler</h2>
                      <p className="text-xs text-slate-500">Giriş için kullanacağınız bilgiler</p>
                    </div>
                  </div>
                  <HataOzeti hatalar={adimHatalari(errors, ADIM1_ALANLARI)} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormAlan label="Ad" required error={errors.ad?.message} icon={User}>
                      <input {...register('ad')} className={inputSinifi(!!errors.ad)} placeholder="Ahmet" aria-invalid={!!errors.ad} />
                    </FormAlan>
                    <FormAlan label="Soyad" required error={errors.soyad?.message}>
                      <input {...register('soyad')} className={inputSinifi(!!errors.soyad, false)} placeholder="Yılmaz" aria-invalid={!!errors.soyad} />
                    </FormAlan>
                  </div>

                  <FormAlan label="E-posta" required error={errors.email?.message} icon={Mail}>
                    <input {...register('email')} type="email" className={inputSinifi(!!errors.email)} placeholder="ornek@email.com" aria-invalid={!!errors.email} />
                  </FormAlan>

                  <FormAlan label="Şifre" required error={errors.sifre?.message} icon={Lock}>
                    <input
                      {...register('sifre')}
                      type={sifreGoster ? 'text' : 'password'}
                      className={`${inputSinifi(!!errors.sifre)} !pr-10`}
                      placeholder="Güçlü bir şifre oluşturun"
                      aria-invalid={!!errors.sifre}
                    />
                    <button
                      type="button"
                      onClick={() => setSifreGoster((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      aria-label={sifreGoster ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {sifreGoster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </FormAlan>
                  <SifreKurallari sifre={sifre} />

                  <button type="button" onClick={devamAdim1} className={`w-full ${btnBirincil}`}>
                    Devam <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Adım 2 */}
              {adim === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-1">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                      <School className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">Eğitim Bilgileri</h2>
                      <p className="text-xs text-slate-500">Okulunuz ve sınav hedefiniz</p>
                    </div>
                  </div>
                  <HataOzeti hatalar={adimHatalari(errors, ADIM2_ALANLARI)} />

                  <FormAlan label="Okul" icon={Building2}>
                    <input
                      {...register('okul')}
                      list={ogretimTuru === 'LGS' ? 'lgs-okul-listesi' : undefined}
                      className={inputSinifi(false)}
                      placeholder="Okul adınız"
                    />
                    {ogretimTuru === 'LGS' && (
                      <datalist id="lgs-okul-listesi">
                        {POPULER_LISELER.map((okul) => <option key={okul} value={okul} />)}
                      </datalist>
                    )}
                  </FormAlan>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormAlan label="Şehir" icon={MapPin}>
                      <input {...register('sehir')} className={inputSinifi(false)} placeholder="Ankara" />
                    </FormAlan>
                    <FormAlan label="Sınıf" required hint="6–8. sınıf LGS · 9–12 ve mezun YKS" error={errors.sinif?.message}>
                      <select {...register('sinif')} className={selectSinifi(!!errors.sinif)} aria-invalid={!!errors.sinif}>
                        <option value="">Sınıf seçin</option>
                        {OGRENCI_SINIF_SECENEKLERI.map((s) => (
                          <option key={s.value} value={s.value}>{s.etiket}</option>
                        ))}
                      </select>
                    </FormAlan>
                  </div>

                  {sinif && (
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${
                      ogretimTuru === 'LGS'
                        ? 'bg-sky-500/10 border-sky-500/25 text-sky-300'
                        : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300'
                    }`}>
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      {ogretimTuru === 'LGS' ? 'LGS paneli açılacak' : 'YKS paneli açılacak'}
                    </div>
                  )}

                  <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
                    <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Hedeflerin <span className="text-slate-600">(isteğe bağlı)</span>
                    </p>

                    <FormAlan label={ogretimTuru === 'LGS' ? 'Hedef Lise' : 'Hedef Üniversite'} icon={Building2}>
                      <input
                        {...register('hedefUniversite')}
                        autoComplete="off"
                        onFocus={() => setHedefListeAcik(true)}
                        onBlur={() => setTimeout(() => setHedefListeAcik(false), 200)}
                        className={inputSinifi(false)}
                        placeholder={ogretimTuru === 'LGS' ? 'Lise ara veya yaz...' : 'Üniversite ara veya yaz...'}
                      />
                      {hedefListeAcik && (
                        <div className="absolute z-50 w-full mt-1.5 bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                          {(ogretimTuru === 'LGS' ? POPULER_LISELER : POPULER_UNIVERSITELER).map((okul) => (
                            <button
                              key={okul}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setValue('hedefUniversite', okul, { shouldDirty: true });
                                setHedefListeAcik(false);
                              }}
                              className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-indigo-600/80 hover:text-white transition-colors first:rounded-t-xl last:rounded-b-xl"
                            >
                              {okul}
                            </button>
                          ))}
                        </div>
                      )}
                    </FormAlan>

                    {ogretimTuru === 'YKS' && (
                      <FormAlan label="Hedef Bölüm" icon={BookOpen}>
                        <input
                          {...register('hedefBolum')}
                          list="yks-bolum-listesi"
                          autoComplete="off"
                          className={inputSinifi(false)}
                          placeholder="Bölüm seçin veya yazın..."
                        />
                        <datalist id="yks-bolum-listesi">
                          {POPULER_BOLUMLER.map((bolum) => <option key={bolum} value={bolum} />)}
                        </datalist>
                      </FormAlan>
                    )}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setAdim(1)} className={`flex-1 ${btnIkincil}`}>
                      <ChevronLeft className="w-4 h-4" /> Geri
                    </button>
                    <button type="button" onClick={devamAdim2} className={`flex-1 ${btnBirincil}`}>
                      Devam <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Adım 3 */}
              {adim === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-1">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">Veli Bilgileri</h2>
                      <p className="text-xs text-slate-500">İsteğe bağlı — veli takibi için</p>
                    </div>
                  </div>
                  <HataOzeti hatalar={adimHatalari(errors, ADIM3_ALANLARI)} />

                  <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Veli bilgilerini doldurursanız veli paneli otomatik açılır ve öğrenci hesabına bağlanır.
                      Giriş bilgileri veli e-postasına da gönderilir. Şifre belirlemezseniz telefonun son 6 hanesi kullanılır.
                    </p>
                  </div>

                  {!veliMevcutHesap && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormAlan label="Veli Adı" required={veliBilgisiVar} error={errors.veliAd?.message} icon={User}>
                          <input {...register('veliAd')} className={inputSinifi(!!errors.veliAd)} placeholder="Mehmet" aria-invalid={!!errors.veliAd} />
                        </FormAlan>
                        <FormAlan label="Veli Soyadı" required={veliBilgisiVar} error={errors.veliSoyad?.message}>
                          <input {...register('veliSoyad')} className={inputSinifi(!!errors.veliSoyad, false)} placeholder="Yılmaz" aria-invalid={!!errors.veliSoyad} />
                        </FormAlan>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormAlan label="Veli Telefon" required={veliBilgisiVar} error={errors.veliTelefon?.message} icon={Phone}>
                          <input {...register('veliTelefon')} type="tel" className={inputSinifi(!!errors.veliTelefon)} placeholder="05xx xxx xx xx" aria-invalid={!!errors.veliTelefon} />
                        </FormAlan>
                        <FormAlan
                          label="Veli Şifresi"
                          error={errors.veliSifre?.message}
                          icon={Lock}
                          hint="Boş bırakırsanız telefonun son 6 hanesi"
                        >
                          <input
                            {...register('veliSifre')}
                            type={veliSifreGoster ? 'text' : 'password'}
                            className={`${inputSinifi(!!errors.veliSifre)} !pr-10`}
                            placeholder="Veli paneli şifresi"
                            aria-invalid={!!errors.veliSifre}
                          />
                          <button
                            type="button"
                            onClick={() => setVeliSifreGoster((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                            aria-label={veliSifreGoster ? 'Şifreyi gizle' : 'Şifreyi göster'}
                          >
                            {veliSifreGoster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </FormAlan>
                      </div>
                      {(watch('veliSifre') || '').length > 0 && (
                        <SifreKurallari sifre={watch('veliSifre') || ''} />
                      )}
                    </>
                  )}

                  <FormAlan label="Veli E-posta" error={errors.veliEmail?.message} icon={Mail}>
                    <input {...register('veliEmail')} type="email" className={inputSinifi(!!errors.veliEmail)} placeholder="veli@email.com (isteğe bağlı)" aria-invalid={!!errors.veliEmail} />
                  </FormAlan>

                  {veliBilgisiVar && (
                    <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3.5 cursor-pointer hover:border-indigo-500/30 transition-colors">
                      <input
                        type="checkbox"
                        {...register('veliMevcutHesap')}
                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/50"
                      />
                      <span className="text-sm text-slate-300 leading-relaxed">
                        Bu e-posta ile veli hesabı <span className="text-indigo-300 font-medium">zaten kayıtlı</span> — mevcut hesaba bağlan
                      </span>
                    </label>
                  )}

                  {veliMevcutHesap && veliBilgisiVar && (
                    <div className="flex items-start gap-2 text-xs text-indigo-300/90 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-3">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      Kayıtlı veli hesabı bulunursa öğrenci otomatik bağlanır; şifre gerekmez.
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setAdim(2)} className={`flex-1 ${btnIkincil}`}>
                      <ChevronLeft className="w-4 h-4" /> Geri
                    </button>
                    <button type="submit" disabled={yukleniyor} className={`flex-1 ${btnBirincil}`}>
                      {yukleniyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {yukleniyor ? 'Oluşturuluyor...' : 'Hesap Oluştur'}
                    </button>
                  </div>
                </div>
              )}
            </form>

            <div className="mt-6 pt-5 border-t border-white/8 text-center text-sm text-slate-500 space-y-2">
              <p>
                Zaten hesabınız var mı?{' '}
                <Link href="/giris" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Giriş Yapın</Link>
              </p>
              <Link href="/sifremi-unuttum" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
                Şifremi unuttum
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
