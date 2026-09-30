import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/colors';
import { Title, Muted } from './ui';

export function ScreenHeader({
  title,
  subtitle,
  back = true,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {back ? (
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.primaryDark} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={{ flex: 1 }}>
          <Title>{title}</Title>
          {subtitle ? <Muted>{subtitle}</Muted> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
});
