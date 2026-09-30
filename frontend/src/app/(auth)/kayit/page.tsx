'use client';

import { Suspense, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2, ChevronRight, ChevronLeft, Users, GraduationCap,
  User, School, Mail, Lock, MapPin, Building2, Target, BookOpen, Phone, CreditCard,
  Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import { OGRENCI_SINIF_SECENEKLERI, KPSS_OGRENCI_SECENEKLERI, kpssOgretimTuruMu, siniftanOgretimTuru } from '@/lib/ogrenciKademe';
import AnaSiteyeDonButonu from '@/components/auth/AnaSiteyeDonButonu';
import { isKpssMode } from '@/lib/platform';
import { girisUrlWithReturn, guvenliReturnUrl, ogrenciGirisSonrasiHedef } from '@/lib/returnUrl';

const sifreKurali = (etiket: string) =>
  z.string()
    .min(8, `${etiket} en az 8 karakter olmalı`)
    .refine((v) => /[A-Z]/.test(v), `${etiket} en az bir büyük harf içermeli`)
    .refine((v) => /[0-9]/.test(v), `${etiket} en az bir rakam içermeli`);

/** TC kimlik no algoritmik doğrulama (sunucu tarafıyla aynı kural) */
function tcKimlikGecerli(deger: string): boolean {
  const tc = (deger || '').replace(/\D/g, '');
  if (!/^[1-9][0-9]{10}$/.test(tc)) return false;
  const d = tc.split('').map((c) => parseInt(c, 10));
  const tek = d[0] + d[2] + d[4] + d[6] + d[8];
  const cift = d[1] + d[3] + d[5] + d[7];
  if (((tek * 7 - cift) % 10 + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

const kayitSchema = z.object({
  ad: z.string().min(2, 'Ad en az 2 karakter'),
  soyad: z.string().min(2, 'Soyad en az 2 karakter'),
  email: z.string().email('Geçerli e-posta girin'),
  sifre: sifreKurali('Şifre'),
  telefon: z
    .string()
    .min(1, 'Telefon zorunlu')
    .refine((v) => {
      let r = v.replace(/\D/g, '');
      while (r.startsWith('90') && r.length > 11) r = r.slice(2);
      if (r.startsWith('90') && r.length === 12) r = r.slice(2);
      if (r.startsWith('90') && r.length === 11 && r[2] === '5') r = r.slice(2);
      const son = r.startsWith('0') ? r.slice(1) : r;
      if (son.length === 10 && son.startsWith('5')) return true;
      if (r.length > 10) {
        const son10 = r.slice(-10);
        return son10.startsWith('5');
      }
      return false;
    }, 'Geçerli cep telefonu girin (5XX XXX XX XX)'),
  tcKimlikNo: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !String(v).trim() || tcKimlikGecerli(v), 'Geçerli bir TC kimlik numarası girin'),
  okul: z.string().optional(),
  sehir: z.string().optional(),
  sinif: z.string().min(1, 'Seçim yapın'),
  ogretimTuru: z.enum(['YKS', 'LGS', 'KPSS_LISANS', 'KPSS_ONLISANS', 'KPSS_ORTAOGRETIM']).optional(),
  hedefUniversite: z.string().optional(),
  hedefBolum: z.string().optional(),
  veliEmail: z.union([z.literal(''), z.string().email('Geçerli veli e-postası')]).optional(),
  veliTelefon: z.string().optional(),
  veliAd: z.string().optional(),
  veliSoyad: z.string().optional(),
  veliSifre: z.string().optional(),
  veliMevcutHesap: z.boolean().optional(),
  kocReferansKod: z.string().optional(),
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

const ADIM1_ALANLARI = ['ad', 'soyad', 'email', 'telefon', 'sifre'] as const;
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
  telefon: 'Telefon',
  tcKimlikNo: 'TC kimlik no',
  veliSifre: 'Veli şifresi',
};

const ADIMLAR = [
  { no: 1, baslik: 'Kişisel', alt: 'Hesap bilgileri', icon: User },
  { no: 2, baslik: 'Eğitim', alt: 'Okul ve hedef', icon: School },
  { no: 3, baslik: 'Veli', alt: 'İsteğe bağlı', icon: Users },
] as const;

function inputSinifi(hatali: boolean, ikonlu = true) {
  return `w-full h-11 ${ikonlu ? 'pl-10' : 'px-4'} pr-4 bg-slate-50 border rounded-xl text-edu-ink text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
    hatali ? 'border-red-500/60 focus:ring-red-500/40' : 'border-edu-line focus:border-indigo-500/50 focus:ring-wingo-400/30 hover:border-white/20'
  }`;
}

function selectSinifi(hatali: boolean) {
  return `w-full h-11 px-4 bg-slate-50 border rounded-xl text-edu-ink text-sm focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
    hatali ? 'border-red-500/60 focus:ring-red-500/40' : 'border-edu-line focus:border-indigo-500/50 focus:ring-wingo-400/30 hover:border-white/20'
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

type AdimBilgi = (typeof ADIMLAR)[number];

function AdimGostergesi({ adim, adimlar }: { adim: number; adimlar: readonly AdimBilgi[] }) {
  const yuzde = adimlar.length > 1 ? ((adim - 1) / (adimlar.length - 1)) * 100 : 100;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {adimlar.map((a) => {
          const aktif = a.no === adim;
          const tamam = a.no < adim;
          const Icon = a.icon;
          return (
            <div key={a.no} className={`flex flex-col items-center gap-1.5 flex-1 ${a.no < ADIMLAR.length ? '' : ''}`}>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  aktif
                    ? 'bg-wingo-600 text-white shadow-lg shadow-wingo-600/25 scale-105'
                    : tamam
                      ? 'bg-wingo-600/20 text-wingo-700 border border-indigo-500/40'
                      : 'bg-slate-50 text-slate-500 border border-edu-line'
                }`}
              >
                {tamam ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <div className="text-center hidden sm:block">
                <p className={`text-xs font-semibold ${aktif ? 'text-edu-ink' : tamam ? 'text-wingo-700' : 'text-slate-500'}`}>
                  {a.baslik}
                </p>
                <p className="text-[10px] text-slate-500">{a.alt}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${yuzde}%` }}
        />
      </div>
      <p className="text-center text-xs text-slate-500 mt-2 sm:hidden">Adım {adim} / {adimlar.length} — {adimlar[adim - 1]?.baslik}</p>
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

function KayitSayfasiIcerik() {
  const [adim, setAdim] = useState(1);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sifreGoster, setSifreGoster] = useState(false);
  const [veliSifreGoster, setVeliSifreGoster] = useState(false);
  const [hedefListeAcik, setHedefListeAcik] = useState(false);
  const [kpssModu, setKpssModu] = useState(false);
  const [partnerYukleniyor, setPartnerYukleniyor] = useState(false);
  const [partnerKaynak, setPartnerKaynak] = useState<'kapya' | null>(null);
  const [partnerKilitli, setPartnerKilitli] = useState(false);
  const [mevcutHesapUyari, setMevcutHesapUyari] = useState(false);
  const [partnerHata, setPartnerHata] = useState<string | null>(null);
  const { girisYap, cikisYap } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = guvenliReturnUrl(searchParams.get('returnUrl'));

  useEffect(() => {
    setKpssModu(isKpssMode());
  }, []);

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
    defaultValues: { sinif: '', veliMevcutHesap: false, kocReferansKod: '' },
    mode: 'onTouched',
  });

  useEffect(() => {
    const ref = (searchParams.get('ref') || searchParams.get('koc') || '').trim();
    if (ref) setValue('kocReferansKod', ref.toUpperCase());
  }, [searchParams, setValue]);

  // Kapya / Edulim: ?partner=kapya&t=<JWT>
  // Mevcut öğrenci hesabı varsa şifresiz otomatik giriş; yoksa form prefill.
  useEffect(() => {
    const partner = (searchParams.get('partner') || '').trim().toLowerCase();
    const t = (searchParams.get('t') || '').trim();
    if (partner !== 'kapya' || !t) return;

    let iptal = false;
    setPartnerYukleniyor(true);
    setPartnerHata(null);
    // Eski tarayıcı oturumu (başka öğrenci) SSO'yu karıştırmasın
    cikisYap();

    void (async () => {
      try {
        const res = await authApi.partnerGiris({ partner: 'kapya', t });
        if (iptal) return;
        const v = res.data.veri as {
          kayitGerekli?: boolean;
          token?: string;
          refreshToken?: string;
          kullanici?: { id: string; email: string; rol: string; ad?: string; soyad?: string; ogretimTuru?: string };
          prefill?: {
            ad?: string;
            soyad?: string;
            email?: string;
            telefon?: string;
            tcKimlikNo?: string;
            sinif?: string;
            okul?: string;
            sehir?: string;
            kocReferansKod?: string;
          };
        };

        if (!v.kayitGerekli && v.token && v.refreshToken && v.kullanici) {
          girisYap({ kullanici: v.kullanici, token: v.token, refreshToken: v.refreshToken });
          toast.basarili(
            (v as { yeniHesap?: boolean }).yeniHesap ? 'Kapya hesabınız oluşturuldu' : 'Kapya ile giriş yapıldı',
            `${v.kullanici.ad || ''} · ${v.kullanici.email}`,
          );
          router.replace(ogrenciGirisSonrasiHedef(v.kullanici.rol, returnUrl) || '/dashboard');
          return;
        }

        const p = v.prefill || {};
        const telHam = (p.telefon || '').trim();
        let tel = telHam.replace(/\D/g, '');
        while (tel.startsWith('90') && tel.length > 11) tel = tel.slice(2);
        if (tel.startsWith('90') && tel.length === 12) tel = tel.slice(2);
        if (tel.length === 10 && tel.startsWith('5')) tel = `0${tel}`;
        else if (!(tel.length === 11 && tel.startsWith('05'))) tel = telHam;

        if (p.ad) setValue('ad', p.ad, { shouldValidate: true });
        if (p.soyad) setValue('soyad', p.soyad, { shouldValidate: true });
        if (p.email) setValue('email', p.email, { shouldValidate: true });
        if (tel) setValue('telefon', tel, { shouldValidate: true });
        if (p.tcKimlikNo) setValue('tcKimlikNo', p.tcKimlikNo, { shouldValidate: true });
        if (p.sinif) setValue('sinif', p.sinif, { shouldValidate: true });
        if (p.okul) setValue('okul', p.okul);
        if (p.sehir) setValue('sehir', p.sehir);
        if (p.kocReferansKod) setValue('kocReferansKod', p.kocReferansKod.toUpperCase());
        setPartnerKaynak('kapya');
        setPartnerKilitli(true);
        setMevcutHesapUyari(false);
        const kayitMesaj = (v as { kayitMesaj?: string }).kayitMesaj;
        if (kayitMesaj) toast.hata(kayitMesaj);
        else toast.basarili('Kapya bilgileriniz yüklendi. Eksik alanları tamamlayıp kayıt olun.');
      } catch (err) {
        if (iptal) return;
        const mesaj =
          (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
          'Kapya bağlantısı doğrulanamadı. Panelden tekrar deneyin.';
        setPartnerHata(mesaj);
        toast.hata(mesaj);
      } finally {
        if (!iptal) setPartnerYukleniyor(false);
      }
    })();

    return () => {
      iptal = true;
    };
  }, [searchParams, setValue, girisYap, cikisYap, router, returnUrl]);

  // KPSS adayları yetişkin olduğundan veli adımı gösterilmez (2 adımlı akış).
  const gorunurAdimlar = useMemo<readonly AdimBilgi[]>(
    () => (kpssModu ? ADIMLAR.filter((a) => a.no !== 3) : ADIMLAR),
    [kpssModu],
  );

  const sinif = watch('sinif');
  const sifre = watch('sifre') || '';
  const veliEmail = watch('veliEmail');
  const veliMevcutHesap = watch('veliMevcutHesap');
  const veliBilgisiVar = Boolean((veliEmail || '').trim());
  const ogretimTuru = useMemo(() => {
    if (kpssOgretimTuruMu(sinif)) return sinif;
    return siniftanOgretimTuru(sinif) ?? 'YKS';
  }, [sinif]);

  useEffect(() => {
    if (kpssOgretimTuruMu(sinif)) {
      setValue('ogretimTuru', sinif as KayitFormu['ogretimTuru']);
      return;
    }
    const tur = siniftanOgretimTuru(sinif);
    if (tur) setValue('ogretimTuru', tur);
  }, [sinif, setValue]);

  const apiHatasiniAlanaYaz = (mesaj: string) => {
    const m = mesaj.toLowerCase();
    if (/tc kimlik|kimlik numaras/.test(m)) {
      setError('tcKimlikNo', { type: 'server', message: mesaj });
      setAdim(1);
      return true;
    }
    if (/telefon/.test(m) && !/veli/.test(m)) {
      setError('telefon', { type: 'server', message: mesaj });
      setAdim(1);
      return true;
    }
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
    } else if (!kpssModu && ADIM3_ALANLARI.some((a) => formErrors[a])) {
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
    else toast.hata(kpssModu ? 'KPSS türü seçimi zorunludur.' : 'Sınıf seçimi zorunludur.');
  };

  const kpssKayitTamamla = async () => {
    const gecerli = await trigger([...ADIM2_ALANLARI]);
    if (!gecerli) {
      toast.hata('KPSS türü seçimi zorunludur.');
      return;
    }
    handleSubmit(onSubmit, onInvalid)();
  };

  const onSubmit = async (veri: KayitFormu) => {
    if (mevcutHesapUyari) {
      toast.hata('Bu e-posta zaten kayıtlı. Giriş sayfasını kullanın.');
      router.push(returnUrl ? girisUrlWithReturn(returnUrl) : '/giris');
      return;
    }
    setYukleniyor(true);
    try {
      const tur = kpssOgretimTuruMu(veri.sinif)
        ? veri.sinif
        : siniftanOgretimTuru(veri.sinif) ?? 'YKS';
      const payload: Record<string, unknown> = {
        ...veri,
        ogretimTuru: tur,
        sinif: kpssOgretimTuruMu(veri.sinif) ? undefined : veri.sinif,
        email: veri.email.trim().toLowerCase(),
      };
      if (kpssModu || kpssOgretimTuruMu(tur)) {
        delete payload.hedefUniversite;
        delete payload.hedefBolum;
      }
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
      const kocKod = typeof veri.kocReferansKod === 'string' ? veri.kocReferansKod.trim() : '';
      if (kocKod) {
        payload.kocReferansKod = kocKod.toUpperCase();
      } else {
        delete payload.kocReferansKod;
      }
      const yanit = await authApi.kayit(payload);
      const { kullanici, token, refreshToken } = yanit.data.veri;
      girisYap({ kullanici, token, refreshToken });
      toast.basarili('Hesabınız oluşturuldu!', kpssModu ? 'WingoKPSS\'e hoş geldiniz' : 'WingoSınav\'a hoş geldiniz');
      router.push(ogrenciGirisSonrasiHedef(kullanici.rol, returnUrl) || '/dashboard');
    } catch (err: any) {
      const mesaj = err?.response?.data?.mesaj || err?.message || 'Kayıt başarısız';
      const alanaYazildi = apiHatasiniAlanaYaz(mesaj);
      toast.hata(alanaYazildi ? mesaj : `Kayıt başarısız: ${mesaj}`);
    } finally {
      setYukleniyor(false);
    }
  };

  const btnBirincil = 'h-11 rounded-xl bg-gradient-to-r from-wingo-600 to-wingo-500 hover:from-wingo-700 hover:to-wingo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-wingo-600/20 disabled:opacity-60 disabled:cursor-not-allowed';
  const btnIkincil = 'h-11 rounded-xl bg-white hover:bg-edu-mint text-edu-ink text-sm font-medium flex items-center justify-center gap-2 transition-all border border-edu-line';

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

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl">
          {/* Üst başlık */}
          <div className="text-center mb-6 sm:mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform ${
                kpssModu
                  ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25'
                  : 'bg-gradient-to-br from-wingo-600 to-wingo-500 shadow-wingo-600/25'
              }`}>
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-edu-ink font-bold text-xl tracking-tight">{kpssModu ? 'WingoKPSS' : 'WingoSınav'}</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-edu-ink tracking-tight">Öğrenci Hesabı Oluştur</h1>
            <p className="text-edu-muted text-sm mt-2 max-w-sm mx-auto">
              {kpssModu ? 'KPSS denemeleri, analiz ve gelişim raporları için kaydolun.' : 'Deneme çöz, analiz gör, hedefinle ilerle.'}
            </p>

            {partnerYukleniyor && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-wingo-200 bg-wingo-50 px-4 py-2 text-xs font-medium text-wingo-800">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Kapya ile bağlanılıyor…
              </div>
            )}
            {partnerHata && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-xs text-red-700 max-w-md mx-auto">
                <p className="font-semibold">Kapya bağlantısı başarısız</p>
                <p className="mt-1 opacity-90">{partnerHata}</p>
                <p className="mt-2 opacity-70">Kapya panelinden WingoDeneme’ye tekrar tıklayın (bağlantı 5 dk geçerli).</p>
              </div>
            )}
            {partnerKaynak === 'kapya' && !partnerYukleniyor && (
              <div className="mt-4 rounded-xl border border-wingo-200 bg-wingo-50 px-4 py-3 text-left text-xs text-wingo-800 max-w-md mx-auto">
                <p className="font-semibold text-wingo-800">Kapya Akademi üzerinden geldiniz</p>
                <p className="mt-1 text-wingo-700">
                  Bilgileriniz dolduruldu. Şifrenizi belirleyip kaydı tamamlayın.
                </p>
              </div>
            )}

            {/* Kayıt türü sekmeleri */}
            <div className="inline-flex p-1 mt-5 rounded-xl bg-slate-50 border border-edu-line backdrop-blur-sm">
              <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-wingo-50 text-wingo-700 text-xs font-semibold border border-wingo-200">
                <GraduationCap className="w-3.5 h-3.5" /> Öğrenci
              </span>
              <Link href="/kayit/veli" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-edu-muted text-xs font-medium hover:text-edu-ink hover:bg-slate-50 transition-colors">
                <Users className="w-3.5 h-3.5" /> Veli
              </Link>
              <Link href="/kayit/kurum" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-edu-muted text-xs font-medium hover:text-edu-ink hover:bg-slate-50 transition-colors">
                Kurum Başvurusu
              </Link>
              <Link href="/kayit/koc" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-edu-muted text-xs font-medium hover:text-edu-ink hover:bg-slate-50 transition-colors">
                <Users className="w-3.5 h-3.5" /> Koç
              </Link>
              <Link href="/kayit/ogretmen" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-edu-muted text-xs font-medium hover:text-edu-ink hover:bg-slate-50 transition-colors">
                <BookOpen className="w-3.5 h-3.5" /> Öğretmen
              </Link>
            </div>
          </div>

          {/* Form kartı */}
          <div className="rounded-2xl border border-edu-line bg-white backdrop-blur-xl shadow-2xl shadow-slate-200/70 p-6 sm:p-8">
            <AdimGostergesi adim={adim} adimlar={gorunurAdimlar} />

            <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
              {/* Adım 1 */}
              {adim === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-1">
                    <div className="w-9 h-9 rounded-lg bg-wingo-600/15 flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-edu-ink">Kişisel Bilgiler</h2>
                      <p className="text-xs text-slate-500">Giriş için kullanacağınız bilgiler</p>
                    </div>
                  </div>
                  <HataOzeti hatalar={adimHatalari(errors, ADIM1_ALANLARI)} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormAlan label="Ad" required error={errors.ad?.message} icon={User}>
                      <input
                        {...register('ad')}
                        readOnly={partnerKilitli}
                        className={`${inputSinifi(!!errors.ad)} ${partnerKilitli ? 'opacity-80 cursor-not-allowed' : ''}`}
                        placeholder="Ahmet"
                        aria-invalid={!!errors.ad}
                      />
                    </FormAlan>
                    <FormAlan label="Soyad" required error={errors.soyad?.message}>
                      <input
                        {...register('soyad')}
                        readOnly={partnerKilitli}
                        className={`${inputSinifi(!!errors.soyad, false)} ${partnerKilitli ? 'opacity-80 cursor-not-allowed' : ''}`}
                        placeholder="Yılmaz"
                        aria-invalid={!!errors.soyad}
                      />
                    </FormAlan>
                  </div>

                  <FormAlan label="E-posta" required error={errors.email?.message} icon={Mail}>
                    <input
                      {...register('email')}
                      type="email"
                      readOnly={partnerKilitli}
                      className={`${inputSinifi(!!errors.email)} ${partnerKilitli ? 'opacity-80 cursor-not-allowed' : ''}`}
                      placeholder="ornek@email.com"
                      aria-invalid={!!errors.email}
                    />
                  </FormAlan>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormAlan label="Cep telefonu" required error={errors.telefon?.message} icon={Phone}>
                      <input
                        {...register('telefon')}
                        type="tel"
                        inputMode="numeric"
                        maxLength={14}
                        readOnly={partnerKilitli}
                        className={`${inputSinifi(!!errors.telefon)} ${partnerKilitli ? 'opacity-80 cursor-not-allowed' : ''}`}
                        placeholder="05XX XXX XX XX"
                        aria-invalid={!!errors.telefon}
                      />
                    </FormAlan>
                    <FormAlan label="TC kimlik no" error={errors.tcKimlikNo?.message} icon={CreditCard}>
                      <input
                        {...register('tcKimlikNo')}
                        inputMode="numeric"
                        maxLength={11}
                        className={inputSinifi(!!errors.tcKimlikNo)}
                        placeholder="İsteğe bağlı · 11 hane"
                        aria-invalid={!!errors.tcKimlikNo}
                        onInput={(e) => {
                          const hedef = e.currentTarget;
                          hedef.value = hedef.value.replace(/\D/g, '').slice(0, 11);
                        }}
                      />
                    </FormAlan>
                  </div>
                  <p className="-mt-2 text-[11px] text-slate-500">
                    TC kimlik numarası isteğe bağlıdır; fatura/ödeme sırasında istenebilir.
                  </p>

                  <FormAlan label="Koç / kurum referans kodu (isteğe bağlı)" error={errors.kocReferansKod?.message} icon={Users}>
                    <input
                      {...register('kocReferansKod')}
                      className={inputSinifi(!!errors.kocReferansKod)}
                      placeholder="WINGO-XXXXXX"
                      aria-invalid={!!errors.kocReferansKod}
                    />
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
                    <div className="w-9 h-9 rounded-lg bg-wingo-600/15 flex items-center justify-center">
                      <School className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-edu-ink">Eğitim Bilgileri</h2>
                      <p className="text-xs text-slate-500">
                        {kpssModu ? 'KPSS hazırlık türünüz' : 'Okulunuz ve sınav hedefiniz'}
                      </p>
                    </div>
                  </div>
                  <HataOzeti hatalar={adimHatalari(errors, ADIM2_ALANLARI).map((h) => ({
                    ...h,
                    etiket: h.alan === 'sinif' && kpssModu ? 'KPSS Türü' : h.etiket,
                    mesaj: h.alan === 'sinif' && kpssModu ? 'KPSS türü seçin' : h.mesaj,
                  }))} />

                  {!kpssModu && (
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
                  )}

                  <div className={`grid grid-cols-1 ${kpssModu ? '' : 'sm:grid-cols-2'} gap-4`}>
                    {!kpssModu && (
                      <FormAlan label="Şehir" icon={MapPin}>
                        <input {...register('sehir')} className={inputSinifi(false)} placeholder="Ankara" />
                      </FormAlan>
                    )}
                    <FormAlan
                      label={kpssModu ? 'KPSS Türü' : 'Sınıf'}
                      required
                      hint={kpssModu ? 'Hazırlık yaptığınız KPSS kademesini seçin' : '6–8. sınıf LGS · 9–12 ve mezun YKS'}
                      error={errors.sinif?.message ? (kpssModu ? 'KPSS türü seçin' : errors.sinif.message) : undefined}
                    >
                      <select {...register('sinif')} className={selectSinifi(!!errors.sinif)} aria-invalid={!!errors.sinif}>
                        <option value="">{kpssModu ? 'KPSS türü seçin' : 'Sınıf seçin'}</option>
                        {(kpssModu ? KPSS_OGRENCI_SECENEKLERI : OGRENCI_SINIF_SECENEKLERI).map((s) => (
                          <option key={s.value} value={s.value}>{s.etiket}</option>
                        ))}
                      </select>
                    </FormAlan>
                    {kpssModu && (
                      <FormAlan label="Şehir" icon={MapPin}>
                        <input {...register('sehir')} className={inputSinifi(false)} placeholder="İstanbul" />
                      </FormAlan>
                    )}
                  </div>

                  {sinif && (
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${
                      kpssModu
                        ? 'bg-teal-500/10 border-teal-500/25 text-teal-300'
                        : ogretimTuru === 'LGS'
                          ? 'bg-sky-500/10 border-sky-500/25 text-sky-300'
                          : 'bg-wingo-600/10 border-indigo-500/25 text-wingo-700'
                    }`}>
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      {kpssModu
                        ? `${KPSS_OGRENCI_SECENEKLERI.find((s) => s.value === sinif)?.etiket ?? 'KPSS'} paneli açılacak`
                        : ogretimTuru === 'LGS'
                          ? 'LGS paneli açılacak'
                          : 'YKS paneli açılacak'}
                    </div>
                  )}

                  {!kpssModu && (
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
                        <div className="absolute z-50 w-full mt-1.5 bg-white border border-edu-line rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                          {(ogretimTuru === 'LGS' ? POPULER_LISELER : POPULER_UNIVERSITELER).map((okul) => (
                            <button
                              key={okul}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setValue('hedefUniversite', okul, { shouldDirty: true });
                                setHedefListeAcik(false);
                              }}
                              className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-wingo-50 hover:text-edu-ink transition-colors first:rounded-t-xl last:rounded-b-xl"
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
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setAdim(1)} className={`flex-1 ${btnIkincil}`}>
                      <ChevronLeft className="w-4 h-4" /> Geri
                    </button>
                    {kpssModu ? (
                      <button type="button" onClick={kpssKayitTamamla} disabled={yukleniyor} className={`flex-1 ${btnBirincil}`}>
                        {yukleniyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {yukleniyor ? 'Oluşturuluyor...' : 'Hesap Oluştur'}
                      </button>
                    ) : (
                      <button type="button" onClick={devamAdim2} className={`flex-1 ${btnBirincil}`}>
                        Devam <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Adım 3 — Veli (yalnızca YKS/LGS; KPSS adaylarında gizli) */}
              {!kpssModu && adim === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-1">
                    <div className="w-9 h-9 rounded-lg bg-wingo-600/15 flex items-center justify-center">
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-edu-ink">Veli Bilgileri</h2>
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
                    <label className="flex items-start gap-3 rounded-xl border border-edu-line bg-slate-950/40 px-4 py-3.5 cursor-pointer hover:border-indigo-500/30 transition-colors">
                      <input
                        type="checkbox"
                        {...register('veliMevcutHesap')}
                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-50 text-indigo-500 focus:ring-wingo-400/50"
                      />
                      <span className="text-sm text-slate-300 leading-relaxed">
                        Bu e-posta ile veli hesabı <span className="text-wingo-700 font-medium">zaten kayıtlı</span> — mevcut hesaba bağlan
                      </span>
                    </label>
                  )}

                  {veliMevcutHesap && veliBilgisiVar && (
                    <div className="flex items-start gap-2 text-xs text-wingo-700/90 rounded-xl border border-indigo-500/20 bg-wingo-600/10 px-3.5 py-3">
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
                <Link href={returnUrl ? girisUrlWithReturn(returnUrl) : '/giris'} className="text-indigo-400 hover:text-wingo-700 font-medium transition-colors">Giriş Yapın</Link>
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

export default function KayitSayfasi() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-edu-bg" />}>
      <KayitSayfasiIcerik />
    </Suspense>
  );
}
