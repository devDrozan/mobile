import { Image, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import appConfig from '../../app.json';
import { useAppTheme } from '../theme';

export function LaunchScreen({ onLayout }: { onLayout: (event: LayoutChangeEvent) => void }) {
  const { colors } = useAppTheme();
  return <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: colors.background }]} onLayout={onLayout} testID="launch-screen">
    <ScrollView contentContainerStyle={styles.content} bounces={false}>
      <View style={styles.brand}>
        <Image source={require('../../assets/splash-icon.png')} accessible={false} importantForAccessibility="no" style={styles.logo} resizeMode="contain" />
        <Text accessibilityRole="header" style={[styles.name, { color: colors.text }]}>{appConfig.expo.name}</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  brand: { alignItems: 'center', gap: 24, maxWidth: 480, width: '100%' },
  logo: { width: 128, height: 128, borderRadius: 28 },
  // Native metrics and unrestricted scaling keep the name readable at large text sizes.
  name: { fontSize: 26, fontWeight: '600', textAlign: 'center', alignSelf: 'stretch' },
});
