'use client';

import { 
  Calculator, 
  BarChart3, 
  Map, 
  ArrowRight, 
  Sparkles, 
  Calendar, 
  Clock, 
  BookOpen, 
  GraduationCap, 
  Target,
  Info,
  ChevronRight,
  ClipboardList,
  Compass
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth.store';

const rehberKartlarYKS = [
  {
    href: '/rehber/mezun-icin-yks-calisma-programi',
    baslik: 'Mezun Programı',
    aciklama: 'Mezunlar için yoğun ve stratejik haftalık plan.',
    ikon: ClipboardList,
    renk: 'from-blue-500 to-indigo-600',
  },
  {
    href: '/rehber/12-sinif-icin-yks-calisma-programi',
    baslik: '12. Sınıf Programı',
    aciklama: 'Okul ve sınav hazırlığını dengeleyen özel plan.',
    ikon: GraduationCap,
    renk: 'from-purple-500 to-violet-600',
  },
  {
    href: '/rehber/sayisal-yks-calisma-programi',
    baslik: 'Sayısal Yol Haritası',
    aciklama: 'MF öğrencileri için kritik konular ve net hedefleri.',
    ikon: Calculator,
    renk: 'from-orange-500 to-amber-600',
  },
  {
    href: '/rehber/esit-agirlik-yks-calisma-programi',
    baslik: 'Eşit Ağırlık Planı',
    aciklama: 'Edebiyat ve Matematik dengesini kuran stratejiler.',
    ikon: BookOpen,
    renk: 'from-emerald-500 to-teal-600',
  },
];

const rehberKartlarLGS = [
  {
    href: '/rehber/8-sinif-lgs-calisma-programi',
    baslik: '8. Sınıf Programı',
    aciklama: 'Okul ve LGS hazırlığını dengeleyen haftalık plan.',
    ikon: GraduationCap,
    renk: 'from-purple-500 to-violet-600',
  },
  {
    href: '/rehber/sayisal-lgs-calisma-programi',
    baslik: 'Sayısal Yol Haritası',
    aciklama: 'LGS Matematik ve Fen Bilimleri yeni nesil soruları için kritik hedefler.',
    ikon: Calculator,
    renk: 'from-orange-500 to-amber-600',
  },
  {
    href: '/rehber/sozel-lgs-calisma-programi',
    baslik: 'Sözel Yol Haritası',
    aciklama: 'Türkçe, İnkılap Tarihi, Din Kültürü ve İngilizce netlerini artıracak stratejiler.',
    ikon: BookOpen,
    renk: 'from-emerald-500 to-teal-600',
  },
];

const sinavTakvimiYKS = [
  { ad: 'MSÜ Sınavı', tarih: '1 Mart 2026', gun: 'Pazar', icon: Clock },
  { ad: 'TYT Oturumu', tarih: '20 Haziran 2026', gun: 'Cumartesi', icon: Target },
  { ad: 'AYT Oturumu', tarih: '21 Haziran 2026', gun: 'Pazar', icon: Sparkles },
  { ad: 'YDT Oturumu', tarih: '21 Haziran 2026', gun: 'Pazar', icon: Info },
];

const sinavTakvimiLGS = [
  { ad: 'LGS 2026 Oturumu', tarih: 'Haziran 2026', gun: 'Pazar', icon: Target }
];

const yolHaritasiYKS = [
  { ay: 'Eylül - Ekim', baslik: 'Temel Atma', detay: 'Eksiklerini belirle, TYT Matematik ve Türkçeye odaklan.' },
  { ay: 'Kasım - Aralık', baslik: 'Derinleşme', detay: 'TYTyi bitirmeye çalış, AYT konularına giriş yap.' },
  { ay: 'Ocak - Şubat', baslik: 'Sömestr Kampı', detay: 'AYTyi yoğunlaştır, bol bol TYT denemesi çöz.' },
  { ay: 'Mart - Nisan', baslik: 'Deneme Rutini', detay: 'Konu eksiklerini kapat, çıkmış sorulara başla.' },
  { ay: 'Mayıs - Haziran', baslik: 'Final Dokunuşu', detay: 'Her gün deneme, hata analizi ve uyku düzeni.' },
];

const yolHaritasiLGS = [
  { ay: 'Eylül - Ekim', baslik: 'Temel ve Kaynak Düzeni', detay: 'LGS derslerinin temellerini at, paragraf ve problem rutinini başlat.' },
  { ay: 'Kasım - Aralık', baslik: 'Konularda Derinleşme', detay: 'Matematik ve Fen derslerindeki yeni nesil soruları analiz etmeye odaklan.' },
  { ay: 'Ocak - Şubat', baslik: 'Sömestr Kampı', detay: 'İlk dönem eksiklerini tamamla, düzenli LGS branş denemelerine başla.' },
  { ay: 'Mart - Nisan', baslik: 'Hız ve Pratik', detay: 'Süre yönetimini öğren, tüm derslerden konu tekrarlarına ve denemelere ağırlık ver.' },
  { ay: 'Mayıs - Haziran', baslik: 'Son Prova ve LGS', detay: 'Çıkmış LGS sorularını çöz, eksik analizi yap ve sınav heyecanını kontrol et.' },
];

export default function RehberHubPage() {
  const { kullanici } = useAuthStore();
  const isLGS = kullanici?.ogretimTuru === 'LGS';

  const rehberKartlar = isLGS ? rehberKartlarLGS : rehberKartlarYKS;
  const sinavTakvimi = isLGS ? sinavTakvimiLGS : sinavTakvimiYKS;
  const yolHaritasi = isLGS ? yolHaritasiLGS : yolHaritasiYKS;

  return (
    <div className="space-y-10 pb-12 overflow-hidden">
      {/* Header Bölümü - Increased font sizes */}
      <section>
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-10 text-white shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-4 border border-indigo-500/30 tracking-widest uppercase">
                <Compass className="w-4 h-4" /> {isLGS ? 'LGS 2026 Rehberi' : 'YKS 2026 Rehberi'}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">Geleceğini Planla, Başarıyı Hedefle.</h1>
              <p className="text-slate-400 mt-4 text-base font-medium leading-relaxed opacity-90">
                {isLGS 
                  ? 'Lise yolculuğunda ihtiyacın olan tüm stratejiler, çalışma programları ve güncel sınav takvimi burada.'
                  : 'Üniversite yolculuğunda ihtiyacın olan tüm stratejiler, çalışma programları ve güncel sınav takvimi burada.'
                }
              </p>
            </motion.div>
          </div>
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Sol Kolon */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Uzman Rehberleri */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-3 uppercase tracking-wider">
              <BarChart3 className="w-5 h-5 text-indigo-500" /> Çalışma Programları
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {rehberKartlar.map((k, i) => {
                const KartIkon = k.ikon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={k.href}
                      className="group block h-full p-6 rounded-2xl bg-white border border-gray-100 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${k.renk} flex items-center justify-center mb-5 text-white shadow-lg`}>
                        <KartIkon className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {k.baslik}
                      </h3>
                      <p className="text-sm text-gray-500 mt-2 font-medium leading-relaxed">
                        {k.aciklama}
                      </p>
                      <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 group-hover:gap-2 transition-all">
                        Detayları İncele <ChevronRight className="w-4 h-4" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Stratejik Yol Haritası */}
          <section className="bg-white rounded-3xl p-8 border border-gray-50 shadow-xl relative overflow-hidden">
            <h2 className="text-base font-bold text-gray-900 mb-8 uppercase tracking-wider flex items-center gap-3">
               <Target className="w-5 h-5 text-rose-500" /> Stratejik Yol Haritası
            </h2>
            <div className="space-y-6 relative z-10">
              {yolHaritasi.map((adim, i) => (
                <div key={i} className="flex gap-5 group">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                      {i + 1}
                    </div>
                    {i !== yolHaritasi.length - 1 && <div className="w-0.5 h-full bg-gray-100 mt-2" />}
                  </div>
                  <div className="pb-8">
                    <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">{adim.ay}</div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1.5">{adim.baslik}</h4>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{adim.detay}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Sağ Kolon */}
        <div className="space-y-8">
          
          {/* Sınav Tarihleri */}
          <div className="bg-white rounded-3xl p-8 border border-gray-50 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900 mb-8 flex items-center gap-3 uppercase tracking-wider">
               <Calendar className="w-5 h-5 text-indigo-500" /> Sınav Tarihleri
            </h3>
            <div className="space-y-6">
              {sinavTakvimi.map((sinav, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                    <sinav.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 leading-none mb-1">{sinav.ad}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase">{sinav.tarih}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sistem Özeti */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <h3 className="text-base font-bold mb-6 relative z-10">Puanlama Sistemi</h3>
            <div className="space-y-6 relative z-10">
              {isLGS ? (
                <>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">Matematik & Fen (Katsayı: 4)</h4>
                    <p className="text-sm font-medium opacity-80 leading-relaxed">Yeni nesil mantık muhakeme sorularının ağırlıklı olduğu sayısal dersler, LGS puanını en fazla etkileyen derslerdir.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">Türkçe (Katsayı: 4)</h4>
                    <p className="text-sm font-medium opacity-80 leading-relaxed">Okuduğunu anlama, görsel yorumlama ve dil bilgisi becerileri LGS sözel puanının ana kaynağını oluşturur.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">Sosyal & İngilizce & Din (Katsayı: 1)</h4>
                    <p className="text-sm font-medium opacity-80 leading-relaxed">İnkılap Tarihi, Yabancı Dil ve Din Kültürü dersleri katsayı olarak daha düşük olsa da hedef okullar için kritik önem taşır.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">TYT (%40 Etki)</h4>
                    <p className="text-sm font-medium opacity-80 leading-relaxed">Temel yeterlilik testi, tüm adayların girmek zorunda olduğu ilk oturumdur.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">AYT (%60 Etki)</h4>
                    <p className="text-sm font-medium opacity-80 leading-relaxed">Alan yeterlilik testi, doğrudan lisans yerleştirmesinde en yüksek etkiye sahiptir.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Hızlı Link */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8 text-center shadow-sm">
             <h4 className="text-base font-bold text-gray-900 mb-2">Netlerimi Planla</h4>
             <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">Hangi dersten kaç nete ihtiyacın olduğunu saniyeler içinde hesapla.</p>
             <Link 
               href="/rehber/net-simulasyonu"
               className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:gap-3 transition-all group"
             >
               Hesaplamaya Başla <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
             </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
