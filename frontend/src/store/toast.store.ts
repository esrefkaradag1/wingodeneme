import { create } from 'zustand';

interface Toast {
  id: string;
  tur: 'success' | 'error' | 'warning' | 'info';
  mesaj: string;
  baslik?: string;
  sure?: number;
}

interface ToastStore {
  toastlar: Toast[];
  ekle: (toast: Omit<Toast, 'id'>) => void;
  kaldır: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toastlar: [],
  ekle: (toast) =>
    set((state) => ({
      toastlar: [...state.toastlar, { ...toast, id: Date.now().toString() }],
    })),
  kaldır: (id) =>
    set((state) => ({ toastlar: state.toastlar.filter((t) => t.id !== id) })),
}));

export const toast = {
  basarili: (mesaj: string, baslik?: string) =>
    useToastStore.getState().ekle({ tur: 'success', mesaj, baslik }),
  hata: (mesaj: string, baslik?: string) =>
    useToastStore.getState().ekle({ tur: 'error', mesaj, baslik }),
  uyari: (mesaj: string, baslik?: string) =>
    useToastStore.getState().ekle({ tur: 'warning', mesaj, baslik }),
  bilgi: (mesaj: string, baslik?: string) =>
    useToastStore.getState().ekle({ tur: 'info', mesaj, baslik }),
  /** İngilizce alias — basarili/hata ile aynı */
  success: (mesaj: string, baslik?: string) =>
    useToastStore.getState().ekle({ tur: 'success', mesaj, baslik }),
  error: (mesaj: string, baslik?: string) =>
    useToastStore.getState().ekle({ tur: 'error', mesaj, baslik }),
};
