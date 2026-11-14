import { LocalDataNoticeProvider } from '../local-data-notice';
import { FeatureBannerAd } from '../components/FeatureBannerAd';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, NotoSansMyanmar_400Regular, NotoSansMyanmar_600SemiBold } from '@expo-google-fonts/noto-sans-myanmar';
import { restoreLanguage } from '../i18n';
import { Header } from '../components/ui';
import { CalculatorSessionProvider } from '../calculator-session';
import { AppThemeProvider, useAppTheme } from '../theme';
import { LaunchGate } from '../components/LaunchGate';
import { ExpenseSessionProvider } from '../modules/expenses/session';
import { SalaryDraftSessionProvider } from '../modules/work/session';
import { HubFooter } from '../modules/hub/HubFooter';

// Hold the native cover until our branded view has laid out.
void SplashScreen.preventAutoHideAsync().catch(() => { /* Unsupported previews can continue. */ });

export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  return <AppThemeProvider><SafeAreaProvider><ThemedLayout /></SafeAreaProvider></AppThemeProvider>;
}

function ThemedLayout() {
  const { colors, resolvedTheme, ready: themeReady } = useAppTheme();
  const [loaded, error] = useFonts({ NotoSansMyanmar_400Regular, NotoSansMyanmar_600SemiBold });
  const [languageReady, setLanguageReady] = useState(false);
  useEffect(() => {
    let active = true;
    void restoreLanguage().finally(() => { if (active) setLanguageReady(true); });
    return () => { active = false; };
  }, []);
  // Render the branded view immediately: readiness gates only the interface, and
  // preference reads have their own timeout, so a stalled store cannot leave the
  // user on a blank screen behind the native splash.
  return <><StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} /><LaunchGate ready={themeReady && languageReady && (loaded || !!error)}><LocalDataNoticeProvider><CalculatorSessionProvider><SalaryDraftSessionProvider><ExpenseSessionProvider><SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}><Header /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} /><FeatureBannerAd /><HubFooter /></SafeAreaView></ExpenseSessionProvider></SalaryDraftSessionProvider></CalculatorSessionProvider></LocalDataNoticeProvider></LaunchGate></>;
}
