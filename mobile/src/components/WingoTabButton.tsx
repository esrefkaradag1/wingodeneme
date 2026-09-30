import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';

const SIZE = 64;
const PLATE = SIZE - 10;
const LOGO = PLATE - 2;

function isAnaSayfa(pathname: string) {
  if (!pathname) return true;
  if (pathname.includes('sinavlar')) return false;
  if (pathname.includes('analiz')) return false;
  if (pathname.includes('profil')) return false;
  if (pathname.includes('wingo')) return false;
  return true;
}

type TabBtnProps = {
  onPress?: (e: any) => void;
  navigation?: { navigate: (name: string) => void };
};

/** Alt tab ortasında yükselen yuvarlak Wingo ikonu → Ana Sayfa */
export function WingoTabButton(props: TabBtnProps) {
  const pathname = usePathname();
  const active = isAnaSayfa(pathname);

  const goHome = () => {
    try {
      props.navigation?.navigate('index');
    } catch {
      props.onPress?.(null);
    }
  };

  return (
    <Pressable
      onPress={goHome}
      accessibilityRole="button"
      accessibilityLabel="Wingo Ana Sayfa"
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={[styles.halo, active && styles.haloActive]}>
        <LinearGradient
          colors={active ? ['#0F766E', '#14B8A6'] : ['#0D9488', '#2DD4BF']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.ring}
        >
          <View style={styles.plate}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    top: -22,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.92,
  },
  halo: {
    borderRadius: SIZE / 2 + 4,
    padding: 3,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 12,
  },
  haloActive: {
    backgroundColor: 'rgba(13, 148, 136, 0.22)',
    shadowOpacity: 0.4,
  },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  plate: {
    width: PLATE,
    height: PLATE,
    borderRadius: PLATE / 2,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO,
    height: LOGO,
  },
});
