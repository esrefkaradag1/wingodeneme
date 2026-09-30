import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { LinearGradient } from 'expo-linear-gradient';
import { aiApi, analizApi } from '../../src/api/client';
import { colors, radius, spacing } from '../../src/theme/colors';

function barRenk(pct: number) {
  if (pct >= 70) return colors.success;
  if (pct >= 45) return colors.warning;
  return colors.danger;
}

function netFromGecmis(s: any): number | null {
  const n = s.netPuan ?? s.net ?? s.ortalamaNet;
  return n != null && Number.isFinite(Number(n)) ? Number(n) : null;
}

/** API bazen sayı, bazen { sira } nesnesi döner */
function siraNumarasi(deger: unknown): number | null {
  if (deger == null) return null;
  if (typeof deger === 'number' && Number.isFinite(deger)) return deger;
  if (typeof deger === 'string' && deger.trim() && Number.isFinite(Number(deger))) {
    return Number(deger);
  }
  if (typeof deger === 'object') {
    const o = deger as Record<string, unknown>;
    const aday = o.sira ?? o.siralama ?? o.ulusalSiralama ?? o.deger;
    if (typeof aday === 'number' && Number.isFinite(aday)) return aday;
    if (typeof aday === 'string' && Number.isFinite(Number(aday))) return Number(aday);
  }
  return null;
}

function siraEtiket(deger: unknown): string {
  const n = siraNumarasi(deger);
  return n != null ? `#${n.toLocaleString('tr-TR')}` : '—';
}

export default function AnalizScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analiz, setAnaliz] = useState<any>(null);
  const [oneriler, setOneriler] = useState<any>(null);
  const [aiAnaliz, setAiAnaliz] = useState<any>(null);
  const ilkYukleme = useRef(true);
  const arkaPlanYuklendi = useRef(false);

  const yukleAnaliz = useCallback(async () => {
    try {
      const a = await analizApi.benim();
      setAnaliz(a.data.veri);
    } catch {
      if (ilkYukleme.current) setAnaliz(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
      ilkYukleme.current = false;
    }
  }, []);

  const yukleArkaPlan = useCallback(async (zorla = false) => {
    if (arkaPlanYuklendi.current && !zorla) return;
    arkaPlanYuklendi.current = true;
    const [o, ai] = await Promise.allSettled([analizApi.oneriler(), aiApi.analiz()]);
    if (o.status === 'fulfilled') setOneriler(o.value.data.veri);
    if (ai.status === 'fulfilled') {
      setAiAnaliz(ai.value.data.veri?.aiAnaliz || ai.value.data.veri);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Ana rapor hızlı gelsin; AI/öneri ekranı kilitlemesin ve her focus’ta tekrarlanmasın
      void yukleAnaliz().then(() => {
        void yukleArkaPlan(false);
      });
    }, [yukleAnaliz, yukleArkaPlan]),
  );

  const dersler: any[] = useMemo(
    () => analiz?.dersPerformanslari || analiz?.dersBazli || [],
    [analiz],
  );
  const zayif: any[] = useMemo(() => analiz?.zayifKonular || [], [analiz]);
  const gecmis: any[] = useMemo(
    () => analiz?.sinavGecmisi || analiz?.sonSinavlar || [],
    [analiz],
  );
  const ortalama = analiz?.ortalamaNet ?? analiz?.ortalamaNe ?? analiz?.ozet?.ortalamaNet;
  const toplamSinav = analiz?.toplamSinav ?? gecmis.length;
  const enIyiSira = analiz?.enIyiSiralama;
  const sonDenemeSira = analiz?.sonDenemeSiralama;

  const trend = useMemo(() => {
    return [...gecmis]
      .slice(0, 8)
      .reverse()
      .map((s) => netFromGecmis(s))
      .filter((n): n is number => n != null);
  }, [gecmis]);

  const trendMax = Math.max(1, ...trend.map((n) => Math.abs(n)), 10);

  const ipucu = useMemo(() => {
    if (zayif[0]) {
      return `${zayif[0].ders} — “${zayif[0].konu}” alanında başarı %${Number(zayif[0].basari || 0).toFixed(0)}. Bugün bu konuya odaklan.`;
    }
    if (aiAnaliz?.genelDegerlendirme) return String(aiAnaliz.genelDegerlendirme);
    const gelisim = aiAnaliz?.geliştirmeGerekli?.[0] ?? aiAnaliz?.acilOnlemler?.[0];
    if (gelisim) return String(gelisim);
    const o =
      oneriler?.mesaj ||
      oneriler?.oneriler?.[0]?.metin ||
      oneriler?.[0]?.metin ||
      oneriler?.[0]?.baslik;
    return o ? String(o) : 'Düzenli deneme çözerek net trendini yükseltebilirsin.';
  }, [aiAnaliz, zayif, oneriler]);

  const seviye =
    ortalama == null
      ? { etiket: 'Başla', renk: colors.textMuted }
      : Number(ortalama) >= 40
        ? { etiket: 'Güçlü', renk: colors.success }
        : Number(ortalama) >= 20
          ? { etiket: 'Gelişiyor', renk: colors.warning }
          : { etiket: 'Çalışma zamanı', renk: colors.danger };

  const ilkYukleniyor = loading && !analiz;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void yukleAnaliz().then(() => yukleArkaPlan(true));
            }}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.title}>Analiz</Text>
        <Text style={styles.subtitle}>Deneme performansın · mobil özet</Text>

        {ilkYukleniyor ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : !analiz || (toplamSinav === 0 && ortalama == null) ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="stats-chart-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Henüz analiz yok</Text>
            <Text style={styles.emptyDesc}>
              Birkaç deneme çözünce net, ders ve zayıf konu raporların burada belirir.
            </Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/sinavlar')}>
              <Text style={styles.emptyBtnText}>Sınavlara git</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <LinearGradient
              colors={['#0F766E', '#14B8A6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>Ortalama net</Text>
                  <Text style={styles.heroNet}>
                    {ortalama != null ? Number(ortalama).toFixed(1) : '—'}
                  </Text>
                </View>
                <View style={styles.seviyePill}>
                  <Text
                    style={[
                      styles.seviyeText,
                      { color: seviye.renk === colors.danger ? '#FEE2E2' : '#fff' },
                    ]}
                  >
                    {seviye.etiket}
                  </Text>
                </View>
              </View>

              {trend.length > 1 ? (
                <View style={styles.sparkRow}>
                  {trend.map((n, i) => {
                    const h = Math.max(8, (Math.abs(n) / trendMax) * 36);
                    return (
                      <View key={i} style={styles.sparkCol}>
                        <View
                          style={[
                            styles.sparkBar,
                            {
                              height: h,
                              backgroundColor:
                                n >= 0 ? 'rgba(255,255,255,0.95)' : 'rgba(254,202,202,0.9)',
                            },
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
              ) : null}
              <Text style={styles.sparkCaption}>Son deneme net trendi</Text>
            </LinearGradient>

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Deneme</Text>
                <Text style={styles.metricValue}>{toplamSinav ?? '—'}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>En iyi sıra</Text>
                <Text style={styles.metricValue}>{siraEtiket(enIyiSira)}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Son sıra</Text>
                <Text style={styles.metricValue}>{siraEtiket(sonDenemeSira)}</Text>
              </View>
            </View>

            <Pressable style={styles.tipCard} onPress={() => router.push('/calisma-plani')}>
              <View style={styles.tipIcon}>
                <Ionicons name="bulb" size={18} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipLabel}>Sana özel ipucu</Text>
                <Text style={styles.tipBody} numberOfLines={4}>
                  {ipucu}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#B45309" />
            </Pressable>

            {dersler.length > 0 ? (
              <View style={styles.block}>
                <Text style={styles.section}>Ders başarıları</Text>
                <View style={styles.card}>
                  {[...dersler]
                    .sort(
                      (a, b) =>
                        Number(b.ortalama ?? b.basari ?? 0) - Number(a.ortalama ?? a.basari ?? 0),
                    )
                    .map((d, i) => {
                      const ad = d.ders || d.ad || `Ders ${i + 1}`;
                      const pct = Math.max(0, Math.min(100, Number(d.ortalama ?? d.basari ?? 0)));
                      return (
                        <View key={String(ad) + i} style={styles.dersRow}>
                          <View style={styles.dersHead}>
                            <Text style={styles.dersAd} numberOfLines={1}>
                              {ad}
                            </Text>
                            <Text style={[styles.dersPct, { color: barRenk(pct) }]}>
                              %{pct.toFixed(0)}
                            </Text>
                          </View>
                          <View style={styles.barBg}>
                            <View
                              style={[
                                styles.barFill,
                                { width: `${pct}%`, backgroundColor: barRenk(pct) },
                              ]}
                            />
                          </View>
                          {d.toplamSoru ? (
                            <Text style={styles.dersMeta}>{d.toplamSoru} soru</Text>
                          ) : null}
                        </View>
                      );
                    })}
                </View>
              </View>
            ) : null}

            {zayif.length > 0 ? (
              <View style={styles.block}>
                <View style={styles.sectionRow}>
                  <Text style={styles.section}>Zayıf konular</Text>
                  <Pressable onPress={() => router.push('/calisma-plani')}>
                    <Text style={styles.link}>Plana ekle</Text>
                  </Pressable>
                </View>
                {zayif.slice(0, 6).map((k, i) => (
                  <View key={i} style={styles.weakRow}>
                    <View style={styles.weakIcon}>
                      <Ionicons name="alert-circle" size={18} color={colors.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.weakTitle} numberOfLines={1}>
                        {k.konu || k.ad || 'Konu'}
                      </Text>
                      <Text style={styles.weakMeta}>
                        {k.ders || 'Ders'}
                        {k.basari != null ? ` · %${Number(k.basari).toFixed(0)} başarı` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {gecmis.length > 0 ? (
              <View style={styles.block}>
                <View style={styles.sectionRow}>
                  <Text style={styles.section}>Son denemeler</Text>
                  <Pressable onPress={() => router.push('/(tabs)/sinavlar')}>
                    <Text style={styles.link}>Sınavlar</Text>
                  </Pressable>
                </View>
                {gecmis.slice(0, 6).map((s, i) => {
                  const net = netFromGecmis(s);
                  const baslik = s.sinav?.baslik || s.baslik || s.sinavAdi || 'Deneme';
                  const tarih = s.bitisZamani || s.olusturuldu || s.tarih;
                  const katilimId = s.id;
                  return (
                    <Pressable
                      key={katilimId || i}
                      style={styles.examRow}
                      onPress={() => {
                        if (katilimId) router.push(`/sonuc/${katilimId}`);
                      }}
                    >
                      <View style={styles.examIcon}>
                        <Ionicons name="document-text" size={18} color={colors.primaryDark} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.examTitle} numberOfLines={1}>
                          {baslik}
                        </Text>
                        <Text style={styles.examMeta}>
                          {[
                            s.sinav?.tur || s.tur,
                            tarih ? new Date(tarih).toLocaleDateString('tr-TR') : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                      <View style={styles.netPill}>
                        <Text style={styles.netPillText}>
                          {net != null ? net.toFixed(1) : '—'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable style={styles.actionBtn} onPress={() => router.push('/(tabs)/sinavlar')}>
                <Ionicons name="play-circle" size={20} color={colors.primaryDark} />
                <Text style={styles.actionText}>Yeni deneme</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => router.push('/calisma-plani')}>
                <Ionicons name="map" size={20} color={colors.primaryDark} />
                <Text style={styles.actionText}>Çalışma planı</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginTop: 4, marginBottom: spacing.md },
  emptyCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  emptyDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  hero: { borderRadius: radius.xl, padding: 18, marginBottom: spacing.md },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  heroNet: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  seviyePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  seviyeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 40,
    marginTop: 16,
  },
  sparkCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 40 },
  sparkBar: { width: '70%', borderRadius: 4, minHeight: 6 },
  sparkCaption: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  metrics: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  metric: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  metricValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: spacing.lg,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipLabel: { fontSize: 11, fontWeight: '800', color: '#B45309', marginBottom: 2 },
  tipBody: { fontSize: 13, color: colors.text, lineHeight: 18, fontWeight: '500' },
  block: { marginBottom: spacing.lg },
  section: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 10 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  dersRow: { marginBottom: 14 },
  dersHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  dersAd: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  dersPct: { fontWeight: '800', fontSize: 14 },
  barBg: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.full },
  dersMeta: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  weakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  weakIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weakTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  weakMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  examIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  examTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  examMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  netPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  netPillText: { fontWeight: '800', color: colors.primaryDark, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  actionText: { fontWeight: '700', color: colors.text, fontSize: 13 },
});
