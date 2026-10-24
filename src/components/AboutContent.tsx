import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, useUi } from './ui';

export function AboutContent() {
  const { t } = useTranslation();
  const { styles } = useUi();
  return <>
    <View><Copy style={styles.eyebrow}>{t('appName')}</Copy><Copy accessibilityRole="header" style={styles.title}>{t('aboutTitle')}</Copy></View>
    <View style={styles.card}>
      <Copy accessibilityRole="header" style={styles.heading}>{t('aboutCreator')}</Copy>
      <View style={styles.divider} />
      <Copy accessibilityRole="header" style={styles.smallHeading}>{t('aboutPurposeTitle')}</Copy>
      <Copy>{t('aboutPurpose')}</Copy>
    </View>
    <View style={styles.note}><Copy style={styles.subtitle}>{t('aboutScope')}</Copy></View>
  </>;
}
