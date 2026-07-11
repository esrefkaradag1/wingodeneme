'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analizApi, sinavApi, aiApi, paketApi, api, publicApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  BookOpen,
  Trophy,
  Target,
  TrendingUp,
  ArrowRight,
  Clock,
  Compass,
  GraduationCap,
  Calendar,
  Swords,
  ListChecks,
  Zap,
  Bell,
  LifeBuoy,
  Globe,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  hizliLinkler,
  LGS_RESMI_TAKIP,
  KPSS_RESMI_TAKIP,
  ogretimTuruCoz,
  YKS_RESMI_TAKIP,
  kpssMi,
  kademeTemasi,
} from '@/lib/ogrenciKademe';

type DuyuruAlici = {
  id: string;
  okundu: boolean;
  duyuru: { id: string; baslik: string; mesaj: string; olusturuldu: string };
};

type DestekTalebi = {
  id: string;
  baslik: string;
  durum: 'ACIK' | 'BEKLEMEDE' | 'COZULDU' | 'KAPANDI';
  sonMesajAt: string;
  olusturuldu: string;
};

export default function DashboardSayfasi() {
  const { kullanici, girisYap } = useAuthStore();
  const { data: analizData } = useQuery({ queryKey: ['analiz'], queryFn: () => analizApi.benim() });
  const { data: sinavlarData } = useQuery({ queryKey: ['sinavlar'], queryFn: () => sinavApi.liste() });
  const { data: oneriData } = useQuery({ queryKey: ['oneriler'], queryFn: () => aiApi.oneriler() });

  const { data: paketlerData } = useQuery({ queryKey: ['paketler'], queryFn: () => paketApi.liste() });
  const { data: duyuruData } = useQuery({
    queryKey: ['duyurular', 'benim', 'dashboard'],
    queryFn: () => api.get('/duyurular/benim'),
  });
  const { data: destekData } = useQuery({
    queryKey: ['destek', 'benim', 'dashboard'],
    queryFn: () => api.get('/destek/benim'),
  });
  const { data: profilData } = useQuery({
    queryKey: ['auth-me', 'dashboard'],
    queryFn: () => authApi.me(),
  });

  const kademe = ogretimTuruCoz(kullanici, profilData?.data?.veri);
  const lgs = kademe === 'LGS';
  const kpss = kpssMi(kademe);
  const tema = kademeTemasi(kademe);
  const vurguMetin = lgs ? 'text-blue-700' : kpss ? 'text-teal-700' : 'text-indigo-700';
  const vurguDolgu = lgs ? 'fill-blue-600' : kpss ? 'fill-teal-600' : 'fill-indigo-600';

  useEffect(() => {
    if (!kullanici || !profilData?.data?.veri) return;
    const tur = ogretimTuruCoz(kullanici, profilData.data.veri);
    if (tur && kullanici.ogretimTuru !== tur) {
      girisYap({ kullanici: { ...kullanici, ogretimTuru: tur } });
    }
  }, [profilData, kullanici, girisYap]);

  const { data: osymData } = useQuery({
    queryKey: ['public', 'osym-ozet'],
    queryFn: () => publicApi.osymOzet(),
    staleTime: 5 * 60 * 1000,
    enabled: !lgs && !kpss,
  });

  const analiz = analizData?.data?.veri;
  const sinavlar = sinavlarData?.data?.veri || [];
  const oneriler = oneriData?.data?.veri?.oneriler || [];
  const paketler = paketlerData?.data?.veri || [];
  const duyurular: DuyuruAlici[] = duyuruData?.data?.veri || [];
  const destekTalepleri: DestekTalebi[] = destekData?.data?.veri || [];
  const oneCikanPaketler = paketler.filter((p: any) => p.oneCikan).slice(0, 2);

  const aktifSinavlar = sinavlar.filter((s: any) => s.durum === 'AKTIF');
  const yakindaSinavlar = sinavlar.filter((s: any) => s.durum === 'YAKINDA').slice(0, 3);
  const tamamlananSinav = sinavlar.filter((s: any) => s.durum === 'TAMAMLANDI').length;
  const okunmamisDuyuru = duyurular.filter((d) => !d.okundu).length;
  const acikTalep = destekTalepleri.filter((t) => t.durum === 'ACIK' || t.durum === 'BEKLEMEDE').length;
  const sonDuyurular = duyurular.slice(0, 3);
  const sonTalep = destekTalepleri[0];
  const veli = profilData?.data?.veri?.ogrenciProfil?.veli as
    | { ad: string; soyad: string; kullanici?: { email?: string } }
    | undefined;

  const osymKaynaklar =
    (osymData as { data?: { veri?: { kaynaklar?: any[] } } })?.data?.veri?.kaynaklar ?? [];
  const yksOzet = osymKaynaklar.find((x: any) => x.kod === 'YKS_KILAVUZ_2026');
  const osymAna = osymKaynaklar.find((x: any) => x.kod === 'OSYM_ANASAYFA');

  const hizliLinklerListe = hizliLinkler(kademe);
  const resmiTakip = lgs ? LGS_RESMI_TAKIP : kpss ? KPSS_RESMI_TAKIP : YKS_RESMI_TAKIP;
  const ResmiIkon = resmiTakip.ikon;

  const stats = [
    { ikon: BookOpen, deger: analiz?.toplamSinav || 0, etiket: 'Toplam Sınav', gradient: 'from-indigo-600 to-blue-600', textColor: 'text-indigo-600' },
    { ikon: Trophy, deger: analiz?.enIyiSiralama ? `#${analiz.enIyiSiralama.toLocaleString('tr-TR')}` : '—', etiket: 'En İyi Sıra', gradient: 'from-amber-500 to-orange-500', textColor: 'text-amber-600' },
    { ikon: Target, deger: `${analiz?.ortalamaNet?.toFixed(1) || '0.0'}`, etiket: 'Ortalama Net', gradient: 'from-emerald-500 to-teal-500', textColor: 'text-emerald-600' },
    { ikon: Swords, deger: tamamlananSinav, etiket: 'Tamamlanan', gradient: 'from-rose-500 to-pink-500', textColor: 'text-rose-600' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Karşılama - Font sizes slightly increased */}
      <section
        className={`relative overflow-hidden rounded-2xl p-10 text-white shadow-xl ${tema.heroBg}`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${tema.heroText}`}>
              {tema.panelAdi}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Merhaba, {kullanici?.ad}!</h1>
            <p className={`mt-2 text-base font-medium opacity-90 max-w-xl ${tema.heroText}`}>
              {lgs
                ? '8. sınıf hedeflerine odaklan; LGS denemelerin ve analizlerin burada.'
                : kpss
                  ? 'GY-GK hedeflerine odaklan; KPSS denemelerin ve analiz raporların burada.'
                  : 'Hedeflerine her geçen gün bir adım daha yaklaşıyorsun. Motivasyonunu yüksek tut!'}
            </p>
          </motion.div>
          <div className="flex gap-4">
            <Link
              href="/sinavlar"
              className={`px-6 py-3 rounded-2xl bg-white font-bold shadow-lg hover:bg-gray-50 transition-all text-sm flex items-center gap-2 ${vurguMetin}`}
            >
              <Zap className={`w-5 h-5 ${vurguDolgu}`} /> Sınava Başla
            </Link>
          </div>
        </div>
      </section>

      {veli && (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Veli bilgisi</p>
          <p className="mt-1">
            {veli.ad} {veli.soyad}
            {veli.kullanici?.email ? ` · ${veli.kullanici.email}` : ''}
          </p>
        </section>
      )}

      {/* Aktif Sınav Barı */}
      {aktifSinavlar.length > 0 && (
        <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-5 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-between gap-6 shadow-sm">
           <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg">
                 <Clock className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs font-bold text-rose-600 uppercase tracking-widest leading-none mb-1.5">Şu An Aktif</p>
                 <h2 className="text-base font-bold text-gray-900">{aktifSinavlar[0].baslik}</h2>
              </div>
           </div>
           <Link href={`/sinav/${aktifSinavlar[0].id}`} className="px-6 py-2.5 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-black transition-all shadow-xl flex items-center gap-2">
              Hemen Katıl <ArrowRight className="w-4 h-4" />
           </Link>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((kart, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card group border-white !p-6">
             <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${kart.gradient} flex items-center justify-center text-white shadow-xl shrink-0`}>
                   {(() => { const Ikon = kart.ikon; return <Ikon className="w-6 h-6" />; })()}
                </div>
                <div className="min-w-0">
                   <div className="text-2xl font-bold text-gray-900 leading-none">{kart.deger}</div>
                   <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5 truncate">{kart.etiket}</div>
                </div>
             </div>
          </motion.div>
        ))}
      </div>

      {/* ÖSYM / YKS müfredat & kılavuz özeti */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-6 shadow-lg ${
          lgs
            ? 'border-blue-100 bg-gradient-to-br from-blue-50/90 to-white shadow-blue-500/5'
            : kpss
              ? 'border-teal-100 bg-gradient-to-br from-teal-50/90 to-white shadow-teal-500/5'
              : 'border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white shadow-indigo-500/5'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4 min-w-0">
            <div
              className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0 ${
                lgs ? 'bg-blue-600' : kpss ? 'bg-teal-600' : 'bg-indigo-600'
              }`}
            >
              {lgs ? <ResmiIkon className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${lgs ? 'text-blue-600' : kpss ? 'text-teal-600' : 'text-indigo-600'}`}>
                Resmi takip
              </p>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">{resmiTakip.baslik}</h2>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed max-w-2xl">
                {lgs ? (
                  <>
                    {LGS_RESMI_TAKIP.aciklama}{' '}
                    <a
                      href={LGS_RESMI_TAKIP.kilavuzUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                    >
                      {LGS_RESMI_TAKIP.kilavuzEtiket}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                ) : kpss ? (
                  <>
                    {KPSS_RESMI_TAKIP.aciklama}{' '}
                    <a
                      href={KPSS_RESMI_TAKIP.kilavuzUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
                    >
                      {KPSS_RESMI_TAKIP.kilavuzEtiket}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                ) : (
                  <>
                    Platform,{' '}
                    <a
                      href={YKS_RESMI_TAKIP.kilavuzUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-indigo-700 hover:underline inline-flex items-center gap-1"
                    >
                      {YKS_RESMI_TAKIP.kilavuzEtiket}
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    ile ana sitedeki içerikleri karşılaştırır. Kesin tarih ve başvuru için mutlaka{' '}
                    <a href={YKS_RESMI_TAKIP.kurumUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                      osym.gov.tr
                    </a>
                    ’yi kullanın.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
        {lgs ? (
          <div className="mt-5 rounded-xl bg-white/80 border border-blue-100/80 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase">MEB duyuruları</p>
            <p className="text-sm text-gray-600 mt-2">
              LGS başvuru ve sınav tarihleri için{' '}
              <a href="https://www.meb.gov.tr/" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">
                meb.gov.tr
              </a>{' '}
              adresini düzenli kontrol edin.
            </p>
          </div>
        ) : kpss ? (
          <div className="mt-5 rounded-xl bg-white/80 border border-teal-100/80 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase">ÖSYM duyuruları</p>
            <p className="text-sm text-gray-600 mt-2">
              KPSS başvuru ve sınav takvimi için{' '}
              <a href={KPSS_RESMI_TAKIP.kurumUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-700 hover:underline">
                osym.gov.tr
              </a>{' '}
              adresini düzenli kontrol edin.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/80 border border-indigo-100/80 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase">YKS kılavuzu sayfası</p>
              <p className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">
                {yksOzet?.baslik || 'Henüz senkron yok — yönetim panelinden tarama yapılabilir.'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {!yksOzet?.sonKontrol ? (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">Henüz tarama yok</span>
                ) : yksOzet.degisti ? (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold">Son kontrolda sayfa değişmiş olabilir</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">Son hash ile uyumlu</span>
                )}
                {yksOzet?.sonKontrol && (
                  <span className="text-gray-500">{new Date(yksOzet.sonKontrol).toLocaleString('tr-TR')}</span>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-white/80 border border-indigo-100/80 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase">ÖSYM duyuru bağlantıları (özet)</p>
              {osymAna?.ornekBaglantilar?.length ? (
                <ul className="mt-2 space-y-1.5">
                  {osymAna.ornekBaglantilar.slice(0, 4).map((b: { baslik: string; href: string }, i: number) => (
                    <li key={i}>
                      <a href={b.href} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-700 hover:underline line-clamp-1 flex items-center gap-1">
                        {b.baslik}
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 mt-2">Örnek bağlantı listesi tarama sonrası dolacak.</p>
              )}
            </div>
          </div>
        )}
      </motion.section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
           {/* Hızlı Erişim Grid */}
           <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {hizliLinklerListe.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group card !p-6 hover:shadow-2xl transition-all border-white ${lgs ? 'hover:border-blue-100' : kpss ? 'hover:border-teal-100' : 'hover:border-indigo-100'}`}
                >
                   <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 shadow-sm" style={{ backgroundColor: link.bg, color: link.color }}>
                      {(() => { const Ikon = link.ikon; return <Ikon className="w-6 h-6" />; })()}
                   </div>
                   <h3 className="text-sm font-bold text-gray-900 leading-tight mb-1.5">{link.etiket}</h3>
                   <p className="text-xs text-gray-400 font-medium line-clamp-1">{link.alt}</p>
                </Link>
              ))}
           </div>

           {/* Takvim Özeti */}
           <div className="card !p-8 border-white shadow-xl bg-white/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-base font-bold text-gray-900 flex items-center gap-3 uppercase tracking-wider">
                    <Calendar className="w-5 h-5 text-indigo-500" /> Sınav Ajandası
                 </h2>
                 <Link href="/sinavlar" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase">Tümünü Gör</Link>
              </div>
              
              <div className="space-y-4">
                {yakindaSinavlar.map((sinav: any) => (
                  <div key={sinav.id} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 flex items-center gap-5 group hover:bg-white hover:border-indigo-100 transition-all shadow-sm">
                     <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex flex-col items-center justify-center text-indigo-600 border border-indigo-50 shrink-0">
                        <span className="text-[10px] uppercase font-bold">{new Date(sinav.baslangicZamani).toLocaleDateString('tr-TR', { month: 'short' })}</span>
                        <span className="text-xl font-bold leading-none">{new Date(sinav.baslangicZamani).getDate()}</span>
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate mb-1.5">{sinav.baslik}</h4>
                        <div className="flex items-center gap-2.5 text-xs font-bold text-gray-400 uppercase">
                           <Clock className="w-4 h-4" /> {formatDistanceToNow(new Date(sinav.baslangicZamani), { addSuffix: true, locale: tr })}
                        </div>
                     </div>
                     <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                ))}
              </div>
           </div>
        </div>

        {/* Yan Panel */}
        <aside className="xl:col-span-4 space-y-8">
           {/* Duyuru + Destek Hızlı Bakış */}
           <div className="grid grid-cols-1 gap-6">
             <div className="card !p-6 border-white bg-white/80">
               <div className="flex items-start justify-between gap-3">
                 <div className="min-w-0">
                   <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Duyurular</div>
                   <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                     <Bell className="w-4 h-4 text-indigo-600" />
                     Gelen kutusu
                   </h3>
                 </div>
                 <div className="shrink-0 text-xs font-bold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                   {okunmamisDuyuru} okunmadı
                 </div>
               </div>

               <div className="mt-4 space-y-2">
                 {sonDuyurular.length === 0 ? (
                   <p className="text-xs text-gray-500">Henüz duyuru yok.</p>
                 ) : (
                   sonDuyurular.map((d) => (
                     <div key={d.id} className="p-3 rounded-xl border border-gray-100 bg-white/60">
                       <p className="text-xs font-bold text-gray-900 line-clamp-1">{d.duyuru.baslik}</p>
                       <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{d.duyuru.mesaj}</p>
                     </div>
                   ))
                 )}
               </div>
               <Link href="/duyurular" className="w-full mt-4 py-3 rounded-xl bg-indigo-600 text-white text-center font-bold text-xs hover:bg-indigo-700 transition-all inline-flex items-center justify-center gap-2">
                 Duyuruları Aç <ArrowRight className="w-4 h-4" />
               </Link>
             </div>

             <div className="card !p-6 border-white bg-white/80">
               <div className="flex items-start justify-between gap-3">
                 <div className="min-w-0">
                   <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destek</div>
                   <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                     <LifeBuoy className="w-4 h-4 text-emerald-600" />
                     Hızlı yardım
                   </h3>
                 </div>
                 <div className="shrink-0 text-xs font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                   {acikTalep} açık
                 </div>
               </div>

               {sonTalep ? (
                 <div className="mt-4 p-4 rounded-xl border border-gray-100 bg-white/60">
                   <p className="text-xs font-bold text-gray-900 line-clamp-1">{sonTalep.baslik}</p>
                   <p className="text-[10px] text-gray-500 mt-1">
                     Son mesaj: {new Date(sonTalep.sonMesajAt).toLocaleString('tr-TR')}
                   </p>
                 </div>
               ) : (
                 <p className="mt-4 text-xs text-gray-500">Herhangi bir destek talebin yok.</p>
               )}

               <Link href="/destek" className="w-full mt-4 py-3 rounded-xl bg-emerald-600 text-white text-center font-bold text-xs hover:bg-emerald-700 transition-all inline-flex items-center justify-center gap-2">
                 Destek Merkezi <ArrowRight className="w-4 h-4" />
               </Link>
             </div>
           </div>

           {/* Analiz & Öneriler */}
           <div className="card !p-8 bg-slate-950 text-white shadow-2xl border-0 relative overflow-hidden">
              <div className="relative z-10">
                 <div className="flex items-center gap-2.5 mb-6">
                    <GraduationCap className="w-6 h-6 text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Analiz & Öneriler</span>
                 </div>
                 
                 <div className="space-y-6">
                    {analiz?.zayifKonular?.slice(0, 3).map((konu: any, i: number) => (
                      <div key={i} className="space-y-3">
                         <div className="flex justify-between text-xs font-bold uppercase tracking-wide">
                            <span className="text-gray-400 truncate pr-4">{konu.konu}</span>
                            <span className={konu.basari < 40 ? 'text-rose-400' : 'text-amber-400'}>%{konu.basari.toFixed(0)}</span>
                         </div>
                         <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${konu.basari}%` }} className={`h-full ${konu.basari < 40 ? 'bg-rose-500' : 'bg-amber-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`} />
                         </div>
                      </div>
                    ))}
                 </div>

                 <Link href="/analiz" className="w-full mt-10 py-4 rounded-2xl bg-white/10 border border-white/10 text-white text-center font-bold text-sm hover:bg-white hover:text-gray-900 transition-all inline-block uppercase tracking-wider shadow-lg">
                    Detaylı Analiz Raporu
                 </Link>
              </div>
           </div>

           {/* Günün Odağı */}
           <div className="card !p-8 border-white bg-white/80">
              <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-3">
                 <Compass className="w-5 h-5 text-emerald-500" /> Bugünün Odak Noktası
              </h3>
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 shadow-sm">
                 <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Başarı Stratejisi</p>
                 <p className="text-sm font-bold text-gray-800 leading-relaxed">
                    Bugün <span className="text-indigo-600">{analiz?.zayifKonular?.[0]?.konu || 'Genel Tekrar'}</span> konusuna odaklanarak netlerini %15 artırabilirsin.
                 </p>
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
}
