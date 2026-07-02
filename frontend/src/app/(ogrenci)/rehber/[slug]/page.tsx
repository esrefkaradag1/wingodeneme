'use client';

import { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  ClipboardList, 
  TrendingUp, 
  Target,
  Zap,
  Star,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const programVerileri: Record<string, any> = {
  'mezun': {
    title: 'Mezunlar İçin YKS Çalışma Programı',
    subtitle: 'Verimlilik odaklı strateji',
    description: 'Mezun senesinde disiplin anahtardır. Bu program, profesyonel bir mesai mantığıyla hazırlanmıştır.',
    odaklar: [
      'Sabah saatlerinde zor derslere odaklan.',
      'Öğleden sonra bol deneme analizi.',
      'Haftalık stabil deneme rutini.',
    ],
    adimlar: [
      { t: '08:00 - 12:00', d: 'Odaklanma Seansı' },
      { t: '13:00 - 17:00', d: 'Uygulama Seansı' },
      { t: '19:00 - 21:00', d: 'Hata Analizi' }
    ]
  },
  '12-sinif': {
    title: '12. Sınıf İçin YKS Programı',
    subtitle: 'Okul ve sınav dengesi',
    description: 'Zaman yönetimi odaklıdır. Okul dersleri ile YKS hazırlığını bütünleştirir.',
    odaklar: [
      'Okul boşluklarını testlerle değerlendir.',
      'Hafta sonları deneme günüdür.',
      '12. sınıf konularını sınavla paralel götür.',
    ],
    adimlar: [
      { t: 'Okul Sonrası', d: 'Kısa Dinlenme' },
      { t: '18:00 - 21:00', d: 'Okul + YKS Çalışması' },
      { t: '21:30 - 22:30', d: 'Haftalık Plan Takibi' }
    ]
  },
  'sayisal': {
    title: 'Sayısal (MF) YKS Stratejisi',
    subtitle: 'Fen ve Matematik odağı',
    description: 'AYT Fen branşlarına derinlik kazandırmaya odaklanır.',
    odaklar: [
      'Günde en az 20 problem çözümü.',
      'Fizik-Kimya-Biyoloji bağlantıları.',
      'Geometri rutinini aksatmama.',
    ],
    adimlar: [
      { t: 'Matematik', d: 'Haftalık 15 saat' },
      { t: 'Fen Bilimleri', d: 'Haftalık 12 saat' },
      { t: 'TYT Türkçe', d: 'Her gün paragraf' }
    ]
  },
  'esit-agirlik': {
    title: 'Eşit Ağırlık (TM) YKS Stratejisi',
    subtitle: 'Matematik ve Edebiyat dengesi',
    description: 'Matematik fark yaratırken, Edebiyat puanları garantiler.',
    odaklar: [
      'Matematik netlerini 30+ bandına taşı.',
      'Edebiyatta dönem mantığını kavra.',
      'TYT Fen netlerinden bedava puan topla.',
    ],
    adimlar: [
      { t: 'Edebiyat', d: 'Her gün 45 dk okuma' },
      { t: 'Matematik', d: 'Günlük 3 saat' },
      { t: 'Sosyal-1', d: 'Harita ve kronoloji' }
    ]
  },
  '8-sinif-lgs': {
    title: '8. Sınıf LGS Çalışma Programı',
    subtitle: 'Okul ve sınav hazırlığı dengesi',
    description: 'Okul ders başarısını yüksek tutarken, LGS\'de fark yaratacak yeni nesil soru çözüm alışkanlığını kazandıran dengeli ve motive edici haftalık plan.',
    odaklar: [
      'Okul derslerini günü gününe mutlaka tekrar et ve eksik bırakma.',
      'Her gün en az 20 paragraf sorusu çözerek hızlı okuma ve anlama becerisi kazan.',
      'Sayısal derslerde formül ezberlemek yerine mantığı ve soru kökünü kavramaya çalış.',
    ],
    adimlar: [
      { t: 'Okul Sonrası', d: 'Kısa dinlenme ve zihinsel hazırlık seansı.' },
      { t: '17:00 - 19:00', d: 'Ders tekrarları, okul ödevleri ve konu eksiklerinin kapatılması.' },
      { t: '19:30 - 21:00', d: 'Yeni nesil soru çözümü ve yanlış yapılan soruların video analizleri.' }
    ]
  },
  'sayisal-lgs': {
    title: 'LGS Sayısal (Matematik & Fen) Yol Haritası',
    subtitle: 'Yeni nesil mantık-muhakeme odağı',
    description: 'Matematik ve Fen Bilimleri, LGS\'nin en belirleyici ve katsayısı yüksek (4) dersleridir. Bu program yeni nesil mantık muhakeme becerilerini geliştirmeyi amaçlar.',
    odaklar: [
      'Matematik dersinde çarpanlar-katlar, üslü-köklü sayılar ve cebirsel ifadelere derinlemesine çalış.',
      'Fen Bilimleri dersinde deney düzenekleri, değişkenler ve grafik yorumlama sorularına odaklan.',
      'Çözemediğin her sayısal sorunun çözüm videosunu mutlaka izle ve 1 gün sonra tekrar kendin çöz.',
    ],
    adimlar: [
      { t: 'Matematik Seansı', d: 'Haftalık 10 saat konu + yeni nesil soru çözümü pratik seansı.' },
      { t: 'Fen Bilimleri', d: 'Haftalık 8 saat deney ve görsel soru analizi odaklı çalışma.' },
      { t: 'Mantık Muhakeme', d: 'Her gün en az 15 mantık muhakeme ve sözel mantık sorusu.' }
    ]
  },
  'sozel-lgs': {
    title: 'LGS Sözel (Türkçe & Sosyal & İngilizce) Yol Haritası',
    subtitle: 'Okuduğunu anlama ve tam net hedefi',
    description: 'Sözel alanda tam net çıkartmak, sayısalda yaşanabilecek olası kayıpları telafi eder. Türkçe anlam bilgisi ve diğer derslerin kavramları bu planın temelidir.',
    odaklar: [
      'Türkçe dersinde paragrafta anlam, sözel mantık ve tablo/grafik yorumlama konularında uzmanlaş.',
      'İnkılap Tarihi ve Din Kültürü derslerinde kavram haritaları ve özet notlar çıkararak çalış.',
      'İngilizce dersinde ünite kelime kartları hazırlayarak düzenli kelime tekrarı yap.',
    ],
    adimlar: [
      { t: 'Türkçe & Paragraf', d: 'Günlük 40 dakika düzenli test ve detaylı soru-cevap analizi.' },
      { t: 'İnkılap & Din', d: 'Haftalık 4 saat kavram, tarihi olaylar ve kronoloji tekrarı.' },
      { t: 'Yabancı Dil', d: 'Günlük 15 dakika kelime ezberi, kalıplar ve diyalog takibi.' }
    ]
  }
};

export default function ProgramDetayPage({ params }: { params: { slug: string } }) {
  const type = params.slug.includes('8-sinif-lgs') ? '8-sinif-lgs'
               : params.slug.includes('sayisal-lgs') ? 'sayisal-lgs'
               : params.slug.includes('sozel-lgs') ? 'sozel-lgs'
               : params.slug.includes('12-sinif') ? '12-sinif' 
               : params.slug.includes('sayisal') ? 'sayisal'
               : params.slug.includes('esit-agirlik') ? 'esit-agirlik'
               : 'mezun';

  const veri = programVerileri[type] || programVerileri['mezun'];

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Link href="/rehber" className="inline-flex items-center gap-1.5 text-indigo-600 font-bold mb-6 hover:gap-2 transition-all text-xs">
        <ArrowLeft className="w-4 h-4" /> Rehber Hub'a Dön
      </Link>

      <div className="space-y-6">
        {/* Giriş */}
        <section className="relative overflow-hidden rounded-2xl bg-white p-6 border border-gray-50 shadow-lg">
           <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase mb-3">
                <Star className="w-3.5 h-3.5 fill-indigo-600" /> Profesyonel Tavsiye
              </div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{veri.title}</h1>
              <p className="text-indigo-600 text-sm font-bold mt-1 uppercase tracking-tight">{veri.subtitle}</p>
              <p className="text-gray-500 mt-4 text-xs leading-relaxed font-medium max-w-2xl">
                {veri.description}
              </p>
           </div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl pointer-events-none opacity-50" />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Kritik Odaklar */}
           <section className="bg-white rounded-2xl p-6 border border-gray-50 shadow-md">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Target className="w-4 h-4 text-rose-500" /> Kritik Noktalar
              </h2>
              <ul className="space-y-3">
                 {veri.odaklar.map((item: string, i: number) => (
                    <li key={i} className="flex gap-2 text-gray-600 font-medium leading-normal text-[11px]">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                       <span>{item}</span>
                    </li>
                 ))}
              </ul>
           </section>

           {/* Örnek Zamanlama */}
           <section className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
              <h2 className="text-sm font-bold mb-5 flex items-center gap-2 uppercase tracking-wider">
                 <Clock className="w-4 h-4 text-indigo-400" /> Örnek Rutin
              </h2>
              <div className="space-y-4">
                 {veri.adimlar.map((adim: any, i: number) => (
                    <div key={i} className="relative pl-5 border-l-2 border-indigo-500/20">
                       <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-500" />
                       <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{adim.t}</div>
                       <div className="text-[11px] font-bold text-slate-200 mt-0.5">{adim.d}</div>
                    </div>
                 ))}
              </div>
           </section>
        </div>

        {/* CTA */}
        <section className="p-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="max-w-sm text-center md:text-left">
              <h3 className="text-lg font-bold tracking-tight">Kendi Planını Oluştur</h3>
              <p className="text-indigo-100 font-medium mt-1 text-[11px]">Bu stratejileri kullanarak sana özel planını AI ile aktifleştir.</p>
           </div>
           <Link 
            href="/study-plan" 
            className="px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold text-xs hover:bg-gray-50 transition-all shadow-lg active:scale-95 flex items-center gap-2 whitespace-nowrap"
           >
              Plana Git <Zap className="w-4 h-4 fill-indigo-600" />
           </Link>
        </section>
      </div>
    </div>
  );
}
