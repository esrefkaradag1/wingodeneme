import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import * as ImagePicker from 'expo-image-picker';
import { apiHataMesaji, authApi, kullaniciApi } from '../../src/api/client';
import { Avatar } from '../../src/components/Avatar';
import { Badge, Card, Field, Muted, PrimaryButton, Title } from '../../src/components/ui';
import {
  KPSS_SINIFLAR,
  YKS_LGS_SINIFLAR,
  siniftanOgretimTuru,
  tcKimlikNoGecerliMi,
  tcKimlikNoNormalize,
} from '../../src/lib/profil';
import { useAuthStore } from '../../src/store/auth';
import { colors, radius, spacing } from '../../src/theme/colors';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value?.trim() ? value : '—'}</Text>
    </View>
  );
}

export default function ProfilScreen() {
  const kullanici = useAuthStore((s) => s.kullanici);
  const platformMode = useAuthStore((s) => s.platformMode);
  const setKullanici = useAuthStore((s) => s.setKullanici);
  const cikisYap = useAuthStore((s) => s.cikisYap);

  const [duzenleModu, setDuzenleModu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sifreSaving, setSifreSaving] = useState(false);
  const [kocSaving, setKocSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(kullanici?.avatarUrl || null);

  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [okul, setOkul] = useState('');
  const [sehir, setSehir] = useState('');
  const [ilce, setIlce] = useState('');
  const [adres, setAdres] = useState('');
  const [tcKimlikNo, setTcKimlikNo] = useState('');
  const [sinif, setSinif] = useState('');
  const [hedefUniversite, setHedefUniversite] = useState('');
  const [hedefBolum, setHedefBolum] = useState('');
  const [koc, setKoc] = useState<any>(null);
  const [kocKod, setKocKod] = useState('');

  const [mevcutSifre, setMevcutSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');

  const platformEtiket = platformMode === 'kpss' ? 'KPSS' : 'YKS / LGS';
  const sinifSecenekleri = platformMode === 'kpss' ? KPSS_SINIFLAR : YKS_LGS_SINIFLAR;
  const lgs = platformMode !== 'kpss' && siniftanOgretimTuru(sinif) === 'LGS';

  const sinifEtiket = useMemo(() => {
    const found = sinifSecenekleri.find((s) => s.value === sinif);
    return found?.etiket || sinif || null;
  }, [sinif, sinifSecenekleri]);

  const yukle = useCallback(async () => {
    try {
      const { data } = await kullaniciApi.profil();
      const p = data.veri || {};
      const mevcut = useAuthStore.getState().kullanici;
      setAd(p.ad || '');
      setSoyad(p.soyad || '');
      setEmail(p.kullanici?.email || mevcut?.email || '');
      setTelefon(p.kullanici?.telefon || p.telefon || '');
      setOkul(p.okul || '');
      setSehir(p.sehir || '');
      setIlce(p.ilce || '');
      setAdres(p.adres || '');
      setTcKimlikNo(p.tcKimlikNo || '');
      setSinif(p.sinif || p.ogretimTuru || '');
      setHedefUniversite(p.hedefUniversite || '');
      setHedefBolum(p.hedefBolum || '');
      setKoc(p.koc || null);
      const url = p.avatarUrl || mevcut?.avatarUrl || null;
      setAvatarUrl(url);
      if (url && mevcut && mevcut.avatarUrl !== url) {
        setKullanici({ ...mevcut, avatarUrl: url });
      }
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e, 'Profil yüklenemedi'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setKullanici]);

  useFocusEffect(
    useCallback(() => {
      setDuzenleModu(false);
      yukle();
    }, [yukle]),
  );

  const gorunenAd = useMemo(
    () => [ad, soyad].filter(Boolean).join(' ') || kullanici?.ad || 'Öğrenci',
    [ad, soyad, kullanici?.ad],
  );

  const avatarGuncelle = async (kaynak: 'galeri' | 'kamera') => {
    try {
      if (kaynak === 'galeri') {
        const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!izin.granted) {
          Alert.alert('İzin gerekli', 'Profil fotoğrafı için galeri izni verin.');
          return;
        }
      } else {
        const izin = await ImagePicker.requestCameraPermissionsAsync();
        if (!izin.granted) {
          Alert.alert('İzin gerekli', 'Profil fotoğrafı için kamera izni verin.');
          return;
        }
      }

      const secenekler: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.72,
        exif: false,
      };

      const sonuc =
        kaynak === 'galeri'
          ? await ImagePicker.launchImageLibraryAsync(secenekler)
          : await ImagePicker.launchCameraAsync(secenekler);

      if (sonuc.canceled || !sonuc.assets?.[0]?.uri) return;
      const asset = sonuc.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const uzanti = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';

      const form = new FormData();
      form.append('dosya', {
        uri: asset.uri,
        name: `avatar.${uzanti}`,
        type: mime.startsWith('image/') ? mime : 'image/jpeg',
      } as any);

      setAvatarSaving(true);
      const { data } = await kullaniciApi.avatarYukle(form);
      const yeniUrl = data?.veri?.avatarUrl || null;
      if (!yeniUrl) {
        Alert.alert('Hata', 'Fotoğraf kaydedildi ama URL alınamadı. Tekrar dene.');
        return;
      }
      // Cache-bust: aynı path olsa bile Image yenilensin
      const gosterUrl = yeniUrl.includes('?') ? `${yeniUrl}&v=${Date.now()}` : `${yeniUrl}?v=${Date.now()}`;
      setAvatarUrl(gosterUrl);
      const mevcut = useAuthStore.getState().kullanici;
      if (mevcut) setKullanici({ ...mevcut, avatarUrl: yeniUrl });
      Alert.alert('Tamam', 'Profil fotoğrafın güncellendi.');
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e, 'Fotoğraf yüklenemedi'));
    } finally {
      setAvatarSaving(false);
    }
  };

  const avatarSec = () => {
    Alert.alert('Profil fotoğrafı', 'Nasıl eklemek istersin?', [
      { text: 'Galeriden seç', onPress: () => void avatarGuncelle('galeri') },
      { text: 'Kamera ile çek', onPress: () => void avatarGuncelle('kamera') },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const vazgec = () => {
    setDuzenleModu(false);
    setMevcutSifre('');
    setYeniSifre('');
    setYeniSifreTekrar('');
    setKocKod('');
    yukle();
  };

  const kaydet = async () => {
    if (!ad.trim() || !soyad.trim()) {
      Alert.alert('Eksik', 'Ad ve soyad zorunludur.');
      return;
    }
    const tc = tcKimlikNoNormalize(tcKimlikNo);
    if (tc && !tcKimlikNoGecerliMi(tc)) {
      Alert.alert('Geçersiz', 'Geçerli bir TC kimlik numarası girin.');
      return;
    }
    setSaving(true);
    try {
      await kullaniciApi.profilGuncelle({
        ad: ad.trim(),
        soyad: soyad.trim(),
        telefon: telefon.trim() || null,
        okul: okul.trim() || null,
        sehir: sehir.trim() || null,
        ilce: ilce.trim() || null,
        adres: adres.trim() || null,
        tcKimlikNo: tc || null,
        sinif: sinif || null,
        hedefUniversite: lgs ? null : hedefUniversite.trim() || null,
        hedefBolum: lgs ? null : hedefBolum.trim() || null,
      });

      let yeniKullanici = {
        ...(kullanici || { id: '', email: email, rol: 'OGRENCI' }),
        ad: ad.trim(),
        soyad: soyad.trim(),
        avatarUrl: avatarUrl,
        ogretimTuru:
          platformMode === 'kpss'
            ? sinif || kullanici?.ogretimTuru
            : siniftanOgretimTuru(sinif) || kullanici?.ogretimTuru,
      };
      try {
        const me = await authApi.me();
        const v = me.data.veri;
        if (v?.kullanici) {
          yeniKullanici = {
            id: v.kullanici.id,
            email: v.kullanici.email,
            rol: v.kullanici.rol,
            ad: v.ogrenciProfil?.ad ?? ad.trim(),
            soyad: v.ogrenciProfil?.soyad ?? soyad.trim(),
            ogretimTuru:
              v.ogrenciProfil?.ogretimTuru ??
              siniftanOgretimTuru(sinif) ??
              kullanici?.ogretimTuru,
            avatarUrl: v.ogrenciProfil?.avatarUrl ?? v.kullanici.avatarUrl ?? avatarUrl,
          };
        }
      } catch {
        /* ignore */
      }
      setKullanici(yeniKullanici);
      setDuzenleModu(false);
      Alert.alert('Kaydedildi', 'Profiliniz canlı sistemde güncellendi.');
      yukle();
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e, 'Profil güncellenemedi'));
    } finally {
      setSaving(false);
    }
  };

  const sifreKaydet = async () => {
    if (yeniSifre !== yeniSifreTekrar) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor.');
      return;
    }
    if (yeniSifre.length < 8 || !/[A-Z]/.test(yeniSifre) || !/[0-9]/.test(yeniSifre)) {
      Alert.alert('Hata', 'Şifre en az 8 karakter, bir büyük harf ve bir rakam içermeli.');
      return;
    }
    if (!mevcutSifre) {
      Alert.alert('Eksik', 'Mevcut şifrenizi girin.');
      return;
    }
    setSifreSaving(true);
    try {
      await kullaniciApi.sifreDegistir({ mevcutSifre, yeniSifre });
      setMevcutSifre('');
      setYeniSifre('');
      setYeniSifreTekrar('');
      Alert.alert('Tamam', 'Şifreniz güncellendi.');
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e, 'Şifre güncellenemedi'));
    } finally {
      setSifreSaving(false);
    }
  };

  const kocBagla = async () => {
    if (!kocKod.trim()) return;
    setKocSaving(true);
    try {
      const { data } = await kullaniciApi.kocReferansBagla(kocKod.trim());
      const zaten = Boolean(data?.veri?.zatenBagli);
      Alert.alert('Bağlantı', zaten ? 'Zaten bu koça bağlısınız.' : 'Koç / kurum bağlantısı kuruldu.');
      setKocKod('');
      yukle();
    } catch (e) {
      Alert.alert('Hata', apiHataMesaji(e, 'Referans kodu bağlanamadı'));
    } finally {
      setKocSaving(false);
    }
  };

  const cikis = () => {
    Alert.alert('Çıkış', 'Oturumu kapatmak istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış yap',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.cikis();
          } catch {
            /* ignore */
          }
          cikisYap();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
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
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Title>Profil</Title>
                <Muted>{duzenleModu ? 'Bilgilerini güncelle' : 'Hesap özeti'}</Muted>
              </View>
              {!duzenleModu ? (
                <Pressable style={styles.editBtn} onPress={() => setDuzenleModu(true)}>
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.editBtnText}>Düzenle</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.cancelBtn} onPress={vazgec}>
                  <Text style={styles.cancelBtnText}>Vazgeç</Text>
                </Pressable>
              )}
            </View>

            <Card style={{ marginTop: spacing.md }}>
              <Pressable
                style={styles.avatarWrap}
                onPress={avatarSec}
                disabled={avatarSaving}
                accessibilityRole="button"
                accessibilityLabel="Profil fotoğrafı değiştir"
              >
                <Avatar uri={avatarUrl} name={gorunenAd} size={72} />
                <View style={styles.avatarBadge}>
                  {avatarSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={14} color="#fff" />
                  )}
                </View>
              </Pressable>
              <Text style={styles.name}>{gorunenAd}</Text>
              <Muted>{email}</Muted>
              <Pressable onPress={avatarSec} disabled={avatarSaving} style={{ marginTop: 8 }}>
                <Text style={styles.avatarHint}>
                  {avatarSaving ? 'Yükleniyor…' : 'Fotoğrafı değiştir'}
                </Text>
              </Pressable>
              <View style={styles.badgeRow}>
                <Badge label={kullanici?.rol || 'OGRENCI'} />
                <Badge label={platformEtiket} />
                {sinifEtiket ? <Badge label={sinifEtiket} tone="amber" /> : null}
              </View>
            </Card>

            {!duzenleModu ? (
              <>
                <Card style={{ marginTop: spacing.md }}>
                  <Text style={styles.section}>Kişisel bilgiler</Text>
                  <InfoRow label="Telefon" value={telefon} />
                  <InfoRow label={platformMode === 'kpss' ? 'Seviye' : 'Sınıf'} value={sinifEtiket} />
                  <InfoRow label="Okul" value={okul} />
                  <InfoRow label="Şehir" value={sehir} />
                  <InfoRow label="İlçe" value={ilce} />
                  {!lgs && platformMode !== 'kpss' ? (
                    <>
                      <InfoRow label="Hedef üniversite" value={hedefUniversite} />
                      <InfoRow label="Hedef bölüm" value={hedefBolum} />
                    </>
                  ) : null}
                </Card>

                <Card style={{ marginTop: spacing.md }}>
                  <Text style={styles.section}>Fatura</Text>
                  <InfoRow
                    label="TC kimlik"
                    value={tcKimlikNo ? `${tcKimlikNo.slice(0, 3)}*****${tcKimlikNo.slice(-2)}` : null}
                  />
                  <InfoRow label="Adres" value={adres} />
                </Card>

                <Card style={{ marginTop: spacing.md }}>
                  <Text style={styles.section}>Koç / kurum</Text>
                  {koc ? (
                    <View style={styles.kocBox}>
                      <Text style={styles.kocName}>
                        {[koc.ad, koc.soyad].filter(Boolean).join(' ')}
                        {koc.kurumAdi ? ` · ${koc.kurumAdi}` : ''}
                      </Text>
                      <Muted>
                        {koc.tip === 'KURUMSAL' ? 'Kurumsal' : 'Koç'} · Kod: {koc.referansKod}
                      </Muted>
                    </View>
                  ) : (
                    <Muted>Henüz koç bağlantısı yok. Düzenle’den bağlayabilirsin.</Muted>
                  )}
                </Card>

                <Card style={{ marginTop: spacing.md }}>
                  <Text style={styles.section}>Uygulama modu</Text>
                  <Text style={styles.modeLocked}>{platformEtiket}</Text>
                  <Muted>
                    Mod girişte seçilir ve oturum boyunca kilitlidir. Değiştirmek için çıkış yapıp
                    diğer modla tekrar giriş yapın.
                  </Muted>
                </Card>

                <Card style={{ marginTop: spacing.md }}>
                  <Text style={styles.section}>Bildirimler</Text>
                  <Muted>
                    Sınav hatırlatması ve duyurular için cihaz bildirimi. İzin diyaloğu çıkmazsa
                    buradan tekrar dene.
                  </Muted>
                  <View style={{ marginTop: 12 }}>
                    <PrimaryButton
                      label="Bildirimleri aç"
                      onPress={() => {
                        void import('../../src/lib/push').then((m) => m.pushBildirimleriAc());
                      }}
                    />
                  </View>
                </Card>

                <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
                  <PrimaryButton label="Çıkış Yap" onPress={cikis} variant="danger" />
                </View>
              </>
            ) : (
              <>
                <Card style={{ marginTop: spacing.md, gap: 12 }}>
                  <Text style={styles.section}>Hesap bilgileri</Text>
                  <Field label="Ad" value={ad} onChangeText={setAd} autoCapitalize="words" />
                  <Field label="Soyad" value={soyad} onChangeText={setSoyad} autoCapitalize="words" />
                  <Field label="E-posta" value={email} editable={false} />
                  <Field
                    label="Telefon"
                    value={telefon}
                    onChangeText={setTelefon}
                    keyboardType="phone-pad"
                    placeholder="05xx xxx xx xx"
                  />

                  <Text style={styles.chipLabel}>
                    {platformMode === 'kpss' ? 'KPSS seviyesi' : 'Sınıf'}
                  </Text>
                  <View style={styles.chips}>
                    {sinifSecenekleri.map((s) => {
                      const on = sinif === s.value;
                      return (
                        <Pressable
                          key={s.value}
                          style={[styles.chip, on && styles.chipOn]}
                          onPress={() => setSinif(s.value)}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.etiket}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Field label="Okul" value={okul} onChangeText={setOkul} />
                  <Field label="Şehir" value={sehir} onChangeText={setSehir} />
                  <Field label="İlçe" value={ilce} onChangeText={setIlce} />

                  {!lgs && platformMode !== 'kpss' ? (
                    <>
                      <Field
                        label="Hedef üniversite"
                        value={hedefUniversite}
                        onChangeText={setHedefUniversite}
                      />
                      <Field label="Hedef bölüm" value={hedefBolum} onChangeText={setHedefBolum} />
                    </>
                  ) : null}
                </Card>

                <Card style={{ marginTop: spacing.md, gap: 12 }}>
                  <Text style={styles.section}>Fatura bilgileri</Text>
                  <Field
                    label="TC kimlik no"
                    value={tcKimlikNo}
                    onChangeText={(t) => setTcKimlikNo(tcKimlikNoNormalize(t))}
                    keyboardType="number-pad"
                    maxLength={11}
                    placeholder="11 haneli TC"
                  />
                  <Field
                    label="Açık adres"
                    value={adres}
                    onChangeText={setAdres}
                    multiline
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
                    placeholder="Mahalle, sokak, bina/daire"
                  />
                </Card>

                <Card style={{ marginTop: spacing.md, gap: 12 }}>
                  <Text style={styles.section}>Koç / kurum bağlantısı</Text>
                  {koc ? (
                    <View style={styles.kocBox}>
                      <Text style={styles.kocName}>
                        {[koc.ad, koc.soyad].filter(Boolean).join(' ')}
                        {koc.kurumAdi ? ` · ${koc.kurumAdi}` : ''}
                      </Text>
                      <Muted>
                        {koc.tip === 'KURUMSAL' ? 'Kurumsal' : 'Koç'} · Kod: {koc.referansKod}
                      </Muted>
                    </View>
                  ) : (
                    <>
                      <Field
                        label="Referans kodu"
                        value={kocKod}
                        onChangeText={(t) => setKocKod(t.toUpperCase())}
                        autoCapitalize="characters"
                        placeholder="WINGO-XXXXXX"
                      />
                      <PrimaryButton
                        label="Bağla"
                        onPress={kocBagla}
                        loading={kocSaving}
                        disabled={!kocKod.trim()}
                      />
                    </>
                  )}
                </Card>

                <Card style={{ marginTop: spacing.md, gap: 12 }}>
                  <Text style={styles.section}>Şifre değiştir</Text>
                  <Field
                    label="Mevcut şifre"
                    value={mevcutSifre}
                    onChangeText={setMevcutSifre}
                    secureTextEntry
                  />
                  <Field
                    label="Yeni şifre"
                    value={yeniSifre}
                    onChangeText={setYeniSifre}
                    secureTextEntry
                  />
                  <Field
                    label="Yeni şifre (tekrar)"
                    value={yeniSifreTekrar}
                    onChangeText={setYeniSifreTekrar}
                    secureTextEntry
                  />
                  <PrimaryButton
                    label="Şifreyi güncelle"
                    onPress={sifreKaydet}
                    loading={sifreSaving}
                  />
                </Card>

                <View style={{ marginTop: spacing.lg, gap: 10, marginBottom: spacing.xl }}>
                  <PrimaryButton label="Değişiklikleri kaydet" onPress={kaydet} loading={saving} />
                  <PrimaryButton label="Vazgeç" variant="ghost" onPress={vazgec} />
                </View>
              </>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 48 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginTop: 4,
  },
  editBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    marginTop: 4,
  },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  avatarWrap: { width: 72, height: 72, marginBottom: 12, alignSelf: 'flex-start' },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  infoRow: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  infoLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  chipLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  chipTextOn: { color: colors.primaryDark },
  kocBox: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  kocName: { fontWeight: '800', color: colors.text, marginBottom: 4 },
  modeLocked: { fontSize: 18, fontWeight: '800', color: colors.primaryDark, marginVertical: 6 },
});
