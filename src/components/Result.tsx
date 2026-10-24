import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Calculation } from '../api/client';
import { money, inputMoney, dateLabel } from '../validation';
import { Copy, useUi } from './ui';

export function SummaryRow({ label, value }: { label: string; value: string }) {
  const { colors } = useUi();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.divider }}><Copy style={{ fontSize: 12, color: colors.muted, flex: 1 }}>{label}</Copy><Copy style={{ fontSize: 12, textAlign: 'right', flex: 1 }}>{value}</Copy></View>;
}

function ResultAmount({ value, size = 34 }: { value: string; size?: number }) {
  const { colors } = useUi();
  const [width, setWidth] = useState(0);
  // Fit ordinary amounts to the card. Keep unusually long values and enlarged
  // accessibility text readable through horizontal scrolling instead of clipping.
  const fontSize = width ? Math.min(size, Math.max(18, width / (value.length * .67))) : size;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ alignSelf: 'stretch', minWidth: 0 }}>
    <ScrollView horizontal style={{ flexGrow: 0 }}>
      <Copy numberOfLines={1} style={{ fontFamily: 'NotoSansMyanmar_600SemiBold', fontSize, lineHeight: fontSize * 1.55, color: colors.resultText, flexShrink: 0 }}>{value}</Copy>
    </ScrollView>
  </View>;
}

export function Result({ value }: { value: Calculation }) {
  const { t, i18n } = useTranslation();
  const { colors, styles } = useUi();
  const result = value.result;
  return <>
    <View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: colors.resultBackground, borderColor: colors.resultBackground }]}>
      <Copy style={{ fontSize: 11, color: colors.resultMuted }}>{t(result?.kind === 'dc' ? 'contributionTitle' : 'estimateTitle')}</Copy>
      {result ? <><ResultAmount value={`₩${money(result.kind === 'dc' ? result.requiredContributionKrw : result.amountKrw)}`} /><Copy style={{ fontSize: 12, color: colors.resultMuted }}>{t('beforeTax')}</Copy>{result.kind === 'severance' && result.provisional && <Copy style={{ fontSize: 12, color: colors.resultWarning }}>{t('provisional')}</Copy>}{result.kind === 'dc' && result.reportedBalance && <><Copy style={{ fontSize: 12, color: colors.resultMuted }}>{t('balance')}</Copy><ResultAmount value={`₩${inputMoney(result.reportedBalance.amount)}`} size={23} /><Copy style={{ color: colors.resultMuted, fontSize: 11 }}>{dateLabel(result.reportedBalance.asOf, i18n.language)}</Copy></>}</> : <><Copy style={[styles.heading, { color: colors.resultText }]}>{t(value.status === 'ineligible' ? 'ineligibleTitle' : 'reviewTitleResult')}</Copy><Copy style={{ color: colors.resultMuted, fontSize: 13 }}>{t(value.status === 'ineligible' ? 'ineligibleSub' : 'reviewResultSub')}</Copy>{value.context.eligibility.reasons.map(reason => <Copy key={reason} style={{ color: colors.resultText, fontSize: 12 }}>{t(`reasons.${reason}`)}</Copy>)}</>}
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
