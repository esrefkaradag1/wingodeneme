import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiHataMesaji, destekApi, listeyeCevir } from '../src/api/client';
import { Badge, Card, EmptyState, Muted, PrimaryButton } from '../src/components/ui';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, radius, spacing } from '../src/theme/colors';

const DURUM_ETIKET: Record<string, { label: string; tone: 'teal' | 'amber' | 'rose' }> = {
  ACIK: { label: 'Açık', tone: 'teal' },
  BEKLEMEDE: { label: 'Yanıtlandı', tone: 'amber' },
  COZULDU: { label: 'Çözüldü', tone: 'teal' },
  KAPANDI: { label: 'Kapandı', tone: 'rose' },
};

export default function DestekScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liste, setListe] = useState<any[]>([]);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [detay, setDetay] = useState<any>(null);
  const [detayLoading, setDetayLoading] = useState(false);
  const [yeniAcik, setYeniAcik] = useState(false);
  const [baslik, setBaslik] = useState('');
  const [ilkMesaj, setIlkMesaj] = useState('');
  const [yanit, setYanit] = useState('');
  const [sending, setSending] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const { data } = await destekApi.liste();
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

  const acDetay = async (id: string) => {
    setSeciliId(id);
    setDetayLoading(true);
    setDetay(null);
    try {
      const { data } = await destekApi.detay(id);
      setDetay(data.veri);
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e));
      setSeciliId(null);
    } finally {
      setDetayLoading(false);
    }
  };

  const olustur = async () => {
    if (baslik.trim().length < 3 || ilkMesaj.trim().length < 2) {
      Alert.alert('Eksik', 'Başlık en az 3, mesaj en az 2 karakter olmalı.');
      return;
    }
    setSending(true);
    try {
      const { data } = await destekApi.olustur({
        baslik: baslik.trim(),
        mesaj: ilkMesaj.trim(),
      });
      setYeniAcik(false);
      setBaslik('');
      setIlkMesaj('');
      await yukle();
      const id = data?.veri?.id;
      if (id) acDetay(id);
      else Alert.alert('Oluşturuldu', 'Destek talebiniz alındı.');
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e));
    } finally {
      setSending(false);
    }
  };

  const mesajGonder = async () => {
    if (!seciliId || !yanit.trim()) return;
    setSending(true);
    try {
      await destekApi.mesaj(seciliId, yanit.trim());
      setYanit('');
      const { data } = await destekApi.detay(seciliId);
      setDetay(data.veri);
      yukle();
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e));
    } finally {
      setSending(false);
    }
  };

  const mesajlar: any[] = Array.isArray(detay?.mesajlar)
    ? detay.mesajlar
    : listeyeCevir(detay?.mesajlar);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader title="Destek Talebi" subtitle="Yardım merkezi" />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(item, i) => item.id || String(i)}
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
          ListHeaderComponent={
            <PrimaryButton
              label="+ Yeni talep"
              onPress={() => setYeniAcik(true)}
            />
          }
          ListEmptyComponent={
            <EmptyState title="Talep yok" desc="Yeni talep oluşturarak destek alabilirsin." />
          }
          renderItem={({ item }) => {
            const d = DURUM_ETIKET[item.durum] || { label: item.durum || '—', tone: 'amber' as const };
            return (
              <Pressable onPress={() => acDetay(item.id)}>
                <Card>
                  <View style={styles.row}>
                    <Badge label={d.label} tone={d.tone} />
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </View>
                  <Text style={styles.title}>{item.baslik || item.konu || 'Talep'}</Text>
                  <Muted>
                    {item.sonMesajAt || item.olusturuldu
                      ? new Date(item.sonMesajAt || item.olusturuldu).toLocaleString('tr-TR')
                      : '—'}
                  </Muted>
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={!!seciliId} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={styles.modalHead}>
            <Pressable onPress={() => setSeciliId(null)} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {detay?.baslik || 'Talep'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          {detayLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
              <ScrollView
                contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
              >
                {mesajlar.map((m) => {
                  const benim = m.gonderenRol === 'OGRENCI';
                  return (
                    <View
                      key={m.id}
                      style={[styles.bubble, benim ? styles.bubbleMe : styles.bubbleThem]}
                    >
                      <Text style={[styles.bubbleText, benim && { color: '#fff' }]}>
                        {m.mesaj}
                      </Text>
                      <Text style={[styles.bubbleTime, benim && { color: 'rgba(255,255,255,0.7)' }]}>
                        {m.olusturuldu
                          ? new Date(m.olusturuldu).toLocaleString('tr-TR')
                          : ''}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
              <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TextInput
                  value={yanit}
                  onChangeText={setYanit}
                  placeholder="Yanıt yaz…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.composerInput}
                  multiline
                />
                <Pressable style={styles.send} onPress={mesajGonder} disabled={sending}>
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={yeniAcik}
        animationType="slide"
        transparent
        onRequestClose={() => {
          Keyboard.dismiss();
          setYeniAcik(false);
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.overlay}
            onPress={() => {
              Keyboard.dismiss();
              setYeniAcik(false);
            }}
          >
            <Pressable
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.sheetHandle} />
              <Text style={[styles.modalTitle, { marginBottom: 4 }]}>Yeni destek talebi</Text>
              <Muted>Başlık ve mesajını yaz, sonra Oluştur’a bas.</Muted>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingTop: 12, paddingBottom: 8 }}
              >
                <TextInput
                  value={baslik}
                  onChangeText={setBaslik}
                  placeholder="Başlık"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  returnKeyType="next"
                />
                <TextInput
                  value={ilkMesaj}
                  onChangeText={setIlkMesaj}
                  placeholder="Mesajınız"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]}
                  multiline
                />
                <PrimaryButton label="Oluştur" onPress={olustur} loading={sending} />
                <PrimaryButton
                  label="Vazgeç"
                  variant="ghost"
                  onPress={() => {
                    Keyboard.dismiss();
                    setYeniAcik(false);
                  }}
                />
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1, textAlign: 'center' },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    maxHeight: 100,
    color: colors.text,
    backgroundColor: colors.bgElevated,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    maxHeight: '88%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.bg,
    fontSize: 15,
  },
});
