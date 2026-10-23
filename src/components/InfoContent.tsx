import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Copy, styles } from './ui';
export const sources = [
  { key: 'sourceCalculator', url: 'https://moel.go.kr/retirementpayCal.do' },
  { key: 'sourceEligibility', url: 'https://www.moel.go.kr/minwon/fastcounsel/fastcounselView.do?inetDcssMngId=202302031324407911000' },
  { key: 'sourcePensions', url: 'https://moel.go.kr/retirementpay.do' },
  { key: 'sourceInsurance', url: 'https://www.eps.go.kr/eo/EmployPerSystem.eo?tabGb=06' },
];
export function Sources() {
  const { t } = useTranslation();
  return <View style={{ gap: 8 }}><Copy style={styles.smallHeading}>{t('sources')}</Copy>{sources.map(s => <Button key={s.key} title={`${t(s.key)} ↗`} secondary onPress={() => { void Linking.openURL(s.url).catch(() => undefined); }} />)}</View>;
}
export function InfoContent({ view }: { view: 'guide' | 'insurance' }) {
  const { t } = useTranslation();
  return <><View><Copy style={styles.eyebrow}>{t('madeFor')}</Copy><Copy accessibilityRole="header" style={styles.title}>{t(view === 'guide' ? 'guideTitle' : 'insuranceTitle')}</Copy><Copy style={styles.subtitle}>{t(view === 'guide' ? 'guideSub' : 'insuranceSub')}</Copy></View>
    {view === 'guide' ? <>{(['normal', 'db', 'dc'] as const).map(m => <View style={styles.card} key={m}><Copy accessibilityRole="header" style={styles.heading}>{t(m)}</Copy><Copy>{t(`${m}Guide`)}</Copy></View>)}<View style={styles.note}><Copy style={styles.smallHeading}>{t('eligibilityTitle')}</Copy><Copy style={styles.subtitle}>{t('eligibilityGuide')}</Copy></View></> : <View style={styles.card}><Copy>{t('insuranceBody')}</Copy><Copy>{t('insuranceBody2')}</Copy></View>}
    <Sources />
  </>;
}
