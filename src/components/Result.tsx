import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Calculation } from '../api/client';
import { money, inputMoney, dateLabel } from '../validation';
import { colors, Copy, styles } from './ui';

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#e9eee2' }}><Copy style={{ fontSize: 12, color: colors.muted, flex: 1 }}>{label}</Copy><Copy style={{ fontSize: 12, textAlign: 'right', flex: 1 }}>{value}</Copy></View>;
}

function ResultAmount({ value, size = 34, color = '#eef4db' }: { value: string; size?: number; color?: string }) {
  const [width, setWidth] = useState(0);
  // Fit ordinary amounts to the card. Keep unusually long values and enlarged
  // accessibility text readable through horizontal scrolling instead of clipping.
  const fontSize = width ? Math.min(size, Math.max(18, width / (value.length * .67))) : size;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ alignSelf: 'stretch', minWidth: 0 }}>
    <ScrollView horizontal style={{ flexGrow: 0 }}>
      <Copy numberOfLines={1} style={{ fontFamily: 'NotoSansMyanmar_600SemiBold', fontSize, lineHeight: fontSize * 1.55, color, flexShrink: 0 }}>{value}</Copy>
    </ScrollView>
  </View>;
}

export function Result({ value }: { value: Calculation }) {
  const { t, i18n } = useTranslation();
  const result = value.result;
  return <>
    <View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: colors.green, borderColor: colors.green }]}>
      <Copy style={{ fontSize: 11, color: '#bdcfae' }}>{t(result?.kind === 'dc' ? 'contributionTitle' : 'estimateTitle')}</Copy>
      {result ? <><ResultAmount value={`₩${money(result.kind === 'dc' ? result.requiredContributionKrw : result.amountKrw)}`} /><Copy style={{ fontSize: 12, color: '#bed2ac' }}>{t('beforeTax')}</Copy>{result.kind === 'severance' && result.provisional && <Copy style={{ fontSize: 12, color: '#e1d5a3' }}>{t('provisional')}</Copy>}{result.kind === 'dc' && result.reportedBalance && <><Copy style={{ fontSize: 12, color: '#c1d5ae' }}>{t('balance')}</Copy><ResultAmount value={`₩${inputMoney(result.reportedBalance.amount)}`} size={23} color="#e2edcf" /><Copy style={{ color: '#b3c7a1', fontSize: 11 }}>{dateLabel(result.reportedBalance.asOf, i18n.language)}</Copy></>}</> : <><Copy style={[styles.heading, { color: '#edf4dd' }]}>{t(value.status === 'ineligible' ? 'ineligibleTitle' : 'reviewTitleResult')}</Copy><Copy style={{ color: '#bfd1ad', fontSize: 13 }}>{t(value.status === 'ineligible' ? 'ineligibleSub' : 'reviewResultSub')}</Copy>{value.context.eligibility.reasons.map(reason => <Copy key={reason} style={{ color: '#d4e2bc', fontSize: 12 }}>{t(`reasons.${reason}`)}</Copy>)}</>}
    </View>
    <View style={styles.card}><Copy accessibilityRole="header" style={styles.heading}>{t('calculation')}</Copy>
      <SummaryRow label={t('serviceDays')} value={String(value.context.employmentDays)} />
      {result?.kind === 'severance' && <>
        <SummaryRow label={t('referenceWages')} value={`₩${money(result.referenceWagesKrw)}`} />
        <SummaryRow label={t('bonusIncluded')} value={`₩${money(result.bonusIncludedKrw)}`} />
        <SummaryRow label={t('leaveIncluded')} value={`₩${money(result.leaveIncludedKrw)}`} />
        <SummaryRow label={t('dailyAverage')} value={`₩${money(result.averageDailyWageKrw)}`} />
        <SummaryRow label={t('dailyApplied')} value={`₩${money(result.applicableDailyWageKrw)}`} />
      </>}
      {result?.kind === 'dc' && <><SummaryRow label={t('totalWages')} value={`₩${money(result.totalWagesKrw)}`} />{result.years.map(year => <SummaryRow key={year.year} label={`${year.year} · ${t('requiredContribution')}`} value={`₩${money(year.contributionKrw)}`} />)}</>}
      {result && <View style={styles.note}><Copy style={styles.smallHeading}>{t(result.kind === 'dc' ? 'dcFormula' : 'formula')}</Copy><Copy style={styles.help}>{t('rounding')}</Copy></View>}
      {value.warnings.map(reason => <View style={styles.note} key={reason}><Copy style={styles.help}>{t(`reasons.${reason}`)}</Copy></View>)}
      <Copy style={styles.help}>{t('verified', { date: dateLabel(value.verifiedOn, i18n.language), version: value.rulesVersion })}</Copy>
    </View>
  </>;
}
