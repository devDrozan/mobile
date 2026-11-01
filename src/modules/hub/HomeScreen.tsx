import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Copy, Screen, useUi } from '../../components/ui';
import { useRouteHeadingFocus } from '../../components/useRouteHeadingFocus';
import { HeroCarousel } from './HeroCarousel';
import { ServiceSections } from './ServiceSections';
import type { ThemeColors } from '../../theme-colors';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useUi();
  const styles = createStyles(colors);
  // Home had no screen-level heading, so returning here announced nothing and
  // heading navigation started at "Our Services". Announce the screen instead.
  const heading = useRouteHeadingFocus();
  return <Screen>
    <Copy ref={heading} accessible accessibilityRole="header" tabIndex={-1} style={styles.visuallyHidden}>{t('hub.home')}</Copy>
    <HeroCarousel />
    <ServiceSections />
    <View style={styles.aboutSection}><Pressable accessibilityRole="button" accessibilityLabel={t('aboutUs')} onPress={() => router.navigate('/about')} style={({ pressed }) => [styles.aboutLink, pressed && { opacity: .65 }]}><Copy nativeMyanmarLineMetrics style={styles.aboutText}>{t('aboutUs')}  →</Copy></Pressable></View>
  </Screen>;
}

function createStyles(colors: ThemeColors) { return StyleSheet.create({
  aboutSection: { alignItems: 'center' },
  aboutLink: { minHeight: 44, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  aboutText: { color: colors.primary, fontSize: 13, lineHeight: 26, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  visuallyHidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
}); }
