import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { listeyeCevir, sinavApi } from '../src/api/client';
import { Badge, Card, EmptyState, Muted, PrimaryButton } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, radius, spacing } from '../src/theme/colors';

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function gunKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function ayTakvimGunleri(yil: number, ay: number) {
  const ilk = new Date(yil, ay - 1, 1);
  const son = new Date(yil, ay, 0);
  const baslangicBos = (ilk.getDay() + 6) % 7; // Pazartesi=0
  const cells: (Date | null)[] = [];
  for (let i = 0; i < baslangicBos; i++) cells.push(null);
  for (let g = 1; g <= son.getDate(); g++) cells.push(new Date(yil, ay - 1, g));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function TakvimScreen() {
  const now = useMemo(() => new Date(), []);
  const [yil, setYil] = useState(now.getFullYear());
  const [ay, setAy] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sinavlar, setSinavlar] = useState<any[]>([]);
  const [secili, setSecili] = useState<any | null>(null);

  const yukle = useCallback(async () => {
    try {
      let data;
      try {
        ({ data } = await sinavApi.takvim(yil, ay));
      } catch {
        ({ data } = await sinavApi.publicTakvim(yil, ay));
      }
      setSinavlar(listeyeCevir(data.veri));
    } catch {
      try {
        const { data } = await sinavApi.liste();
        setSinavlar(listeyeCevir(data.veri));
      } catch {
        setSinavlar([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [yil, ay]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      yukle();
    }, [yukle]),
  );

  const byDay = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const s of sinavlar) {
      const t = s.baslangicZamani || s.tarih;
      if (!t) continue;
      const d = new Date(t);
      const k = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [sinavlar]);

  const cells = useMemo(() => ayTakvimGunleri(yil, ay), [yil, ay]);

  const oncekiAy = () => {
    if (ay === 1) {
      setAy(12);
      setYil((y) => y - 1);
    } else setAy((a) => a - 1);
  };
  const sonrakiAy = () => {
    if (ay === 12) {
      setAy(1);
      setYil((y) => y + 1);
    } else setAy((a) => a + 1);
  };

  const yaklasan = useMemo(() => {
    const t = Date.now();
    return [...sinavlar]
      .filter((s) => s.baslangicZamani && new Date(s.baslangicZamani).getTime() >= t - 86400000)
      .sort(
        (a, b) =>
          new Date(a.baslangicZamani).getTime() - new Date(b.baslangicZamani).getTime(),
      )
      .slice(0, 5);
  }, [sinavlar]);

  const sinavaGit = (s: any) => {
    setSecili(null);
    router.push(`/sinav/${s.id}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader title="Sınav Takvimi" subtitle={`${AYLAR[ay - 1]} ${yil}`} />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: 12, paddingBottom: 40 }}
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
        >
          <View style={styles.monthNav}>
            <Pressable onPress={oncekiAy} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </Pressable>
            <Text style={styles.monthTitle}>
              {AYLAR[ay - 1]} {yil}
            </Text>
            <Pressable onPress={sonrakiAy} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            </Pressable>
          </View>

          <Card>
            <View style={styles.weekRow}>
              {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((d) => (
                <Text key={d} style={styles.weekDay}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {cells.map((d, i) => {
                if (!d) return <View key={`e-${i}`} style={styles.cell} />;
                const k = gunKey(d);
                const events = byDay.get(k) || [];
                const bugun = gunKey(now) === k;
                return (
                  <Pressable
                    key={k}
                    style={[styles.cell, bugun && styles.cellToday]}
                    onPress={() => events[0] && setSecili(events[0])}
                  >
                    <Text style={[styles.dayNum, bugun && styles.dayNumToday]}>{d.getDate()}</Text>
                    {events.length > 0 ? (
                      <View style={styles.dot}>
                        <Text style={styles.dotText}>{events.length}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Text style={styles.section}>Yaklaşan sınavlar</Text>
          {yaklasan.length === 0 ? (
            <EmptyState title="Bu ayda yaklaşan sınav yok" />
          ) : (
            yaklasan.map((s) => (
              <Pressable key={s.id} onPress={() => setSecili(s)}>
                <Card style={{ marginBottom: 8 }}>
                  <View style={styles.row}>
                    <Badge label={s.tur || 'Deneme'} />
                    {s.sureDakika ? <Muted>{s.sureDakika} dk</Muted> : null}
                  </View>
                  <Text style={styles.examTitle}>{s.baslik}</Text>
                  <Muted>
                    {s.baslangicZamani
                      ? new Date(s.baslangicZamani).toLocaleString('tr-TR')
                      : '—'}
                  </Muted>
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={!!secili} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {secili ? (
              <>
                <Badge label={secili.tur || 'Deneme'} />
                <Text style={styles.sheetTitle}>{secili.baslik}</Text>
                <Muted>
                  {secili.baslangicZamani
                    ? new Date(secili.baslangicZamani).toLocaleString('tr-TR')
                    : ''}
                </Muted>
                {secili.aciklama ? (
                  <Text style={styles.desc} numberOfLines={4}>
                    {String(secili.aciklama).replace(/<[^>]+>/g, '')}
                  </Text>
                ) : null}
                <View style={{ gap: 8, marginTop: 12 }}>
                  <PrimaryButton label="Sınava git" onPress={() => sinavaGit(secili)} />
                  <PrimaryButton label="Kapat" variant="ghost" onPress={() => setSecili(null)} />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  cellToday: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
  },
  dayNum: { fontSize: 13, fontWeight: '600', color: colors.text },
  dayNumToday: { color: colors.primaryDark, fontWeight: '800' },
  dot: {
    marginTop: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  section: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  examTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    gap: 8,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  desc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: 4 },
});
