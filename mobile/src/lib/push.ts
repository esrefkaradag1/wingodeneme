import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { kullaniciApi } from '../api/client';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  /* web / unsupported */
}

export type PushDurum = {
  izin: Notifications.PermissionStatus | 'unavailable';
  token: string | null;
  neden?: string;
};

function projeId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return (
    Constants.easConfig?.projectId ||
    extra?.eas?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    // app.json fallback (Constants bazen Expo Go’da gecikebilir)
    'e341a9f1-59e7-42be-9214-9c1cc779de24'
  );
}

/** Sistem bildirim iznini iste (simülatörde de diyalog çıkar) */
export async function pushIzinIste(): Promise<Notifications.PermissionStatus | 'unavailable'> {
  if (Platform.OS === 'web') return 'unavailable';

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'WingoDeneme',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0D9488',
      });
    }

    const mevcut = await Notifications.getPermissionsAsync();
    if (mevcut.granted) {
      return mevcut.status;
    }

    // undetermined / denied → tekrar iste (iOS denied ise diyalog çıkmayabilir)
    const sonuc = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: false,
      },
    });
    return sonuc.status;
  } catch {
    return 'unavailable';
  }
}

export async function pushTokenAl(): Promise<PushDurum> {
  if (Platform.OS === 'web') {
    return { izin: 'unavailable', token: null, neden: 'Web’de push yok' };
  }

  const izin = await pushIzinIste();
  if (izin !== 'granted') {
    return {
      izin,
      token: null,
      neden:
        izin === 'denied'
          ? 'Bildirim izni kapalı. Ayarlardan Expo Go / WingoDeneme için bildirimleri aç.'
          : 'Bildirim izni alınamadı',
    };
  }

  if (!Device.isDevice) {
    return {
      izin,
      token: null,
      neden: 'Push token yalnızca fiziksel cihazda alınır (simülatörde izin diyaloğu çıkar, token gelmez).',
    };
  }

  try {
    const id = projeId();
    const tokenYanit = await Notifications.getExpoPushTokenAsync(
      id ? { projectId: id } : undefined,
    );
    return { izin, token: tokenYanit.data || null };
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : 'Token alınamadı';
    return {
      izin,
      token: null,
      neden: `Expo push token hatası: ${mesaj}. EAS projectId gerekebilir.`,
    };
  }
}

/** Giriş sonrası token’ı backend’e yaz */
export async function pushTokenKaydet(opts?: { sessiz?: boolean }): Promise<PushDurum> {
  const durum = await pushTokenAl();
  if (durum.token) {
    try {
      await kullaniciApi.pushTokenKaydet(durum.token);
    } catch {
      durum.neden = 'Token alındı ama sunucuya kaydedilemedi';
    }
  } else if (!opts?.sessiz && durum.neden) {
    // Kullanıcıya görünür geri bildirim (ilk kurulum)
    if (durum.izin === 'denied') {
      Alert.alert('Bildirimler kapalı', durum.neden, [
        { text: 'Tamam', style: 'cancel' },
        {
          text: 'Ayarlar',
          onPress: () => {
            void Linking.openSettings();
          },
        },
      ]);
    }
  }
  return durum;
}

/** Profil’den manuel tetikleme */
export async function pushBildirimleriAc(): Promise<void> {
  const durum = await pushTokenKaydet({ sessiz: true });
  if (durum.token) {
    Alert.alert('Hazır', 'Bildirimler açıldı. Duyuru ve hatırlatmalar bu cihaza gelecek.');
    return;
  }
  if (durum.izin === 'denied') {
    Alert.alert('İzin gerekli', durum.neden || 'Bildirim iznini Ayarlar’dan aç.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Ayarlar', onPress: () => void Linking.openSettings() },
    ]);
    return;
  }
  Alert.alert('Kurulamadı', durum.neden || 'Push token alınamadı.');
}

export async function pushTokenTemizle(authToken?: string | null): Promise<void> {
  try {
    if (authToken) {
      const { API_BASE_URL } = await import('./config');
      const axios = (await import('axios')).default;
      await axios.delete(`${API_BASE_URL}/kullanicilar/push-token`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return;
    }
    await kullaniciApi.pushTokenTemizle();
  } catch {
    /* ignore */
  }
}

export function bildirimDinleyicileriKur(opts: {
  onAcilis?: (data: Record<string, unknown>) => void;
}) {
  const alindi = Notifications.addNotificationReceivedListener(() => {});
  const yanit = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data || {}) as Record<string, unknown>;
    opts.onAcilis?.(data);
  });
  return () => {
    alindi.remove();
    yanit.remove();
  };
}
