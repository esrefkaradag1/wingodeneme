import { useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
  backgroundColor?: string;
};

/** Profil fotoğrafı; yüklenemezse baş harf gösterir. */
export function Avatar({
  uri,
  name,
  size = 64,
  style,
  textColor = colors.primaryDark,
  backgroundColor = colors.primarySoft,
}: Props) {
  const [bozuk, setBozuk] = useState(false);
  const harf = String(name || 'W').trim().charAt(0).toUpperCase() || 'W';
  const radius = Math.round(size * 0.3);
  const goster = Boolean(uri) && !bozuk;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: goster ? colors.bgMuted : backgroundColor,
        },
        style,
      ]}
    >
      {goster ? (
        <Image
          source={{ uri: uri! }}
          style={{ width: size, height: size, borderRadius: radius }}
          onError={() => setBozuk(true)}
        />
      ) : (
        <Text style={[styles.harf, { fontSize: size * 0.4, color: textColor }]}>{harf}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  harf: { fontWeight: '800' },
});
