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
import { apiHataMesaji, listeyeCevir, sosyalApi } from '../src/api/client';
import { Badge, Card, EmptyState, Muted } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, radius, spacing } from '../src/theme/colors';

function adSoyad(o: any): string {
  if (!o) return 'Öğrenci';
  return [o.ad, o.soyad].filter(Boolean).join(' ') || o.adSoyad || 'Öğrenci';
}

export default function ArkadaslarScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [arkadaslar, setArkadaslar] = useState<any[]>([]);
  const [istekler, setIstekler] = useState<any[]>([]);
  const [duellolar, setDuellolar] = useState<any[]>([]);
  const [arama, setArama] = useState('');
  const [aramaSonuc, setAramaSonuc] = useState<any[]>([]);
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false);
  const [karsilastirmaId, setKarsilastirmaId] = useState<string | null>(null);
  const [karsilastirma, setKarsilastirma] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      const [a, i, d] = await Promise.allSettled([
        sosyalApi.arkadaslar(),
        sosyalApi.gelenIstekler(),
        sosyalApi.gelenDuellolar(),
      ]);
      if (a.status === 'fulfilled') setArkadaslar(listeyeCevir(a.value.data.veri));
      if (i.status === 'fulfilled') setIstekler(listeyeCevir(i.value.data.veri));
      if (d.status === 'fulfilled') setDuellolar(listeyeCevir(d.value.data.veri));
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
    if (arama.trim().length <= 2) {
      setAramaSonuc([]);
      return;
    }
    const t = setTimeout(async () => {
      setAramaYukleniyor(true);
      try {
        const { data } = await sosyalApi.kullaniciAra(arama.trim());
        setAramaSonuc(listeyeCevir(data.veri));
      } catch {
        setAramaSonuc([]);
      } finally {
        setAramaYukleniyor(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [arama]);

  useEffect(() => {
    if (!karsilastirmaId) {
      setKarsilastirma([]);
      return;
    }
    (async () => {
      try {
        const { data } = await sosyalApi.puanKarsilastir(karsilastirmaId);
        setKarsilastirma(listeyeCevir(data.veri).slice(0, 8));
      } catch {
        setKarsilastirma([]);
      }
    })();
  }, [karsilastirmaId]);

  const istekYanit = async (id: string, kabul: boolean) => {
    setBusyId(id);
    try {
      await sosyalApi.arkadasYanit(id, kabul);
      Alert.alert('Tamam', kabul ? 'İstek kabul edildi.' : 'İstek reddedildi.');
      yukle();
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e));
    } finally {
      setBusyId(null);
    }
  };

  const ekle = async (hedefId: string) => {
    setBusyId(hedefId);
    try {
      await sosyalApi.arkadasIstek(hedefId);
      Alert.alert('Gönderildi', 'Arkadaşlık isteği gönderildi.');
      setArama('');
      setAramaSonuc([]);
    } catch (e: any) {
      const status = e?.response?.status;
      Alert.alert(status === 409 ? 'Bilgi' : 'Hata', apiHataMesaji(e));
    } finally {
      setBusyId(null);
    }
  };

  const duelloGonder = async (arkadasId: string) => {
    setBusyId(arkadasId);
    try {
      await sosyalApi.duelloBaslat(arkadasId);
      Alert.alert('Davet', 'Düello daveti gönderildi!');
      yukle();
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e, 'Düello başlatılamadı'));
    } finally {
      setBusyId(null);
    }
  };

  const duelloYanit = async (id: string, kabul: boolean) => {
    setBusyId(id);
    try {
      await sosyalApi.duelloYanit(id, kabul);
      Alert.alert('Tamam', kabul ? 'Düello kabul edildi!' : 'Düello reddedildi.');
      yukle();
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e));
    } finally {
      setBusyId(null);
    }
  };

  const header = (
    <View style={{ gap: 12, marginBottom: 8 }}>
      {istekler.length > 0 ? (
        <Card>
          <Text style={styles.section}>Gelen istekler</Text>
          {istekler.map((it) => {
            const o = it.ogrenci || it.gonderen || it;
            return (
              <View key={it.id} style={styles.rowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{adSoyad(o)}</Text>
                  <Muted>{[o.okul, o.sehir].filter(Boolean).join(' · ') || 'Öğrenci'}</Muted>
                </View>
                <Pressable
                  style={[styles.miniBtn, styles.ok]}
                  disabled={busyId === it.id}
                  onPress={() => istekYanit(it.id, true)}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </Pressable>
                <Pressable
                  style={[styles.miniBtn, styles.no]}
                  disabled={busyId === it.id}
                  onPress={() => istekYanit(it.id, false)}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </Pressable>
              </View>
            );
          })}
        </Card>
      ) : null}

      {duellolar.length > 0 ? (
        <Card>
          <Text style={styles.section}>Düello davetleri</Text>
          {duellolar.map((d) => {
            const o = d.daveteden || d.gonderen || {};
            return (
              <View key={d.id} style={styles.rowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{adSoyad(o)}</Text>
                  <Muted>{d.konuId ? `Konu: ${d.konuId}` : 'Düello daveti'}</Muted>
                </View>
                <Pressable style={styles.linkBtn} onPress={() => duelloYanit(d.id, true)}>
                  <Text style={styles.linkOk}>Kabul</Text>
                </Pressable>
                <Pressable style={styles.linkBtn} onPress={() => duelloYanit(d.id, false)}>
                  <Text style={styles.linkNo}>Red</Text>
                </Pressable>
              </View>
            );
          })}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.section}>Arkadaş ara</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={arama}
            onChangeText={setArama}
            placeholder="İsim yaz (en az 3 harf)"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {aramaYukleniyor ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>
        {aramaSonuc.map((k) => (
          <View key={k.id} style={styles.rowItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{adSoyad(k)}</Text>
              <Muted>{k.okul || k.kullanici?.email || 'Öğrenci'}</Muted>
            </View>
            <Pressable
              style={styles.ekleBtn}
              onPress={() => ekle(k.id)}
              disabled={busyId === k.id}
            >
              <Text style={styles.ekleText}>{busyId === k.id ? '…' : 'Ekle'}</Text>
            </Pressable>
          </View>
        ))}
      </Card>

      <Pressable style={styles.duelloBanner} onPress={() => router.push('/duello')}>
        <Ionicons name="flash" size={18} color="#fff" />
        <Text style={styles.duelloBannerText}>Düello Meydanı</Text>
        <Ionicons name="chevron-forward" size={16} color="#fff" />
      </Pressable>

      {karsilastirmaId && karsilastirma.length > 0 ? (
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.section}>Puan karşılaştır</Text>
            <Pressable onPress={() => setKarsilastirmaId(null)}>
              <Muted>Kapat</Muted>
            </Pressable>
          </View>
          {karsilastirma.map((k, i) => (
            <View key={k.id || i} style={styles.compareRow}>
              <Text style={styles.compareTitle} numberOfLines={1}>
                {k.sinav?.baslik || 'Sınav'}
              </Text>
              <Badge label={`Net ${Number(k.netPuan ?? 0).toFixed(1)}`} />
            </View>
          ))}
        </Card>
      ) : null}

      <Text style={styles.listTitle}>Arkadaşlarım ({arkadaslar.length})</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader title="Arkadaşlar" subtitle="Sosyal ağ & düello" />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={arkadaslar}
          keyExtractor={(item, i) => item.id || String(i)}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: 10, flexGrow: 1 }}
          ListHeaderComponent={header}
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
            <EmptyState title="Henüz arkadaş yok" desc="Ara ve ekle; düello için arkadaş gerekir." />
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.rowItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{adSoyad(item).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{adSoyad(item)}</Text>
                  <Muted>
                    {[item.okul, item.sehir].filter(Boolean).join(' · ') ||
                      (item.puan != null ? `Puan ${item.puan}` : 'Öğrenci')}
                  </Muted>
                </View>
                <Pressable
                  style={styles.iconAction}
                  onPress={() =>
                    setKarsilastirmaId((cur) => (cur === item.id ? null : item.id))
                  }
                >
                  <Ionicons
                    name="stats-chart"
                    size={18}
                    color={karsilastirmaId === item.id ? colors.primary : colors.textMuted}
                  />
                </Pressable>
                <Pressable
                  style={[styles.iconAction, styles.swords]}
                  onPress={() => duelloGonder(item.id)}
                  disabled={busyId === item.id}
                >
                  <Ionicons name="flash" size={18} color="#DC2626" />
                </Pressable>
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 10 },
  listTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 4,
  },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', color: colors.primaryDark },
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
  miniBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ok: { backgroundColor: colors.success },
  no: { backgroundColor: colors.danger },
  linkBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  linkOk: { color: colors.success, fontWeight: '800' },
  linkNo: { color: colors.danger, fontWeight: '800' },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swords: { backgroundColor: '#FEE2E2' },
  duelloBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: radius.lg,
    padding: 14,
  },
  duelloBannerText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 15 },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 8,
  },
  compareTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  ekleBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ekleText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
