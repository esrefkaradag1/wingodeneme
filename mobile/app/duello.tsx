import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiHataMesaji, listeyeCevir, sosyalApi } from '../src/api/client';
import { Card, EmptyState, Muted, PrimaryButton } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, radius, spacing } from '../src/theme/colors';

function adSoyad(o: any): string {
  if (!o) return 'Öğrenci';
  return [o.ad, o.soyad].filter(Boolean).join(' ') || 'Öğrenci';
}

export default function DuelloScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [arkadaslar, setArkadaslar] = useState<any[]>([]);
  const [davetler, setDavetler] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      const [a, d] = await Promise.allSettled([
        sosyalApi.arkadaslar(),
        sosyalApi.gelenDuellolar(),
      ]);
      if (a.status === 'fulfilled') setArkadaslar(listeyeCevir(a.value.data.veri));
      if (d.status === 'fulfilled') setDavetler(listeyeCevir(d.value.data.veri));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      yukle();
    }, [yukle]),
  );

  const meydanOku = async (id: string) => {
    setBusyId(id);
    try {
      await sosyalApi.duelloBaslat(id);
      Alert.alert('Davet gönderildi', 'Rakibin kabul ederse düello başlar.');
      yukle();
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e, 'Düello başlatılamadı'));
    } finally {
      setBusyId(null);
    }
  };

  const yanitla = async (id: string, kabul: boolean) => {
    setBusyId(id);
    try {
      await sosyalApi.duelloYanit(id, kabul);
      Alert.alert('Tamam', kabul ? 'Düello kabul edildi!' : 'Davet reddedildi.');
      yukle();
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader title="Düello Meydanı" subtitle="Arkadaşlarınla yarış" />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={arkadaslar}
          keyExtractor={(item, i) => item.id || String(i)}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: 10, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                yukle();
              }}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={{ gap: 12, marginBottom: 8 }}>
              <Card>
                <Text style={styles.howTitle}>Nasıl çalışır?</Text>
                <Muted>
                  Arkadaş listenden birine meydan oku. Gelen davetleri kabul veya reddet. Arkadaş
                  eklemek için Arkadaşlar sayfasını kullan.
                </Muted>
                <Pressable style={styles.linkRow} onPress={() => router.push('/arkadaslar')}>
                  <Text style={styles.link}>Arkadaşlar →</Text>
                </Pressable>
              </Card>

              {davetler.length > 0 ? (
                <Card>
                  <Text style={styles.section}>Gelen davetler</Text>
                  {davetler.map((d) => {
                    const o = d.daveteden || {};
                    return (
                      <View key={d.id} style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name}>{adSoyad(o)}</Text>
                          <Muted>Düello daveti</Muted>
                        </View>
                        <Pressable onPress={() => yanitla(d.id, true)}>
                          <Text style={styles.ok}>Kabul</Text>
                        </Pressable>
                        <Pressable onPress={() => yanitla(d.id, false)}>
                          <Text style={styles.no}>Red</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </Card>
              ) : null}

              <Text style={styles.section}>Hızlı meydan oku</Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="Arkadaş yok"
              desc="Önce arkadaş ekle, sonra düello başlat."
            />
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={18} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{adSoyad(item)}</Text>
                  <Muted>{item.okul || (item.puan != null ? `Puan ${item.puan}` : 'Rakip')}</Muted>
                </View>
                <PrimaryButton
                  label="Meydan Oku"
                  onPress={() => meydanOku(item.id)}
                  loading={busyId === item.id}
                />
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  howTitle: { fontWeight: '800', color: colors.text, marginBottom: 6 },
  section: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8 },
  linkRow: { marginTop: 10 },
  link: { color: colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ok: { color: colors.success, fontWeight: '800', padding: 8 },
  no: { color: colors.danger, fontWeight: '800', padding: 8 },
});
