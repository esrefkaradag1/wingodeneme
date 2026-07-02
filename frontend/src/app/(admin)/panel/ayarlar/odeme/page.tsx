'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { 
  CreditCard, 
  Save, 
  Lock, 
  Key, 
  Globe, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { IyzicoKriterChecklist } from '@/components/admin/IyzicoKriterChecklist';

interface OdemeAyarlari {
  IYZICO_API_KEY: string;
  IYZICO_SECRET_KEY: string;
  IYZICO_BASE_URL: string;
  IYZICO_ENABLED: boolean;
  PAYMENT_MODE: 'LIVE' | 'SANDBOX';
}

export default function OdemeAyarlariPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OdemeAyarlari>({
    IYZICO_API_KEY: '',
    IYZICO_SECRET_KEY: '',
    IYZICO_BASE_URL: 'https://sandbox-api.iyzipay.com',
    IYZICO_ENABLED: false,
    PAYMENT_MODE: 'SANDBOX',
  });

  const { isLoading } = useQuery({
    queryKey: ['admin-odeme-ayarlari'],
    queryFn: async () => {
      const r = await api.get<{ basarili: boolean; veri: OdemeAyarlari }>('/admin/ayarlar/odeme');
      setForm(r.data.veri);
      return r.data.veri;
    },
  });

  const guncelle = useMutation({
    mutationFn: async (yeniAyarlar: OdemeAyarlari) => {
      const r = await api.put('/admin/ayarlar/odeme', yeniAyarlar);
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-odeme-ayarlari'] });
      toast.basarili('Ödeme ayarları başarıyla güncellendi.');
    },
    onError: () => {
      toast.hata('Ayarlar kaydedilirken bir hata oluştu.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    guncelle.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Ödeme Yöntemleri ve API Ayarları</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Sistemdeki ödeme sağlayıcılarını (Iyzico vb.) buradan yapılandırabilirsiniz. 
          Lütfen API anahtarlarınızı gizli tutun.
        </p>
      </div>

      <IyzicoKriterChecklist />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Iyzico Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100 font-bold">
                iY
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Iyzico Entegrasyonu</h3>
                <p className="text-xs text-gray-400">Güvenli ödeme altyapısı</p>
              </div>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={form.IYZICO_ENABLED}
                onChange={(e) => setForm({ ...form, IYZICO_ENABLED: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-900">Aktif</span>
            </label>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-3 h-3" /> API Key
                </label>
                <input 
                  type="text"
                  value={form.IYZICO_API_KEY}
                  onChange={(e) => setForm({ ...form, IYZICO_API_KEY: e.target.value })}
                  placeholder="sandbox-... veya live-..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Secret Key
                </label>
                <input 
                  type="password"
                  value={form.IYZICO_SECRET_KEY}
                  onChange={(e) => setForm({ ...form, IYZICO_SECRET_KEY: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Base URI
                </label>
                <input 
                  type="text"
                  value={form.IYZICO_BASE_URL}
                  onChange={(e) => setForm({ ...form, IYZICO_BASE_URL: e.target.value })}
                  placeholder="https://sandbox-api.iyzipay.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> Çalışma Modu
                </label>
                <select 
                  value={form.PAYMENT_MODE}
                  onChange={(e) => setForm({ ...form, PAYMENT_MODE: e.target.value as 'LIVE' | 'SANDBOX' })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                >
                  <option value="SANDBOX">Sandbox (Test Ortamı)</option>
                  <option value="LIVE">Live (Gerçek Ödemeler)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex gap-3 italic">
              <Zap className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700">
                Sandbox ortamında test kartlarını kullanabilirsiniz. Gerçek ödemeler için 'Live' moduna geçmeli ve iyzico panelinizden aldığınız canlı anahtarları girmelisiniz.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Info Box */}
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-900">Dikkat</h4>
            <p className="text-xs text-amber-800 opacity-80 leading-relaxed">
              Ödeme ayarları kritik sistem ayarlarıdır. Yanlış yapılandırma durumunda öğrencilerin paket satın alması engellenebilir. 
              API anahtarlarını girdikten sonra sistemin çalıştığından emin olmak için bir test satın alımı yapmanız önerilir.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button 
            type="button"
            className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-bold hover:bg-gray-50 transition-all"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-odeme-ayarlari'] })}
          >
            Değişiklikleri İptal Et
          </button>
          <button 
            type="submit"
            disabled={guncelle.isPending}
            className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-50"
          >
            {guncelle.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Ayarları Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
