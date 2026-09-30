import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { sinavApi } from '../../src/api/client';
import { Badge, Card, EmptyState, Muted, Title } from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/theme/colors';

function listeyeCevir(veri: unknown): any[] {
  if (Array.isArray(veri)) return veri;
  if (veri && typeof veri === 'object') {
    const o = veri as Record<string, unknown>;
    for (const k of ['sinavlar', 'liste', 'items']) {
      if (Array.isArray(o[k])) return o[k] as any[];
    }
  }
  return [];
}

function katilimDurumu(item: any): string | null {
  return item.katilimDurumu ?? item.katilimDurum ?? null;
}

function katilimIdAl(item: any): string | null {
  return item.katilimId ?? item.katilim?.id ?? null;
}

function tarihKisa(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  } catch {
    return null;
  }
}

export default function SinavlarScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sinavlar, setSinavlar] = useState<any[]>([]);

  const yukle = useCallback(async () => {
    try {
      const { data } = await sinavApi.liste();
      setSinavlar(listeyeCevir(data.veri));
    } catch {
      setSinavlar([]);
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

  const ozet = useMemo(() => {
    const tamam = sinavlar.filter((s) => katilimDurumu(s) === 'TAMAMLANDI').length;
    const aktif = sinavlar.filter(
      (s) => s.durum === 'AKTIF' && katilimDurumu(s) !== 'TAMAMLANDI',
    ).length;
    return { tamam, aktif };
  }, [sinavlar]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={styles.head}>
        <Title>Sınavlarım</Title>
        <Muted>
          {ozet.aktif} aktif · {ozet.tamam} tamamlanan
        </Muted>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sinavlar}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: 12, flexGrow: 1 }}
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
          ListEmptyComponent={
            <EmptyState
              title="Sınav bulunamadı"
              desc="Paket satın alınca veya atama gelince burada görünür."
            />
          }
          renderItem={({ item }) => {
            const durum = String(katilimDurumu(item) || '').toUpperCase();
            const katilimId = katilimIdAl(item);
            const sinavDurum = String(item.durum || '').toUpperCase();
            // Tamamlanmış katılım: incele + sonuç (web ile aynı)
            const tamamlandi =
              !!katilimId && (durum === 'TAMAMLANDI' || (sinavDurum === 'BITTI' && durum !== 'DEVAM_EDIYOR'));
            const devamEdiyor = durum === 'DEVAM_EDIYOR';
            const yakinda = sinavDurum === 'YAKINDA';
            const bittiKatilimmadi = sinavDurum === 'BITTI' && !katilimId;
            const baslanabilir =
              !tamamlandi && !yakinda && !bittiKatilimmadi && (sinavDurum === 'AKTIF' || !sinavDurum || devamEdiyor);

            return (
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Badge label={item.tur || 'Deneme'} />
                  {tamamlandi ? <Badge label="Tamamlandı" tone="amber" /> : null}
                  {devamEdiyor ? <Badge label="Devam ediyor" tone="teal" /> : null}
                  {yakinda ? <Badge label="Yakında" /> : null}
                </View>

                <Text style={styles.title}>{item.baslik}</Text>

                <View style={styles.meta}>
                  {item.sureDakika ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="hourglass-outline" size={14} color={colors.textMuted} />
                      <Muted>{item.sureDakika} dk</Muted>
                    </View>
                  ) : null}
                  {item.soruSayisi ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="grid-outline" size={14} color={colors.textMuted} />
                      <Muted>{item.soruSayisi} soru</Muted>
                    </View>
                  ) : null}
                  {item.katilimciSayisi != null ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                      <Muted>{item.katilimciSayisi} kişi</Muted>
                    </View>
                  ) : null}
                  {tarihKisa(item.baslangicZamani) ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                      <Muted>{tarihKisa(item.baslangicZamani)}</Muted>
                    </View>
                  ) : null}
                </View>

                <View style={styles.actions}>
                  {tamamlandi ? (
                    <>
                      <Pressable
                        style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }]}
                        onPress={() => router.push(`/sinav/${item.id}`)}
                      >
                        <Text style={styles.btnPrimaryText}>Soruları İncele</Text>
                        <Ionicons name="book-outline" size={16} color="#fff" />
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.9 }]}
                        onPress={() => router.push(`/sonuc/${katilimId}`)}
                      >
                        <Text style={styles.btnGhostText}>Sonuçları Gör</Text>
                        <Ionicons name="trophy" size={16} color="#D97706" />
                      </Pressable>
                    </>
                  ) : null}

                  {baslanabilir ? (
                    <Pressable
                      style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }]}
                      onPress={() => router.push(`/sinav/${item.id}`)}
                    >
                      <Text style={styles.btnPrimaryText}>
                        {devamEdiyor ? 'Sınava Devam Et' : 'Sınava Başla'}
                      </Text>
                      <Ionicons name="play" size={16} color="#fff" />
                    </Pressable>
                  ) : null}

                  {yakinda ? (
                    <View style={styles.btnDisabled}>
                      <Text style={styles.btnDisabledText}>Hazırlanıyor</Text>
                      <Ionicons name="time-outline" size={16} color={colors.primary} />
                    </View>
                  ) : null}

                  {bittiKatilimmadi ? (
                    <View style={[styles.btnDisabled, { backgroundColor: colors.bgMuted }]}>
                      <Text style={[styles.btnDisabledText, { color: colors.textMuted }]}>
                        Katılım sağlanmadı
                      </Text>
                      <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                    </View>
                  ) : null}

                  {/* Hiç eşleşmezse yine de aksiyon göster */}
                  {!tamamlandi && !baslanabilir && !yakinda && !bittiKatilimmadi ? (
                    <Pressable
                      style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }]}
                      onPress={() => router.push(`/sinav/${item.id}`)}
                    >
                      <Text style={styles.btnPrimaryText}>Sınava Git</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  card: { gap: 0 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 10,
    marginBottom: 10,
    lineHeight: 22,
  },
  meta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { marginTop: 14, gap: 8 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    minHeight: 46,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    minHeight: 46,
  },
  btnGhostText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  btnDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: 12,
    minHeight: 46,
  },
  btnDisabledText: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
});
