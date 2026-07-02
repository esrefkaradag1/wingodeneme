import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Kullanici {
  id: string;
  email: string;
  rol: string;
  ad?: string;
  soyad?: string;
  avatarUrl?: string;
  /** Yalnızca TEACHER rolü için (virgülle birleştirilmiş) */
  brans?: string;
  /** TEACHER için ayrıştırılmış branş listesi */
  branslar?: string[];
  /** Matematik → ['Matematik','Geometri'] vb. */
  izinliDersler?: string[];
  /** Öğrenci ve öğretmen için kademe (YKS / LGS) */
  ogretimTuru?: 'YKS' | 'LGS';
}

interface AuthStore {
  kullanici: Kullanici | null;
  token: string | null;
  refreshToken: string | null;
  /** kullanici verilmezse mevcut kullanıcı korunur (token yenileme gibi akışlarda) */
  girisYap: (oturum: { kullanici?: Kullanici; token?: string; refreshToken?: string }) => void;
  cikisYap: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      kullanici: null,
      token: null,
      refreshToken: null,
      girisYap: (oturum) =>
        set((prev) => ({
          kullanici: oturum.kullanici ?? prev.kullanici,
          token: oturum.token ?? prev.token ?? null,
          refreshToken: oturum.refreshToken ?? prev.refreshToken ?? null,
        })),
      cikisYap: () => set({ kullanici: null, token: null, refreshToken: null }),
    }),
    { name: 'wingo-auth' }
  )
);

export function oturumTemizle(): void {
  useAuthStore.getState().cikisYap();
}
