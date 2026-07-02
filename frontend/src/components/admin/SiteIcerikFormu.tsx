'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { 
  Plus, 
  Trash2, 
  Menu, 
  Monitor, 
  Layout, 
  BarChart3, 
  CheckSquare, 
  MousePointer2, 
  Link as LinkIcon,
  Circle,
  Hash,
  Type,
  ImageIcon,
  Upload,
  XCircle,
  LucideIcon,
  Mail,
  Phone,
  Shield,
  FileText,
  CreditCard,
} from 'lucide-react';
import type { SiteGenelIcerik, SiteGenelIcerikForm } from '@/lib/site-icerik-defaults';
import { VARSAYILAN_SITE_ICERIK } from '@/lib/site-icerik-defaults';
import { YASAL_SAYFA_ETIKET, YASAL_SAYFA_YOLLAR, type YasalSayfaAnahtar } from '@/lib/yasal-sayfalar';
import { sozlesmeGrubuOlustur } from '@/lib/footer-sozlesmeler';
import { motion, AnimatePresence } from 'framer-motion';

function derinKopya<T>(kaynak: T): T {
  return JSON.parse(JSON.stringify(kaynak)) as T;
}

function LogoYukle({
  label,
  deger,
  onDegis,
  genislik = 120,
  yukseklik = 120,
  ipucu,
}: {
  label: string;
  deger: string;
  onDegis: (v: string) => void;
  genislik?: number;
  yukseklik?: number;
  ipucu?: string;
}) {
  const handleDosya = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    if (dosya.size > 2 * 1024 * 1024) {
      alert('Dosya 2 MB\'dan büyük olamaz.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onDegis(reader.result as string);
    reader.readAsDataURL(dosya);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const dosya = e.dataTransfer.files?.[0];
    if (!dosya) return;
    if (dosya.size > 2 * 1024 * 1024) {
      alert('Dosya 2 MB\'dan büyük olamaz.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onDegis(reader.result as string);
    reader.readAsDataURL(dosya);
  };

  const inputId = `logo-upload-${label.replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-2">
      <Etiket htmlFor={inputId}>{label}</Etiket>
      {deger ? (
        <div className="relative inline-block group">
          <img
            src={deger}
            alt={label}
            style={{ width: genislik, height: yukseklik }}
            className="rounded-2xl border border-gray-100 object-contain bg-gray-50 shadow-sm"
          />
          <button
            type="button"
            onClick={() => onDegis('')}
            className="absolute -top-2 -right-2 bg-white rounded-full shadow-md text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-all"
            title="Kaldır"
          >
            <XCircle className="w-5 h-5" />
          </button>
          <label
            htmlFor={inputId}
            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-bold rounded-2xl opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          >
            Değiştir
          </label>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer p-6 text-center"
          style={{ width: genislik, height: yukseklik }}
        >
          <Upload className="w-6 h-6 text-gray-400" />
          <span className="text-xs font-bold text-gray-400">Yükle veya sürükle</span>
          {ipucu && <span className="text-[10px] text-gray-300 font-medium">{ipucu}</span>}
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleDosya}
        className="hidden"
      />
    </div>
  );
}

const OZELLIK_RENKLERI = ['indigo', 'violet', 'cyan', 'emerald', 'orange', 'pink', 'yellow', 'slate'] as const;

const IKON_SEC = [
  'Brain', 'Trophy', 'Users', 'BookOpen', 'Camera', 'BarChart3', 'Map', 'Swords', 'GraduationCap', 'Bell', 'Shield',
  'UserPlus', 'LineChart', 'ClipboardCheck', 'Sparkles', 'Target', 'Timer', 'ArrowRight',
] as const;

function Etiket({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
      {children}
    </label>
  );
}

function Giris({
  id,
  value,
  onChange,
  placeholder,
  icon: Icon
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="relative group">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />}
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 text-sm font-bold text-gray-700 shadow-sm focus:bg-white focus:border-indigo-500 focus:outline-none transition-all ${Icon ? 'pl-11' : ''}`}
      />
    </div>
  );
}

function UzunMetin({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 text-sm font-bold text-gray-700 shadow-sm focus:bg-white focus:border-indigo-500 focus:outline-none transition-all resize-none"
    />
  );
}

function SayiGiris({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 text-sm font-bold text-gray-700 shadow-sm focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
    />
  );
}

function Kart({ title, description, children, icon: Icon }: { title: string; description?: string; children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-6">
         {Icon && (
           <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Icon className="w-5 h-5" />
           </div>
         )}
         <div>
            <h3 className="text-base font-bold text-gray-900 leading-none">{title}</h3>
            {description && <p className="text-xs text-gray-400 mt-1.5 font-medium">{description}</p>}
         </div>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export type SiteIcerikFormRef = {
  getIcerik: () => SiteGenelIcerik;
};

export const SiteIcerikFormu = forwardRef<
  SiteIcerikFormRef,
  { baslangic: SiteGenelIcerik | null }
>(function SiteIcerikFormu({ baslangic }, ref) {
  const [icerik, setIcerik] = useState<SiteGenelIcerikForm>(() =>
    derinKopya(VARSAYILAN_SITE_ICERIK) as unknown as SiteGenelIcerikForm
  );
  const [activeTab, setActiveTab] = useState('marka');

  useEffect(() => {
    if (baslangic) {
      setIcerik(
        derinKopya({
          ...(VARSAYILAN_SITE_ICERIK as unknown as SiteGenelIcerikForm),
          ...(baslangic as unknown as SiteGenelIcerikForm),
        })
      );
    }
  }, [baslangic]);

  useImperativeHandle(
    ref,
    () => ({
      getIcerik: () => derinKopya(icerik) as unknown as SiteGenelIcerik,
    }),
    [icerik]
  );

  const set = (fn: (prev: SiteGenelIcerikForm) => SiteGenelIcerikForm) => setIcerik(fn);

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col lg:flex-row gap-10 min-h-[500px]">
      <Tabs.List className="lg:w-64 shrink-0 flex flex-col gap-1">
        {[
          { v: 'marka', label: 'Marka & Navigasyon', icon: Menu },
          { v: 'hero', label: 'Giriş Alanı (Hero)', icon: Monitor },
          { v: 'istatistik', label: 'İstatistikler', icon: BarChart3 },
          { v: 'ozellikler', label: 'Özellikler', icon: CheckSquare },
          { v: 'nasil', label: 'Nasıl Çalışır?', icon: Layout },
          { v: 'paket', label: 'Paket Alanı', icon: MousePointer2 },
          { v: 'footer', label: 'Footer & Sosyal', icon: LinkIcon },
          { v: 'yasal', label: 'Yasal & iyzico', icon: Shield },
        ].map(({ v, label, icon: Icon }) => (
          <Tabs.Trigger
            key={v}
            value={v}
            className="flex items-center gap-3 px-5 py-4 rounded-2xl text-[13px] font-bold text-gray-500 transition-all text-left hover:bg-gray-50 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-indigo-100"
          >
            <Icon className="w-4 h-4" />
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {/* Marka & Navigasyon */}
          {activeTab === 'marka' && (
            <Tabs.Content key="marka" value="marka" className="outline-none space-y-8" forceMount>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Kart title="Marka Kimliği" icon={Type} description="Sitenin genelinde gözükecek marka isimlerini belirleyin.">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Etiket>Site Adı</Etiket>
                  <Giris icon={Type} value={icerik.marka.ad} onChange={(v) => set((p) => ({ ...p, marka: { ...p.marka, ad: v } }))} />
                </div>
                <div>
                  <Etiket>Logo Harfi (fallback)</Etiket>
                  <Giris icon={Circle} value={icerik.marka.kisaLogo} onChange={(v) => set((p) => ({ ...p, marka: { ...p.marka, kisaLogo: v } }))} />
                </div>
              </div>

              {/* Logo & Favicon Upload */}
              <div className="pt-4 border-t border-gray-50">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" /> Görsel Kimlik
                </p>
                <div className="flex flex-wrap gap-10">
                  <div className="flex flex-col gap-2">
                    <LogoYukle
                      label="Site Logosu"
                      deger={icerik.marka.logoUrl ?? ''}
                      onDegis={(v) => set((p) => ({ ...p, marka: { ...p.marka, logoUrl: v } }))}
                      genislik={180}
                      yukseklik={80}
                      ipucu="PNG / SVG / WebP — maks 2 MB"
                    />
                    <p className="text-[10px] text-gray-400 font-medium max-w-[180px] leading-relaxed">
                      Navbar ve header'da gösterilir. Şeffaf arkaplan (PNG/SVG) önerilir.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <LogoYukle
                      label="Favicon / Uygulama İkonu"
                      deger={icerik.marka.faviconUrl ?? ''}
                      onDegis={(v) => set((p) => ({ ...p, marka: { ...p.marka, faviconUrl: v } }))}
                      genislik={80}
                      yukseklik={80}
                      ipucu="ICO / PNG — ideal 64×64"
                    />
                    <p className="text-[10px] text-gray-400 font-medium max-w-[80px] leading-relaxed">
                      Tarayıcı sekmesinde gösterilir.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <LogoYukle
                      label="Koyu Tema Logosu (opsiyonel)"
                      deger={icerik.marka.logoUrlKoyu ?? ''}
                      onDegis={(v) => set((p) => ({ ...p, marka: { ...p.marka, logoUrlKoyu: v } }))}
                      genislik={180}
                      yukseklik={80}
                      ipucu="Koyu navbar için ayrı logo"
                    />
                    <p className="text-[10px] text-gray-400 font-medium max-w-[180px] leading-relaxed">
                      Opsiyonel: koyu arka planda kullanılır.
                    </p>
                  </div>
                </div>
              </div>
            </Kart>
            
            <Kart title="Üst Menü Ayarları" icon={Menu} description="Giriş ve kayıt yönlendirmelerini düzenleyin.">
               <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Etiket>Giriş Butonu Metni</Etiket>
                  <Giris icon={MousePointer2} value={icerik.nav.girisMetni} onChange={(v) => set((p) => ({ ...p, nav: { ...p.nav, girisMetni: v } }))} />
                </div>
                <div>
                  <Etiket>Kayıt Butonu Metni</Etiket>
                  <Giris icon={Plus} value={icerik.nav.kayitCta} onChange={(v) => set((p) => ({ ...p, nav: { ...p.nav, kayitCta: v } }))} />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-900 mb-4 flex items-center gap-2">
                   Navigasyon Linkleri <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">{icerik.nav.navLinks.length} adet</span>
                </p>
                <div className="space-y-4">
                  {icerik.nav.navLinks.map((l, i) => (
                    <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} key={i} className="flex gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                        <div className="flex-1 min-w-0">
                           <Etiket>Etiket</Etiket>
                           <Giris value={l.label} onChange={(v) => set((p) => {
                              const navLinks = [...p.nav.navLinks];
                              navLinks[i] = { ...navLinks[i], label: v };
                              return { ...p, nav: { ...p.nav, navLinks } };
                           })} />
                        </div>
                        <div className="flex-2 min-w-0">
                           <Etiket>Adres (Link)</Etiket>
                           <Giris value={l.href} onChange={(v) => set((p) => {
                              const navLinks = [...p.nav.navLinks];
                              navLinks[i] = { ...navLinks[i], href: v };
                              return { ...p, nav: { ...p.nav, navLinks } };
                           })} />
                        </div>
                        <button
                           type="button"
                           onClick={() => set((p) => ({ ...p, nav: { ...p.nav, navLinks: p.nav.navLinks.filter((_, j) => j !== i) } }))}
                           className="mt-6 p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                        >
                           <Trash2 className="w-5 h-5" />
                        </button>
                    </motion.div>
                  ))}
                  <button
                    type="button"
                    onClick={() => set((p) => ({ ...p, nav: { ...p.nav, navLinks: [...p.nav.navLinks, { href: '/', label: 'Yeni Link' }] } }))}
                    className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-indigo-600 font-bold text-sm hover:border-indigo-100 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Yeni Menü Öğesi Ekle
                  </button>
                </div>
              </div>
            </Kart>
              </motion.div>
            </Tabs.Content>
          )}

          {/* Hero Content */}
          {activeTab === 'hero' && (
            <Tabs.Content key="hero" value="hero" className="outline-none space-y-8" forceMount>
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Kart title="Hero Başlık Bölümü" icon={Monitor} description="Ana sayfa açılışındaki büyük başlık ve açıklamayı düzenleyin.">
              <div className="grid grid-cols-1 gap-6">
                <div className="grid sm:grid-cols-2 gap-6">
                   <div>
                      <Etiket>Üst Rozet 1</Etiket>
                      <Giris value={icerik.hero.rozet1} onChange={(v) => set((p) => ({ ...p, hero: { ...p.hero, rozet1: v } }))} />
                   </div>
                   <div>
                      <Etiket>Üst Rozet 2</Etiket>
                      <Giris value={icerik.hero.rozet2} onChange={(v) => set((p) => ({ ...p, hero: { ...p.hero, rozet2: v } }))} />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="md:col-span-1">
                      <Etiket>Başlık (Başlangıç)</Etiket>
                      <Giris value={icerik.hero.baslikOnce} onChange={(v) => set((p) => ({ ...p, hero: { ...p.hero, baslikOnce: v } }))} />
                   </div>
                   <div className="md:col-span-1">
                      <Etiket>Vurgulu Kelime</Etiket>
                      <Giris value={icerik.hero.baslikVurgu} onChange={(v) => set((p) => ({ ...p, hero: { ...p.hero, baslikVurgu: v } }))} />
                   </div>
                   <div className="md:col-span-1">
                      <Etiket>Başlık (Bitiş)</Etiket>
                      <Giris value={icerik.hero.baslikSon} onChange={(v) => set((p) => ({ ...p, hero: { ...p.hero, baslikSon: v } }))} />
                   </div>
                </div>

                <div>
                   <Etiket>Alt Açıklama Metni</Etiket>
                   <UzunMetin value={icerik.hero.altMetin} onChange={(v) => set((p) => ({ ...p, hero: { ...p.hero, altMetin: v } }))} />
                </div>
              </div>
            </Kart>
            
            <Kart title="Vizyon Kartları" icon={Layout} description="Hero alanındaki 3 ana özelliği düzenleyin.">
               <div className="grid grid-cols-1 gap-6">
                  {icerik.hero.kartlar.map((k, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-gray-50/50 border border-gray-50 space-y-4">
                       <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Vurgu Kartı {i + 1}</h5>
                       <div className="grid md:grid-cols-2 gap-6">
                          <div>
                             <Etiket>İkon Adı (Brain, Star vb.)</Etiket>
                             <Giris value={k.ikon} onChange={(v) => set((p) => {
                                const kartlar = [...p.hero.kartlar];
                                kartlar[i] = { ...kartlar[i], ikon: v };
                                return { ...p, hero: { ...p.hero, kartlar } };
                             })} />
                          </div>
                          <div>
                             <Etiket>Başlık</Etiket>
                             <Giris value={k.baslik} onChange={(v) => set((p) => {
                                const kartlar = [...p.hero.kartlar];
                                kartlar[i] = { ...kartlar[i], baslik: v };
                                return { ...p, hero: { ...p.hero, kartlar } };
                             })} />
                          </div>
                       </div>
                       <div>
                          <Etiket>Kısa Açıklama</Etiket>
                          <Giris value={k.aciklama} onChange={(v) => set((p) => {
                             const kartlar = [...p.hero.kartlar];
                             kartlar[i] = { ...kartlar[i], aciklama: v };
                             return { ...p, hero: { ...p.hero, kartlar } };
                          })} />
                       </div>
                    </div>
                  ))}
               </div>
            </Kart>
               </motion.div>
            </Tabs.Content>
          )}

          {/* İstatistik */}
          {activeTab === 'istatistik' && (
            <Tabs.Content key="istatistik" value="istatistik" className="outline-none space-y-8" forceMount>
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Kart title="Genel Başarı Verileri" icon={BarChart3} description="Ana sayfada sergilenen büyük rakamları güncelleyin.">
               <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                     <div>
                        <Etiket>Bölüm Başlığı</Etiket>
                        <Giris value={icerik.istatistik.bolumBaslik} onChange={(v) => set((p) => ({ ...p, istatistik: { ...p.istatistik, bolumBaslik: v } }))} />
                     </div>
                     <div>
                        <Etiket>Bilgi Metni</Etiket>
                        <Giris value={icerik.istatistik.bolumAciklama} onChange={(v) => set((p) => ({ ...p, istatistik: { ...p.istatistik, bolumAciklama: v } }))} />
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {icerik.istatistik.satirlar.map((s, i) => (
                      <div key={i} className="p-6 rounded-3xl border border-gray-100 space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <Etiket>Rakam</Etiket>
                               <SayiGiris value={s.sayi} onChange={(v) => set((p) => {
                                  const satirlar = [...p.istatistik.satirlar];
                                  satirlar[i] = { ...satirlar[i], sayi: v };
                                  return { ...p, istatistik: { ...p.istatistik, satirlar } };
                               })} />
                            </div>
                            <div>
                               <Etiket>Ek (+, %, vb.)</Etiket>
                               <Giris value={s.suffix} onChange={(v) => set((p) => {
                                  const satirlar = [...p.istatistik.satirlar];
                                  satirlar[i] = { ...satirlar[i], suffix: v };
                                  return { ...p, istatistik: { ...p.istatistik, satirlar } };
                               })} />
                            </div>
                         </div>
                         <div>
                            <Etiket>Ana Etiket</Etiket>
                            <Giris value={s.etiket} onChange={(v) => set((p) => {
                               const satirlar = [...p.istatistik.satirlar];
                               satirlar[i] = { ...satirlar[i], etiket: v };
                               return { ...p, istatistik: { ...p.istatistik, satirlar } };
                            })} />
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            </Kart>
               </motion.div>
            </Tabs.Content>
          )}

          {/* Özellikler */}
          {activeTab === 'ozellikler' && (
            <Tabs.Content key="ozellikler" value="ozellikler" className="outline-none space-y-8" forceMount>
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Kart title="Öne Çıkan Özellikler" icon={CheckSquare} description="Sitenin sunduğu çözümleri listeleyin.">
               <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6 border-b border-gray-50 pb-8">
                     <div>
                        <Etiket>Bölüm Başlığı</Etiket>
                        <Giris value={icerik.ozellikler.baslik} onChange={(v) => set((p) => ({ ...p, ozellikler: { ...p.ozellikler, baslik: v } }))} />
                     </div>
                     <div>
                        <Etiket>Üst Etiket</Etiket>
                        <Giris value={icerik.ozellikler.ustBaslik} onChange={(v) => set((p) => ({ ...p, ozellikler: { ...p.ozellikler, ustBaslik: v } }))} />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                     {icerik.ozellikler.liste.map((oz, i) => (
                       <motion.div layout key={i} className="p-6 rounded-3xl bg-gray-50/50 border border-gray-50 group">
                          <div className="flex justify-between items-start mb-4">
                             <div className="p-3 rounded-2xl bg-white shadow-sm text-indigo-600">
                                <Plus className="w-5 h-5" />
                             </div>
                             <button type="button" onClick={() => set((p) => ({ ...p, ozellikler: { ...p.ozellikler, liste: p.ozellikler.liste.filter((_, j) => j !== i) } }))} className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 className="w-5 h-5" />
                             </button>
                          </div>
                          <div className="grid md:grid-cols-2 gap-6">
                             <div>
                                <Etiket>Başlık</Etiket>
                                <Giris value={oz.baslik} onChange={(v) => set((p) => {
                                   const liste = [...p.ozellikler.liste];
                                   liste[i] = { ...liste[i], baslik: v };
                                   return { ...p, ozellikler: { ...p.ozellikler, liste } };
                                })} />
                             </div>
                             <div>
                                <Etiket>Aciklama</Etiket>
                                <Giris value={oz.aciklama} onChange={(v) => set((p) => {
                                   const liste = [...p.ozellikler.liste];
                                   liste[i] = { ...liste[i], aciklama: v };
                                   return { ...p, ozellikler: { ...p.ozellikler, liste } };
                                })} />
                             </div>
                          </div>
                       </motion.div>
                     ))}
                     <button
                        type="button"
                        onClick={() => set((p) => ({ ...p, ozellikler: { ...p.ozellikler, liste: [...p.ozellikler.liste, { ikon: 'BookOpen', baslik: 'Yeni Özellik', aciklama: 'Açıklama girin', renk: 'indigo' }] } }))}
                        className="w-full py-5 border-2 border-dashed border-indigo-100 rounded-3xl text-indigo-600 font-bold hover:bg-indigo-50 transition-all"
                     >
                        + Yeni Özellik Kartı Ekle
                     </button>
                  </div>
               </div>
            </Kart>
               </motion.div>
            </Tabs.Content>
          )}

          {/* Paket Alanı */}
          {activeTab === 'paket' && (
            <Tabs.Content key="paket" value="paket" className="outline-none space-y-8" forceMount>
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
             <Kart title="Paket Bölümü" icon={MousePointer2} description="Landing sayfasındaki fiyatlandırma alanı.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                      <Etiket>Ana Başlık</Etiket>
                      <Giris value={icerik.paketBolum.baslik} onChange={(v) => set((p) => ({ ...p, paketBolum: { ...p.paketBolum, baslik: v } }))} />
                   </div>
                   <div>
                      <Etiket>Alt Metin</Etiket>
                      <Giris value={icerik.paketBolum.aciklama} onChange={(v) => set((p) => ({ ...p, paketBolum: { ...p.paketBolum, aciklama: v } }))} />
                   </div>
                   <div>
                      <Etiket>Buton: Tüm Paketler</Etiket>
                      <Giris value={icerik.paketBolum.tumPaketler} onChange={(v) => set((p) => ({ ...p, paketBolum: { ...p.paketBolum, tumPaketler: v } }))} />
                   </div>
                   <div>
                      <Etiket>Buton: Ücretsiz Dene</Etiket>
                      <Giris value={icerik.paketBolum.ucretsizDene} onChange={(v) => set((p) => ({ ...p, paketBolum: { ...p.paketBolum, ucretsizDene: v } }))} />
                   </div>
                </div>
             </Kart>
               </motion.div>
            </Tabs.Content>
          )}

          {/* Footer Alanı */}
          {activeTab === 'footer' && (
            <Tabs.Content key="footer" value="footer" className="outline-none space-y-8" forceMount>
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
             <Kart title="Footer & Alt Alan" icon={LinkIcon} description="Sitenin en alt kısmındaki linkleri ve bilgileri düzenleyin.">
                   <div className="grid grid-cols-1 gap-8">
                   <div>
                      <Etiket>Footer Slogan / Açıklama</Etiket>
                      <UzunMetin value={icerik.footer.footerAciklama} onChange={(v) => set((p) => ({ ...p, footer: { ...p.footer, footerAciklama: v } }))} />
                   </div>
                   <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">İletişim (landing footer)</p>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Etiket>E-posta</Etiket>
                          <Giris icon={Mail} value={icerik.footer.eposta ?? ''} placeholder="destek@site.com" onChange={(v) => set((p) => ({ ...p, footer: { ...p.footer, eposta: v } }))} />
                        </div>
                        <div>
                          <Etiket>Telefon</Etiket>
                          <Giris icon={Phone} value={icerik.footer.telefon ?? ''} placeholder="0850 …" onChange={(v) => set((p) => ({ ...p, footer: { ...p.footer, telefon: v } }))} />
                        </div>
                      </div>
                      <div className="mt-6">
                        <Etiket>Adres</Etiket>
                        <p className="text-[10px] text-gray-400 mb-2 font-medium">Birden fazla satır için Enter ile satır atlayın.</p>
                        <UzunMetin rows={4} value={icerik.footer.adres ?? ''} onChange={(v) => set((p) => ({ ...p, footer: { ...p.footer, adres: v } }))} />
                      </div>
                   </div>
                   <div className="grid md:grid-cols-2 gap-8">
                      <div>
                         <Etiket>Copyright Marka Adı</Etiket>
                         <Giris value={icerik.footer.copyrightMarka} onChange={(v) => set((p) => ({ ...p, footer: { ...p.footer, copyrightMarka: v } }))} />
                      </div>
                      <div>
                         <Etiket>Alt Satır Bilgisi</Etiket>
                         <Giris value={icerik.footer.altSatir} onChange={(v) => set((p) => ({ ...p, footer: { ...p.footer, altSatir: v } }))} />
                      </div>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-indigo-900">Footer — Sözleşmeler sütunu</p>
                      <p className="text-xs text-indigo-700/80 mt-1 font-medium">
                        Ürün / Kaynaklar / Hesap yanında görünen yasal sayfa linkleri. İçerikler &quot;Yasal &amp; iyzico&quot; sekmesinden düzenlenir.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={icerik.footer.sozlesmelerGoster !== false}
                        onChange={(e) =>
                          set((p) => ({
                            ...p,
                            footer: { ...p.footer, sozlesmelerGoster: e.target.checked },
                          }))
                        }
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-xs font-bold text-gray-700">Göster</span>
                    </label>
                  </div>
                  <div>
                    <Etiket>Sütun başlığı</Etiket>
                    <Giris
                      value={icerik.footer.sozlesmelerBaslik ?? 'Sözleşmeler'}
                      onChange={(v) =>
                        set((p) => ({
                          ...p,
                          footer: { ...p.footer, sozlesmelerBaslik: v },
                        }))
                      }
                      placeholder="Sözleşmeler"
                    />
                  </div>
                  <ul className="space-y-2">
                    {(
                      sozlesmeGrubuOlustur(icerik as unknown as SiteGenelIcerik)?.linkler ??
                      (Object.keys(YASAL_SAYFA_YOLLAR) as YasalSayfaAnahtar[]).map((k) => ({
                        href: YASAL_SAYFA_YOLLAR[k],
                        label: YASAL_SAYFA_ETIKET[k],
                      }))
                    ).map((l) => (
                      <li
                        key={l.href}
                        className="flex items-center justify-between gap-3 text-sm bg-white rounded-xl px-4 py-2.5 border border-gray-100"
                      >
                        <span className="font-bold text-gray-800">{l.label}</span>
                        <span className="text-xs text-gray-400 font-mono truncate">{l.href}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setActiveTab('yasal')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Sözleşme metinlerini düzenle → Yasal &amp; iyzico
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 pt-2">
                  <div>
                    <Etiket>Logo yüksekliği (piksel)</Etiket>
                    <p className="text-[10px] text-gray-400 mb-2 font-medium">
                      Navbar ve footer’da görünen yükseklik (16–120). Yükleme önizlemesinden bağımsızdır.
                    </p>
                    <SayiGiris
                      value={icerik.marka.logoYukseklikPx ?? VARSAYILAN_SITE_ICERIK.marka.logoYukseklikPx}
                      onChange={(v) =>
                        set((p) => ({
                          ...p,
                          marka: { ...p.marka, logoYukseklikPx: Math.round(Math.min(120, Math.max(16, v || 36))) },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Etiket>Logo maks. genişlik (piksel)</Etiket>
                    <p className="text-[10px] text-gray-400 mb-2 font-medium">
                      Geniş logolar taşmasın diye üst sınır (48–400).
                    </p>
                    <SayiGiris
                      value={icerik.marka.logoMaxGenislikPx ?? VARSAYILAN_SITE_ICERIK.marka.logoMaxGenislikPx}
                      onChange={(v) =>
                        set((p) => ({
                          ...p,
                          marka: { ...p.marka, logoMaxGenislikPx: Math.round(Math.min(400, Math.max(48, v || 220))) },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </Kart>
               </motion.div>
            </Tabs.Content>
          )}

          {/* Nasıl Çalışır */}
          {activeTab === 'nasil' && (
            <Tabs.Content key="nasil" value="nasil" className="outline-none space-y-8" forceMount>
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Kart title="Nasıl Çalışır?" icon={Layout} description="Adım adım süreçleri düzenleyin.">
                     <p className="text-sm text-gray-500">Bu alan henüz düzenleme formuna tam entegre edilmedi.</p>
                  </Kart>
               </motion.div>
            </Tabs.Content>
          )}

          {/* Yasal & iyzico */}
          {activeTab === 'yasal' && (
            <Tabs.Content key="yasal" value="yasal" className="outline-none space-y-8" forceMount>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <Kart
                  title="iyzico Web Sitesi Kriterleri"
                  icon={Shield}
                  description="Ödeme altyapısı başvurusu için sitede bulunması gereken yasal sayfalar ve ödeme logoları."
                >
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 font-medium leading-relaxed">
                    SSL sertifikası sunucu/hosting tarafında sağlanır (HTTPS). Canlı ortamda otomatik sertifika (Vercel vb.) kullanın.
                    iyzico logosunu{' '}
                    <a
                      href="https://www.iyzico.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 underline"
                    >
                      iyzico
                    </a>{' '}
                    sitesinden indirebilirsiniz.
                  </p>
                </Kart>

                {(Object.keys(YASAL_SAYFA_ETIKET) as YasalSayfaAnahtar[]).map((anahtar) => {
                  const sayfa = icerik.yasalSayfalar?.[anahtar] ?? {
                    baslik: YASAL_SAYFA_ETIKET[anahtar],
                    icerikHtml: '',
                    yayinda: false,
                  };
                  return (
                    <Kart
                      key={anahtar}
                      title={YASAL_SAYFA_ETIKET[anahtar]}
                      icon={FileText}
                      description="Düz metin yapıştırabilirsiniz; paragraflar ve BÖLÜM BAŞLIKLARI: otomatik biçimlenir. İsterseniz HTML (p, h2, ul) de kullanın."
                    >
                      <label className="flex items-center gap-2 cursor-pointer mb-4">
                        <input
                          type="checkbox"
                          checked={sayfa.yayinda}
                          onChange={(e) =>
                            set((prev) => ({
                              ...prev,
                              yasalSayfalar: {
                                ...prev.yasalSayfalar,
                                [anahtar]: { ...sayfa, yayinda: e.target.checked },
                              },
                            }))
                          }
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm font-bold text-gray-700">Yayında (sitede görünsün)</span>
                      </label>
                      <div>
                        <Etiket>Sayfa başlığı</Etiket>
                        <Giris
                          value={sayfa.baslik}
                          onChange={(v) =>
                            set((prev) => ({
                              ...prev,
                              yasalSayfalar: {
                                ...prev.yasalSayfalar,
                                [anahtar]: { ...sayfa, baslik: v },
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Etiket>İçerik</Etiket>
                        <UzunMetin
                          value={sayfa.icerikHtml}
                          onChange={(v) =>
                            set((prev) => ({
                              ...prev,
                              yasalSayfalar: {
                                ...prev.yasalSayfalar,
                                [anahtar]: { ...sayfa, icerikHtml: v },
                              },
                            }))
                          }
                          rows={8}
                        />
                      </div>
                    </Kart>
                  );
                })}

                <Kart title="Ödeme Logoları" icon={CreditCard} description="Footer ve market sayfasında gösterilecek güven rozetleri.">
                  {(
                    [
                      { key: 'visaGoster' as const, urlKey: 'visaLogoUrl' as const, label: 'Visa logosu' },
                      { key: 'mastercardGoster' as const, urlKey: 'mastercardLogoUrl' as const, label: 'Mastercard logosu' },
                      { key: 'iyzicoGoster' as const, urlKey: 'iyzicoLogoUrl' as const, label: 'iyzico ile Öde logosu' },
                    ] as const
                  ).map(({ key, urlKey, label }) => {
                    const og = icerik.odemeGostergeleri ?? VARSAYILAN_SITE_ICERIK.odemeGostergeleri;
                    return (
                      <motion.div key={key} className="space-y-3 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={og[key]}
                            onChange={(e) =>
                              set((prev) => ({
                                ...prev,
                                odemeGostergeleri: {
                                  ...(prev.odemeGostergeleri ?? VARSAYILAN_SITE_ICERIK.odemeGostergeleri),
                                  [key]: e.target.checked,
                                },
                              }))
                            }
                            className="rounded border-gray-300 text-indigo-600"
                          />
                          <span className="text-sm font-bold text-gray-700">{label} göster</span>
                        </label>
                        <div>
                          <Etiket>Logo URL</Etiket>
                          <Giris
                            value={og[urlKey]}
                            onChange={(v) =>
                              set((prev) => ({
                                ...prev,
                                odemeGostergeleri: {
                                  ...(prev.odemeGostergeleri ?? VARSAYILAN_SITE_ICERIK.odemeGostergeleri),
                                  [urlKey]: v,
                                },
                              }))
                            }
                            placeholder="https://..."
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </Kart>
              </motion.div>
            </Tabs.Content>
          )}
        </AnimatePresence>
      </div>
    </Tabs.Root>
  );
});

SiteIcerikFormu.displayName = 'SiteIcerikFormu';
