import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiHataMesaji, duyuruApi, listeyeCevir } from '../src/api/client';
import { Badge, Card, EmptyState, Muted } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, spacing } from '../src/theme/colors';

export default function DuyurularScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liste, setListe] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      const { data } = await duyuruApi.benim();
      setListe(listeyeCevir(data.veri));
    } catch {
      setListe([]);
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

  const okunduIsaretle = async (item: any) => {
    const duyuruId = item.duyuru?.id || item.duyuruId || item.id;
    if (!duyuruId || item.okundu) return;
    setBusyId(duyuruId);
    try {
      await duyuruApi.oku(duyuruId);
      setListe((prev) =>
        prev.map((x) => {
          const xid = x.duyuru?.id || x.duyuruId || x.id;
          return xid === duyuruId ? { ...x, okundu: true } : x;
        }),
      );
    } catch (e) {
      /* sessiz — liste yine de gösterilir */
      console.warn(apiHataMesaji(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader title="Duyurular" subtitle="Gelen kutusu" />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(item, i) => item.id || item.duyuru?.id || String(i)}
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
          ListEmptyComponent={<EmptyState title="Duyuru yok" desc="Yeni duyuru geldiğinde burada görünür." />}
          renderItem={({ item }) => {
            const d = item.duyuru || item;
            const baslik = d.baslik || 'Duyuru';
            const mesaj = String(d.mesaj || d.icerik || d.ozet || '').replace(/<[^>]+>/g, '');
            const tarih = d.olusturuldu || item.olusturuldu || item.createdAt;
            const okundu = !!item.okundu;
            const id = d.id || item.id;
            return (
              <Card>
                <View style={styles.top}>
                  <Badge label={okundu ? 'Okundu' : 'Yeni'} tone={okundu ? 'teal' : 'amber'} />
                  {tarih ? (
                    <Muted>{new Date(tarih).toLocaleString('tr-TR')}</Muted>
                  ) : null}
                </View>
                <Text style={styles.title}>{baslik}</Text>
                <Text style={styles.body}>{mesaj}</Text>
                {!okundu ? (
                  <Pressable
                    style={styles.btn}
                    disabled={busyId === id}
                    onPress={() => okunduIsaretle(item)}
                  >
                    <Text style={styles.btnText}>
                      {busyId === id ? 'İşleniyor…' : 'Okundu işaretle'}
                    </Text>
                  </Pressable>
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
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  body: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  btn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
});
