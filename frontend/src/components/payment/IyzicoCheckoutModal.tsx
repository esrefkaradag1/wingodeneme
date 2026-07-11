'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CreditCard, Loader2, X } from 'lucide-react';
import {
  cleanupIyzicoCheckoutScripts,
  IYZICO_CONTAINER_ID,
  injectIyzicoCheckoutForm,
} from '@/lib/iyzicoCheckout';

type IyzicoCheckoutModalProps = {
  open: boolean;
  checkoutForm: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
};

export function IyzicoCheckoutModal({
  open,
  checkoutForm,
  title = 'Güvenli Ödeme',
  subtitle,
  onClose,
}: IyzicoCheckoutModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [formHazir, setFormHazir] = useState(false);

  useLayoutEffect(() => {
    if (!open || !checkoutForm) {
      setFormHazir(false);
      if (containerRef.current) containerRef.current.innerHTML = '';
      return;
    }

    setFormHazir(false);
    let cancelled = false;

    const mount = () => {
      if (cancelled || !containerRef.current) return;
      const ok = injectIyzicoCheckoutForm(checkoutForm, IYZICO_CONTAINER_ID);
      if (ok) {
        setFormHazir(true);
      } else {
        window.setTimeout(mount, 50);
      }
    };

    const frame = window.requestAnimationFrame(mount);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [open, checkoutForm]);

  const handleClose = () => {
    cleanupIyzicoCheckoutScripts();
    if (containerRef.current) containerRef.current.innerHTML = '';
    setFormHazir(false);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && checkoutForm ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            onClick={handleClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="iyzico-checkout-title"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="iyzico-checkout-title" className="text-lg font-black text-gray-900 leading-tight">
                    {title}
                  </h2>
                  {subtitle ? (
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{subtitle}</p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
                aria-label="Ödeme penceresini kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative p-6 max-h-[75vh] overflow-y-auto">
              {!formHazir ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Ödeme formu yükleniyor...
                  </p>
                </div>
              ) : null}
              <div ref={containerRef} id={IYZICO_CONTAINER_ID} className="min-h-[420px]" />
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
