'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Clock,
  Home,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  User,
} from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { useAuthStore } from '@/store/auth.store';
import { publicApi } from '@/lib/api';
import { toast } from '@/store/toast.store';

const KONU_SECENEKLERI = [
  'Paket ve satın alma',
  'Sınav takvimi',
  'Ödeme / fatura',
  'Teknik sorun',
  'Kurumsal / iş birliği',
  'Diğer',
] as const;

const SSS = [
  {
    soru: 'Deneme paketlerini nasıl satın alabilirim?',
    cevap:
      'Paketler sayfasından paketi seçip denemeleri işaretleyerek sepetten satın alabilir veya tüm paketi tek seferde alabilirsiniz.',
  },
  {
    soru: 'Ödeme sonrası ne zaman erişim açılır?',
    cevap:
      'Kredi kartı ödemelerinde onay sonrası birkaç dakika içinde; havale/EFT’de dekont onayından sonra erişiminiz açılır.',
  },
  {
    soru: 'Üye olmadan iletişime geçebilir miyim?',
    cevap:
      'Evet. Bu formu doldurabilir veya e-posta / telefon kanallarımızdan bize ulaşabilirsiniz. Üyeler destek panelinden talep açarak daha hızlı takip edebilir.',
  },
];

function haritaEmbedUrl(adres: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(adres)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

export default function IletisimSayfasi() {
  const site = useSiteIcerik();
  const kullanici = useAuthStore((s) => s.kullanici);
  const token = useAuthStore((s) => s.token);
  const { eposta, telefon, adres } = site.footer;
  const epostaStr = (eposta ?? '').trim() || 'destek@wingodeneme.com';
  const telefonStr = (telefon ?? '').trim();
  const adresStr = (adres ?? '').trim();

  const [form, setForm] = useState({
    ad: kullanici ? [kullanici.ad, kullanici.soyad].filter(Boolean).join(' ') : '',
    email: kullanici?.email ?? '',
    konu: KONU_SECENEKLERI[0],
    mesaj: '',
  });
  const [gonderildi, setGonderildi] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const haritaUrl = useMemo(
    () => (adresStr ? haritaEmbedUrl(adresStr) : null),
    [adresStr]
  );

  const formGonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ad.trim() || !form.email.trim() || !form.mesaj.trim()) {
      toast.hata('Ad, e-posta ve mesaj alanları zorunludur.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.hata('Geçerli bir e-posta adresi girin.');
      return;
    }

    setGonderiliyor(true);
    try {
      const res = await publicApi.iletisimFormuGonder({
        adSoyad: form.ad.trim(),
        eposta: form.email.trim(),
        konu: form.konu,
        mesaj: form.mesaj.trim(),
      });
      setGonderildi(true);
      toast.basarili(res.data.mesaj || 'Talebiniz alındı. En kısa sürede size dönüş yapacağız.');
      setForm((f) => ({ ...f, mesaj: '' }));
    } catch (err: unknown) {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        'Talep gönderilemedi. Lütfen tekrar deneyin.';
      toast.hata(mesaj);
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <MarketingShell>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-edu-line">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-24 right-0 w-[28rem] h-[28rem] bg-wingo-400/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-300/15 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 md:pb-16">
          <nav
            className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-edu-muted mb-8"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="inline-flex items-center gap-1 hover:text-wingo-700 transition-colors">
              <Home className="w-3.5 h-3.5" />
              Ana sayfa
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span className="text-slate-600">İletişim</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-7"
            >
              <span className="inline-flex items-center rounded-full bg-white border border-edu-line px-4 py-1.5 text-xs font-black uppercase tracking-widest text-wingo-700 mb-4 shadow-sm">
                İletişim
              </span>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-edu-ink tracking-tight leading-[1.1]">
                Size nasıl yardımcı olabiliriz?
              </h1>
              <p className="text-edu-muted mt-4 text-sm md:text-base leading-relaxed max-w-xl">
                Formu doldurun, arayın veya e-posta gönderin. Paket, sınav takvimi, ödeme ve teknik
                konularda ekibimiz en kısa sürede dönüş yapar.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#iletisim-form"
                  className="inline-flex items-center gap-2 rounded-xl bg-edu-cta hover:bg-edu-cta-hover px-5 py-2.5 text-xs font-black text-white shadow-md shadow-orange-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  Mesaj gönder
                </a>
                <a
                  href={`mailto:${epostaStr}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white border border-edu-line px-5 py-2.5 text-xs font-bold text-edu-ink hover:border-wingo-300"
                >
                  <Mail className="w-3.5 h-3.5 text-wingo-600" />
                  E-posta yaz
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3"
            >
              <a
                href={`mailto:${epostaStr}`}
                className="flex items-center gap-3 rounded-2xl border border-edu-line bg-white/90 px-4 py-3.5 shadow-sm hover:border-wingo-300 transition-colors"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-wingo-50 text-wingo-700 shrink-0">
                  <Mail className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-edu-muted">E-posta</span>
                  <span className="block text-sm font-bold text-edu-ink truncate">{epostaStr}</span>
                </span>
              </a>
              {telefonStr ? (
                <a
                  href={`tel:${telefonStr.replace(/[\s()-]/g, '')}`}
                  className="flex items-center gap-3 rounded-2xl border border-edu-line bg-white/90 px-4 py-3.5 shadow-sm hover:border-wingo-300 transition-colors"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 shrink-0">
                    <Phone className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-edu-muted">Telefon</span>
                    <span className="block text-sm font-bold text-edu-ink">{telefonStr}</span>
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-edu-line bg-white/90 px-4 py-3.5 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 shrink-0">
                    <Clock className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-edu-muted">Yanıt süresi</span>
                    <span className="block text-sm font-bold text-edu-ink">Genelde 24 saat</span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-2xl border border-edu-line bg-white/90 px-4 py-3.5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-edu-mint text-wingo-700 shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-edu-muted">Destek</span>
                  <span className="block text-sm font-bold text-edu-ink">Paket · Ödeme · Teknik</span>
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-7"
            id="iletisim-form"
          >
            <div className="rounded-3xl border border-edu-line bg-white backdrop-blur-sm p-6 md:p-8 shadow-xl shadow-slate-200/60">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-wingo-600/15 border border-wingo-600/25 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-wingo-700" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-edu-ink">Mesaj gönderin</h2>
                  <p className="text-xs text-edu-muted">Tüm alanları doldurun, size dönüş yapalım.</p>
                </div>
              </div>

              <form onSubmit={formGonder} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="iletisim-ad" className="block text-xs font-bold text-edu-muted uppercase tracking-wider mb-2">
                      Ad Soyad *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-edu-muted" />
                      <input
                        id="iletisim-ad"
                        type="text"
                        required
                        value={form.ad}
                        onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-edu-line text-edu-ink placeholder:text-slate-400 focus:outline-none focus:border-wingo-600/50 focus:ring-1 focus:ring-wingo-300 transition-all text-sm"
                        placeholder="Adınız Soyadınız"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="iletisim-email" className="block text-xs font-bold text-edu-muted uppercase tracking-wider mb-2">
                      E-posta *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-edu-muted" />
                      <input
                        id="iletisim-email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-edu-line text-edu-ink placeholder:text-slate-400 focus:outline-none focus:border-wingo-600/50 focus:ring-1 focus:ring-wingo-300 transition-all text-sm"
                        placeholder="ornek@email.com"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="iletisim-konu" className="block text-xs font-bold text-edu-muted uppercase tracking-wider mb-2">
                    Konu
                  </label>
                  <select
                    id="iletisim-konu"
                    value={form.konu}
                    onChange={(e) => setForm((f) => ({ ...f, konu: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-edu-line text-edu-ink focus:outline-none focus:border-wingo-600/50 focus:ring-1 focus:ring-wingo-300 transition-all text-sm appearance-none cursor-pointer"
                  >
                    {KONU_SECENEKLERI.map((k) => (
                      <option key={k} value={k} className="bg-white text-edu-ink">
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="iletisim-mesaj" className="block text-xs font-bold text-edu-muted uppercase tracking-wider mb-2">
                    Mesajınız *
                  </label>
                  <textarea
                    id="iletisim-mesaj"
                    required
                    rows={5}
                    value={form.mesaj}
                    onChange={(e) => setForm((f) => ({ ...f, mesaj: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-edu-line text-edu-ink placeholder:text-slate-400 focus:outline-none focus:border-wingo-600/50 focus:ring-1 focus:ring-wingo-300 transition-all text-sm resize-none"
                    placeholder="Sorunuzu veya talebinizi kısaca açıklayın…"
                  />
                </div>

                <button
                  type="submit"
                  disabled={gonderiliyor}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-wingo-600 to-wingo-700 text-white font-bold text-sm hover:brightness-110 transition-all disabled:opacity-60 shadow-lg shadow-wingo-600/20"
                >
                  {gonderiliyor ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Mesajı gönder
                </button>
                <p className="text-[11px] text-edu-muted leading-relaxed">
                  {gonderildi
                    ? 'Talebiniz kaydedildi. Ekibimiz en kısa sürede e-posta veya telefon ile size ulaşacaktır.'
                    : (
                      <>
                        Formu gönderdiğinizde talebiniz doğrudan ekibimize iletilir. Acil durumlarda{' '}
                        <a href={`mailto:${epostaStr}`} className="text-wingo-700 hover:underline">
                          {epostaStr}
                        </a>
                        {telefonStr ? (
                          <>
                            {' '}
                            veya{' '}
                            <a href={`tel:${telefonStr.replace(/[\s()-]/g, '')}`} className="text-wingo-700 hover:underline">
                              {telefonStr}
                            </a>
                          </>
                        ) : null}{' '}
                        üzerinden de bize ulaşabilirsiniz.
                      </>
                    )}
                </p>
              </form>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-5 space-y-4"
          >
            {/* İletişim kanalları */}
            <div className="rounded-3xl border border-edu-line bg-white p-6 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-edu-muted">İletişim bilgileri</h3>

              <a
                href={`mailto:${epostaStr}`}
                className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-edu-line hover:border-wingo-600/30 hover:bg-white transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-wingo-600/15 border border-wingo-600/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5 text-wingo-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-edu-muted">E-posta</p>
                  <p className="text-edu-ink font-bold text-sm mt-0.5 break-all">{epostaStr}</p>
                  <p className="text-xs text-edu-muted mt-1">7/24 yazabilirsiniz</p>
                </div>
              </a>

              {telefonStr && (
                <a
                  href={`tel:${telefonStr.replace(/[\s()-]/g, '')}`}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-edu-line hover:border-wingo-600/30 hover:bg-white transition-all group"
                >
                  <div className="w-11 h-11 rounded-xl bg-wingo-50 border border-wingo-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="w-5 h-5 text-wingo-700" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-edu-muted">Telefon</p>
                    <p className="text-edu-ink font-bold text-sm mt-0.5">{telefonStr}</p>
                    <p className="text-xs text-edu-muted mt-1">Hafta içi 09:00 – 18:00</p>
                  </div>
                </a>
              )}

              {adresStr && (
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-edu-line">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-edu-muted">Adres</p>
                    <p className="text-edu-ink font-medium text-sm mt-0.5 leading-relaxed">{adresStr}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Çalışma saatleri */}
            <div className="rounded-3xl border border-edu-line bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-wingo-700" />
                <h3 className="text-sm font-black uppercase tracking-widest text-edu-muted">Çalışma saatleri</h3>
              </div>
              <ul className="space-y-2.5 text-sm">
                <li className="flex justify-between gap-4 text-slate-600">
                  <span>Pazartesi – Cuma</span>
                  <span className="font-semibold text-edu-ink">09:00 – 18:00</span>
                </li>
                <li className="flex justify-between gap-4 text-slate-600">
                  <span>Cumartesi</span>
                  <span className="font-semibold text-edu-ink">10:00 – 14:00</span>
                </li>
                <li className="flex justify-between gap-4 text-slate-600">
                  <span>Pazar</span>
                  <span className="text-edu-muted">Kapalı</span>
                </li>
              </ul>
            </div>

            {/* Üye CTA */}
            <div className="rounded-3xl border border-wingo-200 bg-gradient-to-br from-wingo-50 to-orange-50 p-6">
              <h3 className="text-edu-ink font-bold">
                {token ? 'Destek paneliniz hazır' : 'Zaten üye misiniz?'}
              </h3>
              <p className="text-edu-muted text-sm mt-2 leading-relaxed">
                {token
                  ? 'Açık destek taleplerinizi panelden takip edebilir, yeni talep oluşturabilirsiniz.'
                  : 'Giriş yaparak destek talebi açın; yanıtları panelden anında görün.'}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {token ? (
                  <Link
                    href="/destek"
                    className="inline-flex px-5 py-2.5 rounded-xl bg-wingo-600 hover:bg-wingo-700 text-white text-sm font-bold transition-colors"
                  >
                    Destek paneline git
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/giris"
                      className="inline-flex px-5 py-2.5 rounded-xl bg-wingo-600 hover:bg-wingo-700 text-white text-sm font-bold transition-colors"
                    >
                      Giriş yap
                    </Link>
                    <Link
                      href="/kayit"
                      className="inline-flex px-5 py-2.5 rounded-xl border border-edu-line text-edu-ink hover:bg-edu-mint text-sm font-bold transition-colors"
                    >
                      Kayıt ol
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Harita */}
        {adresStr && haritaUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 md:mt-14"
          >
            <h2 className="text-lg font-bold text-edu-ink mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-wingo-700" />
              Konum
            </h2>
            <div className="rounded-3xl overflow-hidden border border-edu-line bg-white h-64 md:h-80">
              <iframe
                title="Ofis konumu"
                src={haritaUrl}
                className="w-full h-full border-0 grayscale-[30%] contrast-[1.1]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-edu-muted mt-3">{adresStr}</p>
          </motion.div>
        )}

        {/* SSS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 md:mt-16"
        >
          <h2 className="text-xl font-bold text-edu-ink mb-5">Sık sorulan sorular</h2>
          <div className="space-y-3">
            {SSS.map((item) => (
              <details
                key={item.soru}
                className="group rounded-2xl border border-edu-line bg-slate-50 open:bg-white open:border-wingo-600/20 transition-all"
              >
                <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-edu-ink text-sm md:text-base flex items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  {item.soru}
                  <ChevronRight className="w-4 h-4 text-edu-muted shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="px-5 pb-4 text-edu-muted text-sm leading-relaxed border-t border-edu-line pt-3">
                  {item.cevap}
                </p>
              </details>
            ))}
          </div>
        </motion.div>
      </div>
    </MarketingShell>
  );
}
