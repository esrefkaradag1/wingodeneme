'use client';

import * as Toast from '@radix-ui/react-toast';
import { useToastStore } from '@/store/toast.store';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ikonlar = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

export function Toaster() {
  const { toastlar, kaldır } = useToastStore();

  return (
    <Toast.Provider swipeDirection="right">
      {toastlar.map((toast) => (
        <Toast.Root
          key={toast.id}
          className="bg-white rounded-lg shadow-lg border border-gray-100 p-4 flex items-start gap-3 max-w-sm animate-slide-up"
          open={true}
          onOpenChange={() => kaldır(toast.id)}
          duration={toast.sure || 4000}
        >
          {ikonlar[toast.tur]}
          <div className="flex-1 min-w-0">
            {toast.baslik && (
              <Toast.Title className="font-semibold text-gray-900 text-sm">{toast.baslik}</Toast.Title>
            )}
            <Toast.Description className="text-gray-600 text-sm mt-0.5">{toast.mesaj}</Toast.Description>
          </div>
          <Toast.Close className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-4 h-4" />
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 z-[100] w-96 max-w-[100vw-32px]" />
    </Toast.Provider>
  );
}
