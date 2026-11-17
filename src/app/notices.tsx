import { useRemoteConfig } from '../remote-config';
import { localizedConfigText } from '../remote-config-model';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, Screen, useUi } from '../components/ui';
import { useRouteHeadingFocus } from '../components/useRouteHeadingFocus';
import type { ThemeColors } from '../theme-colors';

export default function NoticesScreen() {
  const { t, i18n } = useTranslation();
  const config = useRemoteConfig();
  const notices = config.features.noticesVisible ? config.notices : [];
  const { colors } = useUi();
  const styles = createStyles(colors);
  const heading = useRouteHeadingFocus();
  return <Screen><View style={styles.card}>
    <Copy ref={heading} accessible accessibilityRole="header" tabIndex={-1} style={styles.title}>{t('hub.noticesTab')}</Copy>
    {notices.length ? notices.map(notice => <View key={notice.id} style={{ gap: 8 }}><Copy nativeMyanmarLineMetrics accessibilityRole="header" style={styles.title}>{localizedConfigText(notice.title, i18n.language)}</Copy><Copy nativeMyanmarLineMetrics style={styles.body}>{localizedConfigText(notice.body, i18n.language)}</Copy></View>) : <Copy nativeMyanmarLineMetrics style={styles.body}>{t('hub.noticesEmpty')}</Copy>}
  </View></Screen>;
}

function createStyles(colors: ThemeColors) { return StyleSheet.create({
  card: { padding: 20, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  title: { color: colors.text, fontSize: 22, lineHeight: 38, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 28 },
}); }
