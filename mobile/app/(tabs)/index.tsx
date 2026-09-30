import { useCallback, useMemo, useState } from 'react';
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
import {
  analizApi,
  duyuruApi,
  kullaniciApi,
  listeyeCevir,
  sinavApi,
} from '../../src/api/client';
import { Avatar } from '../../src/components/Avatar';
import { kisayolOgeleri } from '../../src/lib/menu';
import { gorevBaslikTemizle } from '../../src/lib/studyPlan';
import { useAuthStore } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme/colors';

function gunSelami(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export default function HomeScreen() {
  const kullanici = useAuthStore((s) => s.kullanici);
  const platformMode = useAuthStore((s) => s.platformMode);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sayac, setSayac] = useState<Record<string, number>>({});
  const [analiz, setAnaliz] = useState<any>(null);
  const [oneriler, setOneriler] = useState<any>(null);
  const [sinavlar, setSinavlar] = useState<any[]>([]);
  const [duyurular, setDuyurular] = useState<any[]>([]);
  const [bugunGorevler, setBugunGorevler] = useState<any[]>([]);
  const [planIlerleme, setPlanIlerleme] = useState<{ tamam: number; toplam: number } | null>(null);

  const kisayollar = useMemo(() => kisayolOgeleri(platformMode).slice(0, 8), [platformMode]);

  const yukle = useCallback(async () => {
    try {
      const [s, a, o, sn, d, p] = await Promise.allSettled([
        kullaniciApi.navSayaclari(),
        analizApi.benim(),
        analizApi.oneriler(),
        sinavApi.liste(),
        duyuruApi.benim(),
        kullaniciApi.studyPlanlar(),
      ]);
      if (s.status === 'fulfilled') setSayac(s.value.data.veri || {});
      if (a.status === 'fulfilled') setAnaliz(a.value.data.veri);
      if (o.status === 'fulfilled') setOneriler(o.value.data.veri);
      if (sn.status === 'fulfilled') setSinavlar(listeyeCevir(sn.value.data.veri).slice(0, 4));
      if (d.status === 'fulfilled') {
        const liste = listeyeCevir(d.value.data.veri);
        const okunmamis = liste.filter((x) => !x.okundu);
        setDuyurular((okunmamis.length ? okunmamis : liste).slice(0, 2));
      }
      if (p.status === 'fulfilled') {
        const planlar = listeyeCevir(p.value.data.veri);
        const plan = planlar[0] || (!Array.isArray(p.value.data.veri) ? p.value.data.veri : null);
        const gorevler: any[] = Array.isArray(plan?.gorevler)
          ? plan.gorevler
          : listeyeCevir(plan?.gorevler);
        const tamam = gorevler.filter((g) => g.tamamlandi).length;
        setPlanIlerleme(gorevler.length ? { tamam, toplam: gorevler.length } : null);
        const bugun = new Date().getDate(); // fallback: first incomplete day tasks
        const incomplete = gorevler.filter((g) => !g.tamamlandi);
        // Prefer today's day index if plans use gun 1..n relative
        const byGun = incomplete.filter((g) => Number(g.gun) === 1 || Number(g.gun) === bugun);
        setBugunGorevler((byGun.length ? byGun : incomplete).slice(0, 3));
      } else {
        setBugunGorevler([]);
        setPlanIlerleme(null);
      }
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

  const ilkAd = kullanici?.ad || 'Öğrenci';
  const ortalamaNet = analiz?.ortalamaNet ?? analiz?.ozet?.ortalamaNet;
  const sinavSayisi =
    analiz?.sinavSayisi ?? analiz?.ozet?.sinavSayisi ?? analiz?.toplamSinav ?? null;
  const panelAd = platformMode === 'kpss' ? 'KPSS' : 'YKS / LGS';
  const duyuruSayisi = Number(sayac.duyurular || 0);
  const ilkSinav = sinavlar[0];

  const odakMetni = useMemo(() => {
    if (typeof oneriler === 'string') return oneriler;
    const metin =
      oneriler?.mesaj ||
      oneriler?.oneriler?.[0]?.metin ||
      oneriler?.oneriler?.[0]?.baslik ||
      oneriler?.[0]?.metin ||
      oneriler?.[0]?.baslik;
    if (metin) return String(metin);
    if (ortalamaNet != null && Number(ortalamaNet) < 0) {
      return 'Bugün bir deneme çözerek netlerini toparlamaya başla. Küçük adımlar büyük fark yaratır.';
    }
    return 'Düzenli tekrar ve deneme çözümü başarıyı artırır. Bugün en az bir oturum ayır.';
  }, [oneriler, ortalamaNet]);

  const planYuzde = planIlerleme
    ? Math.round((planIlerleme.tamam / Math.max(1, planIlerleme.toplam)) * 100)
    : null;

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
              yukle();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Üst: selamlama */}
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.selam}>{gunSelami()},</Text>
            <Text style={styles.name} numberOfLines={1}>
              {ilkAd}
            </Text>
            <Text style={styles.subtitle}>
              {panelAd} hazırlığın · {new Date().toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <Pressable
            style={styles.bellWrap}
            onPress={() => router.push('/duyurular')}
            accessibilityLabel="Duyurular"
          >
            <Ionicons name="notifications-outline" size={22} color={colors.primaryDark} />
            {duyuruSayisi > 0 ? (
              <View style={styles.bellDot}>
                <Text style={styles.bellDotText}>{duyuruSayisi > 9 ? '9+' : duyuruSayisi}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            style={styles.avatarBtn}
            onPress={() => router.push('/(tabs)/profil')}
            accessibilityLabel="Profil"
          >
            <Avatar
              uri={kullanici?.avatarUrl}
              name={ilkAd}
              size={42}
              backgroundColor={colors.primary}
              textColor="#fff"
            />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <>
            {/* 1) Ana eylem: sınava başla */}
            <LinearGradient
              colors={['#0F766E', '#14B8A6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaCard}
            >
              <Text style={styles.ctaEyebrow}>Bugünün hedefi</Text>
              <Text style={styles.ctaTitle}>
                {ilkSinav ? 'Denemene kaldığın yerden devam et' : 'Hazır mısın? İlk denemene başla'}
              </Text>
              <Pressable
                style={styles.ctaBtn}
                onPress={() =>
                  ilkSinav
                    ? router.push(`/sinav/${ilkSinav.id}`)
                    : router.push('/(tabs)/sinavlar')
                }
              >
                <Ionicons name="play" size={18} color={colors.primaryDark} />
                <Text style={styles.ctaBtnText} numberOfLines={1}>
                  {ilkSinav ? ilkSinav.baslik : 'Sınavlarımı aç'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primaryDark} />
              </Pressable>
            </LinearGradient>

            {/* 2) Özet metrikler */}
            <View style={styles.metrics}>
              <Pressable style={styles.metric} onPress={() => router.push('/(tabs)/analiz')}>
                <Text style={styles.metricLabel}>Ort. net</Text>
                <Text style={styles.metricValue}>
                  {ortalamaNet != null ? Number(ortalamaNet).toFixed(1) : '—'}
                </Text>
              </Pressable>
              <Pressable style={styles.metric} onPress={() => router.push('/(tabs)/sinavlar')}>
                <Text style={styles.metricLabel}>Sınav</Text>
                <Text style={styles.metricValue}>
                  {sinavSayisi != null ? sinavSayisi : sinavlar.length || '—'}
                </Text>
              </Pressable>
              <Pressable style={styles.metric} onPress={() => router.push('/calisma-plani')}>
                <Text style={styles.metricLabel}>Plan</Text>
                <Text style={styles.metricValue}>
                  {planYuzde != null ? `%${planYuzde}` : '—'}
                </Text>
              </Pressable>
            </View>

            {/* 3) Bugünün çalışma görevleri */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Bugün çalış</Text>
              <Pressable onPress={() => router.push('/calisma-plani')} hitSlop={8}>
                <Text style={styles.link}>Planım</Text>
              </Pressable>
            </View>
            {bugunGorevler.length === 0 ? (
              <Pressable style={styles.emptyRow} onPress={() => router.push('/calisma-plani')}>
                <Ionicons name="map-outline" size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyTitle}>Çalışma planı oluştur</Text>
                  <Text style={styles.emptyDesc}>Günlük oturumlarla netlerini yükselt</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ) : (
              <View style={styles.taskCard}>
                {planIlerleme ? (
                  <View style={styles.progressWrap}>
                    <View style={styles.progressTrack}>
                      <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(100, Math.max(0, planYuzde ?? 0))}%` },
                      ]}
                    />
                    </View>
                    <Text style={styles.progressText}>
                      {planIlerleme.tamam}/{planIlerleme.toplam} görev
                    </Text>
                  </View>
                ) : null}
                {bugunGorevler.map((g) => (
                  <Pressable
                    key={g.id}
                    style={styles.taskRow}
                    onPress={() => router.push('/calisma-plani')}
                  >
                    <View style={styles.taskCheck}>
                      <Ionicons name="ellipse-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {gorevBaslikTemizle(g.baslik || g.konu || 'Görev')}
                      </Text>
                      <Text style={styles.taskMeta}>
                        {[g.ders, g.sureDakika ? `${g.sureDakika} dk` : null]
                          .filter(Boolean)
                          .join(' · ') || 'Oturum'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* 4) Çözülecek sınavlar — dikey liste */}
            <View style={[styles.sectionHead, { marginTop: spacing.md }]}>
              <Text style={styles.sectionTitle}>Çözülecek sınavlar</Text>
              <Pressable onPress={() => router.push('/(tabs)/sinavlar')} hitSlop={8}>
                <Text style={styles.link}>Tümü</Text>
              </Pressable>
            </View>
            {sinavlar.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyDesc}>Şu an açık sınav yok</Text>
              </View>
            ) : (
              sinavlar.map((s) => (
                <Pressable
                  key={s.id}
                  style={styles.examRow}
                  onPress={() => router.push(`/sinav/${s.id}`)}
                >
                  <View style={styles.examIcon}>
                    <Ionicons name="document-text" size={20} color={colors.primaryDark} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.examTitle} numberOfLines={1}>
                      {s.baslik}
                    </Text>
                    <Text style={styles.examMeta}>
                      {[s.tur || 'Deneme', s.sureDakika ? `${s.sureDakika} dk` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <View style={styles.startPill}>
                    <Text style={styles.startPillText}>Başla</Text>
                  </View>
                </Pressable>
              ))
            )}

            {/* 5) Odak önerisi */}
            <Pressable style={styles.focusCard} onPress={() => router.push('/(tabs)/analiz')}>
              <View style={styles.focusIcon}>
                <Ionicons name="bulb-outline" size={20} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.focusLabel}>Öğrenci ipucu</Text>
                <Text style={styles.focusBody} numberOfLines={3}>
                  {odakMetni}
                </Text>
              </View>
            </Pressable>

            {/* 6) Kısayollar — kompakt */}
            <Text style={[styles.sectionTitle, { marginTop: spacing.md, marginBottom: 12 }]}>
              Araçlar
            </Text>
            <View style={styles.tools}>
              {kisayollar.map((item) => {
                const rozet = item.sayacKey ? Number(sayac[item.sayacKey] || 0) : 0;
                return (
                  <Pressable
                    key={String(item.href) + item.etiket}
                    style={styles.tool}
                    onPress={() => router.push(item.href)}
                  >
                    <View style={[styles.toolIcon, { backgroundColor: `${item.renk}18` }]}>
                      <Ionicons name={item.icon} size={20} color={item.renk} />
                      {rozet > 0 ? (
                        <View style={styles.dot}>
                          <Text style={styles.dotText}>{rozet > 9 ? '9+' : rozet}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.toolLabel} numberOfLines={1}>
                      {item.kisa || item.etiket}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 7) Duyurular — sadece varsa */}
            {duyurular.length > 0 ? (
              <>
                <View style={[styles.sectionHead, { marginTop: spacing.md }]}>
                  <Text style={styles.sectionTitle}>Duyurular</Text>
                  <Pressable onPress={() => router.push('/duyurular')} hitSlop={8}>
                    <Text style={styles.link}>Tümü</Text>
                  </Pressable>
                </View>
                {duyurular.map((d, i) => {
                  const duy = d.duyuru || d;
                  return (
                    <Pressable
                      key={d.id || i}
                      style={styles.duyuruRow}
                      onPress={() => router.push('/duyurular')}
                    >
                      <View style={styles.duyuruIcon}>
                        <Ionicons name="megaphone-outline" size={18} color={colors.warning} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.duyuruTitle} numberOfLines={1}>
                          {duy.baslik || 'Duyuru'}
                        </Text>
                        <Text style={styles.duyuruBody} numberOfLines={2}>
                          {String(duy.mesaj || duy.icerik || '').replace(/<[^>]+>/g, '')}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 10,
    paddingTop: spacing.xs,
  },
  selam: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  name: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  avatarBtn: {
    marginLeft: 4,
  },
  ctaCard: {
    borderRadius: radius.xl,
    padding: 18,
    marginBottom: spacing.md,
  },
  ctaEyebrow: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  ctaTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ctaBtnText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  metrics: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg },
  metric: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  metricValue: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 2 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  emptyDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  emptyBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  taskCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: spacing.md,
  },
  progressWrap: { marginBottom: 8 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bgMuted,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressText: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 6 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  taskCheck: { width: 24, alignItems: 'center' },
  taskTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  taskMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  examIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  examTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  examMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  startPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  startPillText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  focusCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  focusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusLabel: { fontSize: 11, fontWeight: '800', color: '#B45309', marginBottom: 4 },
  focusBody: { fontSize: 13, color: colors.text, lineHeight: 18, fontWeight: '500' },
  tools: { flexDirection: 'row', flexWrap: 'wrap' },
  tool: { width: '25%', alignItems: 'center', marginBottom: 14 },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  toolLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  dot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  duyuruRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  duyuruIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duyuruTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  duyuruBody: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 2 },
});
