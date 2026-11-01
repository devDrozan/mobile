import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, ScrollView, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ApiFailure, calculate, getContext, type ContextInput, type CalculationInput } from '../../api/client';
import { type EmploymentValues, dateLabel, inputMoney } from '../../validation';
import { apiMoneyField, reconcileWages, reconcileYears, validateWages, type FieldErrors } from '../../calculator-draft';
import { blankEmployment, useCalculatorSession } from '../../calculator-session';
import { Button, Copy, Field, MoneyField, Screen, useUi } from '../../components/ui';
import { useRouteHeadingFocus } from '../../components/useRouteHeadingFocus';
import { Result, SummaryRow } from '../../components/Result';
import { Sources } from '../../components/InfoContent';

type Method = ContextInput['method'];

export default function CalculatorScreen() {
  const { t, i18n } = useTranslation();
  const { colors, styles } = useUi();
  const isBurmese = i18n.resolvedLanguage === 'my';
  const { width } = useWindowDimensions();
  const hero = t('hero');
  const {
    form, weeklyHoursText, setWeeklyHoursText, resetEmployment,
    method, setMethod, step, setStep, context, setContext, result, setResult,
    wages, setWages, years, setYears, bonus, setBonus, leave, setLeave,
    ordinary, setOrdinary, balance, setBalance, balanceDate, setBalanceDate,
    busy, setBusy, error, setError, fieldErrors, setFieldErrors,
    periodsChanged, setPeriodsChanged, draftContextRef,
  } = useCalculatorSession();
  const [attention, setAttention] = useState<{ target: string }>();
  const [pendingMethod, setPendingMethod] = useState<Method>();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const content = useRef<ComponentRef<typeof View>>(null);
  const heading = useRef<ComponentRef<typeof Text>>(null);
  const routeHeadingRef = useRouteHeadingFocus();
  const errorBox = useRef<ComponentRef<typeof View>>(null);
  const inputs = useRef<Record<string, ComponentRef<typeof TextInput> | null>>({});
  const reduceMotion = useRef(true);
  const registerInput = useCallback((id: string, value: ComponentRef<typeof TextInput> | null) => { inputs.current[id] = value; }, []);
  const registerHeading = useCallback((value: ComponentRef<typeof Text> | null) => { heading.current = value; routeHeadingRef.current = value; }, [routeHeadingRef]);
  const fmtDate = (value: string) => dateLabel(value, i18n.language);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) reduceMotion.current = value; });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduceMotion.current = value; });
    return () => { active = false; subscription.remove(); };
  }, []);
  useLayoutEffect(() => {
    if (!attention) return;
    const frame = requestAnimationFrame(() => {
      const target = attention.target === 'heading' ? heading.current : attention.target === 'error' ? errorBox.current : inputs.current[attention.target];
      if (!target || !content.current) return;
      if (attention.target === 'heading' || attention.target === 'error') Keyboard.dismiss();
      target.focus();
      if (Platform.OS !== 'web') AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
      target.measureLayout(content.current, (_x, y) => scroll.current?.scrollTo({ y: Math.max(0, y - (attention.target === 'heading' ? 16 : 48)), animated: !reduceMotion.current }));
    });
    return () => cancelAnimationFrame(frame);
  }, [attention]);

  function goToStep(next: number) { setPendingMethod(undefined); setStep(next); setAttention({ target: 'heading' }); }
  function clearFieldError(id: string) {
    setFieldErrors(old => { const next = { ...old }; delete next[id]; return next; });
    setError('');
  }
  function fieldProps(id: string) {
    return { id, ref: (value: ComponentRef<typeof TextInput> | null) => { registerInput(id, value); }, error: fieldErrors[id] ? t(fieldErrors[id]) : undefined };
  }
  function reset(next: Method) {
    setPendingMethod(undefined);
    setMethod(next); goToStep(0); setContext(undefined); draftContextRef.current = undefined; setResult(undefined); setError(''); setFieldErrors({}); setPeriodsChanged(false);
    setWages([]); setYears([]); setBonus('0'); setLeave('0'); setOrdinary(''); setBalance(''); setBalanceDate('');
  }
  // Switching scheme clears every entered wage, so ask first when there is a
  // draft. An inline confirmation works on every target, including web.
  function chooseMethod(next: Method) {
    if (next === method) { setPendingMethod(undefined); return; }
    const hasDraft = step > 0 || wages.some(row => row.basePay.trim() || row.allowances.trim()) || years.some(row => row.wages.trim())
      || bonus !== '0' || leave !== '0' || !!ordinary || !!balance;
    if (!hasDraft) { reset(next); return; }
    setPendingMethod(next);
  }
  async function run(task: () => Promise<void>) {
    setBusy(true); setError('');
    try { await task(); } catch (e) {
      const kind = e instanceof ApiFailure ? e.kind : undefined;
      setError(e instanceof ApiFailure && e.issues.length ? 'invalid' : kind === 'offline' ? 'offline' : 'error');
      const mapped: FieldErrors = {};
      let firstEmployment: string | undefined;
      if (e instanceof ApiFailure) for (const item of e.issues) {
        const field = item.field.replace(/^employment\./, '');
        if (field === 'startDate' || field === 'lastWorkingDate' || field === 'weeklyHours') {
          form.setError(field, { message: field === 'weeklyHours' ? 'validHours' : item.code === 'DATE_ORDER' ? 'dateOrder' : 'invalidDate' });
          firstEmployment ??= field;
        } else {
          const id = apiMoneyField(item.field, years);
          if (id) mapped[id] = id === 'balanceDate' ? 'balanceDateRequired' : item.code === 'POSITIVE_ORDINARY_WAGE' ? 'positiveOrdinary' : 'invalidMoney';
        }
      }
      setFieldErrors(mapped);
      if (firstEmployment) { setStep(0); setAttention({ target: firstEmployment }); }
      else if (Object.keys(mapped).length) { setStep(1); setAttention({ target: Object.keys(mapped)[0] }); }
      else setAttention({ target: 'error' });
    } finally { setBusy(false); }
  }
  async function prepare(employment: EmploymentValues) {
    const prepared = await getContext({ method, employment });
    setContext(prepared); setResult(undefined);
    if (prepared.eligibility.status !== 'eligible') {
      setResult(await calculate({ method, employment } as CalculationInput)); goToStep(3); return;
    }
    const previous = draftContextRef.current;
    setPeriodsChanged(!!previous && previous.method === method && JSON.stringify(method === 'dc' ? previous.dcPeriods : previous.wagePeriods) !== JSON.stringify(method === 'dc' ? prepared.dcPeriods : prepared.wagePeriods));
    setWages(reconcileWages(draftContextRef.current, wages, prepared));
    setYears(reconcileYears(draftContextRef.current, years, prepared));
    if (draftContextRef.current?.method !== method || draftContextRef.current.retirementDate !== prepared.retirementDate) {
      setBonus('0'); setLeave('0'); setOrdinary('');
    }
    draftContextRef.current = prepared;
    setFieldErrors({}); goToStep(1);
  }
  function review() {
    const errors = validateWages({ method, wages, years, bonus, leave, ordinary, balance, balanceDate });
    setFieldErrors(errors);
    if (Object.keys(errors).length) { setError('invalid'); setAttention({ target: Object.keys(errors)[0] }); return; }
    setError(''); goToStep(2);
  }
  function payload(): CalculationInput {
    if (method === 'dc') return { method, employment: form.getValues(), dcWages: years, reportedBalance: balance ? { amount: balance, asOf: balanceDate } : null };
    return { method, employment: form.getValues(), wages, annualBonus: bonus, annualLeavePay: leave, ordinaryDailyWage: ordinary || null };
  }

  // Live regions are Android-only, so announce the scheme-change question on iOS.
  useEffect(() => {
    if (pendingMethod && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(`${t('planChangeTitle')}. ${t('planChangeBody')}`);
  }, [pendingMethod, t]);

  const stepKeys = ['employment', 'wages', 'review'] as const;
  const eligibleFlow = context?.eligibility.status === 'eligible';
  const currentIndex = Math.min(step, stepKeys.length - 1);
  // Completion follows the journey that was actually shown: an ineligible
  // outcome never visits wages or review, so those steps stay incomplete.
  const completed = (index: number) => index === 0 ? !!context : !eligibleFlow ? false : index === 1 ? step >= 2 : step >= 3 && !!result?.result;

  return <Screen ref={scroll} contentRef={content}>
    <View style={styles.card}><View style={{ gap: 4 }}><Copy style={styles.eyebrow}>{t('eyebrow')}</Copy><Copy accessibilityRole="header" accessibilityLabel={hero} style={isBurmese ? [styles.burmeseTitle, width < 360 && { fontSize: 24 }] : styles.title}>{hero}</Copy><Copy nativeMyanmarLineMetrics style={styles.subtitle}>{t('heroSub')}</Copy></View>
      <Copy style={styles.eyebrow}>{t('planLabel')}</Copy>
      <View accessibilityRole="radiogroup" style={styles.planRow}>{(['normal', 'db', 'dc'] as const).map(m => <Pressable key={m} accessibilityRole="radio" accessibilityLabel={`${t(m)} ${t(`${m}Sub`)}`} accessibilityState={{ checked: method === m, disabled: busy }} aria-checked={method === m} aria-disabled={busy} disabled={busy} onPress={() => chooseMethod(m)} style={[styles.planOption, method === m && { borderColor: colors.selectedBorder, backgroundColor: colors.selected }]}><Copy style={styles.smallHeading}>{method === m ? '✓ ' : ''}{t(m)}</Copy></Pressable>)}</View>
      <Copy nativeMyanmarLineMetrics style={styles.help}>{t(`${method}Sub`)}</Copy>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/severance/guide')} style={styles.planHelpLink}><Copy style={styles.planHelp}>{t('planHelp')} ↗</Copy></Pressable>
      {pendingMethod && <View accessibilityLiveRegion="polite" style={styles.note}>
        <Copy accessibilityRole="header" style={styles.smallHeading}>{t('planChangeTitle')}</Copy>
        <Copy style={styles.help}>{t('planChangeBody')}</Copy>
        <Button title={t('keepPlan')} onPress={() => setPendingMethod(undefined)} />
        <Button title={t('changePlan')} secondary onPress={() => reset(pendingMethod)} />
      </View>}
      <View accessible accessibilityLabel={`${t('stepOf', { current: currentIndex + 1, total: stepKeys.length })}: ${t(stepKeys[currentIndex])}`} style={styles.progressRow}>{stepKeys.map((key, index) => {
        const done = completed(index);
        const current = !done && step === index;
        return <View key={key} style={styles.progressItem}><View style={[styles.progressBadge, done && { backgroundColor: colors.primary, borderColor: colors.primary }, current && { borderColor: colors.primary }]}><Copy fixedMetrics style={[styles.progressNumber, done && { color: colors.onPrimary }, current && { color: colors.primary }]}>{done ? '✓' : index + 1}</Copy></View><Copy style={[styles.progressLabel, (done || current) && { color: colors.primary }]}>{t(key)}</Copy></View>;
      })}</View>
      {!!error && <View ref={errorBox} accessible accessibilityRole="alert" tabIndex={-1} style={styles.errorBox}><Copy style={styles.error}>{t(error)}</Copy></View>}
      {step === 0 && <>
        <View><Copy ref={registerHeading} accessible accessibilityRole="header" tabIndex={-1} style={isBurmese ? styles.heading : styles.displayHeading}>{t('employmentTitle')}</Copy><Copy style={styles.help}>{t('employmentSub')}</Copy></View>
        <Controller control={form.control} name="startDate" render={({ field, fieldState }) => <Field {...fieldProps('startDate')} label={t('startDate')} placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'} maxLength={10} error={fieldState.error && t(fieldState.error.message!)} />} />
        <Controller control={form.control} name="lastWorkingDate" render={({ field, fieldState }) => <Field {...fieldProps('lastWorkingDate')} label={t('lastWorkingDate')} help={t('lastDayHelp')} placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'} maxLength={10} error={fieldState.error && t(fieldState.error.message!)} />} />
        <Controller control={form.control} name="weeklyHours" render={({ field, fieldState }) => <Field {...fieldProps('weeklyHours')} label={t('weeklyHours')} help={t('hoursHelp')} value={weeklyHoursText} onChangeText={v => { setWeeklyHoursText(v); field.onChange(v.trim() === '' ? NaN : Number(v)); }} keyboardType="decimal-pad" error={fieldState.error && t('validHours')} />} />
        <View style={styles.note}><Controller control={form.control} name="hasSpecialCircumstances" render={({ field }) => <Pressable accessibilityRole="switch" accessibilityLabel={t('special')} accessibilityState={{ checked: field.value }} onPress={() => field.onChange(!field.value)} style={styles.switchRow}><Switch accessible={false} importantForAccessibility="no-hide-descendants" value={field.value} onValueChange={field.onChange} trackColor={{ true: colors.switchOn, false: colors.switchOff }} ios_backgroundColor={colors.switchOff} /><Copy style={{ fontSize: 12, flex: 1 }}>{t('special')}</Copy></Pressable>} /><Copy style={styles.help}>{t('specialHelp')}</Copy></View>
        <Button title={t('continue')} busy={busy} onPress={() => void form.handleSubmit(v => run(() => prepare(v)), errors => { const first = ['startDate', 'lastWorkingDate', 'weeklyHours'].find(key => key in errors); if (first) setAttention({ target: first }); })()} />
      </>}
      {step === 1 && context && <>
        <View><Copy ref={registerHeading} accessible accessibilityRole="header" tabIndex={-1} style={isBurmese ? styles.heading : styles.displayHeading}>{t(method === 'dc' ? 'dcTitle' : 'wagesTitle')}</Copy><Copy style={styles.help}>{t(method === 'dc' ? 'dcHelp' : 'wagesSub')}</Copy></View>
        {periodsChanged && <View accessibilityLiveRegion="polite" style={styles.note}><Copy style={styles.help}>{t('periodsChanged')}</Copy></View>}
        {method === 'dc' ? <>
          {years.map((row, index) => <View key={row.year} style={{ gap: 10, paddingVertical: 10 }}><Copy style={styles.smallHeading}>{row.year}</Copy><Copy style={styles.help}>{fmtDate(context.dcPeriods[index].startDate)} — {fmtDate(context.dcPeriods[index].endDate)}</Copy><MoneyField {...fieldProps(`year-${row.year}`)} label={t('yearWages')} accessibilityLabel={`${t('yearWages')} · ${row.year}`} value={row.wages} onChangeText={v => { clearFieldError(`year-${row.year}`); setYears(old => old.map((r, i) => index === i ? { ...r, wages: v } : r)); }} /></View>)}
          <MoneyField {...fieldProps('balance')} label={`${t('balance')} · ${t('optional')}`} value={balance} onChangeText={v => { clearFieldError('balance'); setBalance(v); }} help={t('balanceHelp')} />
          {!!balance && <Field {...fieldProps('balanceDate')} label={t('balanceDate')} placeholder="YYYY-MM-DD" maxLength={10} value={balanceDate} onChangeText={v => { clearFieldError('balanceDate'); setBalanceDate(v); }} />}
        </> : <>
          {wages.map((row, index) => {
            const period = `${fmtDate(row.startDate)} — ${fmtDate(row.endDate)}`;
            return <View key={row.startDate} style={{ gap: 12, paddingBottom: 17, borderBottomWidth: 1, borderBottomColor: colors.border }}><View><Copy style={styles.smallHeading}>{period}</Copy><Copy style={styles.help}>{t('days', { count: context.wagePeriods[index].days })}</Copy></View><MoneyField {...fieldProps(`base-${index}`)} label={t('basePay')} accessibilityLabel={`${t('basePay')} · ${period}`} value={row.basePay} onChangeText={v => { clearFieldError(`base-${index}`); setWages(old => old.map((r, i) => i === index ? { ...r, basePay: v } : r)); }} /><MoneyField {...fieldProps(`allowances-${index}`)} label={t('allowances')} accessibilityLabel={`${t('allowances')} · ${period}`} value={row.allowances} onChangeText={v => { clearFieldError(`allowances-${index}`); setWages(old => old.map((r, i) => i === index ? { ...r, allowances: v } : r)); }} /></View>;
          })}
          <MoneyField {...fieldProps('bonus')} label={t('annualBonus')} value={bonus} onChangeText={v => { clearFieldError('bonus'); setBonus(v); }} help={t('bonusHelp')} />
          <MoneyField {...fieldProps('leave')} label={t('annualLeavePay')} value={leave} onChangeText={v => { clearFieldError('leave'); setLeave(v); }} help={t('leaveHelp')} />
          <MoneyField {...fieldProps('ordinary')} label={`${t('ordinaryDailyWage')} · ${t('optional')}`} value={ordinary} onChangeText={v => { clearFieldError('ordinary'); setOrdinary(v); }} help={t('ordinaryHelp')} />
        </>}
        <Button title={t('next')} onPress={review} /><Button title={t('back')} secondary onPress={() => { setError(''); goToStep(0); }} />
      </>}
      {step === 2 && <>
        <View><Copy ref={registerHeading} accessible accessibilityRole="header" tabIndex={-1} style={isBurmese ? styles.heading : styles.displayHeading}>{t('reviewTitle')}</Copy><Copy style={styles.help}>{t('reviewSub')}</Copy></View>
        <SummaryRow label={t('yourPlan')} value={`${t(method)} · ${t(`${method}Sub`)}`} />
        <SummaryRow label={t('yourPeriod')} value={`${fmtDate(form.getValues('startDate'))} — ${fmtDate(form.getValues('lastWorkingDate'))}`} />
        <SummaryRow label={t('weeklyHours')} value={String(form.getValues('weeklyHours'))} />
        {method === 'dc' ? years.map(y => <SummaryRow key={y.year} label={`${y.year} · ${t('yearWages')}`} value={`₩${inputMoney(y.wages)}`} />) : <>
          {wages.map(w => <View key={w.startDate}><Copy style={styles.help}>{fmtDate(w.startDate)} — {fmtDate(w.endDate)}</Copy><SummaryRow label={t('basePay')} value={`₩${inputMoney(w.basePay)}`} /><SummaryRow label={t('allowances')} value={`₩${inputMoney(w.allowances)}`} /></View>)}
          <SummaryRow label={t('annualBonus')} value={`₩${inputMoney(bonus)}`} /><SummaryRow label={t('annualLeavePay')} value={`₩${inputMoney(leave)}`} />{!!ordinary && <SummaryRow label={t('ordinaryDailyWage')} value={`₩${inputMoney(ordinary)}`} />}
        </>}
        {method === 'dc' && !!balance && <SummaryRow label={t('balance')} value={`₩${inputMoney(balance)} · ${fmtDate(balanceDate)}`} />}
        <Button title={t('calculate')} busy={busy} onPress={() => void run(async () => { setResult(await calculate(payload())); goToStep(3); })} /><Button title={t('back')} secondary onPress={() => goToStep(1)} disabled={busy} />
      </>}
      {step === 3 && result && <><Copy ref={registerHeading} accessible accessibilityRole="header" tabIndex={-1} style={isBurmese ? styles.heading : styles.displayHeading}>{t(result.result ? 'result' : result.status === 'ineligible' ? 'ineligibleTitle' : 'reviewTitleResult')}</Copy><Result value={result} /><Button title={t('edit')} secondary onPress={() => { goToStep(context?.eligibility.status === 'eligible' ? 1 : 0); setResult(undefined); }} /><Button title={t('startAgain')} onPress={() => { reset(method); resetEmployment(blankEmployment); }} /></>}
    </View>
    <View style={styles.note}><Copy style={styles.smallHeading}>{t('privacyTitle')}</Copy><Copy style={styles.help}>{t('privacySub')}</Copy><Copy style={styles.help}>{t('connection')}</Copy></View>
    <Sources />
    <Copy style={[styles.help, { textAlign: 'center' }]}>{t('footer')}</Copy>
  </Screen>;
}
