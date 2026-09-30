import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import RenderHTML from 'react-native-render-html';
import { apiHataMesaji, sinavApi } from '../../src/api/client';
import { Muted } from '../../src/components/ui';
import type { Soru } from '../../src/lib/types';
import { colors, radius, spacing } from '../../src/theme/colors';

function sureFormat(sn: number) {
  const m = Math.floor(sn / 60);
  const s = sn % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SinavCozScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baslik, setBaslik] = useState('Sınav');
  const [kalanSn, setKalanSn] = useState<number | null>(null);
  const [katilimId, setKatilimId] = useState<string | null>(null);
  const [sorular, setSorular] = useState<Soru[]>([]);
  const [cevaplar, setCevaplar] = useState<Record<string, string | null>>({});
  const [index, setIndex] = useState(0);
  const [navAcik, setNavAcik] = useState(false);
  const [incelemeModu, setIncelemeModu] = useState(false);
  const dirty = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const baslat = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await sinavApi.katil(id);
      const v = data.veri;
      setKatilimId(v.katilim?.id);
      setBaslik(v.sinav?.baslik || v.baslik || 'Sınav');
      const liste: Soru[] = (v.sorular || []).slice().sort((a: Soru, b: Soru) => a.siraNo - b.siraNo);
      setSorular(liste);
      const map: Record<string, string | null> = {};
      for (const c of v.kayitliCevaplar || []) {
        map[c.soruId] = c.secilen ?? null;
      }
      setCevaplar(map);
      const inceleme = Boolean(v.incelemeModu);
      setIncelemeModu(inceleme);
      if (!inceleme && v.sureDakika) setKalanSn(v.sureDakika * 60);
      else setKalanSn(null);
    } catch (e) {
      Alert.alert('Sınav açılamadı', apiHataMesaji(e), [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    baslat();
  }, [baslat]);

  const cevapPayload = useMemo(
    () =>
      Object.entries(cevaplar).map(([soruId, secilen]) => ({
        soruId,
        secilen,
      })),
    [cevaplar],
  );

  const cevaplarRef = useRef(cevapPayload);
  useEffect(() => {
    cevaplarRef.current = cevapPayload;
  }, [cevapPayload]);

  const kaydetTaslak = useCallback(async () => {
    if (incelemeModu || !katilimId || !dirty.current) return;
    try {
      await sinavApi.taslak(katilimId, cevaplarRef.current);
      dirty.current = false;
    } catch {
      /* sessiz */
    }
  }, [katilimId, incelemeModu]);

  const bitir = useCallback(
    async (otomatik = false) => {
      if (incelemeModu || !katilimId) return;
      const onayla = () =>
        new Promise<boolean>((resolve) => {
          if (otomatik) {
            resolve(true);
            return;
          }
          const cevapli = Object.values(cevaplarRef.current).filter((c) => c.secilen).length;
          const toplam = Math.max(cevaplarRef.current.length, 1);
          Alert.alert(
            'Sınavı bitir',
            `${cevapli}/${toplam} soru cevaplandı. Cevapların gönderilecek. Emin misin?`,
            [
              { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Bitir', style: 'destructive', onPress: () => resolve(true) },
            ],
          );
        });
      if (!(await onayla())) return;
      setSaving(true);
      try {
        await sinavApi.bitir(katilimId, cevaplarRef.current);
        router.replace(`/sonuc/${katilimId}`);
      } catch (e) {
        Alert.alert('Gönderilemedi', apiHataMesaji(e));
      } finally {
        setSaving(false);
      }
    },
    [katilimId, incelemeModu],
  );

  const bitirRef = useRef(bitir);
  useEffect(() => {
    bitirRef.current = bitir;
  }, [bitir]);

  useEffect(() => {
    if (kalanSn == null) return;
    if (kalanSn <= 0) {
      Alert.alert('Süre doldu', 'Sınav otomatik gönderilecek.');
      void bitirRef.current(true);
      return;
    }
    const t = setTimeout(() => setKalanSn((s) => (s == null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [kalanSn]);

  useEffect(() => {
    const t = setInterval(() => {
      void kaydetTaslak();
    }, 25000);
    return () => clearInterval(t);
  }, [kaydetTaslak]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [index]);

  const sec = (harf: string) => {
    if (incelemeModu) return;
    const aktif = sorular[index];
    if (!aktif) return;
    setCevaplar((prev) => {
      const ayni = prev[aktif.id] === harf;
      return { ...prev, [aktif.id]: ayni ? null : harf };
    });
    dirty.current = true;
  };

  const git = (i: number) => {
    void kaydetTaslak();
    setIndex(i);
    setNavAcik(false);
  };

  const soru = sorular[index];
  const cevapliSayisi = useMemo(
    () => sorular.filter((s) => !!cevaplar[s.id]).length,
    [sorular, cevaplar],
  );
  const ilerleme = sorular.length ? cevapliSayisi / sorular.length : 0;
  const sureKritik = kalanSn != null && kalanSn < 300;
  const sureUyari = kalanSn != null && kalanSn < 60;
  const contentW = Math.max(280, width - 40);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Muted>Sınav yükleniyor…</Muted>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      {/* Üst çubuk */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Sınavdan çık"
          hitSlop={8}
          style={styles.iconBtn}
          onPress={() => {
            Alert.alert('Çıkış', 'Taslak kaydedilir. Çıkmak istiyor musun?', [
              { text: 'Kal', style: 'cancel' },
              {
                text: 'Çık',
                onPress: async () => {
                  await kaydetTaslak();
                  router.back();
                },
              },
            ]);
          }}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {baslik}
          </Text>
          <Text style={styles.topMeta}>
            {incelemeModu
              ? `İnceleme · Soru ${index + 1}/${sorular.length}`
              : `${cevapliSayisi}/${sorular.length} cevaplı · Soru ${index + 1}/${sorular.length}`}
          </Text>
        </View>

        {incelemeModu ? (
          <View style={[styles.timerPill, { backgroundColor: colors.warningSoft }]}>
            <Ionicons name="eye-outline" size={14} color="#B45309" />
            <Text style={[styles.timerText, { color: '#B45309' }]}>İncele</Text>
          </View>
        ) : kalanSn != null ? (
          <View
            style={[
              styles.timerPill,
              sureKritik && styles.timerWarn,
              sureUyari && styles.timerDanger,
            ]}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={sureUyari ? '#fff' : sureKritik ? '#B45309' : colors.primaryDark}
            />
            <Text
              style={[
                styles.timerText,
                sureKritik && { color: '#B45309' },
                sureUyari && { color: '#fff' },
              ]}
            >
              {sureFormat(kalanSn)}
            </Text>
          </View>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(ilerleme * 100)}%` }]} />
      </View>

      {/* Soru gövdesi */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {soru ? (
          <>
            <View style={styles.metaRow}>
              <View style={styles.qChip}>
                <Text style={styles.qChipText}>Soru {soru.siraNo}</Text>
              </View>
              {soru.konu?.ders ? (
                <View style={styles.dersChip}>
                  <Text style={styles.dersChipText} numberOfLines={1}>
                    {soru.konu.ders}
                    {soru.konu.ad ? ` · ${soru.konu.ad}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.questionCard}>
              <RenderHTML
                contentWidth={contentW}
                source={{ html: soru.metinHtml || '<p></p>' }}
                baseStyle={styles.questionHtml}
                tagsStyles={{
                  p: { marginTop: 0, marginBottom: 10 },
                  img: { maxWidth: contentW },
                }}
              />
              {soru.gorselUrl ? (
                <Image
                  source={{ uri: soru.gorselUrl }}
                  style={styles.qImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            <Text style={styles.optHint}>
              {incelemeModu
                ? 'İnceleme modu · cevaplar değiştirilemez'
                : 'Cevabını seç · aynı şıkka tekrar basınca kaldırılır'}
            </Text>

            <View style={styles.optList}>
              {Object.entries(soru.secenekler || {}).map(([harf, metin]) => {
                const secili = cevaplar[soru.id] === harf;
                return (
                  <Pressable
                    key={harf}
                    onPress={() => sec(harf)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: secili }}
                    style={({ pressed }) => [
                      styles.opt,
                      secili && styles.optOn,
                      pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                    ]}
                  >
                    <View style={[styles.optHarf, secili && styles.optHarfOn]}>
                      <Text style={[styles.optHarfText, secili && { color: '#fff' }]}>{harf}</Text>
                    </View>
                    <Text style={[styles.optText, secili && styles.optTextOn]}>{metin}</Text>
                    {secili ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    ) : (
                      <View style={styles.optRadio} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <Muted>Soru yok</Muted>
        )}
      </ScrollView>

      {/* Alt bar */}
      <View style={styles.bottom}>
        <View style={styles.navRow}>
          <Pressable
            accessibilityLabel="Önceki soru"
            disabled={index === 0}
            onPress={() => git(Math.max(0, index - 1))}
            style={({ pressed }) => [
              styles.navBtn,
              index === 0 && styles.navBtnDisabled,
              pressed && index > 0 && { opacity: 0.85 },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={index === 0 ? colors.textMuted : colors.text}
            />
            <Text style={[styles.navBtnText, index === 0 && { color: colors.textMuted }]}>
              Önceki
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Soru listesi"
            onPress={() => setNavAcik(true)}
            style={({ pressed }) => [styles.navCenter, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="grid-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.navCenterText}>
              {index + 1}/{sorular.length}
            </Text>
          </Pressable>

          {index < sorular.length - 1 ? (
            <Pressable
              accessibilityLabel="Sonraki soru"
              onPress={() => git(Math.min(sorular.length - 1, index + 1))}
              style={({ pressed }) => [styles.navBtnPrimary, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.navBtnPrimaryText}>Sonraki</Text>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </Pressable>
          ) : incelemeModu ? (
            <Pressable
              accessibilityLabel="İncelemeyi kapat"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.navBtnFinish, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.navBtnPrimaryText}>Kapat</Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="Sınavı bitir"
              disabled={saving}
              onPress={() => bitir(false)}
              style={({ pressed }) => [
                styles.navBtnFinish,
                saving && { opacity: 0.6 },
                pressed && !saving && { opacity: 0.9 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.navBtnPrimaryText}>Bitir</Text>
                  <Ionicons name="checkmark-done" size={20} color="#fff" />
                </>
              )}
            </Pressable>
          )}
        </View>

        {!incelemeModu && index < sorular.length - 1 ? (
          <Pressable style={styles.finishLink} onPress={() => bitir(false)} disabled={saving}>
            <Text style={styles.finishLinkText}>Sınavı şimdi bitir</Text>
          </Pressable>
        ) : null}
        {incelemeModu && katilimId ? (
          <Pressable style={styles.finishLink} onPress={() => router.push(`/sonuc/${katilimId}`)}>
            <Text style={[styles.finishLinkText, { color: colors.primaryDark }]}>Sonuçları gör</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Soru navigatörü */}
      <Modal visible={navAcik} animationType="slide" transparent onRequestClose={() => setNavAcik(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setNavAcik(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Sorular</Text>
              <Text style={styles.sheetSub}>
                {cevapliSayisi} cevaplı · {sorular.length - cevapliSayisi} boş
              </Text>
            </View>

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Cevaplı</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendCurrent]} />
                <Text style={styles.legendText}>Şu an</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.border }]} />
                <Text style={styles.legendText}>Boş</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
              {sorular.map((s, i) => {
                const answered = !!cevaplar[s.id];
                const aktif = i === index;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => git(i)}
                    style={[
                      styles.gridCell,
                      answered && styles.gridDone,
                      aktif && styles.gridActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.gridText,
                        answered && { color: colors.primaryDark },
                        aktif && { color: '#fff' },
                      ]}
                    >
                      {i + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable style={styles.sheetClose} onPress={() => setNavAcik(false)}>
              <Text style={styles.sheetCloseText}>Kapat</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: { flex: 1, minWidth: 0 },
  topTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
  topMeta: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    minHeight: 36,
  },
  timerWarn: { backgroundColor: colors.warningSoft },
  timerDanger: { backgroundColor: colors.danger },
  timerText: { fontWeight: '800', fontSize: 13, color: colors.primaryDark, fontVariant: ['tabular-nums'] },
  progressTrack: {
    height: 4,
    backgroundColor: colors.bgMuted,
    marginHorizontal: spacing.md,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  body: { paddingHorizontal: spacing.md, paddingTop: 14, paddingBottom: 28 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  qChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  qChipText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  dersChip: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    maxWidth: '75%',
  },
  dersChipText: { color: colors.textSecondary, fontWeight: '600', fontSize: 12 },
  questionCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  questionHtml: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
  },
  qImage: {
    width: '100%',
    height: 200,
    marginTop: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bgMuted,
  },
  optHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 10,
  },
  optList: { gap: 10 },
  opt: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.bgElevated,
    minHeight: 56,
  },
  optOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optHarf: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optHarfOn: { backgroundColor: colors.primary },
  optHarfText: { fontWeight: '800', color: colors.text, fontSize: 15 },
  optText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  optTextOn: { color: colors.primaryDark, fontWeight: '700' },
  optRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.bgElevated,
    gap: 6,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  navBtnDisabled: { opacity: 0.55 },
  navBtnText: { fontWeight: '700', color: colors.text, fontSize: 14 },
  navCenter: {
    minWidth: 72,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navCenterText: { fontWeight: '800', color: colors.primaryDark, fontSize: 13 },
  navBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  navBtnFinish: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDark,
  },
  navBtnPrimaryText: { fontWeight: '800', color: '#fff', fontSize: 14 },
  finishLink: { alignItems: 'center', paddingVertical: 6 },
  finishLinkText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,47,43,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.md,
    paddingBottom: 28,
    maxHeight: '72%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: 10,
    marginBottom: 12,
  },
  sheetHead: { marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheetSub: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  legend: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendCurrent: { backgroundColor: colors.primaryDark, borderWidth: 2, borderColor: colors.accent },
  legendText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
  },
  gridCell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridDone: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  gridActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  gridText: { fontWeight: '800', color: colors.text, fontSize: 14 },
  sheetClose: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.bgMuted,
  },
  sheetCloseText: { fontWeight: '800', color: colors.text, fontSize: 14 },
});
