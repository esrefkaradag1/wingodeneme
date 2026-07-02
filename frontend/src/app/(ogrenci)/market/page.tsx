'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { paketApi } from '@/lib/api';
import {
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Loader2,
  X,
  BookOpen,
  Video,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/store/toast.store';
import { OdemeGuvenRozetleri } from '@/components/landing/OdemeGuvenRozetleri';
import {
  kategoriHaritasi,
  paketKategoriEtiket,
  paketKategoriRenk,
  paketKategoriFromPaket,
  type PaketKategoriKayit,
} from '@/lib/paketKategori';

const VARSAYILAN_WINGOLINK_KATEGORI = [
  {
    id: 'wingolink-yks',
    ad: 'YKS Hazırlık Videoları',
    aciklama: 'TYT & AYT tüm dersler için profesyonel video paketleri ve interaktif çözüm anlatımları.',
    disUrl: 'https://wingolink.com.tr/yks',
    ozellikler: ['Tüm dersler', 'Konu anlatım + soru çözüm', 'Mobil uyumlu izleme'],
    ikon: GraduationCap,
  },
  {
    id: 'wingolink-lgs',
    ad: 'LGS Hazırlık Videoları',
    aciklama: '8. sınıf MEB müfredatına tam uyumlu profesyonel hazırlık videoları ve yeni nesil sorular.',
    disUrl: 'https://wingolink.com.tr/lgs',
    ozellikler: ['MEB uyumlu', 'Yeni nesil sorular', 'Konu deneme paketleri'],
    ikon: BookOpen,
  },
  {
    id: 'wingolink-arsiv',
    ad: 'Konu Anlatım Arşivi',
    aciklama: 'Binlerce ders saatlik içerik, sınırsız izleme. Tek aboneliğin her şeyi kapsasın.',
    disUrl: 'https://wingolink.com.tr',
    ozellikler: ['Sınırsız izleme', 'Tüm kategoriler', '7/24 erişim'],
    ikon: Video,
  },
] as const;

export default function MarketSayfasi() {
  const [secilenPaket, setSecilenPaket] = useState<any>(null);
  const [checkoutForm, setCheckoutForm] = useState<string | null>(null);
  const [kategoriFiltre, setKategoriFiltre] = useState<string | 'TUMU'>('TUMU');

  const { data: paketlerData, isLoading: paketlerYukleniyor } = useQuery({
    queryKey: ['paketler'],
    queryFn: () => paketApi.liste(),
  });

  const { data: kategorilerData } = useQuery({
    queryKey: ['paket-kategorileri'],
    queryFn: () => paketApi.kategoriler(),
  });
  const kategoriler: PaketKategoriKayit[] = kategorilerData?.data?.veri || [];
  const kategoriHarita = useMemo(() => kategoriHaritasi(kategoriler), [kategoriler]);

  const satinAlMutation = useMutation({
    mutationFn: (paketId: string) => 
      paketApi.satinAl({ paketId, odemeYontemi: 'KREDI_KARTI' }),
    onSuccess: (response) => {
      const data = response.data.veri;
      if (data.checkoutFormContent) {
        setCheckoutForm(data.checkoutFormContent);
      } else {
        toast.basarili('Siparişiniz alındı, ödeme onayı bekleniyor.');
      }
    },
    onError: (error: any) => {
      toast.hata(error.response?.data?.mesaj || 'Ödeme başlatılamadı');
    }
  });

  // Iyzico scriptini inject et
  useEffect(() => {
    if (checkoutForm) {
      const container = document.getElementById('iyzico-form-container');
      if (container) {
        // Mevcut scriptleri temizle
        container.innerHTML = '';
        
        // Iyzico'nun döndürdüğü HTML içeriğini (script tag içeren) bir div içine koy
        const div = document.createElement('div');
        div.innerHTML = checkoutForm;
        container.appendChild(div);

        // Script tag'lerini elle çalıştır (bazı tarayıcılarda innerHTML içindeki scriptler çalışmaz)
        const scripts = div.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
          const newScript = document.createElement('script');
          newScript.text = scripts[i].text;
          document.body.appendChild(newScript);
        }
      }
    }
  }, [checkoutForm]);

  const paketler = paketlerData?.data?.veri || [];

  const wingoPaketleri = useMemo(
    () => paketler.filter((p: any) => !p.disUrl),
    [paketler]
  );

  const mevcutKategoriler = useMemo(() => {
    const slugSet = new Set<string>();
    for (const p of wingoPaketleri) {
      slugSet.add(p.kategoriKayit?.slug || p.kategori || 'GENEL');
    }
    return kategoriler.filter((k) => slugSet.has(k.slug));
  }, [wingoPaketleri, kategoriler]);

  const gorunenWingoPaketleri = useMemo(() => {
    if (kategoriFiltre === 'TUMU') return wingoPaketleri;
    return wingoPaketleri.filter((p: any) => (p.kategoriKayit?.slug || p.kategori || 'GENEL') === kategoriFiltre);
  }, [wingoPaketleri, kategoriFiltre]);

  const kategoriyeGoreGruplar = useMemo(() => {
    if (kategoriFiltre !== 'TUMU') {
      return [{ kategori: kategoriFiltre, paketler: gorunenWingoPaketleri }];
    }
    return mevcutKategoriler.map((k) => ({
      kategori: k,
      paketler: wingoPaketleri.filter((p: any) => (p.kategoriKayit?.slug || p.kategori || 'GENEL') === k),
    })).filter((g) => g.paketler.length > 0);
  }, [kategoriFiltre, gorunenWingoPaketleri, mevcutKategoriler, wingoPaketleri]);
  const wingoLinkPaketleri = useMemo(
    () => paketler.filter((p: any) => !!p.disUrl),
    [paketler]
  );

  if (paketlerYukleniyor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-12">
      {/* Header */}
      <section className="text-center space-y-4">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest border border-indigo-100"
        >
           <Sparkles className="w-4 h-4" /> Eğitim Paketleri
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
          Geleceğine <span className="text-indigo-600">Yatırım Yap</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          Hedeflediğin üniversite için ihtiyacın olan tüm deneme sınavları ve yapay zeka destekli analizler burada.
        </p>
      </section>

      {/* WingoLink Promo Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-indigo-900 via-slate-900 to-black p-1"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="relative bg-white/5 backdrop-blur-3xl rounded-[39px] p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
              <Sparkles className="w-3 h-3" /> İş Ortağımız
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
              WingoLink <span className="text-indigo-400">Eko-Sistemi</span> ile Tanışın
            </h2>
            <p className="text-indigo-100/70 font-medium text-lg max-w-xl">
              Tüm derslerde profesyonel video paketleri, interaktif içerikler ve binlerce yeni nesil soru wingolink.com.tr'de seni bekliyor.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <a 
                href="https://wingolink.com.tr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
              >
                Hemen Keşfet
              </a>
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" />
                  </div>
                ))}
                <div className="h-10 px-4 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-300">
                  +10k Öğrenci
                </div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/3 aspect-square relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full animate-pulse"></div>
            <div className="relative w-full h-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 flex flex-col justify-center items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40">
                <Zap className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-white">Sınırsız İçerik</h3>
              <p className="text-sm font-bold text-indigo-200/60">YKS & LGS için en kapsamlı video arşivi</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Wingo Deneme Paketleri */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
              <Zap className="w-3.5 h-3.5" /> Wingo Deneme
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-3">Sınav & Deneme Paketleri</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">
              Wingo Deneme bünyesindeki online sınavlar, analiz ve yapay zeka destekli içerikler.
            </p>
          </div>
        </div>

        {wingoPaketleri.length > 0 && mevcutKategoriler.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setKategoriFiltre('TUMU')}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border transition-all ${
                kategoriFiltre === 'TUMU'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              Tümü
            </button>
            {mevcutKategoriler.map((k) => (
              <button
                key={k.slug}
                type="button"
                onClick={() => setKategoriFiltre(k.slug)}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border transition-all ${
                  kategoriFiltre === k.slug
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : `${paketKategoriRenk(k.slug, kategoriHarita)} hover:opacity-90`
                }`}
              >
                {k.ad}
              </button>
            ))}
          </div>
        )}

        {wingoPaketleri.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-10 text-center">
            <p className="text-sm font-bold text-indigo-700/80">
              Şu anda satışta olan Wingo Deneme paketi bulunmuyor. Yakında yeni paketler eklenecek.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {kategoriyeGoreGruplar.map(({ kategori, paketler: grupPaketleri }) => {
              const kat = kategoriHarita.get(kategori);
              return (
              <div key={kategori} className="space-y-6">
                {kategoriFiltre === 'TUMU' && (
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${paketKategoriRenk(kategori, kategoriHarita)}`}>
                      {kat?.ad || kategori}
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs font-bold text-gray-400">{grupPaketleri.length} paket</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {grupPaketleri.map((paket: any, index: number) => {
                    const katInfo = paketKategoriFromPaket(paket, kategoriHarita);
                    return (
                    <motion.div
                      key={paket.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.08 }}
                      className={`relative group bg-white rounded-[32px] p-8 border-2 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
                        paket.populer ? 'border-indigo-600 shadow-xl' : 'border-gray-100 hover:border-indigo-200'
                      }`}
                    >
                      {paket.populer && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30">
                          En Popüler
                        </div>
                      )}

                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-2">
                            <span className={`self-start px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${katInfo.renk}`}>
                              {katInfo.ad}
                            </span>
                            <div className={`p-3 rounded-2xl w-fit ${paket.populer ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-indigo-600'}`}>
                              <Zap className="w-6 h-6" />
                            </div>
                          </div>
                          <div className="text-right">
                            {paket.indirimliFiyat && (
                              <p className="text-sm text-gray-400 line-through font-bold">₺{paket.fiyat}</p>
                            )}
                            <p className="text-3xl font-black text-gray-900">₺{paket.indirimliFiyat || paket.fiyat}</p>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-black text-gray-900 mb-2">{paket.ad}</h3>
                          <p className="text-sm text-gray-400 font-medium leading-relaxed">{paket.aciklama}</p>
                        </div>

                        <div className="space-y-3 py-6 border-y border-gray-50">
                          {paket.sinavSayisi > 0 && (
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>{paket.sinavSayisi} Adet Deneme Sınavı</span>
                            </div>
                          )}
                          {paket.ozellikler?.map((ozellik: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm font-medium text-gray-500">
                              <CheckCircle2 className="w-4 h-4 text-indigo-200" />
                              <span>{ozellik}</span>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/paket/${encodeURIComponent(paket.id)}`}
                            className="py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-800 hover:border-indigo-300 hover:text-indigo-700 transition-all"
                          >
                            Denemeleri Seç
                          </Link>
                          <button
                            onClick={() => {
                              setSecilenPaket(paket);
                              satinAlMutation.mutate(paket.id);
                            }}
                            disabled={satinAlMutation.isPending}
                            className={`py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                              paket.populer
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'
                                : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-900/10'
                            }`}
                          >
                            {satinAlMutation.isPending && secilenPaket?.id === paket.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                Tüm Paket <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {/* WingoLink Eğitim Paketleri */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-widest border border-orange-100">
              <Sparkles className="w-3.5 h-3.5" /> WingoLink
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-3">İş Ortağı Eğitim Paketleri</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">
              <a href="https://wingolink.com.tr" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-bold">
                wingolink.com.tr
              </a>{' '}
              üzerindeki profesyonel konu anlatım videoları ve içerik kategorileri.
            </p>
          </div>
          <a
            href="https://wingolink.com.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-black uppercase tracking-widest border border-orange-200 transition-colors"
          >
            Tümünü Gör <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {wingoLinkPaketleri.length > 0
            ? wingoLinkPaketleri.map((paket: any, index: number) => (
                <motion.div
                  key={paket.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08 }}
                  className="relative group bg-white rounded-[32px] p-8 border-2 border-orange-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:border-orange-300"
                >
                  <div className="absolute top-4 right-4 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-200">
                    WingoLink Özel
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
                        <Video className="w-6 h-6" />
                      </div>
                      {(paket.indirimliFiyat || paket.fiyat) ? (
                        <div className="text-right">
                          {paket.indirimliFiyat && (
                            <p className="text-sm text-gray-400 line-through font-bold">₺{paket.fiyat}</p>
                          )}
                          <p className="text-3xl font-black text-gray-900">₺{paket.indirimliFiyat || paket.fiyat}</p>
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">{paket.ad}</h3>
                      <p className="text-sm text-gray-400 font-medium leading-relaxed">{paket.aciklama}</p>
                    </div>

                    <div className="space-y-3 py-6 border-y border-gray-50">
                      {paket.ozellikler?.map((ozellik: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <CheckCircle2 className="w-4 h-4 text-orange-300" />
                          <span>{ozellik}</span>
                        </div>
                      ))}
                    </div>

                    <a
                      href={paket.disUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                    >
                      WingoLink'te İncele <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              ))
            : VARSAYILAN_WINGOLINK_KATEGORI.map((kategori, index) => {
                const Ikon = kategori.ikon;
                return (
                  <motion.a
                    key={kategori.id}
                    href={kategori.disUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.08 }}
                    className="relative group bg-white rounded-[32px] p-8 border-2 border-orange-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:border-orange-300 flex flex-col"
                  >
                    <div className="absolute top-4 right-4 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-200">
                      wingolink.com.tr
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
                        <Ikon className="w-6 h-6" />
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 mt-6 mb-2">{kategori.ad}</h3>
                    <p className="text-sm text-gray-400 font-medium leading-relaxed">{kategori.aciklama}</p>

                    <div className="space-y-3 py-6 border-y border-gray-50 mt-4">
                      {kategori.ozellikler.map((ozellik, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <CheckCircle2 className="w-4 h-4 text-orange-300" />
                          <span>{ozellik}</span>
                        </div>
                      ))}
                    </div>

                    <span className="mt-6 w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all bg-orange-500 text-white group-hover:bg-orange-600 shadow-lg shadow-orange-500/20">
                      WingoLink'i Aç <ExternalLink className="w-4 h-4" />
                    </span>
                  </motion.a>
                );
              })}
        </div>
      </section>

      <div className="max-w-2xl mx-auto rounded-[32px] bg-emerald-50/50 border border-emerald-100 p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
           <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="flex-1 text-center md:text-left">
           <h3 className="text-sm font-black text-emerald-900 uppercase tracking-widest mb-1">256-bit Güvenli Ödeme</h3>
           <p className="text-xs font-bold text-emerald-700/60 leading-relaxed">Ödemeleriniz Iyzico güvencesiyle uçtan uca şifrelenir. Kart bilgileriniz asla sunucularımızda saklanmaz.</p>
        </div>
        <OdemeGuvenRozetleri className="shrink-0" />
      </div>

      {/* Iyzico Modal */}
      <AnimatePresence>
        {checkoutForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
              onClick={() => setCheckoutForm(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900 leading-tight">Güvenli Ödeme</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{secilenPaket?.ad}</p>
                  </div>
                </div>
                <button
                  onClick={() => setCheckoutForm(null)}
                  className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 max-h-[70vh] overflow-y-auto">
                 <div id="iyzico-form-container" className="min-h-[400px]">
                    <div className="flex flex-col items-center justify-center py-12">
                       <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ödeme formu yükleniyor...</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
