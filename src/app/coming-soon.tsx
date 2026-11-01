import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Copy, Screen, useUi } from '../components/ui';
import { useRouteHeadingFocus } from '../components/useRouteHeadingFocus';
import { modules } from '../modules/catalog';
import type { ThemeColors } from '../theme-colors';

export default function ComingSoonScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const { colors } = useUi();
  const styles = createStyles(colors);
  const heading = useRouteHeadingFocus();
  if (id === 'salary' || id === 'work') return <Redirect href="/work" />;
  const module = modules.find(item => item.id === id && item.status === 'planned');
  return <Screen>
    <View style={styles.card}>
      <Copy style={styles.status}>{t('hub.comingSoon')}</Copy>
      <Copy ref={heading} accessible accessibilityRole="header" tabIndex={-1} style={styles.title}>{module ? t(module.titleKey) : t('hub.unknownService')}</Copy>
      <Copy nativeMyanmarLineMetrics style={styles.description}>{module ? t(module.descriptionKey) : t('hub.unknownServiceHint')}</Copy>
      {module && <Copy nativeMyanmarLineMetrics style={styles.note}>{t('hub.plannedNotice')}</Copy>}
    </View>
    <Button title={t('hub.backHome')} secondary onPress={() => router.navigate('/')} />
  </Screen>;
}

function createStyles(colors: ThemeColors) { return StyleSheet.create({
  card: { backgroundColor: colors.surfaceSubtle, borderRadius: 18, padding: 20, gap: 9 },
  status: { color: colors.primary, fontSize: 12, lineHeight: 25, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  title: { color: colors.text, fontSize: 23, lineHeight: 38, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  description: { color: colors.text, fontSize: 14, lineHeight: 29 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 27 },
}); }
