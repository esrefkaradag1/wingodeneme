import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { aiApi, apiHataMesaji, kullaniciApi, listeyeCevir } from '../src/api/client';
import {
  CALISMA_PLANI_ACIKLAMA,
  gorevBaslikTemizle,
  oturumEtiketi,
  oturumSaatAraligi,
} from '../src/lib/studyPlan';
import { Badge, Card, EmptyState, Muted, PrimaryButton } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, radius, spacing } from '../src/theme/colors';

export default function CalismaPlaniScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uretiyor, setUretiyor] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [hafta, setHafta] = useState(0);
  const [seciliGun, setSeciliGun] = useState<number | null>(null);

  const yukle = useCallback(async () => {
    try {
      const { data } = await kullaniciApi.studyPlanlar();
      const liste = listeyeCevir(data.veri);
      setPlan(liste[0] || (data.veri && !Array.isArray(data.veri) ? data.veri : null));
    } catch {
      setPlan(null);
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

  const gorevler: any[] = useMemo(() => {
    if (!plan) return [];
    return Array.isArray(plan.gorevler) ? plan.gorevler : listeyeCevir(plan.gorevler);
  }, [plan]);

  const gunler = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const g of gorevler) {
      const gun = Number(g.gun ?? 1);
      if (!map.has(gun)) map.set(gun, []);
      map.get(gun)!.push(g);
    }
    for (const [, list] of map) {
      list.sort((a, b) => Number(a.oturum ?? a.sira ?? 0) - Number(b.oturum ?? b.sira ?? 0));
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [gorevler]);

  const haftalik = useMemo(() => {
    const start = hafta * 7 + 1;
    const end = start + 6;
    return gunler.filter(([gun]) => gun >= start && gun <= end);
  }, [gunler, hafta]);

  const maxHafta = Math.max(0, Math.ceil((gunler[gunler.length - 1]?.[0] || 7) / 7) - 1);

  // Hafta değişince veya veri gelince seçili günü ayarla
  useEffect(() => {
    if (haftalik.length === 0) {
      setSeciliGun(null);
      return;
    }
    setSeciliGun((prev) => {
      if (prev != null && haftalik.some(([g]) => g === prev)) return prev;
      return haftalik[0][0];
    });
  }, [haftalik]);

  const seciliGorevler = useMemo(() => {
    if (seciliGun == null) return [];
    return haftalik.find(([g]) => g === seciliGun)?.[1] || [];
  }, [haftalik, seciliGun]);

  const tamam = gorevler.filter((g) => g.tamamlandi).length;
  const toplamDk = gorevler.reduce((a, g) => a + Number(g.sureDakika || 0), 0);
  const yuzde = gorevler.length ? Math.round((tamam / gorevler.length) * 100) : 0;

  const gunTamam = seciliGorevler.filter((g) => g.tamamlandi).length;
  const gunToplam = seciliGorevler.length;

  const toggle = async (gorev: any) => {
    if (!gorev.id) return;
    const next = !gorev.tamamlandi;
    setPlan((p: any) => {
      if (!p) return p;
      const gs = (Array.isArray(p.gorevler) ? p.gorevler : []).map((x: any) =>
        x.id === gorev.id ? { ...x, tamamlandi: next } : x,
      );
      return { ...p, gorevler: gs };
    });
    try {
      await kullaniciApi.studyGorevDurum(gorev.id, next);
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e));
      yukle();
    }
  };

  const planUret = async () => {
    setUretiyor(true);
    try {
      await aiApi.studyPlan();
      Alert.alert('Hazır', 'Çalışma planın oluşturuldu.');
      await yukle();
      setHafta(0);
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e, 'Plan üretilemedi'));
    } finally {
      setUretiyor(false);
    }
  };

  const hedefler = plan?.hedefler || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader title="Çalışma Planım" subtitle="Günlük oturumlar" />
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
          {!plan ? (
            <Card>
              <EmptyState
                title="Plan yok"
                desc="Yapay zeka ile kişisel çalışma planı oluştur."
              />
              <PrimaryButton label="İlk planını hazırla" onPress={planUret} loading={uretiyor} />
            </Card>
          ) : (
            <>
              <Card>
                <Text style={styles.planTitle}>{plan.baslik || 'Çalışma Planı'}</Text>
                <Muted>{CALISMA_PLANI_ACIKLAMA}</Muted>
                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Text style={styles.statVal}>{tamam}</Text>
                    <Muted>Tamam</Muted>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statVal}>{gorevler.length - tamam}</Text>
                    <Muted>Kalan</Muted>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statVal}>{Math.round(toplamDk / 60) || 0}s</Text>
                    <Muted>Süre</Muted>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statVal}>%{yuzde}</Text>
                    <Muted>Başarı</Muted>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${yuzde}%` }]} />
                </View>
                <PrimaryButton
                  label="Planı yeniden üret"
                  variant="ghost"
                  onPress={planUret}
                  loading={uretiyor}
                />
              </Card>

              {(hedefler.kisa || hedefler.orta || hedefler.uzun) && (
                <Card>
                  <Text style={styles.section}>Hedefler</Text>
                  {hedefler.kisa ? <Muted>Kısa: {String(hedefler.kisa)}</Muted> : null}
                  {hedefler.orta ? <Muted>Orta: {String(hedefler.orta)}</Muted> : null}
                  {hedefler.uzun ? <Muted>Uzun: {String(hedefler.uzun)}</Muted> : null}
                </Card>
              )}

              <View style={styles.weekNav}>
                <Pressable
                  style={styles.weekBtn}
                  disabled={hafta <= 0}
                  onPress={() => setHafta((h) => Math.max(0, h - 1))}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={hafta <= 0 ? colors.borderStrong : colors.primary}
                  />
                </Pressable>
                <Text style={styles.weekLabel}>Hafta {hafta + 1}</Text>
                <Pressable
                  style={styles.weekBtn}
                  disabled={hafta >= maxHafta}
                  onPress={() => setHafta((h) => Math.min(maxHafta, h + 1))}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={hafta >= maxHafta ? colors.borderStrong : colors.primary}
                  />
                </Pressable>
              </View>

              {haftalik.length === 0 ? (
                <EmptyState title="Bu hafta görev yok" />
              ) : (
                <>
                  {/* Gün tabları */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dayTabs}
                  >
                    {haftalik.map(([gun, gs]) => {
                      const aktif = gun === seciliGun;
                      const biten = gs.filter((g) => g.tamamlandi).length;
                      return (
                        <Pressable
                          key={gun}
                          onPress={() => setSeciliGun(gun)}
                          style={[styles.dayTab, aktif && styles.dayTabOn]}
                        >
                          <Text style={[styles.dayTabLabel, aktif && styles.dayTabLabelOn]}>
                            Gün {gun}
                          </Text>
                          <Text style={[styles.dayTabMeta, aktif && styles.dayTabMetaOn]}>
                            {biten}/{gs.length}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <Card>
                    <View style={styles.dayHead}>
                      <Text style={styles.dayTitle}>Gün {seciliGun}</Text>
                      <Badge
                        label={`${gunTamam}/${gunToplam} tamam`}
                        tone={gunTamam === gunToplam && gunToplam > 0 ? 'teal' : 'amber'}
                      />
                    </View>

                    {seciliGorevler.length === 0 ? (
                      <Muted>Bu gün için görev yok.</Muted>
                    ) : (
                      seciliGorevler.map((g: any, idx: number) => {
                        const oturum = idx + 1;
                        return (
                          <Pressable
                            key={g.id || `${seciliGun}-${idx}`}
                            style={styles.gorev}
                            onPress={() => toggle(g)}
                          >
                            <View
                              style={[
                                styles.check,
                                g.tamamlandi && { backgroundColor: colors.success },
                              ]}
                            >
                              {g.tamamlandi ? (
                                <Ionicons name="checkmark" size={14} color="#fff" />
                              ) : null}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.gorevText, g.tamamlandi && styles.done]}>
                                {gorevBaslikTemizle(g.baslik || g.konu || 'Görev')}
                              </Text>
                              <Muted>
                                {[
                                  g.ders,
                                  oturumEtiketi(oturum),
                                  oturumSaatAraligi(oturum, g.sureDakika),
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Muted>
                            </View>
                            <Badge
                              label={g.tamamlandi ? 'Tamam' : `${g.sureDakika || 45} dk`}
                              tone={g.tamamlandi ? 'teal' : 'amber'}
                            />
                          </Pressable>
                        );
                      })
                    )}
                  </Card>
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  planTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  section: { fontWeight: '800', color: colors.text, marginBottom: 6 },
  stats: { flexDirection: 'row', marginTop: 14, marginBottom: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.text },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bgMuted,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  weekBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontWeight: '800', color: colors.text, fontSize: 15 },
  dayTabs: { gap: 8, paddingVertical: 2 },
  dayTab: {
    minWidth: 72,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
  },
  dayTabOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTabLabel: { fontWeight: '800', fontSize: 13, color: colors.text },
  dayTabLabelOn: { color: '#fff' },
  dayTabMeta: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  dayTabMetaOn: { color: 'rgba(255,255,255,0.85)' },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayTitle: { fontWeight: '800', color: colors.primaryDark, fontSize: 16 },
  gorev: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gorevText: { fontSize: 14, fontWeight: '700', color: colors.text },
  done: { textDecorationLine: 'line-through', color: colors.textMuted },
});
