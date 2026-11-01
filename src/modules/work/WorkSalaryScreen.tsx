import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Alert, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ApiFailure, estimateSalary } from '../../api/client';
import { Button, Copy, Field, MoneyField, Screen, useUi } from '../../components/ui';
import { useRouteHeadingFocus } from '../../components/useRouteHeadingFocus';
import { dateLabel, inputMoney } from '../../validation';
import { blankEntry, emptyMonth, hourKeys, koreaMonth, monthDates, moveMonth, settingKeys, validateMonth, type SalaryInput, type SalaryResult } from './model';
import * as storage from './storage';

export default function WorkSalaryScreen() {
  const { t, i18n } = useTranslation();
  const { styles, colors } = useUi();
  const heading = useRouteHeadingFocus();
  const [month, setMonth] = useState(koreaMonth);
  const [draft, setDraft] = useState<SalaryInput>(() => emptyMonth(month));
  const drafts = useRef(new Map<string, SalaryInput>());
  const [selected, setSelected] = useState(`${month}-01`);
  const [list, setList] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [consented, setConsented] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SalaryResult>();
  const revision = useRef(0);
  const mounted = useRef(true);
  const inputs = useRef<Record<string, ComponentRef<typeof TextInput> | null>>({});
  const pendingFocus = useRef('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    const cached = drafts.current.get(month);
    void storage.loadMonth(month).then(loaded => {
      if (!active) return;
      setDraft(cached ?? loaded.draft); setConsented(loaded.consented); setReady(true);
    }).catch(() => { if (active) { setLoadFailed(true); setFailure('storageFailed'); } });
    return () => { active = false; };
  }, [month, loadAttempt]);
  useEffect(() => {
    if (pendingFocus.current) {
      inputs.current[pendingFocus.current]?.focus();
      pendingFocus.current = '';
    }
  }, [errors, selected]);
  function update(next: SalaryInput) {
    revision.current++; setResult(undefined); setErrors({}); setFailure(''); setMessage('unsaved');
    drafts.current.set(month, next); setDraft(next);
  }
  function showErrors(next: Record<string, string>) {
    const first = Object.keys(next)[0];
    const match = first?.match(/^entries\.(\d+)\./);
    if (match) setSelected(draft.entries[Number(match[1])]?.date ?? selected);
    pendingFocus.current = first ?? ''; setErrors(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
    void AccessibilityInfo.announceForAccessibility(t('salary.checkFields'));
  }
  function valid() {
    const next = validateMonth(draft);
    if (Object.keys(next).length) { showErrors(next); return false; }
    if (!consented) { setFailure('consentRequired'); return false; }
    return true;
  }
  async function save() {
    if (!ready || !valid()) return;
    const snapshot = { ...draft, settings: { ...draft.settings }, entries: draft.entries.map(entry => ({ ...entry })) }; const token = revision.current;
    setSaving(true); setFailure('');
    try {
      await storage.saveMonth(snapshot);
      if (mounted.current && token === revision.current) { setMessage('saved'); drafts.current.delete(month); }
    } catch { if (mounted.current) setFailure('storageFailed'); }
    finally { if (mounted.current) setSaving(false); }
  }
  async function calculate() {
    if (!ready || !valid()) return;
    const token = ++revision.current;
    setBusy(true); setFailure(''); setResult(undefined);
    try {
      const response = await estimateSalary(draft);
      if (mounted.current && token === revision.current) {
        setResult(response); void AccessibilityInfo.announceForAccessibility(`${t('salary.estimate')}: ${inputMoney(response.amountKrw)} KRW`);
      }
    } catch (error) {
      if (!mounted.current || token !== revision.current) return;
      if (error instanceof ApiFailure && error.issues.length) showErrors(Object.fromEntries(error.issues.map(issue => [issue.field, issue.code])));
      else setFailure('requestFailed');
    } finally { if (mounted.current) setBusy(false); }
  }
  function resetLoad() { setReady(false); setLoadFailed(false); setFailure(''); setMessage(''); setResult(undefined); setErrors({}); }
  function changeMonth(offset: number) {
    revision.current++; drafts.current.set(month, draft);
    const next = moveMonth(month, offset); resetLoad(); setDraft(drafts.current.get(next) ?? emptyMonth(next)); setMonth(next); setSelected(`${next}-01`);
  }
  function confirmDelete(all: boolean) {
    Alert.alert(t(all ? 'salary.deleteAll' : 'salary.deleteMonth'), t('salary.deleteConfirm'), [
      { text: t('salary.cancel'), style: 'cancel' },
      { text: t('salary.confirmDelete'), style: 'destructive', onPress: () => { void remove(all); } },
    ]);
  }
  async function remove(all: boolean) {
    revision.current++; setResult(undefined); setSaving(true); setFailure('');
    try {
      if (all) { await storage.deleteAll(); drafts.current.clear(); setConsented(false); }
      else { await storage.deleteMonth(month); drafts.current.delete(month); }
      if (mounted.current) { setDraft(emptyMonth(month)); setErrors({}); setMessage('deleted'); }
    } catch { if (mounted.current) setFailure('storageFailed'); }
    finally { if (mounted.current) setSaving(false); }
  }
  const dates = monthDates(month);
  const entryIndex = draft.entries.findIndex(entry => entry.date === selected);
  const entry = draft.entries[entryIndex] ?? blankEntry(selected);
  const unlocked = ready && !saving;
  const monthLabel = new Intl.DateTimeFormat(i18n.resolvedLanguage === 'my' ? 'my-MM' : 'en-GB', { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
  const labelDate = (date: string) => dateLabel(date, i18n.resolvedLanguage);
  const errorFor = (path: string) => errors[path] ? t(`salary.errors.${errors[path]}`, { defaultValue: t('salary.errors.INVALID_VALUE') }) : undefined;
  const entriesError = Object.entries(errors).filter(([path]) => path.endsWith('.date') || !path.startsWith('settings.') && !path.startsWith('entries.'));
  const leading = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  return <Screen ref={scroll}>
    <View style={styles.heroPanel}>
      <Copy ref={heading} accessibilityRole="header" style={styles.heading}>{t('salary.title')}</Copy>
      <Copy style={styles.subtitle}>{t('salary.intro')}</Copy>
    </View>
    <View style={styles.note}>
      <Copy>{t('salary.disclosure')}</Copy>
      {!consented && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consented }} accessibilityLabel={t('salary.accept')} onPress={() => setConsented(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}><Copy style={{ color: colors.primary }}>{consented ? '☑' : '☐'} {t('salary.accept')}</Copy></Pressable>}
      {consented && <Copy style={styles.help}>{t('salary.accepted')}</Copy>}
    </View>
    <View style={styles.card}>
      <Copy accessibilityRole="header" style={styles.heading}>{monthLabel}</Copy>
      <View style={{ gap: 8 }}>
        <Button title={t('salary.previousMonth')} secondary disabled={!ready || saving || busy || month <= '1900-01'} onPress={() => changeMonth(-1)} />
        <Button title={t('salary.nextMonth')} secondary disabled={!ready || saving || busy || month >= '2099-12'} onPress={() => changeMonth(1)} />
      </View>
      {!ready && !loadFailed && <Copy accessibilityLiveRegion="polite">{t('salary.loading')}</Copy>}
      {loadFailed && <><Copy style={styles.error}>{t(Platform.OS === 'web' ? 'salary.nativeOnly' : 'salary.storageFailed')}</Copy><Button title={t('salary.retryLoad')} secondary onPress={() => { resetLoad(); setLoadAttempt(value => value + 1); }} /></>}
      {failure && <Copy accessibilityRole="alert" style={styles.error}>{t(`salary.${failure}`)}</Copy>}
      {message && <Copy accessibilityLiveRegion="polite">{t(`salary.${message}`)}</Copy>}
      {Object.keys(errors).length > 0 && <Copy accessibilityRole="alert" style={styles.error}>{t('salary.checkFields')}</Copy>}
      {entriesError.map(([path, code]) => <Copy key={path} style={styles.error}>{t(`salary.errors.${code}`, { defaultValue: t('salary.errors.INVALID_VALUE') })}</Copy>)}
    </View>
    <View style={styles.card}>
      <Copy accessibilityRole="header" style={styles.heading}>{t('salary.paySettings')}</Copy>
      <Copy style={styles.help}>{t('salary.rules')}</Copy>
      {settingKeys.map(key => <MoneyField key={key} id={`salary-${key}`} ref={node => { inputs.current[`settings.${key}`] = node; }} label={`${t(`salary.${key}`)} (KRW)`} editable={unlocked} value={draft.settings[key]} error={errorFor(`settings.${key}`)} onChangeText={value => { if (unlocked) update({ ...draft, settings: { ...draft.settings, [key]: value } }); }} />)}
    </View>
    <View style={styles.card}>
      <Copy accessibilityRole="header" style={styles.heading}>{t('salary.calendar')}</Copy>
      <Copy style={styles.help}>{t('salary.hoursHelp')}</Copy>
      {!list && <Copy style={styles.help}>{t('salary.calendarScrollHint')}</Copy>}
      <Button title={t(list ? 'salary.showCalendar' : 'salary.showList')} secondary onPress={() => setList(value => !value)} />
      {list ? <View style={{ gap: 4 }}>{dates.map(date => <Button key={date} title={`${labelDate(date)}${draft.entries.some(row => row.date === date) ? ` · ${t('salary.recorded')}` : ''}`} secondary onPress={() => setSelected(date)} />)}</View>
        : <ScrollView horizontal accessibilityLabel={t('salary.calendar')}><View style={{ width: 336, flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: 7 }, (_, day) => <Copy key={`weekday-${day}`} style={{ width: 48, textAlign: 'center', paddingVertical: 8, fontSize: 11 }}>{new Intl.DateTimeFormat(i18n.resolvedLanguage === 'my' ? 'my-MM' : 'en', { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 2 + day)))}</Copy>)}
          {Array.from({ length: leading }, (_, i) => <View key={`blank-${i}`} style={{ width: 48, height: 48 }} />)}
          {dates.map(date => {
            const recorded = draft.entries.some(row => row.date === date);
            return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`${labelDate(date)}${recorded ? ` · ${t('salary.recorded')}` : ''}`} accessibilityState={{ selected: selected === date }} onPress={() => setSelected(date)} style={{ width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: selected === date ? colors.selected : colors.surface }}><Copy>{date.slice(-2)}{recorded ? ' •' : ''}</Copy></Pressable>;
          })}
        </View></ScrollView>}
      <Copy accessibilityRole="header" style={styles.smallHeading}>{labelDate(selected)}</Copy>
      {hourKeys.map(key => <Field key={key} ref={node => { inputs.current[`entries.${entryIndex}.${key}`] = node; }} id={`salary-${key}`} label={t(`salary.${key}`)} keyboardType="decimal-pad" maxLength={5} value={entry[key]} error={errorFor(`entries.${entryIndex}.${key}`)} editable={unlocked} onChangeText={value => {
        const next = { ...entry, [key]: value };
        update({ ...draft, entries: entryIndex < 0 ? [...draft.entries, next] : draft.entries.map((row, index) => index === entryIndex ? next : row) });
      }} />)}
      <Button title={t('salary.deleteDay')} secondary disabled={!unlocked || entryIndex < 0} onPress={() => update({ ...draft, entries: draft.entries.filter(row => row.date !== selected) })} />
      <Button title={t('salary.saveMonth')} busy={saving} disabled={!ready} onPress={() => { void save(); }} />
    </View>
    <View style={styles.card}>
      <Copy accessibilityRole="header" style={styles.heading}>{t('salary.summary')}</Copy>
      <Copy>{t('salary.recordCount', { count: draft.entries.length })}</Copy>
      <Copy style={styles.help}>{t('salary.estimateHelp')}</Copy>
      <Button title={t('salary.calculate')} busy={busy} disabled={!unlocked} onPress={() => { void calculate(); }} />
      {result && <View accessibilityLiveRegion="polite" style={styles.note}>
        <Copy accessibilityRole="header" style={styles.heading}>{t('salary.estimate')}</Copy>
        <Copy style={[styles.heading, { flexShrink: 1 }]}>{inputMoney(result.amountKrw)} KRW</Copy>
        {(['base', 'weekdayOvertime', 'saturday', 'sunday', 'night'] as const).map(key => <Copy key={key}>{t(`salary.components.${key}`)}: {inputMoney(result.components[key])} KRW</Copy>)}
        {(['normal', 'weekdayOvertime', 'saturday', 'sunday', 'night'] as const).map(key => <Copy key={`hours-${key}`}>{t(`salary.totals.${key}`)}: {result.hours[key]} {t('salary.hours')}</Copy>)}
        <Copy style={styles.help}>{t('salary.rules')}</Copy>
        <Copy style={styles.help}>{t('salary.exclusions')}</Copy>
        <Copy style={styles.help}>{t('salary.rounding')} · {result.formulaVersion}</Copy>
      </View>}
    </View>
    <View style={styles.card}>
      <Button title={t('salary.deleteMonth')} secondary disabled={!unlocked || busy} onPress={() => confirmDelete(false)} />
      <Button title={t('salary.deleteAll')} secondary disabled={!unlocked || busy} onPress={() => confirmDelete(true)} />
    </View>
  </Screen>;
}
