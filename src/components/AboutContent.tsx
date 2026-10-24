import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, useUi } from './ui';

export function AboutContent() {
  const { t, i18n } = useTranslation();
  const { styles } = useUi();
  const isMyanmar = i18n.resolvedLanguage === 'my';
  return <>
    <View><Copy style={styles.eyebrow}>{t('appName')}</Copy><Copy accessibilityRole="header" style={styles.title}>{t('aboutTitle')}</Copy></View>
    <View style={styles.card}>
      <Copy accessibilityRole="header" style={styles.heading}>{t('aboutCreator')}</Copy>
      <View style={styles.divider} />
      <Copy accessibilityRole="header" style={styles.smallHeading}>{t('aboutPurposeTitle')}</Copy>
      <Copy nativeMyanmarLineMetrics style={isMyanmar && aboutStyles.purpose}>{t('aboutPurpose')}</Copy>
    </View>
    <View style={[styles.note, aboutStyles.paragraphs]}>
      <Copy nativeMyanmarLineMetrics style={[styles.subtitle, isMyanmar && aboutStyles.scope]}>{t('aboutScopeDetails')}</Copy>
      <Copy nativeMyanmarLineMetrics style={[styles.subtitle, isMyanmar && aboutStyles.scope]}>{t('aboutScopeEstimate')}</Copy>
    </View>
  </>;
}

const aboutStyles = StyleSheet.create({
  purpose: { fontSize: 15, lineHeight: 34 },
  scope: { fontSize: 14, lineHeight: 32 },
  paragraphs: { gap: 12 },
});
