'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  ShoppingBag,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Pencil,
  Plus,
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Calendar,
  Wallet,
  User,
  ExternalLink,
  X,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from '@/store/toast.store';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface PaketOzet {
  id: string;
  ad: string;
  sinavSayisi: number;
  fiyat: number;
  indirimliFiyat: number | null;
}

interface SiparisSatir {
  id: string;
  miktar: number;
  durum: string;
  referansNo: string | null;
  odemeMetodu: string | null;
  notlar: string | null;
  faturaBilgileri: any;
  olusturuldu: string;
  guncellendi: string;
  odemeZamani: string | null;
  kullanici: {
    id: string;
    email: string;
    rol: string;
    ogrenciProfil?: { ad: string; soyad: string } | null;
    veliProfil?: { ad: string; soyad: string } | null;
  };
  paket: PaketOzet;
}

interface Ozet {
  bekleyen: number;
  tamamlanan: number;
  iptal: number;
  hata: number;
  iade: number;
  toplamSiparis: number;
  tamamlananGelir: number;
  bugunGelir: number;
  buAyGelir: number;
}

const DURUM_ETIKET: Record<string, string> = {
  BEKLEMEDE: 'Ödeme bekliyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL_EDILDI: 'İptal',
  IADE_EDILDI: 'İade Edildi',
  HATA: 'Hata',
};

const DURUM_RENK: Record<string, string> = {
  BEKLEMEDE: 'bg-amber-100 text-amber-800',
  TAMAMLANDI: 'bg-green-100 text-green-800',
  IPTAL_EDILDI: 'bg-gray-200 text-gray-700',
  IADE_EDILDI: 'bg-indigo-100 text-indigo-700',
  HATA: 'bg-red-100 text-red-800',
};

function kullaniciAdi(s: SiparisSatir['kullanici']): string {
  if (s.ogrenciProfil) return `${s.ogrenciProfil.ad} ${s.ogrenciProfil.soyad}`;
  if (s.veliProfil) return `${s.veliProfil.ad} ${s.veliProfil.soyad}`;
  return s.email;
}

export default function SiparislerSayfasi() {
  const queryClient = useQueryClient();
  const [sayfa, setSayfa] = useState(1);
  const [durumFiltre, setDurumFiltre] = useState<string>('');
  const [q, setQ] = useState('');
  const [detayModal, setDetayModal] = useState<SiparisSatir | null>(null);
  const [manuelModal, setManuelModal] = useState(false);
  const [kapaliGruplar, setKapaliGruplar] = useState<Set<string>>(new Set());

  const [duzenForm, setDuzenForm] = useState({
    durum: 'BEKLEMEDE',
    notlar: '',
    referansNo: '',
    odemeMetodu: 'KREDİ KARTI',
    faturaBilgileri: '',
  });

  const [manuelForm, setManuelForm] = useState({
    email: '',
    paketId: '',
    miktar: '',
    notlar: '',
    referansNo: '',
    odemeMetodu: 'HAVALE',
  });

  const { data: ozetRes } = useQuery({
    queryKey: ['admin-siparis-ozet'],
    queryFn: () => adminApi.siparisOzet(),
  });
  const ozet: Ozet | undefined = ozetRes?.data?.veri;

  const { data: listeRes, isLoading } = useQuery({
    queryKey: ['admin-siparisler', sayfa, durumFiltre, q],
    queryFn: () =>
      adminApi.siparisler({
        sayfa,
        durum: durumFiltre || undefined,
        q: q.trim() || undefined,
      }),
  });

  const satirlar: SiparisSatir[] = listeRes?.data?.veri || [];
  const meta = listeRes?.data?.meta || { toplam: 0, toplamSayfa: 1 };

  const musteriGruplari = useMemo(() => {
    const map = new Map<
      string,
      { anahtar: string; kullanici: SiparisSatir['kullanici']; siparisler: SiparisSatir[]; toplamTutar: number }
    >();
    for (const s of satirlar) {
      const anahtar = s.kullanici?.id || s.kullanici?.email || 'bilinmeyen';
      const mevcut = map.get(anahtar);
      if (mevcut) {
        mevcut.siparisler.push(s);
        mevcut.toplamTutar += s.miktar;
      } else {
        map.set(anahtar, { anahtar, kullanici: s.kullanici, siparisler: [s], toplamTutar: s.miktar });
      }
    }
    return [...map.values()];
  }, [satirlar]);

  const grupKapat = (anahtar: string) =>
    setKapaliGruplar((prev) => {
      const yeni = new Set(prev);
      if (yeni.has(anahtar)) yeni.delete(anahtar);
      else yeni.add(anahtar);
      return yeni;
    });

  const { data: paketRes } = useQuery({
    queryKey: ['admin-paketler-siparis'],
    queryFn: () => adminApi.paketler(),
    enabled: manuelModal,
  });
  const paketler: { id: string; ad: string; fiyat: number; indirimliFiyat: number | null }[] =
    paketRes?.data?.veri || [];

  const guncelleMutation = useMutation({
    mutationFn: ({ id, veri }: { id: string; veri: Record<string, unknown> }) =>
      adminApi.siparisGuncelle(id, veri),
    onSuccess: () => {
      toast.basarili('Sipariş güncellendi');
      setDetayModal(null);
      queryClient.invalidateQueries({ queryKey: ['admin-siparisler'] });
      queryClient.invalidateQueries({ queryKey: ['admin-siparis-ozet'] });
    },
    onError: (e: unknown) => {
      if (axios.isAxiosError(e) && e.response?.data?.mesaj) toast.hata(String(e.response.data.mesaj));
      else toast.hata('Güncellenemedi');
    },
  });

  const manuelMutation = useMutation({
    mutationFn: (veri: Record<string, unknown>) => adminApi.siparisManuelOlustur(veri),
    onSuccess: () => {
      toast.basarili('Manuel sipariş oluşturuldu');
      setManuelModal(false);
      setManuelForm({ email: '', paketId: '', miktar: '', notlar: '', referansNo: '', odemeMetodu: 'HAVALE' });
      queryClient.invalidateQueries({ queryKey: ['admin-siparisler'] });
      queryClient.invalidateQueries({ queryKey: ['admin-siparis-ozet'] });
    },
    onError: (e: unknown) => {
      if (axios.isAxiosError(e) && e.response?.data?.mesaj) toast.hata(String(e.response.data.mesaj));
      else toast.hata('Kayıt oluşturulamadı');
    },
  });

  const detayAc = (s: SiparisSatir) => {
    setDuzenForm({
      durum: s.durum,
      notlar: s.notlar || '',
      referansNo: s.referansNo || '',
      odemeMetodu: s.odemeMetodu || 'KREDİ KARTI',
      faturaBilgileri: s.faturaBilgileri ? JSON.stringify(s.faturaBilgileri, null, 2) : '',
    });
    setDetayModal(s);
  };

  const ozetKartlar = useMemo(
    () => [
      { etiket: 'Bugün Gelir', deger: ozet?.bugunGelir ?? 0, ikon: Calendar, renk: 'text-emerald-600 bg-emerald-50', isMoney: true },
      { etiket: 'Bu Ay Gelir', deger: ozet?.buAyGelir ?? 0, ikon: Banknote, renk: 'text-indigo-600 bg-indigo-50', isMoney: true },
      { etiket: 'Bekleyen', deger: ozet?.bekleyen ?? 0, ikon: Clock, renk: 'text-amber-600 bg-amber-50', isMoney: false },
      { etiket: 'Hata/İptal', deger: (ozet?.hata ?? 0) + (ozet?.iptal ?? 0), ikon: AlertTriangle, renk: 'text-red-600 bg-red-50', isMoney: false },
    ],
    [ozet]
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Finans & Sipariş Takibi</h1>
          </div>
          <p className="text-gray-500 font-medium">
            Ödemeleri onaylayın, iadeleri yönetin ve finansal durumunuzu anlık olarak takip edin.
          </p>
        </div>
        <button 
          onClick={() => setManuelModal(true)}
          className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          <Plus className="w-5 h-5" /> Manuel Sipariş Ekle
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ozetKartlar.map((k) => {
          const Icon = k.ikon;
          return (
            <motion.div 
              key={k.etiket}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4"
            >
              <div className={`p-3 rounded-2xl ${k.renk}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{k.etiket}</p>
                <p className="text-2xl font-black text-gray-900">
                   {k.isMoney ? `${k.deger.toLocaleString('tr-TR')} ₺` : k.deger}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            value={q}
            onChange={(e) => { setQ(e.target.value); setSayfa(1); }}
            placeholder="Müşteri adı, e-posta veya referans no ile ara..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-900 shadow-sm"
          />
        </div>
        <select 
          value={durumFiltre}
          onChange={(e) => { setDurumFiltre(e.target.value); setSayfa(1); }}
          className="px-6 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-600 bg-white shadow-sm cursor-pointer"
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(DURUM_ETIKET).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Veriler yükleniyor...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {musteriGruplari.map((grup) => {
              const kapali = kapaliGruplar.has(grup.anahtar);
              return (
                <div key={grup.anahtar}>
                  {/* Müşteri başlığı */}
                  <button
                    type="button"
                    onClick={() => grupKapat(grup.anahtar)}
                    className="w-full flex items-center gap-4 px-6 py-4 bg-gray-50/60 hover:bg-gray-100/70 transition-colors text-left"
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${kapali ? '-rotate-90' : ''}`}
                    />
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">
                      {kullaniciAdi(grup.kullanici)[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-gray-900 truncate">{kullaniciAdi(grup.kullanici)}</p>
                      <p className="text-xs text-gray-400 lowercase truncate">{grup.kullanici.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-gray-900">{grup.toplamTutar.toLocaleString('tr-TR')} ₺</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {grup.siparisler.length} sipariş
                      </p>
                    </div>
                  </button>

                  {/* Müşterinin siparişleri */}
                  {!kapali && (
                    <div className="divide-y divide-gray-50">
                      {grup.siparisler.map((s) => (
                        <div
                          key={s.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pl-6 sm:pl-16 pr-6 py-4 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate">
                              {s.sinav?.baslik ?? s.paket?.ad ?? 'Sipariş'}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-medium">
                              {format(new Date(s.olusturuldu), 'd MMMM yyyy HH:mm', { locale: tr })}
                            </p>
                          </div>
                          <div className="shrink-0 sm:w-40">
                            <p className="font-black text-gray-900 text-lg">{s.miktar.toLocaleString('tr-TR')} ₺</p>
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                              <Wallet className="w-3 h-3" /> {s.odemeMetodu || 'KREDİ KARTI'}
                            </span>
                          </div>
                          <div className="shrink-0 sm:w-36">
                            <span
                              className={`inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${DURUM_RENK[s.durum] || 'bg-gray-100'}`}
                            >
                              {DURUM_ETIKET[s.durum] || s.durum}
                            </span>
                          </div>
                          <div className="shrink-0 sm:text-right">
                            <button
                              onClick={() => detayAc(s)}
                              className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {!isLoading && satirlar.length === 0 && (
           <div className="py-20 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-100 mx-auto mb-4" />
              <p className="text-gray-400 font-bold tracking-tight">Eşleşen sipariş bulunamadı.</p>
           </div>
        )}
      </div>

      {/* Pagination */}
      {meta.toplamSayfa > 1 && (
        <div className="flex items-center justify-center gap-4">
           <button 
             disabled={sayfa === 1}
             onClick={() => setSayfa(sayfa - 1)}
             className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 disabled:opacity-30 hover:border-indigo-300 transition-all"
           >
             <ChevronLeft className="w-5 h-5" />
           </button>
           <span className="font-black text-gray-900">SAYFA {sayfa} / {meta.toplamSayfa}</span>
           <button 
             disabled={sayfa === meta.toplamSayfa}
             onClick={() => setSayfa(sayfa + 1)}
             className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 disabled:opacity-30 hover:border-indigo-300 transition-all"
           >
             <ChevronRight className="w-5 h-5" />
           </button>
        </div>
      )}

      {/* Details/Edit Modal */}
      <AnimatePresence>
        {detayModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100"
            >
               <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-indigo-600 text-white rounded-2xl">
                        <FileText className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="font-black text-gray-900 text-xl tracking-tight">Sipariş Detayı</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{detayModal.id}</p>
                     </div>
                  </div>
                  <button onClick={() => setDetayModal(null)} className="p-2 text-gray-400 hover:text-gray-900">
                    <X className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
                  {/* Left Column: Info */}
                  <div className="space-y-6">
                     <div className="p-6 rounded-3xl bg-indigo-50/50 border border-indigo-100 space-y-4">
                        <div>
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Müşteri Bilgisi</label>
                           <p className="font-bold text-gray-900 flex items-center gap-2">
                             <User className="w-4 h-4 text-indigo-400" /> {kullaniciAdi(detayModal.kullanici)}
                           </p>
                           <p className="text-xs text-indigo-600 italic mt-0.5">{detayModal.kullanici.email}</p>
                        </div>
                        <div className="pt-4 border-t border-indigo-100">
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                             {detayModal.sinav ? 'Satın Alınan Sınav' : 'Satın Alınan Paket'}
                           </label>
                           <p className="font-black text-gray-900">{detayModal.sinav?.baslik ?? detayModal.paket?.ad ?? '—'}</p>
                           <p className="text-2xl font-black text-indigo-600 mt-1">{detayModal.miktar.toLocaleString('tr-TR')} ₺</p>
                        </div>
                        {detayModal.odemeZamani && (
                          <div className="pt-4 border-t border-indigo-100 flex items-center gap-2 text-xs font-bold text-green-600">
                            <CheckCircle2 className="w-4 h-4" /> Ödeme: {format(new Date(detayModal.odemeZamani), 'd MMM yyyy HH:mm', { locale: tr })}
                          </div>
                        )}
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Yönetici Notları</label>
                        <textarea 
                          value={duzenForm.notlar}
                          onChange={(e) => setDuzenForm({ ...duzenForm, notlar: e.target.value })}
                          className="w-full px-4 py-4 rounded-3xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none h-32 text-sm font-medium resize-none shadow-inner"
                          placeholder="Müşteriye görünmeyen özel notlar..."
                        />
                     </div>
                  </div>

                  {/* Right Column: Editing */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">İşlem Durumu</label>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(DURUM_ETIKET).map(([k, v]) => (
                          <button 
                            key={k}
                            onClick={() => setDuzenForm({ ...duzenForm, durum: k })}
                            className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider text-left transition-all border
                              ${duzenForm.durum === k ? `${DURUM_RENK[k]} border-transparent shadow-md` : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-100'}`}
                          >
                             {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ödeme Metodu</label>
                          <select 
                             value={duzenForm.odemeMetodu}
                             onChange={(e) => setDuzenForm({ ...duzenForm, odemeMetodu: e.target.value })}
                             className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm text-gray-700 bg-white"
                          >
                             <option value="KREDİ KARTI">Kredi Kartı</option>
                             <option value="HAVALE">Havale / EFT</option>
                             <option value="MANUEL">Manuel Kayıt</option>
                             <option value="DİĞER">Diğer</option>
                          </select>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Referans No (Iyzico / Banka)</label>
                          <input 
                             value={duzenForm.referansNo}
                             onChange={(e) => setDuzenForm({ ...duzenForm, referansNo: e.target.value })}
                             className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs text-gray-600 bg-white"
                             placeholder="WNG-TRX-123456"
                          />
                       </div>
                    </div>
                  </div>

                  {/* Fatura Bilgileri Section */}
                  <div className="col-span-1 md:col-span-2 space-y-2 pt-4 border-t border-gray-50">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Fatura & ERP Bilgileri (JSON)
                     </label>
                     <textarea 
                        value={duzenForm.faturaBilgileri}
                        onChange={(e) => setDuzenForm({ ...duzenForm, faturaBilgileri: e.target.value })}
                        className="w-full p-4 rounded-3xl border border-gray-100 bg-gray-900 text-indigo-300 font-mono text-xs h-32 resize-none shadow-xl"
                        placeholder='{ "title": "Company Name", "taxId": "..." }'
                     />
                  </div>
               </div>

               <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex gap-4">
                  <button onClick={() => setDetayModal(null)} className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-100 rounded-3xl transition-all uppercase text-[11px] tracking-widest">İptal</button>
                  <button 
                    disabled={guncelleMutation.isPending}
                    onClick={() => {
                        let fatura = null;
                        try { if (duzenForm.faturaBilgileri) fatura = JSON.parse(duzenForm.faturaBilgileri); }
                        catch(err) { return toast.hata("Fatura JSON formatı geçersiz"); }
                        
                        guncelleMutation.mutate({
                           id: detayModal.id,
                           veri: {
                              durum: duzenForm.durum,
                              notlar: duzenForm.notlar,
                              referansNo: duzenForm.referansNo.trim() || null,
                              odemeMetodu: duzenForm.odemeMetodu,
                              faturaBilgileri: fatura
                           }
                        });
                    }}
                    className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 uppercase text-[11px] tracking-widest"
                  >
                    {guncelleMutation.isPending ? 'KAYDEDİLİYOR...' : 'SİPARİŞİ GÜNCELLE'}
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manuel Order Modal */}
      <AnimatePresence>
        {manuelModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          >
            <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 space-y-8"
            >
               <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                     <Plus className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Manuel Sipariş Oluştur</h2>
                  <p className="text-sm text-gray-500 font-medium mt-1">Havale veya elden ödemeler için kayıt oluşturun.</p>
               </div>

               <div className="space-y-5">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Kullanıcı E-Postası</label>
                     <input 
                       value={manuelForm.email}
                       onChange={(e) => setManuelForm({ ...manuelForm, email: e.target.value })}
                       className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50 font-medium"
                       placeholder="ogrenci@email.com"
                     />
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Paket Seçimi</label>
                     <select 
                       value={manuelForm.paketId}
                       onChange={(e) => setManuelForm({ ...manuelForm, paketId: e.target.value })}
                       className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50 font-bold text-gray-700"
                     >
                        <option value="">Paket Seçiniz...</option>
                        {paketler.map(p => (
                          <option key={p.id} value={p.id}>{p.ad} ({ (p.indirimliFiyat || p.fiyat).toLocaleString('tr-TR') } ₺)</option>
                        ))}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tutar (Opsiyonel)</label>
                       <input 
                         value={manuelForm.miktar}
                         onChange={(e) => setManuelForm({ ...manuelForm, miktar: e.target.value })}
                         className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50 font-black text-indigo-600"
                         placeholder="Değişecekse girin"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Ödeme Yöntemi</label>
                       <select 
                         value={manuelForm.odemeMetodu}
                         onChange={(e) => setManuelForm({ ...manuelForm, odemeMetodu: e.target.value })}
                         className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50 font-bold"
                       >
                         <option value="HAVALE">Havale</option>
                         <option value="ELDEN">Elden</option>
                         <option value="HEDİYE">Hediye / Ücretsiz</option>
                       </select>
                    </div>
                  </div>
               </div>

               <div className="flex gap-4">
                  <button onClick={() => setManuelModal(false)} className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-50 rounded-3xl transition-all">İptal</button>
                  <button 
                    disabled={manuelMutation.isPending || !manuelForm.email || !manuelForm.paketId}
                    onClick={() => manuelMutation.mutate({
                       ...manuelForm,
                       miktar: manuelForm.miktar ? parseFloat(manuelForm.miktar) : undefined
                    })}
                    className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-3xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 uppercase text-[11px] tracking-widest"
                  >
                     {manuelMutation.isPending ? 'İŞLENİYOR...' : 'SİPARİŞİ OLUŞTUR'}
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
