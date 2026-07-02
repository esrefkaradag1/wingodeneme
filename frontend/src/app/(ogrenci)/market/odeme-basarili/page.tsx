'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OdemeBasariliSayfasi() {
  const searchParams = useSearchParams();
  const siparisId = searchParams.get('siparisId');

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-8 text-center space-y-8 border-2 border-emerald-50"
      >
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-lg shadow-emerald-100">
           <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Ödeme Başarılı!</h1>
          <p className="text-gray-500 font-medium">Teşekkürler! Paketiniz başarıyla aktive edildi. Şimdi tüm özelliklerin tadını çıkarabilirsin.</p>
        </div>

        {siparisId && (
          <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sipariş No</span>
             <span className="text-sm font-black text-gray-900">#{siparisId.slice(-8).toUpperCase()}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
           <Link 
            href="/dashboard"
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
           >
            Kontrol Paneline Git <ArrowRight className="w-4 h-4" />
           </Link>
           <Link 
            href="/sinavlar"
            className="w-full py-4 bg-gray-50 text-gray-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95"
           >
            Sınavlarımı Görüntüle <ShoppingBag className="w-4 h-4" />
           </Link>
        </div>
      </motion.div>
    </div>
  );
}
