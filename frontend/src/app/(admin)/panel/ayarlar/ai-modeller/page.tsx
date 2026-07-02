'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { Brain, RefreshCw, Save, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { OpenRouterModelKayit } from '@/lib/openrouterModeller';

interface ModelAyar {
  sonSenkron: string | null;
  openrouterToplam: number;
  modeller: OpenRouterModelKayit[];
}

export default function AiModellerAyarlariPage() {
  const qc = useQueryClient();
  const [arama, setArama] = useState('');
  const [modeller, setModeller] = useState<OpenRouterModelKayit[]>([]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-ai-modeller'],
    queryFn: async () => {
      const r = await api.get<{ basarili: boolean; veri: ModelAyar }>('/admin/ai-modeller');
      setModeller(r.data.veri.modeller || []);
      return r.data.veri;
    },
  });

  const senkronize = useMutation({
    mutationFn: async () => {
      const r = await api.post<{ basarili: boolean; mesaj?: string; veri: ModelAyar }>(
        '/admin/ai-modeller/senkronize',
        {},
        { timeout: 120000 },
      );
      return r.data;
    },
    onSuccess: (yanit) => {
      setModeller(yanit.veri.modeller || []);
      qc.invalidateQueries({ queryKey: ['admin-ai-modeller'] });
      qc.invalidateQueries({ queryKey: ['ai-panel-modeller'] });
      toast.basarili(yanit.mesaj || 'OpenRouter modelleri güncellendi.');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj
        || 'Senkronizasyon başarısız. OPENROUTER_API_KEY kontrol edin.';
      toast.hata(msg);
    },
  });

  const kaydet = useMutation({
    mutationFn: async () => {
      const r = await api.put<{ basarili: boolean; mesaj?: string }>('/admin/ai-modeller', { modeller });
      return r.data;
    },
    onSuccess: (yanit) => {
      qc.invalidateQueries({ queryKey: ['admin-ai-modeller'] });
      qc.invalidateQueries({ queryKey: ['ai-panel-modeller'] });
      toast.basarili(yanit.mesaj || 'Panel model listesi kaydedildi.');
    },
    onError: () => toast.hata('Kayıt sırasında hata oluştu.'),
  });

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase();
    if (!q) return modeller;
    return modeller.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.ad.toLowerCase().includes(q) ||
        m.aciklama.toLowerCase().includes(q),
    );
  }, [modeller, arama]);

  const paneldeGosterilen = modeller.filter((m) => m.paneldeGoster).length;

  const togglePanel = (id: string) => {
    setModeller((prev) =>
      prev.map((m) => (m.id === id ? { ...m, paneldeGoster: !m.paneldeGoster } : m)),
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-fuchsia-100 text-fuchsia-700 rounded-xl">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">AI Model Ayarları</h1>
            <p className="text-sm text-gray-500">
              OpenRouter&apos;dan güncel modelleri çekin; öğretmen panelinde hangilerinin görüneceğini seçin.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Son senkron</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">
            {data?.sonSenkron ? new Date(data.sonSenkron).toLocaleString('tr-TR') : 'Henüz yapılmadı'}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OpenRouter katalog</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">{data?.openrouterToplam || 0} model</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Panelde gösterilen</p>
          <p className="mt-1 text-sm font-semibold text-emerald-700">{paneldeGosterilen} model</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => senkronize.mutate()}
          disabled={senkronize.isPending}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-fuchsia-600 text-white font-bold text-sm hover:bg-fuchsia-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${senkronize.isPending ? 'animate-spin' : ''}`} />
          OpenRouter&apos;dan Güncelle
        </button>
        <button
          type="button"
          onClick={() => kaydet.mutate()}
          disabled={kaydet.isPending}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Panel Seçimlerini Kaydet
        </button>
        {isFetching && !isLoading && (
          <span className="text-xs text-gray-400">Yükleniyor…</span>
        )}
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 flex gap-3 text-sm text-amber-900">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          «Güncelle» tüm uygun modelleri OpenRouter API&apos;sinden çeker. Yalnızca <b>Panelde göster</b> işaretli
          modeller AI Soru Üretimi ekranında listelenir. Önerilen modeller ilk senkronda otomatik işaretlenir.
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Model adı veya slug ara…"
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-white outline-none focus:border-fuchsia-400"
        />
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 text-left">
              <tr>
                <th className="px-4 py-3 font-bold text-gray-500">Panel</th>
                <th className="px-4 py-3 font-bold text-gray-500">Model</th>
                <th className="px-4 py-3 font-bold text-gray-500">OpenRouter slug</th>
                <th className="px-4 py-3 font-bold text-gray-500">Bağlam</th>
                <th className="px-4 py-3 font-bold text-gray-500">Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => togglePanel(m.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        m.paneldeGoster
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {m.paneldeGoster ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                      {m.paneldeGoster ? 'Göster' : 'Gizle'}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                    {m.ikon} {m.ad}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.id}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {m.contextLength ? `${Math.round(m.contextLength / 1000)}K` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-md">
                    <input
                      value={m.aciklama}
                      onChange={(e) =>
                        setModeller((prev) =>
                          prev.map((x) => (x.id === m.id ? { ...x, aciklama: e.target.value } : x)),
                        )
                      }
                      className="w-full px-2 py-1 rounded-lg border border-transparent hover:border-gray-200 focus:border-fuchsia-300 outline-none bg-transparent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtreli.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            Model bulunamadı. «OpenRouter&apos;dan Güncelle» ile kataloğu yükleyin.
          </div>
        )}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs text-gray-400 text-center"
      >
        Senkronizasyon OPENROUTER_API_KEY ile çalışır. Ücretli modeller için OpenRouter hesabınızda yeterli kredi olmalıdır.
      </motion.p>
    </div>
  );
}
