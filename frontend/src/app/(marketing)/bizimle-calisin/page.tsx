'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  FileUp,
  GraduationCap,
  Home,
  Loader2,
  Mail,
  Phone,
  Send,
  Shapes,
  User,
  Wallet,
} from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { soruYazariApi } from '@/lib/api';
import { toast } from '@/store/toast.store';

type BransGrubu = { kademe: string; etiket: string; branslar: string[] };

const AVANTAJLAR = [
  {
    ikon: Wallet,
    baslik: 'Soru başına ödeme',
    metin: 'Ücretinizi siz belirtirsiniz; anlaşma sonrası her onaylanan soru için ödeme alırsınız.',
  },
  {
    ikon: GraduationCap,
    baslik: 'Kendi branşınız',
    metin: 'Yalnızca seçtiğiniz kademe ve branşlarda soru hazırlarsınız.',
  },
  {
    ikon: FileUp,
    baslik: 'Tekli veya toplu ithal',
    metin: 'Kendi ürettiğiniz soruları panelden tek tek veya toplu olarak sisteme aktarabilirsiniz.',
  },
  {
    ikon: Shapes,
    baslik: 'Şekil içeren sorular',
    metin: 'Geometri, fizik gibi branşlarda hazır şekil ve görsellerinizi soruyla birlikte ekleyebilirsiniz.',
  },
];

const SUREC = [
  { adim: '01', baslik: 'Başvuru', metin: 'Formu doldurun, branş ve ücret talebinizi iletin.' },
  { adim: '02', baslik: 'İnceleme', metin: 'Ekibimiz deneyiminizi ve örnek çalışmanızı değerlendirir.' },
  { adim: '03', baslik: 'Panel erişimi', metin: 'Anlaşma sonrası tekli yazım veya toplu ithal ile hemen soru ekleyebilirsiniz.' },
];

const alanSinifi =
  'w-full rounded-xl bg-slate-50 border border-edu-line px-3.5 py-3 text-sm text-edu-ink placeholder:text-slate-400 outline-none transition-all focus:border-wingo-600/50 focus:ring-1 focus:ring-wingo-300';

const etiketSinifi = 'mb-2 block text-xs font-bold uppercase tracking-wider text-edu-muted';

export default function BizimleCalisinSayfasi() {
  const [form, setForm] = useState({
    ad: '',
    soyad: '',
    dogumTarihi: '',
    email: '',
    telefon: '',
    universite: '',
    fakulte: '',
    bolum: '',
    mezuniyetYili: '',
    deneyimYili: '',
    soruBasinaUcret: '',
    aylikSoruKapasitesi: '',
    ornekCalismaUrl: '',
    aciklama: '',
  });
  const [secili, setSecili] = useState<Record<string, string[]>>({});
  const [gonderildi, setGonderildi] = useState(false);

  const { data: bransData, isLoading: bransYukleniyor } = useQuery({
    queryKey: ['soru-yazari-branslar'],
    queryFn: () => soruYazariApi.branslar(),
  });
  const gruplar: BransGrubu[] = bransData?.data?.veri || [];

  const seciliSayisi = useMemo(
    () => Object.values(secili).reduce((s, l) => s + l.length, 0),
    [secili],
  );

  const tahminiKazanc = useMemo(() => {
    const ucret = Number(form.soruBasinaUcret);
    const kapasite = Number(form.aylikSoruKapasitesi);
    if (!(ucret > 0 && kapasite > 0)) return null;
    return (ucret * kapasite).toLocaleString('tr-TR');
  }, [form.soruBasinaUcret, form.aylikSoruKapasitesi]);

  const bransToggle = (kademe: string, brans: string) => {
    setSecili((prev) => {
      const mevcut = prev[kademe] ?? [];
      const yeni = mevcut.includes(brans) ? mevcut.filter((b) => b !== brans) : [...mevcut, brans];
      const kopya = { ...prev };
      if (yeni.length) kopya[kademe] = yeni;
      else delete kopya[kademe];
      return kopya;
    });
  };

  const kademeToggle = (grup: BransGrubu) => {
    setSecili((prev) => {
      const hepsi = grup.branslar.every((b) => (prev[grup.kademe] ?? []).includes(b));
      const kopya = { ...prev };
      if (hepsi) delete kopya[grup.kademe];
      else kopya[grup.kademe] = [...grup.branslar];
      return kopya;
    });
  };

  const basvurMut = useMutation({
    mutationFn: () =>
      soruYazariApi.basvur({
        ...form,
        mezuniyetYili: form.mezuniyetYili || undefined,
        deneyimYili: form.deneyimYili || undefined,
        aylikSoruKapasitesi: form.aylikSoruKapasitesi || undefined,
        branslar: secili,
      }),
    onSuccess: () => setGonderildi(true),
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        'Başvuru gönderilemedi';
      toast.hata(mesaj);
    },
  });

  const gecerli =
    form.ad.trim().length >= 2 &&
    form.soyad.trim().length >= 2 &&
    form.email.trim().length > 4 &&
    form.telefon.replace(/\D/g, '').length >= 10 &&
    form.universite.trim().length >= 2 &&
    Number(form.soruBasinaUcret) > 0 &&
    seciliSayisi > 0;

  if (gonderildi) {
    return (
      <MarketingShell>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-wingo-600/15 blur-[120px]" />
          </div>
          <div className="relative mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-wingo-600/30 bg-wingo-600/15 text-wingo-700"
            >
              <CheckCircle2 className="h-8 w-8" />
            </motion.div>
            <h1 className="mt-6 text-3xl font-black tracking-tight text-edu-ink sm:text-4xl">
              Başvurunuz alındı
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-edu-muted">
              Başvurunuz değerlendirme ekibimize iletildi. İncelemenin ardından belirttiğiniz e-posta
              ve telefon üzerinden size dönüş yapacağız.
            </p>
            <div className="mx-auto mt-8 space-y-3 rounded-3xl border border-edu-line bg-white p-5 text-left text-sm backdrop-blur-sm">
              <p className="flex items-center justify-between gap-4 border-b border-edu-line py-2.5">
                <span className="text-edu-muted">Ad soyad</span>
                <span className="font-semibold text-edu-ink">
                  {form.ad} {form.soyad}
                </span>
              </p>
              <p className="flex items-center justify-between gap-4 border-b border-edu-line py-2.5">
                <span className="text-edu-muted">Branş sayısı</span>
                <span className="font-semibold text-wingo-700">{seciliSayisi}</span>
              </p>
              <p className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-edu-muted">Soru başına talebiniz</span>
                <span className="font-semibold text-edu-ink">{form.soruBasinaUcret} ₺</span>
              </p>
            </div>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-wingo-600 to-wingo-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-wingo-600/20 transition hover:brightness-110"
            >
              Ana sayfaya dön
            </Link>
          </div>
        </section>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-edu-line">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-wingo-600/10 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-orange-100/60 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 md:pb-16 lg:px-8">
          <nav
            className="mb-8 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-edu-muted"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-wingo-700">
              <Home className="h-3.5 w-3.5" />
              Ana sayfa
            </Link>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-slate-600">Bizimle çalışın</span>
          </nav>

          <div className="grid items-end gap-10 lg:grid-cols-12">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-7"
            >
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-edu-line bg-white px-4 py-1.5 text-xs font-black uppercase tracking-widest text-wingo-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Soru yazarı başvurusu
              </span>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-edu-ink sm:text-4xl md:text-5xl">
                Alanınızda uzmanlık{' '}
                <span className="bg-gradient-to-r from-wingo-600 via-wingo-500 to-orange-500 bg-clip-text text-transparent">
                  kazanca
                </span>{' '}
                dönüşsün
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-edu-muted md:text-base">
                Branşınızı ve ücret talebinizi iletin. Anlaşma sonrası kendi ürettiğiniz soruları
                tekli veya toplu ithal edebilir; geometri ve fizikteki şekilli sorularınızı da
                sisteme taşıyabilirsiniz.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="grid gap-3 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1"
            >
              {SUREC.map((s) => (
                <div
                  key={s.adim}
                  className="flex items-start gap-3 rounded-2xl border border-edu-line bg-slate-50 px-4 py-3"
                >
                  <span className="font-mono text-xs font-black text-wingo-700">{s.adim}</span>
                  <div>
                    <p className="text-sm font-bold text-edu-ink">{s.baslik}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-edu-muted">{s.metin}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {AVANTAJLAR.map((a) => (
              <div
                key={a.baslik}
                className="group rounded-2xl border border-edu-line bg-white p-5 transition hover:border-wingo-600/25 hover:bg-white"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-wingo-600/25 bg-wingo-600/15 text-wingo-700 transition group-hover:scale-105">
                  <a.ikon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-bold text-edu-ink">{a.baslik}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-edu-muted">{a.metin}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="mt-6 overflow-hidden rounded-2xl border border-wingo-600/20 bg-gradient-to-r from-wingo-50 via-white to-orange-50 p-5 sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-wingo-600/30 bg-wingo-600/15 text-wingo-700">
                <FileUp className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-edu-ink">
                  Acil sınav ihtiyacı mı var? Kendi sorularınızı getirin
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-edu-muted sm:text-sm">
                  Özellikle geometri ve fizikte şekil üretimi zaman alıyorsa, hazırladığınız
                  soruları tek tek editörden ekleyebilir veya toplu ithal ile bir kerede
                  yükleyebilirsiniz. Görselleri soruya bağlayıp onay sürecine göndermeniz yeterli;
                  kalite kontrolünden geçen sorular bankaya alınır.
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {['Tekli ekleme', 'Toplu JSON ithal', 'Şekil / görsel ekleme', 'Onay sonrası ödeme'].map(
                    (etiket) => (
                      <li
                        key={etiket}
                        className="rounded-lg border border-edu-line bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600"
                      >
                        {etiket}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Form + özet */}
      <div className="mx-auto max-w-6xl px-4 py-10 pb-20 sm:px-6 md:py-14 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-8"
          >
            <div className="space-y-6 rounded-3xl border border-edu-line bg-white p-6 shadow-xl shadow-slate-200/60 backdrop-blur-sm sm:p-8">
              {/* Kişisel */}
              <section>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-wingo-600/25 bg-wingo-600/15">
                    <User className="h-5 w-5 text-wingo-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-edu-ink">Kişisel bilgiler</h2>
                    <p className="text-xs text-edu-muted">İletişim için doğru bilgileri girin.</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={etiketSinifi}>Ad *</span>
                    <input
                      value={form.ad}
                      onChange={(e) => setForm({ ...form, ad: e.target.value })}
                      className={alanSinifi}
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="block">
                    <span className={etiketSinifi}>Soyad *</span>
                    <input
                      value={form.soyad}
                      onChange={(e) => setForm({ ...form, soyad: e.target.value })}
                      className={alanSinifi}
                      autoComplete="family-name"
                    />
                  </label>
                  <label className="block">
                    <span className={`${etiketSinifi} flex items-center gap-1.5`}>
                      <CalendarDays className="h-3 w-3" /> Doğum tarihi
                    </span>
                    <input
                      type="date"
                      value={form.dogumTarihi}
                      onChange={(e) => setForm({ ...form, dogumTarihi: e.target.value })}
                      className={`${alanSinifi} [color-scheme:dark]`}
                    />
                  </label>
                  <label className="block">
                    <span className={`${etiketSinifi} flex items-center gap-1.5`}>
                      <Phone className="h-3 w-3" /> Telefon *
                    </span>
                    <input
                      value={form.telefon}
                      onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                      placeholder="05XX XXX XX XX"
                      className={alanSinifi}
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className={`${etiketSinifi} flex items-center gap-1.5`}>
                      <Mail className="h-3 w-3" /> E-posta *
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={alanSinifi}
                      autoComplete="email"
                    />
                  </label>
                </div>
              </section>

              <div className="h-px bg-gradient-to-r from-transparent via-edu-line to-transparent" />

              {/* Eğitim */}
              <section>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-wingo-200 bg-wingo-50">
                    <Building2 className="h-5 w-5 text-wingo-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-edu-ink">Eğitim bilgileri</h2>
                    <p className="text-xs text-edu-muted">Akademik geçmişinizi kısaca paylaşın.</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className={etiketSinifi}>Mezun olduğu üniversite *</span>
                    <input
                      value={form.universite}
                      onChange={(e) => setForm({ ...form, universite: e.target.value })}
                      className={alanSinifi}
                    />
                  </label>
                  <label className="block">
                    <span className={etiketSinifi}>Fakülte</span>
                    <input
                      value={form.fakulte}
                      onChange={(e) => setForm({ ...form, fakulte: e.target.value })}
                      className={alanSinifi}
                    />
                  </label>
                  <label className="block">
                    <span className={etiketSinifi}>Bölüm</span>
                    <input
                      value={form.bolum}
                      onChange={(e) => setForm({ ...form, bolum: e.target.value })}
                      className={alanSinifi}
                    />
                  </label>
                  <label className="block">
                    <span className={etiketSinifi}>Mezuniyet yılı</span>
                    <input
                      type="number"
                      min={1960}
                      max={2100}
                      value={form.mezuniyetYili}
                      onChange={(e) => setForm({ ...form, mezuniyetYili: e.target.value })}
                      className={alanSinifi}
                    />
                  </label>
                  <label className="block">
                    <span className={etiketSinifi}>Öğretmenlik deneyimi (yıl)</span>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={form.deneyimYili}
                      onChange={(e) => setForm({ ...form, deneyimYili: e.target.value })}
                      className={alanSinifi}
                    />
                  </label>
                </div>
              </section>

              <div className="h-px bg-gradient-to-r from-transparent via-edu-line to-transparent" />

              {/* Branşlar */}
              <section>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50">
                      <GraduationCap className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-edu-ink">Branş seçimi *</h2>
                      <p className="text-xs text-edu-muted">
                        Kademe başlığına tıklayarak tüm branşları seçebilirsiniz.
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      seciliSayisi > 0
                        ? 'border border-wingo-600/30 bg-wingo-600/15 text-wingo-700'
                        : 'border border-edu-line bg-white text-edu-muted'
                    }`}
                  >
                    {seciliSayisi} seçili
                  </span>
                </div>

                {bransYukleniyor ? (
                  <div className="py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-wingo-700" />
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {gruplar.map((grup) => {
                      const seciliListe = secili[grup.kademe] ?? [];
                      const hepsi = grup.branslar.every((b) => seciliListe.includes(b));
                      return (
                        <div
                          key={grup.kademe}
                          className={`rounded-2xl border p-3.5 transition ${
                            seciliListe.length
                              ? 'border-wingo-600/25 bg-wingo-600/[0.06]'
                              : 'border-edu-line bg-slate-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => kademeToggle(grup)}
                            className={`w-full cursor-pointer rounded-xl px-3 py-2.5 text-xs font-black transition ${
                              hepsi
                                ? 'bg-gradient-to-r from-wingo-600 to-wingo-700 text-white shadow-md shadow-teal-700/20'
                                : seciliListe.length
                                  ? 'bg-wingo-600/15 text-wingo-700 ring-1 ring-wingo-200'
                                  : 'bg-white text-slate-600 hover:bg-edu-mint'
                            }`}
                          >
                            {grup.etiket}
                            {seciliListe.length > 0 && ` · ${seciliListe.length}`}
                          </button>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {grup.branslar.map((brans) => {
                              const aktif = seciliListe.includes(brans);
                              return (
                                <button
                                  key={brans}
                                  type="button"
                                  onClick={() => bransToggle(grup.kademe, brans)}
                                  className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                                    aktif
                                      ? 'border-wingo-600/50 bg-wingo-600/20 text-wingo-700'
                                      : 'border-edu-line bg-slate-50 text-edu-muted hover:border-slate-200 hover:text-edu-ink'
                                  }`}
                                >
                                  {brans}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="h-px bg-gradient-to-r from-transparent via-edu-line to-transparent" />

              {/* Ücret */}
              <section className="rounded-2xl border border-wingo-600/20 bg-gradient-to-br from-wingo-50 to-orange-50 p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-wingo-600/30 bg-wingo-600/20">
                    <Wallet className="h-5 w-5 text-wingo-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-edu-ink">Ücret talebiniz</h2>
                    <p className="text-xs text-edu-muted">Soru başına beklediğiniz ücreti belirtin.</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={etiketSinifi}>Soru başına ücret (₺) *</span>
                    <input
                      type="number"
                      min={1}
                      step="0.5"
                      value={form.soruBasinaUcret}
                      onChange={(e) => setForm({ ...form, soruBasinaUcret: e.target.value })}
                      placeholder="Örn. 25"
                      className={`${alanSinifi} text-lg font-black`}
                    />
                  </label>
                  <label className="block">
                    <span className={etiketSinifi}>Ayda hazırlayabileceğiniz soru</span>
                    <input
                      type="number"
                      min={1}
                      value={form.aylikSoruKapasitesi}
                      onChange={(e) => setForm({ ...form, aylikSoruKapasitesi: e.target.value })}
                      placeholder="Örn. 200"
                      className={alanSinifi}
                    />
                  </label>
                </div>
                {tahminiKazanc && (
                  <p className="mt-4 rounded-xl border border-wingo-600/20 bg-wingo-600/10 px-4 py-3 text-xs font-bold text-wingo-700">
                    Aylık tahmini kazanç:{' '}
                    <span className="text-base text-edu-ink">{tahminiKazanc} ₺</span>
                  </p>
                )}
              </section>

              {/* Ek */}
              <section className="grid gap-4">
                <div className="mb-1 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10">
                    <FileText className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-edu-ink">Ek bilgiler</h2>
                    <p className="text-xs text-edu-muted">İsteğe bağlı; başvurunuzu güçlendirir.</p>
                  </div>
                </div>
                <label className="block">
                  <span className={etiketSinifi}>Örnek çalışma bağlantısı</span>
                  <input
                    value={form.ornekCalismaUrl}
                    onChange={(e) => setForm({ ...form, ornekCalismaUrl: e.target.value })}
                    placeholder="Drive / portfolyo veya hazır soru seti bağlantısı"
                    className={alanSinifi}
                  />
                </label>
                <label className="block">
                  <span className={etiketSinifi}>Kendinizden kısaca bahsedin</span>
                  <textarea
                    rows={3}
                    value={form.aciklama}
                    onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                    placeholder="Deneyiminiz, hazır soru setiniz, şekilli geometri/fizik örnekleriniz…"
                    className={`${alanSinifi} resize-none`}
                  />
                </label>
              </section>

              <button
                type="button"
                onClick={() => basvurMut.mutate()}
                disabled={!gecerli || basvurMut.isPending}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-wingo-600 to-wingo-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-wingo-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {basvurMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Başvuruyu gönder
              </button>
              <p className="text-center text-[11px] leading-relaxed text-edu-muted">
                Verileriniz yalnızca başvuru değerlendirmesi için kullanılır, üçüncü kişilerle
                paylaşılmaz.
              </p>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-4 lg:col-span-4 lg:sticky lg:top-24 lg:self-start"
          >
            <div className="rounded-3xl border border-edu-line bg-white p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-edu-muted">
                Başvuru özeti
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-edu-muted">Branş</span>
                  <span className={`font-bold ${seciliSayisi ? 'text-wingo-700' : 'text-slate-600'}`}>
                    {seciliSayisi || '—'}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-edu-muted">Soru ücreti</span>
                  <span className="font-bold text-edu-ink">
                    {Number(form.soruBasinaUcret) > 0 ? `${form.soruBasinaUcret} ₺` : '—'}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-edu-muted">Aylık kapasite</span>
                  <span className="font-bold text-edu-ink">
                    {Number(form.aylikSoruKapasitesi) > 0 ? form.aylikSoruKapasitesi : '—'}
                  </span>
                </li>
                {tahminiKazanc && (
                  <li className="rounded-xl border border-wingo-600/20 bg-wingo-600/10 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-wingo-700">
                      Tahmini aylık
                    </p>
                    <p className="mt-0.5 text-lg font-black text-edu-ink">{tahminiKazanc} ₺</p>
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-3xl border border-edu-line bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <FileUp className="h-4 w-4 text-wingo-700" />
                <h3 className="text-sm font-black uppercase tracking-widest text-edu-muted">
                  Soru ithali
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-edu-muted">
                Onay sonrası öğretmen paneline erişirsiniz. Soruları tek tek yazabilir veya hazır
                listenizi toplu ithal edebilirsiniz. Şekil gerektiren branşlarda görsellerinizi
                soruya eklemeniz yeterli.
              </p>
            </div>

            <div className="rounded-3xl border border-edu-line bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-wingo-700" />
                <h3 className="text-sm font-black uppercase tracking-widest text-edu-muted">
                  Değerlendirme
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-edu-muted">
                Başvurular genellikle birkaç iş günü içinde incelenir. Eksik bilgi varsa e-posta
                üzerinden sizden ek belge istenebilir.
              </p>
            </div>

            <div className="rounded-3xl border border-wingo-200 bg-gradient-to-br from-wingo-50 to-orange-50 p-6">
              <h3 className="font-bold text-edu-ink">Kurumsal iş birliği mi?</h3>
              <p className="mt-2 text-sm leading-relaxed text-edu-muted">
                Okul veya kurum adına toplu çözüm arıyorsanız iletişim formundan bize yazın.
              </p>
              <Link
                href="/iletisim"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-wingo-700 transition hover:text-wingo-700"
              >
                İletişime geç
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.aside>
        </div>
      </div>
    </MarketingShell>
  );
}
