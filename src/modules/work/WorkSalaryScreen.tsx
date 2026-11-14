import { defaultSelectedDate } from '../../calendar-date';
import { useLocalDataNotice } from '../../local-data-notice';
import { LocalDataNotice } from '../../components/LocalDataNotice';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ApiFailure, estimateSalary } from '../../api/client';
import { Button, Copy, Field, MoneyField, Screen, useUi } from '../../components/ui';
import { MonthCalendar } from '../../components/MonthCalendar';
import { useRouteHeadingFocus } from '../../components/useRouteHeadingFocus';
import { dateLabel, inputMoney } from '../../validation';
import { blankEntry, emptyMonth, hourKeys, koreaMonth, monthDates, moveMonth, normalizeSalaryInput, settingKeys, validateMonth, type SalaryInput, type SalaryResult, type WorkEntry } from './model';
import * as storage from './storage';
import { blankLeave, leaveBalance, toggleLeaveDate, validateLeave, type LeavePolicy, type LeaveRecord } from './leave';
import { useSalaryDraftSession } from './session';

type Action = 'save' | 'delete' | 'calculate';

export default function WorkSalaryScreen() {
  const { t, i18n } = useTranslation();
  const { styles, colors } = useUi();
  const { width } = useWindowDimensions();
  const heading = useRouteHeadingFocus();
  const session = useSalaryDraftSession();
  const [month, setMonth] = useState(() => session.getMonth() ?? koreaMonth());
  const [draft, setDraft] = useState<SalaryInput>(() => emptyMonth(month));
  const drafts = useRef(session.drafts);
  const [selected, setSelected] = useState(() => defaultSelectedDate(month));
  const [list, setList] = useState(false);
  const [dayDraft, setDayDraft] = useState<WorkEntry>();
  const [dayEditing, setDayEditing] = useState(false);
  const [dayErrors, setDayErrors] = useState<Record<string, string>>({});
  const [dayMessage, setDayMessage] = useState('');
  const [settingsCollapsed, setSettingsCollapsed] = useState(() => session.collapsedSettings.has(month));
  const [settingsAction, setSettingsAction] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const notice = useLocalDataNotice();
  const { adoptLegacy } = notice;
  const consented = notice.accepted;
  const [leave, setLeave] = useState<LeaveRecord>(() => blankLeave(Number(month.slice(0, 4))));
  const [leaveLoaded, setLeaveLoaded] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [leaveFeedback, setLeaveFeedback] = useState<{ code: string; tone: 'error' | 'info' }>();
  const [markLeave, setMarkLeave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  // Feedback renders beside the button that caused it, so a tap always answers
  // where the user is looking instead of far up the scroll view.
  const [feedback, setFeedback] = useState<{ action: Action; code: string; tone: 'error' | 'info' }>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SalaryResult>();
  const [resultRevision, setResultRevision] = useState(0);
  const revision = useRef(0);
  const mounted = useRef(true);
  const inputs = useRef<Record<string, ComponentRef<typeof TextInput> | null>>({});
  const pendingFocus = useRef('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const summaryY = useRef<number | null>(null);
  const resultY = useRef<{ revision: number; y: number } | null>(null);
  const pendingReveal = useRef<{ revision: number; kind: 'result' | 'failure' } | null>(null);
  const revealFrame = useRef<number | null>(null);
  const reduceMotion = useRef(true);
  const calcFeedback = feedback?.action === 'calculate' ? feedback : undefined;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) reduceMotion.current = value; }).catch(() => { if (active) reduceMotion.current = true; });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduceMotion.current = value; });
    return () => { active = false; subscription.remove(); };
  }, []);
  // Native onLayout can arrive after the response commit or its first frame.
  // Keep the latest reveal pending until both offsets exist instead of losing it.
  const queueReveal = useCallback(() => {
    const pending = pendingReveal.current;
    if (!pending || revealFrame.current !== null) return;
    revealFrame.current = requestAnimationFrame(() => {
      revealFrame.current = null;
      if (!mounted.current || pendingReveal.current !== pending || pending.revision !== revision.current) return;
      const top = summaryY.current;
      const detail = resultY.current;
      if (top === null || pending.kind === 'result' && detail?.revision !== pending.revision || !scroll.current) return;
      const y = top + (pending.kind === 'result' ? detail!.y : 0);
      scroll.current.scrollTo({ y: Math.max(0, y - 12), animated: !reduceMotion.current });
      pendingReveal.current = null;
    });
  }, []);
  useLayoutEffect(() => {
    if (!result && !calcFeedback) return;
    const pending = { revision: revision.current, kind: result ? 'result' as const : 'failure' as const };
    pendingReveal.current = pending;
    queueReveal();
    return () => {
      if (pendingReveal.current === pending) pendingReveal.current = null;
      if (revealFrame.current !== null) { cancelAnimationFrame(revealFrame.current); revealFrame.current = null; }
    };
  }, [result, resultRevision, calcFeedback, queueReveal]);
  useEffect(() => {
    let active = true;
    void (async () => {
      await session.waitForPending();
      const year = Number(month.slice(0, 4));
      const [loaded, storedLeave] = await Promise.all([storage.loadMonth(month), storage.loadLeave(year).catch(() => null)]);
      return { loaded, storedLeave, year };
    })().then(({ loaded, storedLeave, year }) => {
      if (!active) return;
      setDraft(drafts.current.get(month) ?? loaded.draft); setSettingsCollapsed(session.collapsedSettings.has(month)); adoptLegacy(loaded.consented); setLeave(storedLeave ?? blankLeave(year)); setLeaveLoaded(true); setReady(true);
    }).catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [month, loadAttempt, session, adoptLegacy]);
  useEffect(() => {
    if (pendingFocus.current) {
      inputs.current[pendingFocus.current]?.focus();
      pendingFocus.current = '';
    }
  }, [errors, selected, settingsCollapsed, dayDraft, dayEditing]);
  function update(next: SalaryInput) {
    setSettingsAction(false);
    revision.current++; setResult(undefined); setErrors({}); setFeedback({ action: 'save', code: 'unsaved', tone: 'info' });
    drafts.current.set(month, next); setDraft(next);
  }
  function openDay(date: string, editing = false) {
    const existing = draft.entries.find(row => row.date === date);
    setSelected(date); setDayDraft({ ...(existing ?? blankEntry(date)) }); setDayEditing(editing || !existing); setDayErrors({}); setDayMessage('');
    setMarkLeave(leave.policy === 'yes' && leave.dates.includes(date));
  }
  async function saveDay() {
    if (!dayDraft || saving || !ready) return;
    const normalizedDay = normalizeSalaryInput({ ...draft, entries: [dayDraft] }).entries[0];
    const savedDay = markLeave ? { ...normalizedDay, normalHours: '0', overtimeHours: '0', nightHours: '0' } : normalizedDay;
    const next = { ...draft, entries: [...draft.entries.filter(row => row.date !== savedDay.date), savedDay].sort((a, b) => a.date.localeCompare(b.date)) };
    const nextLeave = leave.policy === 'yes' ? toggleLeaveDate(leave, savedDay.date, markLeave) : undefined;
    if (nextLeave && validateLeave(nextLeave)) { setDayMessage('leaveInvalid'); return; }
    const index = next.entries.findIndex(row => row.date === savedDay.date);
    const invalid = validateMonth(next); setDayErrors(Object.fromEntries(Object.entries(invalid).filter(([field]) => field.startsWith(`entries.${index}.`)).map(([field, code]) => [field.split('.').at(-1)!, code])));
    if (Object.keys(invalid).length) {
      const first = Object.keys(invalid).find(key => key.startsWith(`entries.${index}.`));
      setDayMessage(first ? '' : 'dayMonthError');
      if (first) inputs.current[`day.${first.split('.').at(-1)}`]?.focus();
      return;
    }
    if (!consented) { setDayMessage('consentRequired'); return; }
    const token = revision.current; setSaving(true); setDayMessage('');
    try {
      await session.mutation(async () => { await storage.saveMonth(next, nextLeave); if (token === revision.current) drafts.current.delete(month); });
      if (mounted.current && token === revision.current) {
        update(next); if (nextLeave) setLeave(nextLeave); drafts.current.delete(month); setFeedback({ action: 'save', code: 'saved', tone: 'info' }); setDayDraft(undefined); setMarkLeave(false); Keyboard.dismiss();
        void AccessibilityInfo.announceForAccessibility(t('salary.saved'));
      }
    } catch { if (mounted.current) setDayMessage('storageFailed'); }
    finally { if (mounted.current) setSaving(false); }
  }
  function showErrors(next: Record<string, string>) {
    if (Object.keys(next).some(key => key.startsWith('settings.'))) { session.collapsedSettings.delete(month); setSettingsCollapsed(false); }
    const first = Object.keys(next)[0];
    const match = first?.match(/^entries\.(\d+)\./);
    if (match) { openDay(draft.entries[Number(match[1])]?.date ?? selected, true); setDayErrors(Object.fromEntries(Object.entries(next).filter(([field]) => field.startsWith(`entries.${match[1]}.`)).map(([field, code]) => [field.split('.').at(-1)!, code]))); }
    pendingFocus.current = first?.startsWith('entries.') ? `day.${first.split('.').at(-1)}` : first ?? ''; setErrors(next); setFeedback(undefined);
    scroll.current?.scrollTo({ y: 0, animated: false });
    void AccessibilityInfo.announceForAccessibility(t('salary.checkFields'));
  }
  function reportCalcFailure(code: string) {
    setFeedback({ action: 'calculate', code, tone: 'error' });
    void AccessibilityInfo.announceForAccessibility(t(`salary.${code}`));
  }
  // Say why the estimate stopped: an unreachable API, a build without a usable
  // API address, an API error response, and any other fault read differently.
  function calcFailureCode(error: unknown) {
    const kind = error instanceof ApiFailure ? error.kind : undefined;
    return kind === 'offline' ? 'apiUnreachable' : kind === 'unavailable' ? 'apiNotConfigured' : kind === 'server' ? 'apiError' : 'requestFailed';
  }
  function valid(scope: 'save' | 'calculate') {
    const next = validateMonth(draft);
    if (Object.keys(next).length) { showErrors(next); return false; }
    if (!consented) {
      if (scope === 'calculate') reportCalcFailure('consentRequired');
      else setFeedback({ action: 'save', code: 'consentRequired', tone: 'error' });
      return false;
    }
    return true;
  }
  async function save(fromSettings = false) {
    setSettingsAction(fromSettings);
    if (!ready || !valid('save')) return;
    const snapshot = normalizeSalaryInput(draft); const token = revision.current;
    setSaving(true); setFeedback(undefined);
    try {
      await session.mutation(async () => {
        await storage.saveMonth(snapshot);
        if (token === revision.current) { drafts.current.delete(month); if (fromSettings) session.collapsedSettings.add(month); }
      });
      if (mounted.current && token === revision.current) {
        setDraft(snapshot);
        if (fromSettings) { Keyboard.dismiss(); setSettingsCollapsed(true); void AccessibilityInfo.announceForAccessibility(t('salary.settingsSaved')); }
        setFeedback({ action: 'save', code: 'saved', tone: 'info' });
      }
    } catch { if (mounted.current) setFeedback({ action: 'save', code: 'storageFailed', tone: 'error' }); }
    finally { if (mounted.current) setSaving(false); }
  }
  async function saveLeaveSettings() {
    if (!ready || !leaveLoaded || leaveSaving) return;
    if (!leave.policy) { setLeaveError('choosePolicy'); return; }
    const invalid = validateLeave(leave);
    if (invalid) { setLeaveError(invalid === 'days' ? 'daysError' : 'invalid'); return; }
    if (!consented) { setLeaveError('consentRequired'); return; }
    setLeaveSaving(true); setLeaveError(''); setLeaveFeedback(undefined);
    try {
      await session.mutation(() => storage.saveLeave(leave));
      if (mounted.current) { setLeaveFeedback({ code: 'saved', tone: 'info' }); void AccessibilityInfo.announceForAccessibility(t('salary.leave.saved')); }
    } catch { if (mounted.current) setLeaveFeedback({ code: 'saveFailed', tone: 'error' }); }
    finally { if (mounted.current) setLeaveSaving(false); }
  }
  async function calculate() {
    setSettingsAction(false);
    if (!ready || !valid('calculate')) return;
    Keyboard.dismiss();
    const token = ++revision.current;
    setBusy(true); setFeedback(undefined); setResult(undefined);
    try {
      const response = await estimateSalary(normalizeSalaryInput(draft));
      if (mounted.current && token === revision.current) {
        setResultRevision(token); setResult(response); void AccessibilityInfo.announceForAccessibility(`${t('salary.estimate')}: ${inputMoney(response.amountKrw)} KRW`);
      }
    } catch (error) {
      if (!mounted.current || token !== revision.current) return;
      if (error instanceof ApiFailure && error.issues.length) showErrors(Object.fromEntries(error.issues.map(issue => [issue.field, issue.code])));
      else reportCalcFailure(calcFailureCode(error));
    } finally { if (mounted.current) setBusy(false); }
  }
  function resetLoad() { setReady(false); setLoadFailed(false); setFeedback(undefined); setResult(undefined); setErrors({}); setLeaveLoaded(false); setLeaveError(''); setLeaveFeedback(undefined); }
  function changeMonth(offset: number) {
    revision.current++; drafts.current.set(month, draft);
    const next = moveMonth(month, offset); setSettingsCollapsed(session.collapsedSettings.has(next)); setSettingsAction(false); session.setMonth(next); resetLoad(); setLeave(blankLeave(Number(next.slice(0, 4)))); setMarkLeave(false); setDraft(drafts.current.get(next) ?? emptyMonth(next)); setMonth(next); setSelected(defaultSelectedDate(next));
  }
  function confirmDelete(all: boolean) {
    Alert.alert(t(all ? 'salary.deleteAll' : 'salary.deleteMonth'), t('salary.deleteConfirm'), [
      { text: t('salary.cancel'), style: 'cancel' },
      { text: t('salary.confirmDelete'), style: 'destructive', onPress: () => { void remove(all); } },
    ]);
  }
  async function remove(all: boolean) {
    revision.current++; setResult(undefined); setSaving(true); setFeedback(undefined);
    try {
      if (all) { await session.mutation(() => storage.deleteAll()); session.collapsedSettings.clear(); drafts.current.clear(); if (mounted.current) {  setLeave(blankLeave(Number(month.slice(0, 4)))); setLeaveFeedback(undefined); setLeaveError(''); } }
      else { await session.mutation(() => storage.deleteMonth(month)); session.collapsedSettings.delete(month); drafts.current.delete(month); }
      if (mounted.current) { setSettingsCollapsed(false); setSettingsAction(false); setDraft(emptyMonth(month)); setErrors({}); setFeedback({ action: 'delete', code: 'deleted', tone: 'info' }); }
    } catch { if (mounted.current) setFeedback({ action: 'delete', code: 'storageFailed', tone: 'error' }); }
    finally { if (mounted.current) setSaving(false); }
  }
  const dates = monthDates(month);
  const leaveYear = Number(month.slice(0, 4));
  const leaveOptions: LeavePolicy[] = ['yes', 'no', 'unsure'];
  const leaveTotals = leaveBalance(leave);
  const annualLeaveDate = (date: string) => leave.policy === 'yes' && leave.dates.includes(date);
  const dateSummary = (date: string) => `${labelDate(date)}${draft.entries.some(row => row.date === date) ? ` · ${t('salary.recorded')}` : ''}${annualLeaveDate(date) ? ` · ${t('salary.leave.recorded')}` : ''}`;
  const dateRecorded = (date: string) => draft.entries.some(row => row.date === date) || annualLeaveDate(date);
  const entryIndex = draft.entries.findIndex(entry => entry.date === selected);
  const unlocked = ready && !saving;
  const monthLabel = new Intl.DateTimeFormat(i18n.resolvedLanguage === 'my' ? 'my-MM' : 'en-GB', { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
  const labelDate = (date: string) => dateLabel(date, i18n.resolvedLanguage);
  const errorFor = (path: string) => errors[path] ? t(`salary.errors.${errors[path]}`, { defaultValue: t('salary.errors.INVALID_VALUE') }) : undefined;
  const entriesError = Object.entries(errors).filter(([path]) => path.endsWith('.date') || !path.startsWith('settings.') && !path.startsWith('entries.'));
  const feedbackFor = (action: Action) => feedback?.action === action
    ? feedback.tone === 'error'
      ? <Copy accessibilityRole="alert" style={styles.error}>{t(`salary.${feedback.code}`)}</Copy>
      : <Copy accessibilityLiveRegion="polite">{t(`salary.${feedback.code}`)}</Copy>
    : null;
  return <><View style={{ flex: 1 }} accessibilityElementsHidden={!!dayDraft} importantForAccessibility={dayDraft ? 'no-hide-descendants' : 'auto'}><Screen ref={scroll}>
    <View style={styles.heroPanel}>
      <Copy ref={heading} accessibilityRole="header" style={styles.heading}>{t('salary.title')}</Copy>
      <Copy style={styles.subtitle}>{t('salary.intro')}</Copy>
    </View>
    <LocalDataNotice notice={notice} />
    {(!ready || loadFailed || Object.keys(errors).length > 0) && <View style={styles.card}>
      {!ready && !loadFailed && <Copy accessibilityLiveRegion="polite">{t('salary.loading')}</Copy>}
      {loadFailed && <><Copy style={styles.error}>{t(Platform.OS === 'web' ? 'salary.nativeOnly' : 'salary.storageFailed')}</Copy><Button title={t('salary.retryLoad')} secondary onPress={() => { resetLoad(); setLoadAttempt(value => value + 1); }} /></>}
      {Object.keys(errors).length > 0 && <Copy accessibilityRole="alert" style={styles.error}>{t('salary.checkFields')}</Copy>}
      {entriesError.map(([path, code]) => <Copy key={path} style={styles.error}>{t(`salary.errors.${code}`, { defaultValue: t('salary.errors.INVALID_VALUE') })}</Copy>)}
    </View>}
    <View style={styles.card}>
      <Copy accessibilityRole="header" style={styles.heading}>{t('salary.paySettings')}</Copy>
      {settingsCollapsed ? <><Copy style={styles.help}>{t('salary.settingsSaved')}</Copy><Button title={t('salary.editSettings')} secondary disabled={!ready || saving} onPress={() => { session.collapsedSettings.delete(month); pendingFocus.current = 'settings.basicSalary'; setSettingsCollapsed(false); }} /></> : <>
      <Copy style={styles.help}>{t('salary.rules')}</Copy>
      {settingKeys.map(key => <MoneyField key={key} id={`salary-${key}`} ref={node => { inputs.current[`settings.${key}`] = node; }} label={`${t(`salary.${key}`)} (KRW)`} editable={unlocked} value={draft.settings[key]} error={errorFor(`settings.${key}`)} onChangeText={value => { if (unlocked) update({ ...draft, settings: { ...draft.settings, [key]: value } }); }} />)}
      <Copy style={styles.help}>{t('salary.settingsSaveHelp')}</Copy>
      <Button title={t('salary.saveSettings')} busy={saving} disabled={!ready} onPress={() => { void save(true); }} /></>}
      {settingsAction && feedbackFor('save')}
    </View>
    <View style={styles.card} testID="salary-leave">
      <Copy accessibilityRole="header" style={styles.heading}>{t('salary.leave.title', { year: leaveYear })}</Copy>
      <Copy style={styles.help}>{t('salary.leave.intro')}</Copy>
      <Copy style={styles.smallHeading}>{t('salary.leave.question', { year: leaveYear })}</Copy>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('salary.leave.question', { year: leaveYear })} style={styles.planRow}>
        {leaveOptions.map(option => {
          const checked = leave.policy === option;
          return <Pressable key={option} accessibilityRole="radio" accessibilityLabel={t(`salary.leave.${option}`)} accessibilityState={{ checked, disabled: !leaveLoaded || leaveSaving }} disabled={!leaveLoaded || leaveSaving} onPress={() => { setLeave({ ...leave, policy: option }); setLeaveError(''); setLeaveFeedback(undefined); }} style={[styles.planOption, checked && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }]}><Copy style={styles.planHelp}>{t(`salary.leave.${option}`)}</Copy></Pressable>;
        })}
      </View>
      {leave.policy === 'yes' && <>
        <Field id="salary-leave-days" label={t('salary.leave.days', { year: leaveYear })} keyboardType="decimal-pad" maxLength={6} value={leave.entitlementDays} help={t('salary.leave.daysHelp')} error={leaveError === 'daysError' ? t('salary.leave.daysError') : undefined} editable={leaveLoaded && !leaveSaving} onChangeText={value => { setLeave({ ...leave, entitlementDays: value }); setLeaveError(''); setLeaveFeedback(undefined); }} />
        <Copy style={styles.help}>{t('salary.leave.used', { used: leaveTotals.used })}</Copy>
        <Copy style={styles.help}>{t('salary.leave.remaining', { remaining: leaveTotals.remaining })}</Copy>
        {leaveTotals.over !== '0' && <Copy style={styles.error}>{t('salary.leave.over', { over: leaveTotals.over })}</Copy>}
        <Copy style={styles.help}>{t('salary.leave.markHelp', { year: leaveYear })}</Copy>
        <Copy style={styles.help}>{t('salary.leave.excluded')}</Copy>
      </>}
      {leave.policy === 'no' && <View style={styles.note}><Copy>{t('salary.leave.noNotice')}</Copy></View>}
      {leave.policy === 'unsure' && <View style={styles.note}><Copy>{t('salary.leave.unsureGuide')}</Copy></View>}
      {leave.policy !== null && <Button title={t('salary.leave.save')} busy={leaveSaving} disabled={!leaveLoaded || saving || !ready} onPress={() => { void saveLeaveSettings(); }} />}
      {leaveError && leaveError !== 'daysError' && <Copy accessibilityRole="alert" style={styles.error}>{t(`salary.leave.${leaveError}`)}</Copy>}
      {leaveFeedback && (leaveFeedback.tone === 'error'
        ? <Copy accessibilityRole="alert" style={styles.error}>{t(`salary.leave.${leaveFeedback.code}`)}</Copy>
        : <Copy accessibilityLiveRegion="polite">{t(`salary.leave.${leaveFeedback.code}`)}</Copy>)}
    </View>
    <View style={[styles.card, { width: Math.min(width - 12, 560), alignSelf: 'center', padding: 6 } ]}>
      <Copy accessibilityRole="header" style={styles.heading}>{t('salary.calendar')}</Copy>
      <Copy style={styles.help}>{t('salary.hoursHelp')}</Copy>
      <Button title={t(list ? 'salary.showCalendar' : 'salary.showList')} secondary onPress={() => setList(value => !value)} />
      <MonthCalendar hideGrid={list} month={month} monthLabel={monthLabel} dates={dates} selected={selected}
          weekdays={Array.from({ length: 7 }, (_, i) => t(`expenses.weekdays.${(i + 1) % 7}`))}
          previousLabel={t('salary.previousMonth')} nextLabel={t('salary.nextMonth')}
          previousDisabled={!ready || saving || busy || month <= '1900-01'} nextDisabled={!ready || saving || busy || month >= '2099-12'}
          onPrevious={() => changeMonth(-1)} onNext={() => changeMonth(1)} onSelect={openDay}
          testPrefix="salary-day" label={dateSummary}
          recorded={dateRecorded} />
      {list && <View style={{ gap: 4 }}>{dates.map(date => <Button key={date} title={dateSummary(date)} secondary onPress={() => openDay(date)} />)}</View>}

      <View style={{ padding: 14, gap: 14 }}>
      <Copy accessibilityRole="header" style={styles.smallHeading}>{labelDate(selected)}</Copy>
      <Button title={t('salary.openDay')} secondary disabled={!unlocked} onPress={() => openDay(selected)} />
      <Button title={t('salary.deleteDay')} secondary disabled={!unlocked || entryIndex < 0} onPress={() => update({ ...draft, entries: draft.entries.filter(row => row.date !== selected) })} />
      <Button title={t('salary.saveMonth')} busy={saving} disabled={!ready} onPress={() => { void save(); }} />
      {!settingsAction && feedbackFor('save')}
      </View>
    </View>
    <View style={styles.card} testID="salary-summary" onLayout={event => { summaryY.current = event.nativeEvent.layout.y; queueReveal(); }}>
      <Copy accessibilityRole="header" style={styles.heading}>{t('salary.summary')}</Copy>
      <Copy>{t('salary.recordCount', { count: draft.entries.length })}</Copy>
      <Copy style={styles.help}>{t('salary.estimateHelp')}</Copy>
      <Button title={t('salary.calculate')} busy={busy} disabled={!unlocked} onPress={() => { void calculate(); }} />
      {feedbackFor('calculate')}
      {result && <View key={resultRevision} testID="salary-result" accessibilityLiveRegion="polite" style={styles.note} onLayout={event => {
        if (resultRevision !== revision.current) return;
        resultY.current = { revision: resultRevision, y: event.nativeEvent.layout.y }; queueReveal();
      }}>
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
      {feedbackFor('delete')}
    </View>
  </Screen></View>
    <Modal visible={!!dayDraft} transparent animationType="none" onShow={() => { if (dayEditing) inputs.current[`day.${Object.keys(dayErrors)[0] ?? 'normalHours'}`]?.focus(); }} onRequestClose={() => { if (!saving) setDayDraft(undefined); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', backgroundColor: '#091a15aa', paddingHorizontal: 12, paddingVertical: 32 }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 520, maxHeight: '100%', alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 14 }}>
            {dayDraft && <>
              <Copy accessibilityRole="header" style={styles.heading}>{labelDate(dayDraft.date)}</Copy>
              <Copy style={styles.help}>{t('salary.hoursHelp')}</Copy>
              {dayEditing ? <>
                {leave.policy === 'yes' && leaveLoaded && <Pressable accessibilityRole="checkbox" accessibilityLabel={t('salary.leave.dayToggle')} accessibilityState={{ checked: markLeave }} disabled={saving} onPress={() => { const next = !markLeave; setMarkLeave(next); if (next) setDayDraft({ ...dayDraft, normalHours: '0', overtimeHours: '0', nightHours: '0' }); setDayErrors({}); setDayMessage(''); }} style={{ minHeight: 44, justifyContent: 'center' }}><Copy>{markLeave ? '☑' : '☐'} {t('salary.leave.dayToggle')}</Copy></Pressable>}
                {markLeave ? <Copy style={styles.help}>{t('salary.leave.dayHelp')}</Copy> : hourKeys.map(key => { const code = dayErrors[key]; return <Field key={key} ref={node => { inputs.current[`day.${key}`] = node; }} id={`salary-day-${key}`} label={t(`salary.${key}`)} keyboardType="decimal-pad" maxLength={5} value={dayDraft[key]} error={code ? t(`salary.errors.${code}`, { defaultValue: t('salary.errors.INVALID_VALUE') }) : undefined} editable={!saving} onChangeText={value => { setDayDraft({ ...dayDraft, [key]: value }); setDayErrors({}); setDayMessage(''); }} />; })}
                <Copy style={styles.help}>{t('salary.settingsSaveHelp')}</Copy>
                <LocalDataNotice notice={notice} />
                {dayMessage && <Copy accessibilityRole="alert" style={styles.error}>{t(`salary.${dayMessage}`)}</Copy>}
                <Button title={t('salary.saveDay')} busy={saving} onPress={() => { void saveDay(); }} />
              </> : <>{markLeave && <Copy style={styles.help}>{t('salary.leave.recorded')}</Copy>}{hourKeys.map(key => <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Copy style={{ flex: 1 }}>{t(`salary.${key}`)}</Copy><Copy>{dayDraft[key]}</Copy></View>)}<Button title={t('salary.editDay')} onPress={() => { pendingFocus.current = 'day.normalHours'; setDayEditing(true); }} /></>}
              <Button title={t('salary.closeDay')} secondary disabled={saving} onPress={() => setDayDraft(undefined)} />
            </>}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
