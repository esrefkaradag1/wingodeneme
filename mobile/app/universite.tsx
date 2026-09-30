import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { analizApi, apiHataMesaji, listeyeCevir, universiteApi } from '../src/api/client';
import { Badge, Card, EmptyState, Muted } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, radius, spacing } from '../src/theme/colors';

export default function UniversiteScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hedefler, setHedefler] = useState<any[]>([]);
  const [tahminler, setTahminler] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [sonuclar, setSonuclar] = useState<any[]>([]);
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [analiz, setAnaliz] = useState<any>(null);

  const yukle = useCallback(async () => {
    try {
      const [h, a] = await Promise.allSettled([
        universiteApi.hedeflerim(),
        analizApi.benim(),
      ]);
      let hedefListe: any[] = [];
      if (h.status === 'fulfilled') {
        hedefListe = listeyeCevir(h.value.data.veri);
        setHedefler(hedefListe);
      }
      let net: number | undefined;
      let siralama: number | undefined;
      if (a.status === 'fulfilled') {
        const v = a.value.data.veri;
        setAnaliz(v);
        net = v?.ortalamaNet ?? v?.ozet?.ortalamaNet;
        siralama = v?.enIyiSiralama ?? v?.ozet?.enIyiSiralama;
      }
      if (hedefListe.length > 0) {
        try {
          const params: Record<string, number> = {};
          if (net != null) params.net = Number(net);
          if (siralama != null) params.siralama = Number(siralama);
          const { data } = await universiteApi.tahmin(params);
          setTahminler(listeyeCevir(data.veri));
        } catch {
          setTahminler([]);
        }
      } else setTahminler([]);
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

  useEffect(() => {
    if (q.trim().length < 2) {
      setSonuclar([]);
      return;
    }
    const t = setTimeout(async () => {
      setAramaYukleniyor(true);
      try {
        const { data } = await universiteApi.ara({ q: q.trim() });
        setSonuclar(listeyeCevir(data.veri));
      } catch {
        setSonuclar([]);
      } finally {
        setAramaYukleniyor(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const ekle = async (bolumId: string) => {
    setBusyId(bolumId);
    try {
      await universiteApi.hedefEkle(bolumId, 1);
      Alert.alert('Eklendi', 'Hedef listene eklendi.');
      setQ('');
      setSonuclar([]);
      yukle();
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e));
    } finally {
      setBusyId(null);
    }
  };

  const tahminMap = new Map(
    tahminler.map((t) => [t.bolumId || t.bolum?.id, t]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader title="Üniversite Tercihi" subtitle="Hedef bölümlerin" />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={hedefler}
          keyExtractor={(item, i) => item.id || item.bolum?.id || String(i)}
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
              <Pressable style={styles.banner} onPress={() => router.push('/tercih-robotu')}>
                <Ionicons name="color-wand" size={18} color="#fff" />
                <Text style={styles.bannerText}>Tercih Robotu’na git</Text>
                <Ionicons name="chevron-forward" size={16} color="#fff" />
              </Pressable>

              {(analiz?.ortalamaNet != null || analiz?.ozet?.ortalamaNet != null) && (
                <Card>
                  <Muted>Analiz özeti</Muted>
                  <Text style={styles.stat}>
                    Net{' '}
                    {Number(analiz?.ortalamaNet ?? analiz?.ozet?.ortalamaNet).toFixed(1)}
                    {(analiz?.enIyiSiralama ?? analiz?.ozet?.enIyiSiralama) != null
                      ? ` · Sıra ${analiz?.enIyiSiralama ?? analiz?.ozet?.enIyiSiralama}`
                      : ''}
                  </Text>
                </Card>
              )}

              <Card>
                <Text style={styles.section}>Bölüm ara / ekle</Text>
                <View style={styles.searchRow}>
                  <Ionicons name="search" size={18} color={colors.textMuted} />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Üniversite veya bölüm"
                    placeholderTextColor={colors.textMuted}
                    style={styles.searchInput}
                  />
                  {aramaYukleniyor ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                </View>
                {sonuclar.map((u) => {
                  const bolumler = Array.isArray(u.bolumler) ? u.bolumler : [];
                  if (bolumler.length === 0) {
                    return (
                      <View key={u.id} style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name}>{u.ad || u.universiteAdi}</Text>
                          <Muted>{u.sehir || u.tur || ''}</Muted>
                        </View>
                      </View>
                    );
                  }
                  return bolumler.map((b: any) => (
                    <View key={b.id} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{b.bolumAdi || b.ad}</Text>
                        <Muted>
                          {[u.ad || u.kisaAd, b.sinavTuru, b.minSiralama ? `sıra ${b.minSiralama}` : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </Muted>
                      </View>
                      <Pressable
                        style={styles.addBtn}
                        onPress={() => ekle(b.id)}
                        disabled={busyId === b.id}
                      >
                        <Ionicons name="add" size={20} color="#fff" />
                      </Pressable>
                    </View>
                  ));
                })}
              </Card>

              <Text style={styles.section}>Hedeflerim ({hedefler.length})</Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState title="Hedef yok" desc="Ara ve + ile hedef bölüm ekle." />
          }
          renderItem={({ item }) => {
            const b = item.bolum || item;
            const uni = b.universite || {};
            const t = tahminMap.get(b.id || item.bolumId);
            return (
              <Card>
                <Text style={styles.name}>{b.bolumAdi || b.ad || 'Bölüm'}</Text>
                <Muted>
                  {[uni.ad || uni.kisaAd, b.sinavTuru, b.minSiralama ? `taban sıra ${b.minSiralama}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Muted>
                {t ? (
                  <View style={{ marginTop: 8 }}>
                    <Badge label={t.ihtimal || t.yuzde != null ? `%${t.yuzde}` : 'Tahmin'} />
                  </View>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    borderRadius: radius.lg,
    padding: 14,
  },
  bannerText: { flex: 1, color: '#fff', fontWeight: '800' },
  section: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8 },
  stat: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    backgroundColor: colors.bg,
    marginBottom: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.text, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
