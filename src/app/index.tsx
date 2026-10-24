import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ApiFailure, calculate, getContext, type ContextInput, type CalculationInput } from '../api/client';
import { type EmploymentValues, dateLabel, inputMoney } from '../validation';
import { apiMoneyField, reconcileWages, reconcileYears, validateWages, type FieldErrors } from '../calculator-draft';
import { blankEmployment, useCalculatorSession } from '../calculator-session';
import { colors, Button, Copy, Field, MoneyField, Screen, styles } from '../components/ui';
import { Result, SummaryRow } from '../components/Result';
import { Sources } from '../components/InfoContent';

type Method = ContextInput['method'];
const sample: EmploymentValues = { startDate: '2014-10-02', lastWorkingDate: '2017-09-15', weeklyHours: 40, hasSpecialCircumstances: false };

export default function CalculatorScreen() {
  const { t, i18n } = useTranslation();
  const {
    form, weeklyHoursText, setWeeklyHoursText, resetEmployment,
    method, setMethod, step, setStep, context, setContext, result, setResult,
    wages, setWages, years, setYears, bonus, setBonus, leave, setLeave,
    ordinary, setOrdinary, balance, setBalance, balanceDate, setBalanceDate,
    busy, setBusy, error, setError, fieldErrors, setFieldErrors,
    periodsChanged, setPeriodsChanged, draftContextRef,
  } = useCalculatorSession();
  const [attention, setAttention] = useState<{ target: string }>();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const content = useRef<ComponentRef<typeof View>>(null);
  const heading = useRef<ComponentRef<typeof Text>>(null);
  const errorBox = useRef<ComponentRef<typeof View>>(null);
  const inputs = useRef<Record<string, ComponentRef<typeof TextInput> | null>>({});
  const reduceMotion = useRef(true);
  const registerInput = useCallback((id: string, value: ComponentRef<typeof TextInput> | null) => { inputs.current[id] = value; }, []);
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

  function goToStep(next: number) { setStep(next); setAttention({ target: 'heading' }); }
  function clearFieldError(id: string) {
    setFieldErrors(old => { const next = { ...old }; delete next[id]; return next; });
    setError('');
  }
  function fieldProps(id: string) {
    return { id, ref: (value: ComponentRef<typeof TextInput> | null) => { registerInput(id, value); }, error: fieldErrors[id] ? t(fieldErrors[id]) : undefined };
  }
  function reset(next: Method) {
    setMethod(next); goToStep(0); setContext(undefined); draftContextRef.current = undefined; setResult(undefined); setError(''); setFieldErrors({}); setPeriodsChanged(false);
    setWages([]); setYears([]); setBonus('0'); setLeave('0'); setOrdinary(''); setBalance(''); setBalanceDate('');
  }
  async function run(task: () => Promise<void>) {
    setBusy(true); setError('');
    try { await task(); } catch (e) {
      setError(e instanceof ApiFailure && e.issues.length ? 'invalid' : 'error');
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
  async function prepare(employment: EmploymentValues, example = false) {
    const prepared = await getContext({ method, employment });
    setContext(prepared); setResult(undefined);
    if (prepared.eligibility.status !== 'eligible') {
      setResult(await calculate({ method, employment } as CalculationInput)); goToStep(3); return;
    }
    const previous = draftContextRef.current;
    setPeriodsChanged(!example && !!previous && previous.method === method && JSON.stringify(method === 'dc' ? previous.dcPeriods : previous.wagePeriods) !== JSON.stringify(method === 'dc' ? prepared.dcPeriods : prepared.wagePeriods));
    setWages(example ? prepared.wagePeriods.map((p, index) => ({ startDate: p.startDate, endDate: p.endDate, basePay: index === 0 || index === 3 ? '1000000' : '2000000', allowances: index === 0 || index === 3 ? '180000' : '360000' })) : reconcileWages(draftContextRef.current, wages, prepared));
    setYears(example ? prepared.dcPeriods.map(p => ({ year: p.year, wages: '30000000' })) : reconcileYears(draftContextRef.current, years, prepared));
    if (example || draftContextRef.current?.method !== method || draftContextRef.current.retirementDate !== prepared.retirementDate) {
      setBonus(example ? '4000000' : '0'); setLeave(example ? '300000' : '0'); setOrdinary('');
    }
    if (example) { setBalance(''); setBalanceDate(''); }
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

  return <Screen ref={scroll} contentRef={content}>
    <View><Copy style={styles.eyebrow}>{t('eyebrow')}</Copy><Copy accessibilityRole="header" style={styles.title}>{t('hero')}</Copy><Copy style={styles.subtitle}>{t('heroSub')}</Copy></View>
    <View style={styles.card}><View><Copy accessibilityRole="header" style={styles.heading}>{t('calculatorTitle')}</Copy><Copy style={styles.help}>{t('calculatorSub')}</Copy></View><Button secondary title={t('example')} busy={busy} onPress={() => void run(async () => { resetEmployment(sample); await prepare(sample, true); })} />
      <Copy style={styles.eyebrow}>{t('planLabel')}</Copy>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>{(['normal', 'db', 'dc'] as const).map(m => <Pressable key={m} accessibilityRole="radio" accessibilityLabel={`${t(m)} ${t(`${m}Sub`)}`} accessibilityState={{ checked: method === m, disabled: busy }} aria-checked={method === m} aria-disabled={busy} disabled={busy} onPress={() => { if (m !== method) reset(m); }} style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: method === m ? '#829d71' : colors.border, backgroundColor: method === m ? '#eff5e7' : '#fff', borderRadius: 8 }}><Copy style={styles.smallHeading}>{t(m)}</Copy><Copy style={{ fontSize: 10, lineHeight: 21, color: colors.muted }}>{t(`${m}Sub`)}</Copy></Pressable>)}</View>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/guide')}><Copy style={{ fontSize: 11, color: '#6e855b' }}>{t('planHelp')} ↗</Copy></Pressable>
      <View style={{ flexDirection: 'row', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>{['employment', 'wages', 'review'].map((key, index) => <Copy key={key} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: step >= index ? colors.green : '#829274' }}>{step > index ? '✓' : index + 1} {t(key)}</Copy>)}</View>
      {!!error && <View ref={errorBox} accessible accessibilityRole="alert" tabIndex={-1} style={styles.errorBox}><Copy style={styles.error}>{t(error)}</Copy></View>}
      {step === 0 && <>
        <View><Copy ref={heading} accessible accessibilityRole="header" tabIndex={-1} style={styles.heading}>{t('employmentTitle')}</Copy><Copy style={styles.help}>{t('employmentSub')}</Copy></View>
        <Controller control={form.control} name="startDate" render={({ field, fieldState }) => <Field {...fieldProps('startDate')} label={t('startDate')} placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'} maxLength={10} error={fieldState.error && t(fieldState.error.message!)} />} />
        <Controller control={form.control} name="lastWorkingDate" render={({ field, fieldState }) => <Field {...fieldProps('lastWorkingDate')} label={t('lastWorkingDate')} help={t('lastDayHelp')} placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'} maxLength={10} error={fieldState.error && t(fieldState.error.message!)} />} />
        <Controller control={form.control} name="weeklyHours" render={({ field, fieldState }) => <Field {...fieldProps('weeklyHours')} label={t('weeklyHours')} help={t('hoursHelp')} value={weeklyHoursText} onChangeText={v => { setWeeklyHoursText(v); field.onChange(v.trim() === '' ? NaN : Number(v)); }} keyboardType="decimal-pad" error={fieldState.error && t('validHours')} />} />
        <View style={styles.note}><View style={styles.row}><Controller control={form.control} name="hasSpecialCircumstances" render={({ field }) => <Switch accessibilityLabel={t('special')} value={field.value} onValueChange={field.onChange} trackColor={{ true: '#719a66', false: '#dbe4d2' }} />} /><Copy style={{ fontSize: 12, flex: 1 }}>{t('special')}</Copy></View><Copy style={styles.help}>{t('specialHelp')}</Copy></View>
        <Button title={t('continue')} busy={busy} onPress={() => void form.handleSubmit(v => run(() => prepare(v)), errors => { const first = ['startDate', 'lastWorkingDate', 'weeklyHours'].find(key => key in errors); if (first) setAttention({ target: first }); })()} />
      </>}
      {step === 1 && context && <>
        <View><Copy ref={heading} accessible accessibilityRole="header" tabIndex={-1} style={styles.heading}>{t(method === 'dc' ? 'dcTitle' : 'wagesTitle')}</Copy><Copy style={styles.help}>{t(method === 'dc' ? 'dcHelp' : 'wagesSub')}</Copy></View>
        {periodsChanged && <View accessibilityLiveRegion="polite" style={styles.note}><Copy style={styles.help}>{t('periodsChanged')}</Copy></View>}
        {method === 'dc' ? <>
          {years.map((row, index) => <View key={row.year} style={{ gap: 10, paddingVertical: 10 }}><Copy style={styles.smallHeading}>{row.year}</Copy><Copy style={styles.help}>{fmtDate(context.dcPeriods[index].startDate)} — {fmtDate(context.dcPeriods[index].endDate)}</Copy><MoneyField {...fieldProps(`year-${row.year}`)} label={t('yearWages')} value={row.wages} onChangeText={v => { clearFieldError(`year-${row.year}`); setYears(old => old.map((r, i) => index === i ? { ...r, wages: v } : r)); }} /></View>)}
          <MoneyField {...fieldProps('balance')} label={`${t('balance')} · ${t('optional')}`} value={balance} onChangeText={v => { clearFieldError('balance'); setBalance(v); }} help={t('balanceHelp')} />
          {!!balance && <Field {...fieldProps('balanceDate')} label={t('balanceDate')} placeholder="YYYY-MM-DD" maxLength={10} value={balanceDate} onChangeText={v => { clearFieldError('balanceDate'); setBalanceDate(v); }} />}
        </> : <>
          {wages.map((row, index) => <View key={row.startDate} style={{ gap: 12, paddingBottom: 17, borderBottomWidth: 1, borderBottomColor: colors.border }}><View><Copy style={styles.smallHeading}>{fmtDate(row.startDate)} — {fmtDate(row.endDate)}</Copy><Copy style={styles.help}>{t('days', { count: context.wagePeriods[index].days })}</Copy></View><MoneyField {...fieldProps(`base-${index}`)} label={t('basePay')} value={row.basePay} onChangeText={v => { clearFieldError(`base-${index}`); setWages(old => old.map((r, i) => i === index ? { ...r, basePay: v } : r)); }} /><MoneyField {...fieldProps(`allowances-${index}`)} label={t('allowances')} value={row.allowances} onChangeText={v => { clearFieldError(`allowances-${index}`); setWages(old => old.map((r, i) => i === index ? { ...r, allowances: v } : r)); }} /></View>)}
          <MoneyField {...fieldProps('bonus')} label={t('annualBonus')} value={bonus} onChangeText={v => { clearFieldError('bonus'); setBonus(v); }} help={t('bonusHelp')} />
          <MoneyField {...fieldProps('leave')} label={t('annualLeavePay')} value={leave} onChangeText={v => { clearFieldError('leave'); setLeave(v); }} help={t('leaveHelp')} />
          <MoneyField {...fieldProps('ordinary')} label={`${t('ordinaryDailyWage')} · ${t('optional')}`} value={ordinary} onChangeText={v => { clearFieldError('ordinary'); setOrdinary(v); }} help={t('ordinaryHelp')} />
        </>}
        <Button title={t('next')} onPress={review} /><Button title={t('back')} secondary onPress={() => { setError(''); goToStep(0); }} />
      </>}
      {step === 2 && <>
        <View><Copy ref={heading} accessible accessibilityRole="header" tabIndex={-1} style={styles.heading}>{t('reviewTitle')}</Copy><Copy style={styles.help}>{t('reviewSub')}</Copy></View>
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
      {step === 3 && result && <><Copy ref={heading} accessible accessibilityRole="header" tabIndex={-1} style={styles.heading}>{t(result.result ? 'result' : result.status === 'ineligible' ? 'ineligibleTitle' : 'reviewTitleResult')}</Copy><Result value={result} /><Button title={t('edit')} secondary onPress={() => { goToStep(context?.eligibility.status === 'eligible' ? 1 : 0); setResult(undefined); }} /><Button title={t('startAgain')} onPress={() => { reset(method); resetEmployment(blankEmployment); }} /></>}
    </View>
    <View style={styles.note}><Copy style={styles.smallHeading}>{t('privacyTitle')}</Copy><Copy style={styles.help}>{t('privacySub')}</Copy><Copy style={styles.help}>{t('connection')}</Copy></View>
    <Sources />
    <Copy style={[styles.help, { textAlign: 'center' }]}>{t('footer')}</Copy>
  </Screen>;
}
