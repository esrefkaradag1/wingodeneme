import { useCallback, useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { authHydrate, useAuthStore } from '../src/store/auth';
import { SplashBrand } from '../src/components/SplashBrand';
import { colors } from '../src/theme/colors';
import { bildirimDinleyicileriKur, pushTokenKaydet } from '../src/lib/push';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go / web’de yok say */
});

const MIN_SPLASH_MS = 1600;

function pushVeriyeGit(data: Record<string, unknown>) {
  const tur = String(data.tur || '');
  if (tur === 'duyuru' || data.duyuruId) {
    router.push('/duyurular');
    return;
  }
  if (tur.includes('siparis') || tur.includes('odeme')) {
    router.push('/(tabs)/profil');
    return;
  }
  if (tur.includes('sinav') || data.sinavId) {
    router.push('/(tabs)/sinavlar');
    return;
  }
  if (tur.includes('destek')) {
    router.push('/destek');
    return;
  }
}

export default function RootLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const [minSureBitti, setMinSureBitti] = useState(false);
  const [nativeGizlendi, setNativeGizlendi] = useState(false);

  useEffect(() => {
    void authHydrate();
    const t = setTimeout(() => setMinSureBitti(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Oturum açılınca push — UI oturduktan sonra izin diyaloğu çıksın
  useEffect(() => {
    if (!hydrated || !token) return;
    const t = setTimeout(() => {
      void pushTokenKaydet({ sessiz: false });
    }, 1200);
    const temizle = bildirimDinleyicileriKur({ onAcilis: pushVeriyeGit });
    return () => {
      clearTimeout(t);
      temizle();
    };
  }, [hydrated, token]);

  const hazir = hydrated && minSureBitti;

  const onSplashLayout = useCallback(async () => {
    if (nativeGizlendi) return;
    try {
      await SplashScreen.hideAsync();
    } catch {
      /* ignore */
    }
    setNativeGizlendi(true);
  }, [nativeGizlendi]);

  useEffect(() => {
    void onSplashLayout();
  }, [onSplashLayout]);

  if (!hazir) {
    return (
      <>
        <StatusBar style="dark" />
        <SplashBrand />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sinav/[id]" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="sonuc/[katilimId]" options={{ headerShown: false }} />
        <Stack.Screen name="takvim" />
        <Stack.Screen name="calisma-plani" />
        <Stack.Screen name="duyurular" />
        <Stack.Screen name="destek" />
        <Stack.Screen name="arkadaslar" />
        <Stack.Screen name="duello" />
        <Stack.Screen name="universite" />
        <Stack.Screen name="tercih-robotu" />
      </Stack>
    </>
  );
}
