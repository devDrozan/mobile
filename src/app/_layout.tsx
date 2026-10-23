import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, NotoSansMyanmar_400Regular, NotoSansMyanmar_600SemiBold } from '@expo-google-fonts/noto-sans-myanmar';
import { restoreLanguage } from '../i18n';
import { colors, Header } from '../components/ui';

export default function RootLayout() {
  const [loaded, error] = useFonts({ NotoSansMyanmar_400Regular, NotoSansMyanmar_600SemiBold });
  useEffect(() => { void restoreLanguage(); }, []);
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}><ActivityIndicator color={colors.green} /></View>;
  return <SafeAreaProvider><SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}><StatusBar style="dark" /><Header /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} /></SafeAreaView></SafeAreaProvider>;
}
