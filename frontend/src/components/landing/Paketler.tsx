'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { useKpssLanding } from '@/contexts/LandingThemeContext';
import { CheckCircle2, Loader2, ShieldCheck, Sparkles, Star, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { paketApi } from '@/lib/api';
import {
  kategoriHaritasi,
  paketKategoriFromPaket,
  type PaketKategoriKayit,
} from '@/lib/paketKategori';
import { resolveMarketingNavHref } from '@/lib/publicPaketlerHref';
import { PaketSatisKarti, type PaketSatisVeri } from '@/components/landing/PaketSatisKarti';

const KPSS_YEDEK: PaketSatisVeri[] = [
  {
    id: 'kpss-aylik',
    ad: 'Aylık KPSS Paketi',
    aciklama: 'Kısa dönemli, yoğun tekrar ve deneme çözümü yapmak isteyen adaylar için ideal.',
    fiyat: 299,
    indirimliFiyat: 249,
    sinavSayisi: 0,
    populer: false,
    ozellikler: [
      'Sınırsız Yapay Zeka GY-GK Denemeleri',
      'Detaylı Kazanım Performans Raporları',
      'Eksik Konulara Özel Soru Önerileri',
      'Ayrıntılı Çözüm Videoları ve Açıklamalar',
      '24/7 Akıllı Rehberlik Desteği',
    ],
    kategori: 'KPSS',
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
      'Öncelikli Canlı Destek',
    ],
    kategori: 'KPSS',
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
    kategori: 'KPSS',
  },
];

function kpssPaketMi(p: PaketSatisVeri) {
  return (
    (p.kategori && p.kategori.toUpperCase().includes('KPSS')) ||
    p.ad.toUpperCase().includes('KPSS')
  );
}

export function Paketler() {
  const site = useSiteIcerik();
  const kpss = useKpssLanding();
  const pb = site.paketBolum;

  const { data, isLoading } = useQuery({
    queryKey: ['landing-aktif-paketler', kpss ? 'kpss' : 'yks'],
    queryFn: () => api.get('/paketler/aktif'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: kategorilerData } = useQuery({
    queryKey: ['landing-paket-kategorileri'],
    queryFn: () => paketApi.kategoriler(),
    staleTime: 5 * 60 * 1000,
  });

  const paketler: PaketSatisVeri[] = data?.data?.veri || [];
  const kategoriler: PaketKategoriKayit[] = kategorilerData?.data?.veri || [];
  const kategoriHarita = useMemo(() => kategoriHaritasi(kategoriler), [kategoriler]);

  const platformPaketler = useMemo(() => {
    const filtrelenmis = paketler.filter((p) => (kpss ? kpssPaketMi(p) : !kpssPaketMi(p)));
    if (kpss && filtrelenmis.length === 0) return KPSS_YEDEK;
    return filtrelenmis;
  }, [paketler, kpss]);

  const siraliPaketler = useMemo(() => {
    const sira = new Map(kategoriler.map((k, i) => [k.slug, i]));
    return [...platformPaketler].sort((a, b) => {
      if (a.populer !== b.populer) return a.populer ? -1 : 1;
      const ka = sira.get(a.kategori || 'GENEL') ?? 999;
      const kb = sira.get(b.kategori || 'GENEL') ?? 999;
      if (ka !== kb) return ka - kb;
      return a.ad.localeCompare(b.ad, 'tr');
    });
  }, [platformPaketler, kategoriler]);

  const hamHref = (pb.tumPaketlerHref || '/paketler').trim();
  const tumPaketlerLink = (() => {
    const resolved = resolveMarketingNavHref(hamHref, pb.tumPaketler);
    if (
      !resolved ||
      resolved === '/kayit' ||
      resolved.startsWith('/kayit') ||
      resolved === '/iletisim' ||
      resolved.startsWith('/iletisim') ||
      resolved === '/market'
    ) {
      return '/paketler';
    }
    return resolved;
  })();

  return (
    <section id="paketler" className="relative py-20 md:py-24 bg-edu-bg scroll-mt-24 overflow-hidden">
      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.05, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 right-0 w-[28rem] h-[28rem] bg-wingo-400/15 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{ opacity: [0.3, 0.55, 0.3], x: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-[100px] pointer-events-none"
        style={{ backgroundColor: 'color-mix(in srgb, var(--edu-cta) 12%, transparent)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-10 md:mb-12"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] mb-5"
            style={{
              borderColor: 'color-mix(in srgb, var(--edu-cta) 35%, white)',
              backgroundColor: 'color-mix(in srgb, var(--edu-cta) 10%, white)',
              color: 'var(--edu-cta-hover)',
            }}
          >
            <Timer className="w-3.5 h-3.5" />
            {kpss ? 'KPSS’ye özel paketler' : 'Sınava özel paketler'}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-[2.85rem] font-extrabold text-edu-ink tracking-tight leading-[1.1] mb-4">
            {kpss ? 'Hedefinize ulaştıran KPSS paketleri' : pb.baslik}
          </h2>
          <p className="text-edu-muted text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            {kpss
              ? 'GY-GK odaklı denemeler, analiz ve AI destekli içerik — tek pakette memurluk hazırlığı.'
              : pb.aciklama}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-10 text-xs sm:text-sm font-semibold text-edu-muted"
        >
          {[
            { ikon: CheckCircle2, metin: 'Anında aktivasyon' },
            { ikon: ShieldCheck, metin: 'Güvenli ödeme' },
            { ikon: Sparkles, metin: 'Detaylı analiz dahil' },
          ].map((t) => (
            <div key={t.metin} className="flex items-center gap-2">
              <t.ikon className="w-4 h-4 text-wingo-600" />
              {t.metin}
            </div>
          ))}
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link
            href={pb.kayitHref}
            className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-edu-cta hover:bg-edu-cta-hover text-white text-sm font-extrabold transition-all shadow-lg hover:-translate-y-0.5 overflow-hidden"
            style={{ boxShadow: '0 12px 28px -10px color-mix(in srgb, var(--edu-cta) 45%, transparent)' }}
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700" />
            <Sparkles className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{pb.ucretsizDene}</span>
          </Link>
          <Link
            href={tumPaketlerLink}
            className="px-6 py-3 rounded-xl bg-white border border-edu-line text-edu-ink text-sm font-bold hover:border-wingo-400 transition-all"
          >
            {pb.tumPaketler}
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-wingo-600" />
          </div>
        ) : siraliPaketler.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-edu-line bg-white p-14 text-center"
          >
            <Star className="w-10 h-10 text-wingo-600 mx-auto mb-4 opacity-50" />
            <p className="text-edu-ink font-bold text-lg">{pb.bosPaketMesaj}</p>
            <p className="text-edu-muted text-sm mt-2">{pb.bosPaketAlt}</p>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-7 items-stretch"
          >
            {siraliPaketler.map((paket, i) => {
              const katInfo = paketKategoriFromPaket(paket, kategoriHarita);
              return (
                <PaketSatisKarti
                  key={paket.id}
                  paket={paket}
                  kategoriAd={kpss ? katInfo.ad || 'KPSS' : katInfo.ad}
                  kategoriSlug={kpss ? katInfo.slug || 'KPSS' : katInfo.slug}
                  index={i}
                  kpssModu={kpss}
                />
              );
            })}
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center text-xs text-edu-muted"
        >
          Ödeme sonrası paket anında hesabına tanımlanır. İstediğin zaman iptal / destek için bizimle iletişime geçebilirsin.
        </motion.p>
      </div>
    </section>
  );
}
