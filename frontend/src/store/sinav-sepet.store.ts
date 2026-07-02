import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SepetSinav = {
  id: string;
  baslik: string;
  tur: string;
  baslangicZamani: string;
  gosterilenFiyat: number;
};

interface SinavSepetStore {
  urunler: SepetSinav[];
  ekle: (urun: SepetSinav) => void;
  cikar: (id: string) => void;
  temizle: () => void;
  sepetteMi: (id: string) => boolean;
}

export const useSinavSepetStore = create<SinavSepetStore>()(
  persist(
    (set, get) => ({
      urunler: [],
      ekle: (urun) =>
        set((state) => {
          if (state.urunler.some((u) => u.id === urun.id)) return state;
          return { urunler: [...state.urunler, urun] };
        }),
      cikar: (id) => set((state) => ({ urunler: state.urunler.filter((u) => u.id !== id) })),
      temizle: () => set({ urunler: [] }),
      sepetteMi: (id) => get().urunler.some((u) => u.id === id),
    }),
    { name: 'wingo-sinav-sepet' }
  )
);

export function sepetToplamTutar(urunler: SepetSinav[]): number {
  return urunler.reduce((t, u) => t + (u.gosterilenFiyat || 0), 0);
}
