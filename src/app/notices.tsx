import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, Screen, useUi } from '../components/ui';
import { useRouteHeadingFocus } from '../components/useRouteHeadingFocus';
import type { ThemeColors } from '../theme-colors';

export default function NoticesScreen() {
  const { t } = useTranslation();
  const { colors } = useUi();
  const styles = createStyles(colors);
  const heading = useRouteHeadingFocus();
  return <Screen><View style={styles.card}>
    <Copy ref={heading} accessible accessibilityRole="header" tabIndex={-1} style={styles.title}>{t('hub.noticesTab')}</Copy>
    <Copy nativeMyanmarLineMetrics style={styles.body}>{t('hub.noticesEmpty')}</Copy>
  </View></Screen>;
}

function createStyles(colors: ThemeColors) { return StyleSheet.create({
  card: { padding: 20, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  title: { color: colors.text, fontSize: 22, lineHeight: 38, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 28 },
}); }
