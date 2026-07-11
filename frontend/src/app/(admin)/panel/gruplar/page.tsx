'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { api } from '@/lib/api';
import {
  FolderOpen, Plus, BookOpen,
  ChevronDown, ChevronUp, Loader2, Trash2, Edit, Check, X,
  ChevronRight,
  GitMerge
} from 'lucide-react';
import { toast } from '@/store/toast.store';
import { confirmAsk } from '@/store/confirm-dialog.store';
import { motion, AnimatePresence } from 'framer-motion';
import { grupKonuOgretimTuru, ogretimTuruKisaEtiket } from '@/lib/grupOgretimTuru';
import { OGRETIM_TURU_SECENEKLERI, getOgretimTuruSecenekleri } from '@/lib/ogretimTuruSecenekleri';
import { bagliGruplariFiltrele, grupYoluHaritasi } from '@/lib/grupYolu';

interface Grup {
  id: string;
  ad: string;
  tur: string;
  aciklama?: string;
  aktif: boolean;
  parentId: string | null;
  _count: { sinavlar: number; children: number };
  /** Bu gruptaki sınavlara bağlı toplam soru */
  soruSayisi: number;
}

interface TreeGrup extends Grup {
  cocuklar: TreeGrup[];
}

const turRenkleri: Record<string, string> = {
  YKS: 'bg-indigo-100 text-indigo-700',
  LGS: 'bg-violet-100 text-violet-700',
  KPSS: 'bg-amber-100 text-amber-800',
  KPSS_LISANS: 'bg-amber-100 text-amber-800',
  KPSS_ONLISANS: 'bg-amber-100 text-amber-800',
  KPSS_ORTAOGRETIM: 'bg-orange-100 text-orange-800',
  SINIF_6: 'bg-cyan-100 text-cyan-700',
  SINIF_7: 'bg-teal-100 text-teal-700',
  SINIF_9: 'bg-sky-100 text-sky-700',
  SINIF_10: 'bg-orange-100 text-orange-700',
  SINIF_11: 'bg-pink-100 text-pink-700',
};

function grupTurEtiketi(grup: Grup): string {
  return ogretimTuruKisaEtiket(grupKonuOgretimTuru(grup) || grup.tur);
}

function grupTurRenk(grup: Grup): string {
  const efektif = grupKonuOgretimTuru(grup) || grup.tur;
  return turRenkleri[efektif] || 'bg-gray-100 text-gray-600';
}

function gruplariAgacaDonustur(liste: Grup[]): TreeGrup[] {
  if (!Array.isArray(liste)) return [];
  const map: Record<string, TreeGrup> = {};
  const agac: TreeGrup[] = [];

  // Önce tüm grupları haritaya ekle (Geçersiz ID'leri filtrele)
  liste.forEach(g => {
    if (g && g.id) {
      map[g.id] = { ...g, cocuklar: [] };
    }
  });

  // Hiyerarşiyi oluştur
  liste.forEach(g => {
    if (g && g.id) {
      if (g.parentId && map[g.parentId]) {
        map[g.parentId].cocuklar.push(map[g.id]);
      } else {
        // Eğer parentId yoksa veya üst grup bulunamadıysa ana dal olarak ekle
        agac.push(map[g.id]);
      }
    }
  });

  return agac;
}

export default function GruplarSayfasi() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [yeniGrupForm, setYeniGrupForm] = useState(false);
  const [ustGrupKilitli, setUstGrupKilitli] = useState(false);
  const [duzenleGrupId, setDuzenleGrupId] = useState<string | null>(null);
  const [hizliAltGrupId, setHizliAltGrupId] = useState<string | null>(null);
  const [hizliAltAd, setHizliAltAd] = useState('');
  
  const [form, setForm] = useState({ ad: '', tur: 'YKS', aciklama: '', parentId: '' });
  const [duzenleForm, setDuzenleForm] = useState({ ad: '', tur: 'YKS', aciklama: '', parentId: '' });
  const [ogretimTuruSecenekleri, setOgretimTuruSecenekleri] = useState<any[]>([]);

  useEffect(() => {
    const secenekler = getOgretimTuruSecenekleri();
    setOgretimTuruSecenekleri(secenekler);
    if (secenekler.length > 0) {
      setForm(f => ({ ...f, tur: secenekler[0].value }));
      setDuzenleForm(f => ({ ...f, tur: secenekler[0].value }));
    }
  }, []);

  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['gruplar'],
    queryFn: () => adminApi.gruplar(),
    refetchOnMount: 'always',
    staleTime: 0,
  });
  
  const hamGruplar: Grup[] = bagliGruplariFiltrele(data?.data?.veri || []);
  const grupYollari = grupYoluHaritasi(hamGruplar);
  const agacGruplar = gruplariAgacaDonustur(hamGruplar);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const grupOlustur = useMutation({
    mutationFn: (veri?: { ad: string; tur: string; aciklama?: string; parentId?: string | null }) => {
      const kaynak = veri || form;
      return api.post('/admin/gruplar', {
        ad: kaynak.ad.trim(),
        tur: kaynak.tur,
        aciklama: kaynak.aciklama?.trim() || '',
        parentId: kaynak.parentId || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gruplar'] });
      qc.invalidateQueries({ queryKey: ['admin-gruplar'] });
      setYeniGrupForm(false);
      setUstGrupKilitli(false);
      setHizliAltGrupId(null);
      setHizliAltAd('');
      setForm({ ad: '', tur: 'YKS', aciklama: '', parentId: '' });
      toast.basarili('Grup oluşturuldu!');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        'Grup oluşturulamadı';
      toast.hata(msg);
    },
  });

  const grupGuncelle = useMutation({
    mutationFn: ({ id, veri }: { id: string; veri: any }) =>
      api.put(`/admin/gruplar/${id}`, veri),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gruplar'] });
      qc.invalidateQueries({ queryKey: ['admin-gruplar'] });
      setDuzenleGrupId(null);
      toast.basarili('Grup güncellendi');
    },
  });

  const grupSil = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/gruplar/${id}`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['gruplar'] });
      qc.invalidateQueries({ queryKey: ['admin-gruplar'] });
      const mesaj = res?.data?.mesaj || 'Grup silindi';
      toast.basarili(mesaj);
    },
    onError: () => toast.hata('Grup silinemedi'),
  });

  const aktifToggle = useMutation({
    mutationFn: ({ id, aktif }: { id: string; aktif: boolean }) =>
      api.put(`/admin/gruplar/${id}`, { aktif }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gruplar'] });
      qc.invalidateQueries({ queryKey: ['admin-gruplar'] });
    },
  });

  const altGrupFormAc = (ust: Grup) => {
    const ustTur = grupKonuOgretimTuru(ust) || ust.tur;
    setUstGrupKilitli(true);
    setForm({ ad: '', tur: ustTur, aciklama: '', parentId: ust.id });
    setYeniGrupForm(true);
    setExpandedIds((prev) => new Set(prev).add(ust.id));
  };

  const hizliAltGrupEkle = (ust: Grup) => {
    const ad = hizliAltAd.trim();
    if (!ad) return;
    const ustTur = grupKonuOgretimTuru(ust) || ust.tur;
    grupOlustur.mutate({ ad, tur: ustTur, parentId: ust.id });
  };

  const renderGrup = (grup: TreeGrup, level: number = 0) => {
    const isExpanded = expandedIds.has(grup.id);
    const hasChildren = grup.cocuklar.length > 0;

    return (
      <div key={grup.id} className="space-y-1">
        <div 
          className={`group flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 
            ${!grup.aktif ? 'bg-gray-50/50 opacity-60' : 'bg-white hover:border-indigo-200 hover:shadow-md shadow-sm border-gray-100'} 
            ${level > 0 ? 'ml-8' : ''}`}
        >
          {/* Hiyerarşi Çizgisi */}
          {level > 0 && (
            <div className="absolute left-[-20px] top-1/2 w-4 h-[2px] bg-gray-200" />
          )}

          {/* Expand Toggle */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => toggleExpand(grup.id)}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 
              ${level === 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
              <FolderOpen className="w-5 h-5" />
            </div>
          </div>

          {/* Bilgi */}
          <div className="flex-1 min-w-0">
            {duzenleGrupId === grup.id ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                <input
                  value={duzenleForm.ad}
                  onChange={(e) => setDuzenleForm({ ...duzenleForm, ad: e.target.value })}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  autoFocus
                />
                <select
                  value={duzenleForm.tur}
                  onChange={(e) => setDuzenleForm({ ...duzenleForm, tur: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                >
                  {ogretimTuruSecenekleri.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => grupGuncelle.mutate({ id: grup.id, veri: duzenleForm })} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDuzenleGrupId(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900">{grup.ad}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${grupTurRenk(grup)}`}>
                  {grupTurEtiketi(grup)}
                </span>
                {grup.aciklama && <p className="text-xs text-gray-400 w-full italic">{grup.aciklama}</p>}
              </div>
            )}
          </div>

          {/* İstatistikler */}
          <div className="hidden md:flex items-center gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-gray-300" /> {grup._count?.sinavlar || 0} Sınav
            </div>
          </div>

          {/* Aksiyonlar */}
          <div className="flex items-center gap-1 md:opacity-100">
            <button 
              onClick={() => altGrupFormAc(grup)}
              className="p-2 rounded-xl hover:bg-emerald-50 text-emerald-600"
              title="Alt Grup Ekle"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                setDuzenleGrupId(grup.id);
                setDuzenleForm({
                  ad: grup.ad,
                  tur: grupKonuOgretimTuru(grup) || grup.tur,
                  aciklama: grup.aciklama || '',
                  parentId: grup.parentId || '',
                });
              }}
              className="p-2 rounded-xl hover:bg-blue-50 text-blue-600"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button 
              onClick={async () => {
                if (await confirmAsk({ title: 'Grubu Sil', message: `"${grup.ad}" silinsin mi?`, variant: 'destructive' })) {
                  grupSil.mutate(grup.id);
                }
              }}
              className="p-2 rounded-xl hover:bg-red-50 text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Çocuk Grupları (Recursive) */}
        {isExpanded && hasChildren && (
          <div className="relative pl-4 mt-2">
            <div className="absolute left-3 top-0 bottom-4 w-[2px] bg-gray-100 rounded-full" />
            <div className="space-y-3">
              {grup.cocuklar.map(cocuk => renderGrup(cocuk, level + 1))}
            </div>
          </div>
        )}

        {isExpanded && (
          <div className={`mt-2 ${level > 0 ? 'ml-12' : 'ml-10'}`}>
              {hizliAltGrupId === grup.id ? (
                <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-2xl border border-emerald-100 bg-emerald-50/50">
                  <input
                    value={hizliAltAd}
                    onChange={(e) => setHizliAltAd(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') hizliAltGrupEkle(grup);
                      if (e.key === 'Escape') { setHizliAltGrupId(null); setHizliAltAd(''); }
                    }}
                    placeholder={`${grup.ad} altına yeni grup adı`}
                    className="flex-1 px-3 py-2 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => hizliAltGrupEkle(grup)}
                      disabled={!hizliAltAd.trim() || grupOlustur.isPending}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Ekle
                    </button>
                    <button
                      onClick={() => { setHizliAltGrupId(null); setHizliAltAd(''); }}
                      className="px-3 py-2 text-gray-500 text-sm font-bold rounded-xl hover:bg-white"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setHizliAltGrupId(grup.id);
                    setHizliAltAd('');
                    setExpandedIds((prev) => new Set(prev).add(grup.id));
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" /> Alt grup ekle
                </button>
              )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Soru & Sınav Grupları</h1>
          </div>
          <p className="text-gray-500 font-medium max-w-lg">
            Soru bankanızı ve sınavlarınızı hiyerarşik kategorilere ayırarak düzenleyin.
          </p>
        </div>
        <button
          onClick={() => {
            setUstGrupKilitli(false);
            setForm({ ad: '', tur: 'YKS', aciklama: '', parentId: '' });
            setYeniGrupForm(true);
          }}
          className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 grow-0 shrink-0"
        >
          <Plus className="w-5 h-5" /> Yeni Ana Grup
        </button>
      </div>

      {/* Yeni / Düzenle Formu */}
      <AnimatePresence>
        {yeniGrupForm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
               <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-600" /> {form.parentId ? 'Alt Grup Ekle' : 'Yeni Ana Grup Oluştur'}
                  </h3>
                  <button onClick={() => { setYeniGrupForm(false); setUstGrupKilitli(false); }} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
               </div>
               
               <div className="p-8 space-y-6">
                  {form.parentId && (
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between gap-3 text-xs font-bold text-indigo-600">
                      <span className="flex items-center gap-2 italic">
                        <GitMerge className="w-4 h-4 shrink-0" />
                        Üst Grup: {grupYollari.get(form.parentId) || hamGruplar.find(h => h.id === form.parentId)?.ad}
                      </span>
                      {ustGrupKilitli && (
                        <button
                          type="button"
                          onClick={() => { setUstGrupKilitli(false); setForm((f) => ({ ...f, parentId: '' })); }}
                          className="text-[10px] uppercase tracking-wider text-indigo-400 hover:text-indigo-700 shrink-0"
                        >
                          Ana grup yap
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grup Adı</label>
                      <input 
                        value={form.ad}
                        onChange={(e) => setForm({ ...form, ad: e.target.value })}
                        placeholder="Örn: Matematik > Türev"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sınav Türü</label>
                       <select 
                         value={form.tur}
                         onChange={(e) => setForm({ ...form, tur: e.target.value })}
                         className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                       >
                          {ogretimTuruSecenekleri.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                       </select>
                    </div>

                    {!ustGrupKilitli && (
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Üst Grup (Opsiyonel)</label>
                         <select
                           value={form.parentId}
                           onChange={(e) => {
                             const parentId = e.target.value;
                             const ust = hamGruplar.find((g) => g.id === parentId);
                             setForm({
                               ...form,
                               parentId,
                               tur: ust ? (grupKonuOgretimTuru(ust) || ust.tur) : form.tur,
                             });
                           }}
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                         >
                           <option value="">(Ana Grup)</option>
                           {[...hamGruplar]
                             .sort((a, b) =>
                               (grupYollari.get(a.id) || a.ad).localeCompare(grupYollari.get(b.id) || b.ad, 'tr')
                             )
                             .map((g) => (
                               <option key={g.id} value={g.id}>
                                 {grupYollari.get(g.id) || g.ad}
                               </option>
                             ))}
                         </select>
                      </div>
                    )}

                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Açıklama</label>
                      <textarea 
                        value={form.aciklama}
                        onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                        placeholder="..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium h-24 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button onClick={() => { setYeniGrupForm(false); setUstGrupKilitli(false); }} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-2xl transition-all">İptal</button>
                     <button 
                       onClick={() => grupOlustur.mutate()}
                       disabled={!form.ad || grupOlustur.isPending}
                       className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-50"
                     >
                       {grupOlustur.isPending ? 'Oluşturuluyor...' : 'Grubu Kaydet'}
                     </button>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Gruplar Yükleniyor...</p>
          </div>
        ) : agacGruplar.length === 0 ? (
          <div className="bg-gray-50 rounded-3xl py-20 text-center border-2 border-dashed border-gray-200">
            <FolderOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-gray-400 font-bold">Henüz grup oluşturulmadı.</h3>
            <p className="text-gray-300 text-sm italic">Hemen "Yeni Ana Grup" butonuyla başlayın.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {agacGruplar.map(g => renderGrup(g))}
          </div>
        )}
      </div>

      {/* Bilgilendirme */}
      <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100 flex items-start gap-4">
        <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 shrink-0">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900">Soru Grubu Yapısı Hakkında</h4>
          <p className="text-xs text-blue-800 opacity-70 leading-relaxed mt-1">
            Sorularınızı ve sınavlarınızı organize etmek için hiyerarşik bir yapı kullanın. 
            Örneğin "YKS Hazırlık" ana grubunun altına "Matematik", "Türkçe" gibi alt gruplar; 
            onların da altına "Türev", "İntegral" gibi konu başlıkları ekleyebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
