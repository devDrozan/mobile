import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Copy, useUi } from './ui';
export const sources = [
  { key: 'sourceCalculator', url: 'https://moel.go.kr/retirementpayCal.do' },
  { key: 'sourceEligibility', url: 'https://www.moel.go.kr/minwon/fastcounsel/fastcounselView.do?inetDcssMngId=202302031324407911000' },
  { key: 'sourcePensions', url: 'https://moel.go.kr/retirementpay.do' },
  { key: 'sourceInsurance', url: 'https://www.eps.go.kr/eo/EmployPerSystem.eo?tabGb=06' },
];
export function Sources() {
  const { t } = useTranslation();
  const { styles } = useUi();
  return <View style={{ gap: 8 }}><Copy style={styles.smallHeading}>{t('sources')}</Copy>{sources.map(s => <Button key={s.key} title={`${t(s.key)} ↗`} secondary onPress={() => { void Linking.openURL(s.url).catch(() => undefined); }} />)}</View>;
}
export function InfoContent({ view }: { view: 'guide' | 'insurance' }) {
  const { t, i18n } = useTranslation();
  const { styles } = useUi();
  const paragraphStyle = i18n.resolvedLanguage === 'my' && infoStyles.paragraph;
  const subtitleStyle = i18n.resolvedLanguage === 'my' && infoStyles.subtitle;
  return <><View><Copy style={styles.eyebrow}>{t('madeFor')}</Copy><Copy accessibilityRole="header" style={styles.title}>{t(view === 'guide' ? 'guideTitle' : 'insuranceTitle')}</Copy><Copy nativeMyanmarLineMetrics style={[styles.subtitle, subtitleStyle]}>{t(view === 'guide' ? 'guideSub' : 'insuranceSub')}</Copy></View>
    {view === 'guide' ? <>{(['normal', 'db', 'dc'] as const).map(m => <View style={[styles.card, infoStyles.card]} key={m}><Copy accessibilityRole="header" style={styles.heading}>{t(m)}</Copy><Copy nativeMyanmarLineMetrics style={paragraphStyle}>{t(`${m}Guide`)}</Copy></View>)}<View style={[styles.note, infoStyles.note]}><Copy accessibilityRole="header" style={styles.smallHeading}>{t('eligibilityTitle')}</Copy><Copy nativeMyanmarLineMetrics style={[styles.subtitle, paragraphStyle]}>{t('eligibilityGuide')}</Copy></View></> : <View style={[styles.card, infoStyles.card]}><Copy nativeMyanmarLineMetrics style={paragraphStyle}>{t('insuranceBody')}</Copy><Copy nativeMyanmarLineMetrics style={paragraphStyle}>{t('insuranceBody2')}</Copy></View>}
    <Sources />
  </>;
}

const infoStyles = StyleSheet.create({
  card: { paddingVertical: 24 },
  note: { paddingVertical: 20, gap: 12 },
  paragraph: { fontSize: 15, lineHeight: 34 },
  subtitle: { lineHeight: 30 },
});
