import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiHataMesaji, sinavApi } from '../../src/api/client';
import { Card, Muted, PrimaryButton, Title } from '../../src/components/ui';
import { colors, spacing } from '../../src/theme/colors';

function paramId(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return String(v[0] || '');
  return String(v || '');
}

function sayi(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function SonucScreen() {
  const params = useLocalSearchParams<{ katilimId: string | string[] }>();
  const katilimId = paramId(params.katilimId);
  const [loading, setLoading] = useState(true);
  const [sonuc, setSonuc] = useState<any>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    (async () => {
      if (!katilimId) {
        setHata('Katılım bulunamadı');
        setLoading(false);
        return;
      }
      setLoading(true);
      setHata(null);
      try {
        const { data } = await sinavApi.sonuc(katilimId);
        if (!iptal) setSonuc(data?.veri ?? null);
      } catch (e) {
        if (!iptal) {
          setSonuc(null);
          setHata(apiHataMesaji(e));
        }
      } finally {
        if (!iptal) setLoading(false);
      }
    })();
    return () => {
      iptal = true;
    };
  }, [katilimId]);

  const ozet = useMemo(() => {
    const s = sonuc || {};
    const net = sayi(s.netPuan ?? s.net ?? s.ozet?.net ?? s.ozet?.netPuan);
    const dogru = sayi(s.dogruSayisi ?? s.dogru ?? s.ozet?.dogru);
    const yanlis = sayi(s.yanlisSayisi ?? s.yanlis ?? s.ozet?.yanlis);
    const bos = sayi(s.bosSayisi ?? s.bos ?? s.ozet?.bos);
    const ham = sayi(s.hamPuan ?? s.ozet?.hamPuan);
    const sira = sayi(s.gosterilenSiralama ?? s.ulusalSiralama ?? s.siralama);
    const havuz = sayi(s.siralamaHavuz ?? s.tahminiSiralama?.havuz);
    const baslik = s.sinav?.baslik || s.sinavBaslik || 'Deneme sonucu';
    const tur = s.sinav?.tur || s.sinavTur || null;
    const sinavId = s.sinavId || s.sinav?.id || null;
    const konular: any[] = Array.isArray(s.konuAnalizi)
      ? s.konuAnalizi.filter((k) => Number(k.dogru || 0) + Number(k.yanlis || 0) > 0).slice(0, 8)
      : [];
    return { net, dogru, yanlis, bos, ham, sira, havuz, baslik, tur, sinavId, konular };
  }, [sonuc]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
          <Text style={styles.backText}>Sınavlar</Text>
        </Pressable>

        <Title>{ozet.baslik}</Title>
        <Muted>{ozet.tur ? `${ozet.tur} · Deneme özeti` : 'Deneme özeti'}</Muted>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : hata ? (
          <Card style={{ marginTop: 16 }}>
            <Text style={{ color: colors.danger }}>{hata}</Text>
          </Card>
        ) : !sonuc ? (
          <Card style={{ marginTop: 16 }}>
            <Text style={{ color: colors.textSecondary }}>Sonuç bulunamadı.</Text>
          </Card>
        ) : (
          <>
            <Card style={styles.hero}>
              <Muted>Toplam net</Muted>
              <Text style={styles.big}>{ozet.net != null ? ozet.net.toFixed(2) : '—'}</Text>
              {ozet.ham != null ? (
                <Text style={styles.heroSub}>Başarı puanı %{ozet.ham.toFixed(1)}</Text>
              ) : null}
            </Card>

            <View style={styles.row}>
              <Card style={styles.stat}>
                <Muted>Doğru</Muted>
                <Text style={[styles.statVal, { color: colors.success }]}>
                  {ozet.dogru ?? '—'}
                </Text>
              </Card>
              <Card style={styles.stat}>
                <Muted>Yanlış</Muted>
                <Text style={[styles.statVal, { color: colors.danger }]}>
                  {ozet.yanlis ?? '—'}
                </Text>
              </Card>
              <Card style={styles.stat}>
                <Muted>Boş</Muted>
                <Text style={styles.statVal}>{ozet.bos ?? '—'}</Text>
              </Card>
            </View>

            <Card style={{ marginTop: 12 }}>
              <Muted>
                {ozet.havuz != null
                  ? `Sıralama / ${ozet.havuz.toLocaleString('tr-TR')}`
                  : 'Sıralama'}
              </Muted>
              <Text style={styles.rank}>
                {ozet.sira != null ? `#${ozet.sira.toLocaleString('tr-TR')}` : '—'}
              </Text>
            </Card>

            {ozet.konular.length > 0 ? (
              <View style={{ marginTop: spacing.lg, gap: 8 }}>
                <Text style={styles.sectionTitle}>Konu özeti</Text>
                {ozet.konular.map((k, i) => (
                  <Card key={`${k.ders}-${k.konu}-${i}`} style={styles.konuCard}>
                    <Text style={styles.konuTitle}>
                      {k.ders ? `${k.ders} · ` : ''}
                      {k.konu || 'Konu'}
                    </Text>
                    <Text style={styles.konuMeta}>
                      {Number(k.dogru || 0)}D · {Number(k.yanlis || 0)}Y · {Number(k.bos || 0)}B
                      {k.basariYuzdesi != null
                        ? ` · %${Number(k.basariYuzdesi).toFixed(0)}`
                        : ''}
                    </Text>
                  </Card>
                ))}
              </View>
            ) : null}
          </>
        )}

        <View style={{ marginTop: spacing.xl, gap: 10 }}>
          {ozet.sinavId ? (
            <PrimaryButton
              label="Soruları İncele"
              onPress={() => router.push(`/sinav/${ozet.sinavId}`)}
            />
          ) : null}
          <PrimaryButton
            label="Analize git"
            variant="ghost"
            onPress={() => router.replace('/(tabs)/analiz')}
          />
          <PrimaryButton
            label="Ana sayfa"
            variant="ghost"
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 10, alignSelf: 'flex-start' },
  backText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  hero: { marginTop: spacing.md, backgroundColor: colors.primarySoft, borderColor: colors.borderStrong },
  big: { fontSize: 40, fontWeight: '800', color: colors.primaryDark, marginTop: 4 },
  heroSub: { marginTop: 6, color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { flex: 1 },
  statVal: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  rank: { fontSize: 28, fontWeight: '800', color: colors.warning, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  konuCard: { paddingVertical: 12 },
  konuTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  konuMeta: { marginTop: 4, fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
});
