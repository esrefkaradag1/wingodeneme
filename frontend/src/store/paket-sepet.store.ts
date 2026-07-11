import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function sinavIdListesiAyni(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

interface PaketSepetStore {
  paketId: string | null;
  paketAd: string | null;
  seciliSinavIds: string[];
  kaydet: (paketId: string, sinavIds: string[], paketAd?: string) => void;
  cikar: (sinavId: string) => void;
  temizle: () => void;
}

export const usePaketSepetStore = create<PaketSepetStore>()(
  persist(
    (set) => ({
      paketId: null,
      paketAd: null,
      seciliSinavIds: [],
      kaydet: (paketId, sinavIds, paketAd) =>
        set((state) => {
          const ids = [...new Set(sinavIds.filter(Boolean))];
          const ad = paketAd?.trim() || null;
          if (
            state.paketId === paketId &&
            state.paketAd === ad &&
            sinavIdListesiAyni(state.seciliSinavIds, ids)
          ) {
            return state;
          }
          return { paketId, paketAd: ad, seciliSinavIds: ids };
        }),
      cikar: (sinavId) =>
        set((state) => {
          const yeni = state.seciliSinavIds.filter((id) => id !== sinavId);
          if (yeni.length === 0) {
            return { paketId: null, paketAd: null, seciliSinavIds: [] };
          }
          return { ...state, seciliSinavIds: yeni };
        }),
      temizle: () => set({ paketId: null, paketAd: null, seciliSinavIds: [] }),
    }),
    { name: 'wingo-paket-sepet' }
  )
);
