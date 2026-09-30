import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Kullanici } from '../lib/types';
import type { PlatformMode } from '../lib/config';
import { DEFAULT_PLATFORM } from '../lib/config';

const STORAGE_KEY = 'wingo-auth-v1';

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  kullanici: Kullanici | null;
  platformMode: PlatformMode;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  girisYap: (p: { token: string; refreshToken: string; kullanici: Kullanici }) => void;
  setTokens: (token: string, refreshToken: string) => void;
  setKullanici: (kullanici: Kullanici) => void;
  setPlatformMode: (mode: PlatformMode) => void;
  cikisYap: () => void;
};

async function kaydet(partial: Partial<AuthState>) {
  const mevcut = useAuthStore.getState();
  const veri = {
    token: partial.token !== undefined ? partial.token : mevcut.token,
    refreshToken: partial.refreshToken !== undefined ? partial.refreshToken : mevcut.refreshToken,
    kullanici: partial.kullanici !== undefined ? partial.kullanici : mevcut.kullanici,
    platformMode: partial.platformMode !== undefined ? partial.platformMode : mevcut.platformMode,
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(veri));
  } catch {
    /* ignore */
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  kullanici: null,
  platformMode: DEFAULT_PLATFORM,
  hydrated: false,
  setHydrated: (v) => set({ hydrated: v }),
  girisYap: ({ token, refreshToken, kullanici }) => {
    // Giriş anındaki platformMode oturuma kilitlenir (profilde değiştirilemez)
    const platformMode = useAuthStore.getState().platformMode;
    set({ token, refreshToken, kullanici, platformMode });
    void kaydet({ token, refreshToken, kullanici, platformMode });
  },
  setTokens: (token, refreshToken) => {
    set({ token, refreshToken });
    void kaydet({ token, refreshToken });
  },
  setKullanici: (kullanici) => {
    set({ kullanici });
    void kaydet({ kullanici });
  },
  setPlatformMode: (platformMode) => {
    // Oturum açıkken mod değiştirilemez — yalnızca giriş ekranında
    if (useAuthStore.getState().token) return;
    set({ platformMode });
    void kaydet({ platformMode });
  },
  cikisYap: () => {
    const eskiToken = useAuthStore.getState().token;
    set({ token: null, refreshToken: null, kullanici: null });
    void kaydet({ token: null, refreshToken: null, kullanici: null });
    void import('../lib/push')
      .then((m) => m.pushTokenTemizle(eskiToken))
      .catch(() => undefined);
  },
}));

/** Uygulama açılışında AsyncStorage’dan oturumu yükle */
export async function authHydrate() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const veri = JSON.parse(raw) as {
        token?: string | null;
        refreshToken?: string | null;
        kullanici?: Kullanici | null;
        platformMode?: PlatformMode;
      };
      useAuthStore.setState({
        token: veri.token ?? null,
        refreshToken: veri.refreshToken ?? null,
        kullanici: veri.kullanici ?? null,
        platformMode: veri.platformMode ?? DEFAULT_PLATFORM,
      });
    }
  } catch {
    /* ignore */
  } finally {
    useAuthStore.getState().setHydrated(true);
  }
}
