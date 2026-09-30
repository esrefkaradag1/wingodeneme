import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi, apiHataMesaji } from '../../src/api/client';
import { useAuthStore } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme/colors';
import type { PlatformMode } from '../../src/lib/config';

const LIM10_URL = 'https://lim10soft.com.tr';

export default function LoginScreen() {
  const token = useAuthStore((s) => s.token);
  const girisYap = useAuthStore((s) => s.girisYap);
  const platformMode = useAuthStore((s) => s.platformMode);
  const setPlatformMode = useAuthStore((s) => s.setPlatformMode);

  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreGoster, setSifreGoster] = useState(false);
  const [loading, setLoading] = useState(false);

  if (token) return <Redirect href="/(tabs)" />;

  const onGiris = async () => {
    if (!email.trim() || !sifre) {
      Alert.alert('Eksik bilgi', 'E-posta ve şifre gerekli.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.giris(email.trim().toLowerCase(), sifre);
      const { token: t, refreshToken, kullanici } = data.veri;
      girisYap({ token: t, refreshToken, kullanici });
      setTimeout(() => {
        void import('../../src/lib/push').then((m) => m.pushTokenKaydet({ sessiz: false }));
      }, 800);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Giriş başarısız', apiHataMesaji(e, 'E-posta veya şifre hatalı'));
    } finally {
      setLoading(false);
    }
  };

  const modes: { id: PlatformMode; label: string }[] = [
    { id: 'yks_lgs', label: 'YKS / LGS' },
    { id: 'kpss', label: 'KPSS' },
  ];

  return (
    <View style={styles.root}>
      {/* Soft atmospheric blobs — WorkWave tarzı hafif arka plan */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={['#EEF6FF', '#F7FBFA', '#F3FFFB']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.blob, styles.blobTop]} />
        <View style={[styles.blob, styles.blobMid]} />
        <View style={[styles.blob, styles.blobBottom]} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.wrap}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Image
                source={require('../../assets/wingodeneme-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.headline}>WingoDeneme’ye hoş geldin</Text>
              <Text style={styles.tagline}>Deneme çöz, analiz gör, hedefine ilerle</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.sectionLabel}>Platform</Text>
              <View style={styles.modeRow}>
                {modes.map((m) => {
                  const aktif = platformMode === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setPlatformMode(m.id)}
                      style={[styles.modeChip, aktif && styles.modeChipOn]}
                    >
                      <Text style={[styles.modeText, aktif && styles.modeTextOn]}>{m.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>E-posta</Text>
              <View style={styles.inputShell}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ornek@email.com"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>

              <Text style={styles.fieldLabel}>Şifre</Text>
              <View style={styles.inputShell}>
                <TextInput
                  secureTextEntry={!sifreGoster}
                  value={sifre}
                  onChangeText={setSifre}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, { paddingRight: 48 }]}
                />
                <Pressable
                  onPress={() => setSifreGoster((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={10}
                  accessibilityLabel={sifreGoster ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  <Ionicons
                    name={sifreGoster ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94A3B8"
                  />
                </Pressable>
              </View>

              <Pressable
                onPress={onGiris}
                disabled={loading}
                style={({ pressed }) => [
                  styles.loginBtn,
                  (loading || pressed) && { opacity: 0.88 },
                ]}
              >
                <LinearGradient
                  colors={['#14B8A6', '#0D9488']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.loginBtnGrad}
                >
                  {loading ? (
                    <Text style={styles.loginBtnText}>Giriş yapılıyor…</Text>
                  ) : (
                    <Text style={styles.loginBtnText}>Giriş Yap</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerHint}>Geliştiren</Text>
              <Pressable
                onPress={() => void Linking.openURL(LIM10_URL)}
                hitSlop={12}
                style={({ pressed }) => [styles.lim10Hit, pressed && { opacity: 0.7 }]}
                accessibilityRole="link"
                accessibilityLabel="lim10soft web sitesi"
              >
                <Image
                  source={require('../../assets/lim10soft-logo.png')}
                  style={styles.lim10Logo}
                  resizeMode="contain"
                />
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FBFA' },
  wrap: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.55,
  },
  blobTop: {
    width: 220,
    height: 220,
    top: -60,
    right: -40,
    backgroundColor: '#BFDBFE',
  },
  blobMid: {
    width: 180,
    height: 180,
    top: 180,
    left: -70,
    backgroundColor: '#A7F3D0',
  },
  blobBottom: {
    width: 160,
    height: 160,
    bottom: 80,
    right: -30,
    backgroundColor: '#FBCFE8',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 128,
    height: 128,
    marginBottom: 16,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2F2B',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 8,
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  form: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 2,
  },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  modeChip: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  modeChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  modeText: { fontWeight: '600', color: '#64748B', fontSize: 13 },
  modeTextOn: { color: colors.primaryDark },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  inputShell: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF2',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0F2F2B',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  loginBtn: {
    marginTop: 14,
    borderRadius: radius.full,
    overflow: 'hidden',
    shadowColor: '#0D9488',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  loginBtnGrad: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  footerHint: {
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  lim10Hit: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  lim10Logo: {
    width: 132,
    height: 38,
  },
});
