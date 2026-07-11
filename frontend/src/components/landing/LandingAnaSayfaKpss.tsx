'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Zap,
  GraduationCap,
  TrendingUp,
  BookOpen,
  CheckCircle,
  Award,
  Star,
  Check,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Loader2
} from 'lucide-react';
import { SiteIcerikProvider, useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { api } from '@/lib/api';
import { OdemeGuvenRozetleri } from '@/components/landing/OdemeGuvenRozetleri';
import { PaketSatisKarti } from '@/components/landing/PaketSatisKarti';
import { siteLogoGorunum } from '@/lib/site-marka-logo';
import { useAuthStore } from '@/store/auth.store';
import { LandingKullaniciMenu } from '@/components/landing/LandingKullaniciMenu';

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const steps = 60;
    const stepTime = duration / steps;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(increment * step, target);
      setVal(current);
      if (step >= steps) {
        clearInterval(timer);
        setVal(target);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{Math.floor(val).toLocaleString('tr-TR')}{suffix}</span>;
}

interface Paket {
  id: string;
  ad: string;
  aciklama: string | null;
  kategori?: string;
  fiyat: number;
  indirimliFiyat: number | null;
  sinavSayisi: number;
  ozellikler: string[];
  aktif: boolean;
  populer: boolean;
}

function LandingIcerikKpss() {
  const site = useSiteIcerik();
  const [mobilMenu, setMobilMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const token = useAuthStore((s) => s.token);
  const kullanici = useAuthStore((s) => s.kullanici);
  const oturumAcik = Boolean(mounted && token && kullanici);
  const logoSt = siteLogoGorunum(site.marka);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch active packages
  const { data: paketlerData, isLoading: paketlerYukleniyor } = useQuery({
    queryKey: ['landing-aktif-paketler-kpss'],
    queryFn: () => api.get('/paketler/aktif'),
    staleTime: 5 * 60 * 1000,
  });

  const tumPaketler: Paket[] = paketlerData?.data?.veri || [];

  // Filter for KPSS packages (where kategori includes KPSS, or name includes KPSS)
  const kpssPaketler = useMemo(() => {
    const filtrelenmis = tumPaketler.filter(
      (p) =>
        (p.kategori && p.kategori.toUpperCase().includes('KPSS')) ||
        p.ad.toUpperCase().includes('KPSS')
    );

    // Fallback default packages if no packages are loaded from backend database
    if (filtrelenmis.length === 0) {
      return [
        {
          id: 'kpss-aylik',
          ad: 'Aylık KPSS Paketi',
          aciklama: 'Kısa dönemli, yoğun tekrar ve deneme çözümü yapmak isteyen adaylar için ideal.',
          fiyat: 299,
          indirimliFiyat: 249,
          sinavSayisi: 0, // Sınırsız
          populer: false,
          ozellikler: [
            'Sınırsız Yapay Zeka GY-GK Denemeleri',
            'Detaylı Kazanım Performans Raporları',
            'Eksik Konulara Özel Soru Önerileri',
            'Ayrıntılı Çözüm Videoları ve Açıklamalar',
            '24/7 Akıllı Rehberlik Desteği',
          ],
          aktif: true,
        },
        {
          id: 'kpss-yillik',
          ad: 'Yıllık KPSS Paketi',
          aciklama: 'Sınava kadar uzun soluklu, planlı ve tam kapsamlı yapay zeka desteğiyle hazırlık.',
          fiyat: 1999,
          indirimliFiyat: 1499,
          sinavSayisi: 0,
          populer: true,
          ozellikler: [
            'Tüm GY-GK Konularında Sınırsız Deneme',
            'Kişiye Özel Haftalık Çalışma Programı',
            'Yapay Zekadan Birebir Net Artış Analizi',
            'ÖSYM Tarzı Çıkabilecek Soru Tahminleri',
            'Öncelikli Canlı Destek Desteği',
          ],
          aktif: true,
        },
        {
          id: 'kpss-3-aylik',
          ad: '3 Aylık KPSS Paketi',
          aciklama: 'Konuları bitirdikten sonra deneme kampı yapmak isteyen adaylar için en popüler seçim.',
          fiyat: 799,
          indirimliFiyat: 599,
          sinavSayisi: 0,
          populer: false,
          ozellikler: [
            '3 Ay Boyunca Sınırsız GY-GK Sınavları',
            'Kapsamlı Bölüm & Konu Analiz Raporları',
            'ÖSYM Birebir Uyumlu Deneme Çözümleri',
            'Yapay Zeka Destekli Hedef Takibi',
            'Gelişmiş Deneme Karnesi Paylaşımı',
          ],
          aktif: true,
        },
      ];
    }
    return filtrelenmis;
  }, [tumPaketler]);

  return (
    <main className="min-h-screen bg-[#040d0c] text-slate-100 overflow-x-hidden selection:bg-[#2ABBA7] selection:text-white scroll-smooth">
      {/* Navbar */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#040d0c]/90 backdrop-blur-xl border-b border-[#2ABBA7]/10 shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            {site.marka.logoUrl ? (
              <img
                src={site.marka.logoUrl}
                alt={site.marka.ad}
                className={logoSt.className}
                style={logoSt.style}
              />
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-[#2ABBA7]/10 flex items-center justify-center border border-[#2ABBA7]/25 group-hover:scale-105 transition-all duration-300">
                  <GraduationCap className="w-5 h-5 text-[#2ABBA7]" />
                </div>
                <span className="text-xl font-black text-white tracking-tight uppercase">
                  Wingo<span className="text-[#2ABBA7] group-hover:text-[#42cfbc] transition-colors">KPSS</span>
                </span>
              </>
            )}
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-1.5 py-1 backdrop-blur-md">
            <a href="#istatistik" className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-all duration-200 hover:bg-white/[0.06]">
              Sayılarla Wingo
            </a>
            <a href="#nasil-calisir" className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-all duration-200 hover:bg-white/[0.06]">
              Nasıl Çalışır?
            </a>
            <a href="#ozellikler" className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-all duration-200 hover:bg-white/[0.06]">
              Özellikler
            </a>
            <a href="#paketler" className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-all duration-200 hover:bg-white/[0.06]">
              Paketler
            </a>
          </div>

          <div className="hidden lg:flex items-center gap-6">
            {oturumAcik ? (
              <LandingKullaniciMenu variant="kpss" />
            ) : (
              <>
                <Link href="/giris" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                  Giriş Yap
                </Link>
                <Link href="/kayit" className="relative group overflow-hidden bg-[#2ABBA7] hover:bg-[#1fa897] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 shadow-lg shadow-teal-500/20">
                  <span className="relative z-10">Ücretsiz Kaydol</span>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobilMenu(!mobilMenu)}
            className="lg:hidden p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 hover:text-white"
          >
            {mobilMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Nav Menu */}
      <AnimatePresence>
        {mobilMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-20 z-40 bg-[#040d0c] border-b border-[#2ABBA7]/10 p-6 flex flex-col gap-5 lg:hidden"
          >
            <a
              href="#istatistik"
              onClick={() => setMobilMenu(false)}
              className="text-base font-semibold text-slate-300 hover:text-white"
            >
              Sayılarla Wingo
            </a>
            <a
              href="#nasil-calisir"
              onClick={() => setMobilMenu(false)}
              className="text-base font-semibold text-slate-300 hover:text-white"
            >
              Nasıl Çalışır?
            </a>
            <a
              href="#ozellikler"
              onClick={() => setMobilMenu(false)}
              className="text-base font-semibold text-slate-300 hover:text-white"
            >
              Özellikler
            </a>
            <a
              href="#paketler"
              onClick={() => setMobilMenu(false)}
              className="text-base font-semibold text-slate-300 hover:text-white"
            >
              Paketler
            </a>
            <hr className="border-white/[0.06]" />
            {oturumAcik ? (
              <LandingKullaniciMenu mobil variant="kpss" onNavigate={() => setMobilMenu(false)} />
            ) : (
              <div className="flex flex-col gap-4">
                <Link href="/giris" className="text-center py-3 rounded-xl font-bold text-sm text-slate-300 border border-white/[0.08]">
                  Giriş Yap
                </Link>
                <Link href="/kayit" className="text-center py-3 rounded-xl font-bold text-sm bg-[#2ABBA7] text-white">
                  Ücretsiz Kaydol
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-36 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#2ABBA7]/5 rounded-full blur-[150px]" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[130px]" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2ABBA7]/20 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Content */}
          <div className="lg:col-span-7 text-left space-y-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-[#2ABBA7]/10 border border-[#2ABBA7]/20 px-4 py-1.5 text-xs font-semibold text-[#2ABBA7] backdrop-blur-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F7C948]" />
              Devlet Memurluğu Yolculuğunda Akıllı Yol Arkadaşın
            </motion.div>

            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight"
              >
                KPSS'de Hedeflerine <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2ABBA7] via-[#48dfcb] to-[#80EAD8]">
                  Yapay Zeka Destekli
                </span> <br />
                Denemelerle Ulaş
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed"
              >
                Lisans, Önlisans ve Ortaöğretim düzeylerinde, ÖSYM formatında akıllı deneme sınavları, konu performans analizleri ve yapay zeka gelişim raporları ile rakiplerinin önüne geç.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-2"
            >
              <Link
                href="/kayit"
                className="group relative flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#2ABBA7] to-[#1fa897] px-8 py-4 font-black text-sm text-white shadow-xl shadow-teal-950/40 hover:shadow-teal-900/60 hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
              >
                KPSS'ye Ücretsiz Başla
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Micro Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-4 pt-6 border-t border-white/[0.05]"
            >
              <div>
                <p className="text-2xl font-black text-white">120K+</p>
                <p className="text-xs text-slate-500 mt-1">Özgün Soru Havuzu</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">%98.4</p>
                <p className="text-xs text-slate-500 mt-1">ÖSYM Birebir Uyum</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">24/7</p>
                <p className="text-xs text-slate-500 mt-1">Yapay Zeka Analizi</p>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Character Showcase */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative w-full max-w-[420px] aspect-[4/5] flex items-center justify-center"
            >
              {/* Outer Circular Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#2ABBA7]/20 to-teal-500/5 rounded-full blur-[80px] scale-95" />
              
              {/* Main character image wrapper */}
              <div className="relative w-full h-full flex items-end justify-center select-none z-10">
                <Image
                  src="/kpss-character.png"
                  alt="Wingo KPSS Asistanı"
                  width={420}
                  height={740}
                  priority
                  className="object-contain h-[112%] drop-shadow-[0_15px_30px_rgba(42,187,167,0.25)]"
                />
              </div>

              {/* Floating Info Cards */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 -left-6 bg-[#091720]/90 backdrop-blur-md border border-white/[0.08] p-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-20"
              >
                <div className="w-9 h-9 rounded-lg bg-[#2ABBA7]/15 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#2ABBA7]" />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-medium leading-none">Performans Artışı</p>
                  <p className="text-white text-xs font-bold mt-1">%42'ye Varan Yükseliş</p>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-1/4 -right-6 bg-[#091720]/90 backdrop-blur-md border border-white/[0.08] p-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-20"
              >
                <div className="w-9 h-9 rounded-lg bg-[#2ABBA7]/15 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[#2ABBA7]" />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-medium leading-none">Güncel Konular</p>
                  <p className="text-white text-xs font-bold mt-1">2026 GY+GK Uyumlu</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="istatistik" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#030a09] scroll-mt-20 overflow-hidden border-t border-[#2ABBA7]/5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#2ABBA7]/3 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center rounded-full bg-[#2ABBA7]/10 border border-[#2ABBA7]/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#2ABBA7] mb-4">
              ÖSYM Formatında Akıllı Hazırlık
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">Sayılarla Wingo KPSS</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-3">Yapay zeka altyapımızla binlerce memur adayı hedeflerine daha emin adımlarla ilerliyor.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { target: 120000, suffix: '+', label: 'Özgün Soru', desc: 'Her dersten güncel müfredata uygun soru havuzu', color: 'text-[#8FE4D8]', accent: 'from-[#2ABBA7]/15 to-[#2ABBA7]/5', border: 'border-[#2ABBA7]/15' },
              { target: 98, suffix: '.4%', label: 'ÖSYM Uyum Oranı', desc: 'Tüm Genel Yetenek & Genel Kültür kazanımları', color: 'text-[#FFE08A]', accent: 'from-amber-500/15 to-amber-500/5', border: 'border-amber-500/15' },
              { target: 45, suffix: '+', label: 'Akıllı Deneme', desc: 'Yapay zeka ile kişiye özel üretilen sınavlar', color: 'text-[#FF9AA2]', accent: 'from-red-500/15 to-red-500/5', border: 'border-red-500/15' },
              { target: 4, suffix: '.8', label: 'Öğrenci Memnuniyeti', desc: 'Yapay zeka rehberlik desteğimizle yüksek verim', color: 'text-[#B8A4FF]', accent: 'from-indigo-500/15 to-indigo-500/5', border: 'border-indigo-500/15' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                className={`relative rounded-2xl border ${s.border} bg-gradient-to-b ${s.accent} p-6 cursor-default overflow-hidden backdrop-blur-md shadow-lg shadow-black/20 hover:shadow-black/40 transition-shadow duration-300 group`}
              >
                <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-current to-transparent ${s.color} opacity-30`} />
                <div className={`text-4xl font-black tabular-nums mb-2 tracking-tight ${s.color}`}>
                  <AnimatedNumber target={s.target} suffix={s.suffix} />
                </div>
                <div className="text-slate-100 font-bold text-sm mb-1">{s.label}</div>
                <div className="text-slate-400 text-xs leading-snug">{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Nasıl Çalışır Section */}
      <section id="nasil-calisir" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#040d0c] scroll-mt-20 overflow-hidden border-t border-white/[0.02]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#2ABBA7]/4 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/3 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-xl mx-auto mb-16"
          >
            <span className="inline-flex items-center rounded-full bg-[#2ABBA7]/10 border border-[#2ABBA7]/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#2ABBA7] mb-5">
              Kolay ve Etkili Süreç
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-4">Sistem Nasıl Çalışıyor?</h2>
            <p className="text-slate-400 text-sm leading-relaxed">Wingo KPSS, hedefinize giden devlet memurluğu yolculuğunu 3 basit adımda organize eder.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line on desktop */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-[#2ABBA7]/30 via-amber-500/20 to-teal-500/30" />

            {[
              { step: 1, title: 'Kapsam ve Kademeni Seç', text: 'Lisans, ön lisans veya ortaöğretim düzeyinizi seçip hedeflerinizi belirleyin.', color: 'from-[#2ABBA7] to-[#1fa897]', iconBg: 'bg-[#2ABBA7]/10', iconText: 'text-[#2ABBA7]', icon: GraduationCap },
              { step: 2, title: 'Yapay Zeka ile Deneme Çöz', text: 'Yapay zekanın tamamen eksiklerinize ve ÖSYM tarzına göre ürettiği GY-GK denemelerini çözün.', color: 'from-amber-500 to-amber-600', iconBg: 'bg-amber-500/10', iconText: 'text-amber-500', icon: Zap },
              { step: 3, title: 'Detaylı Gelişim Raporunu Al', text: 'Yanlış yaptığınız konuların analizini görün ve yapay zeka destekli ders çalışma yol haritanıza başlayın.', color: 'from-indigo-500 to-indigo-600', iconBg: 'bg-indigo-500/10', iconText: 'text-indigo-500', icon: Award },
            ].map((adim, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                className="relative group"
              >
                <div className="relative bg-slate-950/60 rounded-2xl border border-white/[0.05] p-7 backdrop-blur-sm hover:border-[#2ABBA7]/20 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
                  <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${adim.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className="flex items-center gap-4 mb-5">
                    <div className={`inline-flex w-10 h-10 rounded-xl bg-gradient-to-br ${adim.color} items-center justify-center font-black text-base text-white shadow-lg`}>
                      {adim.step}
                    </div>
                    <div className={`inline-flex w-12 h-12 rounded-xl ${adim.iconBg} items-center justify-center`}>
                      <adim.icon className={`w-6 h-6 ${adim.iconText}`} />
                    </div>
                  </div>

                  <h3 className="text-white font-black text-lg mb-2.5">{adim.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{adim.text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center mt-12"
          >
            <Link
              href="/kayit"
              className="group inline-flex items-center gap-2 text-[#2ABBA7] font-bold text-sm hover:gap-3 transition-all"
            >
              Hemen Başla
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Özellikler Section */}
      <section id="ozellikler" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#030a09] scroll-mt-20 overflow-hidden border-t border-[#2ABBA7]/5">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="inline-flex items-center rounded-full bg-[#2ABBA7]/10 border border-[#2ABBA7]/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#2ABBA7]">
              Gelişmiş Özellikler
            </span>
            <h2 className="text-3xl font-black text-white sm:text-4xl">KPSS Süreciniz İçin Güçlü Araçlar</h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Memurluk hedefinize ulaşmanız için özel olarak tasarlanmış yapay zeka entegrasyonu ve kapsamlı soru bankası.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: 'ÖSYM Standartlarında', desc: 'Genel Yetenek ve Genel Kültür konularına uygun, güncel müfredatla birebir uyumlu test havuzları.' },
              { icon: GraduationCap, title: 'Dinamik Seviye Analizi', desc: 'Yanlış yaptığın konuları tespit eden ve çalışma planını buna göre şekillendiren yapay zeka rehberliği.' },
              { icon: Sparkles, title: 'Hızlı ve Detaylı Çözümler', desc: 'Her deneme sonrasında eksik kaldığın kazanımları güçlendirecek özel soru tavsiyeleri.' },
              { icon: CheckCircle, title: 'Gelişmiş Deneme Karnesi', desc: 'Her sınav sonunda doğru-yanlış analizleri, tahmini Türkiye sıralamaları ve net grafikleri tek ekranda.' }
            ].map((f, i) => (
              <div key={i} className="group bg-slate-950/40 hover:bg-[#2ABBA7]/[0.02] border border-white/[0.04] hover:border-[#2ABBA7]/20 rounded-2xl p-7 shadow-sm transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[#2ABBA7]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <f.icon className="w-6 h-6 text-[#2ABBA7]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Paketler Section */}
      <section id="paketler" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#040d0c] scroll-mt-20 overflow-hidden border-t border-white/[0.02]">
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-xl mx-auto mb-16"
          >
            <span className="inline-flex items-center rounded-full bg-[#2ABBA7]/10 border border-[#2ABBA7]/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#2ABBA7] mb-5">
              Uygun Fiyatlar
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">Hedefinize Ulaştıran KPSS Paketleri</h2>
            <p className="text-slate-400 text-sm leading-relaxed mt-2">Bütçenize ve çalışma planınıza en uygun paketi seçin, yapay zeka ile çalışmaya hemen başlayın.</p>
          </motion.div>

          {paketlerYukleniyor ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#2ABBA7] animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-7 items-stretch pt-2">
              {kpssPaketler.map((paket, i) => (
                <PaketSatisKarti
                  key={paket.id}
                  paket={paket}
                  kategoriAd="KPSS"
                  kategoriSlug="KPSS"
                  index={i}
                  kpssModu
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-[#030a09] text-white overflow-hidden border-t border-[#2ABBA7]/10">
        <div className="absolute top-1/3 right-0 w-64 h-64 bg-[#2ABBA7]/4 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-teal-500/3 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8 pb-14 border-b border-white/[0.06]">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-6">
              <Link href="/" className="inline-flex items-center gap-2.5 shrink-0 group">
                {site.marka.logoUrl ? (
                  <img
                    src={site.marka.logoUrl}
                    alt={site.marka.ad}
                    className={`${logoSt.className} brightness-0 invert`}
                    style={logoSt.style}
                  />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-[#2ABBA7]/10 flex items-center justify-center border border-[#2ABBA7]/25">
                      <GraduationCap className="w-5 h-5 text-[#2ABBA7]" />
                    </div>
                    <span className="text-xl font-black text-white tracking-tight uppercase">
                      Wingo<span className="text-[#2ABBA7]">KPSS</span>
                    </span>
                  </>
                )}
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Wingo KPSS ile devlet memurluğu sınav hazırlık sürecinizi dijitalleştirin. Yapay zeka destekli denemeler, konu performans analizleri ve kişiye özel gelişim raporları ile hedefinize emin adımlarla ulaşın.
              </p>
              {/* Contact */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-[#2ABBA7]" />
                  </div>
                  <a href="mailto:destek@wingodeneme.com" className="hover:underline hover:text-[#2ABBA7] transition-colors">
                    destek@wingodeneme.com
                  </a>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-[#2ABBA7]" />
                  </div>
                  <span>05322029646 - 0532202WNGO</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-400">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-[#2ABBA7]" />
                  </div>
                  <span className="leading-relaxed">Ziya Gökalp Mah. Süleyman Demirel Bulvarı Mall Of İstanbul The Office No:7 E Kat:17 D.No:136 PK:34490 Başakşehir İstanbul/Türkiye</span>
                </div>
              </div>
            </div>

            {/* Menu Links */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-7">Ürün</h3>
              <ul className="space-y-4">
                <li><Link href="/paketler" className="text-sm text-slate-400 hover:text-[#2ABBA7] transition-colors duration-200 flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2ABBA7]/30" />Paketler</Link></li>
                <li><Link href="/#ozellikler" className="text-sm text-slate-400 hover:text-[#2ABBA7] transition-colors duration-200 flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2ABBA7]/30" />Özellikler</Link></li>
                <li><Link href="/#nasil-calisir" className="text-sm text-slate-400 hover:text-[#2ABBA7] transition-colors duration-200 flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2ABBA7]/30" />Nasıl Çalışır?</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-7">Kaynaklar</h3>
              <ul className="space-y-4">
                <li><Link href="/#istatistik" className="text-sm text-slate-400 hover:text-[#2ABBA7] transition-colors duration-200 flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2ABBA7]/30" />İstatistikler</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-7">Hesap</h3>
              <ul className="space-y-4">
                <li><Link href="/giris" className="text-sm text-slate-400 hover:text-[#2ABBA7] transition-colors duration-200 flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2ABBA7]/30" />Giriş Yap</Link></li>
                <li><Link href="/kayit" className="text-sm text-slate-400 hover:text-[#2ABBA7] transition-colors duration-200 flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2ABBA7]/30" />Kayıt Ol</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-7">Sözleşmeler</h3>
              <ul className="space-y-4">
                <li><Link href="/hakkimizda" className="text-sm text-slate-400 hover:text-[#2ABBA7] transition-colors duration-200 flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2ABBA7]/30" />Hakkımızda</Link></li>
                <li><Link href="/gizlilik-politikasi" className="text-sm text-slate-400 hover:text-[#2ABBA7] transition-colors duration-200 flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2ABBA7]/30" />Gizlilik Politikası</Link></li>
                <li><Link href="/mesafeli-satis-sozlesmesi" className="text-sm text-slate-400 hover:text-[#2ABBA7] transition-colors duration-200 flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2ABBA7]/30" />Mesafeli Satış</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col items-center gap-5">
            <OdemeGuvenRozetleri koyu />

            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-slate-500">
                Copyright &copy; {new Date().getFullYear()}{' '}
                <span className="text-slate-400 font-semibold">Wingo KPSS</span>
                {' '}— Tüm Hakları Saklıdır. | Tasarım ve Kodlama
              </p>
              <a
                href="https://lim10soft.com.tr/"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100 transition-opacity duration-300"
              >
                <img
                  src="https://lim10soft.com.tr/assets/imgs/lim10soft/lim10soft-footer-logo-white.png"
                  alt="Lim10 Soft"
                  className="h-7 w-auto"
                />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

export function LandingAnaSayfaKpss() {
  return (
    <SiteIcerikProvider>
      <LandingIcerikKpss />
    </SiteIcerikProvider>
  );
}
