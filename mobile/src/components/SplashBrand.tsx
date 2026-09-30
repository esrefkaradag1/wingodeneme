import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

/** Marka splash — logo + slogan */
export function SplashBrand() {
  return (
    <LinearGradient
      colors={['#F0FDFA', '#FFFFFF', '#F7FBFA']}
      locations={[0, 0.55, 1]}
      style={styles.wrap}
    >
      <View style={styles.center}>
        <View style={styles.logoCard}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
            <Text style={styles.brand}>WingoDeneme</Text>
        <Text style={styles.slogan}>Deneme · Analiz · Gelişim</Text>
      </View>
      <Text style={styles.footer}>wingolink</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  center: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCard: {
    width: 148,
    height: 148,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  logo: {
    width: 132,
    height: 132,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
  },
  slogan: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
  },
});
