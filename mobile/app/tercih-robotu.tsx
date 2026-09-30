import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiHataMesaji, listeyeCevir, universiteApi } from '../src/api/client';
import { Card, EmptyState, Muted, PrimaryButton } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, radius, spacing } from '../src/theme/colors';

const SEHIRLER = ['', 'İstanbul', 'Ankara', 'İzmir'];
const TURLER = [
  { v: '', l: 'Tümü' },
  { v: 'DEVLET', l: 'Devlet' },
  { v: 'VAKIF', l: 'Vakıf' },
];

export default function TercihRobotuScreen() {
  const [q, setQ] = useState('');
  const [sehir, setSehir] = useState('');
  const [tur, setTur] = useState('');
  const [minSiralama, setMinSiralama] = useState('');
  const [maxSiralama, setMaxSiralama] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sonuclar, setSonuclar] = useState<any[]>([]);
  const [hedefler, setHedefler] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const hedefIds = new Set(
    hedefler.map((h) => h.bolum?.id || h.bolumId || h.id).filter(Boolean),
  );

  const hedefleriYukle = useCallback(async () => {
    try {
      const { data } = await universiteApi.hedeflerim();
      setHedefler(listeyeCevir(data.veri));
    } catch {
      setHedefler([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      hedefleriYukle();
    }, [hedefleriYukle]),
  );

  const ara = async () => {
    setLoading(true);
    try {
      const { data } = await universiteApi.ara({
        q: q.trim() || undefined,
        sehir: sehir || undefined,
        universiteTuru: tur || undefined,
        minSiralama: minSiralama ? Number(minSiralama) : undefined,
        maxSiralama: maxSiralama ? Number(maxSiralama) : undefined,
      });
      const uniler = listeyeCevir(data.veri);
      const flat: any[] = [];
      for (const u of uniler) {
        const bolumler = Array.isArray(u.bolumler) ? u.bolumler : [];
        if (bolumler.length === 0) {
          flat.push({ ...u, _uni: u.ad, _bolumId: u.id, _bolumAdi: u.ad });
        } else {
          for (const b of bolumler) {
            flat.push({
              ...b,
              _uni: u.ad || u.kisaAd,
              _sehir: u.sehir,
              _bolumId: b.id,
              _bolumAdi: b.bolumAdi || b.ad,
            });
          }
        }
      }
      setSonuclar(flat);
    } catch (e) {
      setSonuclar([]);
      Alert.alert('Hata', apiHataMesaji(e, 'Arama yapılamadı'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleHedef = async (bolumId: string) => {
    setBusyId(bolumId);
    try {
      if (hedefIds.has(bolumId)) {
        await universiteApi.hedefSil(bolumId);
      } else {
        await universiteApi.hedefEkle(bolumId, 1);
      }
      await hedefleriYukle();
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader title="Tercih Robotu" subtitle="Filtrele ve hedefle" />
      <FlatList
        data={sonuclar}
        keyExtractor={(item, i) => item._bolumId || item.id || String(i)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: 10, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              ara();
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 8 }}>
            {hedefler.length > 0 ? (
              <Card>
                <Text style={styles.section}>Tercih havuzu ({hedefler.length})</Text>
                {hedefler.slice(0, 5).map((h) => (
                  <Text key={h.id || h.bolum?.id} style={styles.havuzItem} numberOfLines={1}>
                    • {h.bolum?.bolumAdi || h.bolum?.ad || 'Bölüm'} —{' '}
                    {h.bolum?.universite?.ad || h.bolum?.universite?.kisaAd || ''}
                  </Text>
                ))}
              </Card>
            ) : null}

            <Card>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Üniversite / bölüm ara"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                returnKeyType="search"
                onSubmitEditing={ara}
              />
              <Text style={styles.filterLabel}>Şehir</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {SEHIRLER.map((s) => (
                  <Pressable
                    key={s || 'all'}
                    style={[styles.chip, sehir === s && styles.chipOn]}
                    onPress={() => setSehir(s)}
                  >
                    <Text style={[styles.chipText, sehir === s && styles.chipTextOn]}>
                      {s || 'Tümü'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.filterLabel}>Tür</Text>
              <View style={styles.chipRow}>
                {TURLER.map((t) => (
                  <Pressable
                    key={t.v || 'all'}
                    style={[styles.chip, tur === t.v && styles.chipOn]}
                    onPress={() => setTur(t.v)}
                  >
                    <Text style={[styles.chipText, tur === t.v && styles.chipTextOn]}>{t.l}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.rangeRow}>
                <TextInput
                  value={minSiralama}
                  onChangeText={setMinSiralama}
                  placeholder="Min sıra"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  value={maxSiralama}
                  onChangeText={setMaxSiralama}
                  placeholder="Max sıra"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <PrimaryButton label="Sonuçları filtrele" onPress={ara} loading={loading} />
            </Card>

            <Text style={styles.section}>Sonuçlar</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <EmptyState title="Sonuç yok" desc="Filtreleyip ara." />
          )
        }
        renderItem={({ item }) => {
          const id = item._bolumId || item.id;
          const secili = hedefIds.has(id);
          return (
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item._bolumAdi || item.bolumAdi}</Text>
                  <Muted>
                    {[item._uni, item._sehir || item.sehir, item.sinavTuru, item.minSiralama]
                      .filter(Boolean)
                      .join(' · ')}
                  </Muted>
                </View>
                <Pressable
                  style={[styles.toggle, secili && styles.toggleOn]}
                  onPress={() => toggleHedef(id)}
                  disabled={busyId === id}
                >
                  <Ionicons
                    name={secili ? 'checkmark' : 'add'}
                    size={20}
                    color={secili ? '#fff' : colors.primaryDark}
                  />
                </Pressable>
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 6 },
  havuzItem: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.bg,
    fontSize: 15,
    marginBottom: 8,
  },
  filterLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    marginRight: 8,
  },
  chipOn: { backgroundColor: colors.primarySoft },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  chipTextOn: { color: colors.primaryDark },
  rangeRow: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  toggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.success },
});
