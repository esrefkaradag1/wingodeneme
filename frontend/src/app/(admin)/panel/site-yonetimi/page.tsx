'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { VARSAYILAN_SITE_ICERIK, type SiteGenelIcerik } from '@/lib/site-icerik-defaults';
import { confirmAsk } from '@/store/confirm-dialog.store';
import Link from 'next/link';
import { SiteIcerikFormu, type SiteIcerikFormRef } from '@/components/admin/SiteIcerikFormu';
import { 
  Save, 
  RotateCcw, 
  Eye, 
  Settings2, 
  Layout, 
  Monitor, 
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SiteYonetimiPage() {
  const queryClient = useQueryClient();
  const formRef = useRef<SiteIcerikFormRef>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-site-icerik'],
    queryFn: async () => {
      const r = await api.get<{ basarili: boolean; veri: SiteGenelIcerik }>('/admin/site-icerik');
      return r.data.veri;
    },
  });

  useEffect(() => {
    if (!isLoading) setYukleniyor(false);
  }, [isLoading]);

  useEffect(() => {
    if (isError) {
      setYukleniyor(false);
      toast.hata('Site içeriği yüklenemedi. Giriş yaptığınızdan ve API’nin açık olduğundan emin olun.');
    }
  }, [isError]);

  const kaydet = useMutation({
    mutationFn: async (icerik: SiteGenelIcerik) => {
      const r = await api.put<{ basarili: boolean; veri: SiteGenelIcerik }>('/admin/site-icerik', icerik);
      return r.data.veri;
    },
    onSuccess: (veri) => {
      queryClient.setQueryData(['admin-site-icerik'], veri);
      queryClient.invalidateQueries({ queryKey: ['public-site-icerik'] });
      toast.basarili('Site içeriği başarıyla güncellendi.');
    },
    onError: () => toast.hata('Kayıt sırasında bir hata oluştu.'),
  });

  const handleKaydet = () => {
    const icerik = formRef.current?.getIcerik();
    if (!icerik) {
      toast.hata('Form verileri alınamadı.');
      return;
    }
    kaydet.mutate(icerik);
  };

  const handleSifirla = async () => {
    const ok = await confirmAsk({
      title: 'Fabrika Ayarlarına Dön',
      message: 'Tüm özelleştirmeleriniz silinecek ve site varsayılan taslağına dönecektir. Onaylıyor musunuz?',
      variant: 'destructive',
    });
    if (!ok) return;
    kaydet.mutate({} as SiteGenelIcerik);
  };

  const handleOrnekYukle = () => {
    queryClient.setQueryData(['admin-site-icerik'], derinKopya(VARSAYILAN_SITE_ICERIK as SiteGenelIcerik));
    toast.bilgi('Varsayılan metinler yüklendi. Kalıcı olması için "Değişiklikleri Uygula" demelisiniz.');
  };

  if (isLoading && yukleniyor) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">CMS Hazırlanıyor...</p>
      </div>
    );
  }

  return (
    <div className="relative pb-24">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Settings2 className="w-5 h-5" />
             </div>
             <h1 className="text-2xl font-bold text-gray-900">Site İçerik Yönetimi</h1>
          </div>
          <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-2xl">
            Sitenizin ana sayfası, menüleri ve genel metinlerini buradan canlı olarak yönetebilirsiniz. 
            Değişiklikler anında veritabanına kaydedilir.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            target="_blank" 
            className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Eye className="w-4 h-4" /> Önizleme
          </Link>
          <button
            onClick={handleKaydet}
            disabled={kaydet.isPending}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
          >
            {kaydet.isPending ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {kaydet.isPending ? 'Uygulanıyor...' : 'Değişiklikleri Uygula'}
          </button>
        </div>
      </div>

      {/* Main CMS Interface */}
      <div className="grid grid-cols-1 gap-10">
         <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">İçerik Editörü • v2.0</span>
               </div>
               <div className="flex items-center gap-3">
                  <button onClick={handleOrnekYukle} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter">
                     Varsayılan Taslağı Yükle
                  </button>
                  <div className="w-px h-3 bg-gray-200" />
                  <button onClick={handleSifirla} className="text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-tighter">
                     Sıfırla
                  </button>
               </div>
            </div>

            <div className="p-8 flex-1">
               <SiteIcerikFormu ref={formRef} baslangic={data ?? null} />
            </div>
         </div>
      </div>

      {/* Floating Info */}
      <div className="mt-8 p-6 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-4">
         <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <Info className="w-5 h-5" />
         </div>
         <div className="space-y-1">
            <h4 className="text-sm font-bold text-indigo-900">Profesyonel İpucu</h4>
            <p className="text-xs text-indigo-700 font-medium leading-relaxed opacity-80">
              İkon alanlarında **Lucide React** kütüphanesindeki ikon adlarını kullanabilirsiniz (ör: `Sparkles`, `Brain`, `Layout`). 
              Büyük-küçük harf duyarlılığına dikkat ediniz. Kayıt işleminden sonra ana sayfanızı yenileyerek değişiklikleri görebilirsiniz.
            </p>
         </div>
      </div>
    </div>
  );
}

function derinKopya<T>(kaynak: T): T {
  return JSON.parse(JSON.stringify(kaynak)) as T;
}
