import { defaultSelectedDate } from '../../calendar-date';
import { useLocalDataNotice } from '../../local-data-notice';
import { LocalDataNotice } from '../../components/LocalDataNotice';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Copy, Field, MoneyField, Screen, useUi } from '../../components/ui';
import { MonthCalendar } from '../../components/MonthCalendar';
import { useRouteHeadingFocus } from '../../components/useRouteHeadingFocus';
import { dateLabel, inputMoney } from '../../validation';
import { calendarDates, categories, compactDailyTotal, dailyExpenses, koreaDate, moveMonth, newForm, orderEntries, validateEntry, type ExpenseEntry, type ExpenseForm } from './model';
import { useExpenseSession } from './session';
import * as storage from './storage';
type Feedback = { action: 'save' | 'delete'; code: string; target?: string };
export default function ExpensesScreen() {
  const { t, i18n } = useTranslation();
  const { styles, colors } = useUi();
  const { width, fontScale } = useWindowDimensions();
  const heading = useRouteHeadingFocus();
  const session = useExpenseSession();
  const [month, setMonth] = useState(() => session.getMonth() ?? koreaDate().slice(0, 7));
  const [selected, setSelected] = useState(() => session.getSelectedDate() ?? defaultSelectedDate(month));
  const [form, setForm] = useState<ExpenseForm>(() => selected ? session.formForDate(selected) : newForm(month));
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const notice = useLocalDataNotice();
  const { adoptLegacy } = notice;
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback>();
  const mounted = useRef(true);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const detailY = useRef<number | null>(null);
  const detailHeading = useRef<ComponentRef<typeof Text>>(null);
  const restoreEditorFocus = useRef(false);
  useEffect(() => {
    if (editorOpen) { restoreEditorFocus.current = true; return; }
    if (!restoreEditorFocus.current) return;
    const frame = requestAnimationFrame(() => { restoreEditorFocus.current = false; if (detailHeading.current) AccessibilityInfo.sendAccessibilityEvent(detailHeading.current, 'focus'); });
    return () => cancelAnimationFrame(frame);
  }, [editorOpen]);
  const fields = useRef<Record<string, ComponentRef<typeof TextInput> | null>>({});
  const pendingReveal = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    void (async () => { await session.waitForPending(); return storage.loadMonth(month); })().then(loaded => {
      if (!active) return;
      const date = session.getSelectedDate() ?? defaultSelectedDate(month);
      session.setSelectedDate(date); setSelected(date);
      setEntries(loaded.entries); setForm(date ? session.formForDate(date) : newForm(month)); adoptLegacy(loaded.consented); setReady(true);
    }).catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [month, attempt, session, adoptLegacy]);
  function revealForm(field?: string) {
    if (field) fields.current[field]?.focus();
  }
  useEffect(() => {
    if (!selected) return;
    const frame = requestAnimationFrame(() => { if (pendingReveal.current && detailY.current !== null) { scroll.current?.scrollTo({ y: Math.max(0, detailY.current - 12), animated: false }); pendingReveal.current = false; } });
    return () => cancelAnimationFrame(frame);
  }, [selected]);
  function replaceForm(next: ExpenseForm) { session.forms.set(selected, next); setForm(next); }
  function changeField(key: 'description' | 'category' | 'amount', value: string) {
    replaceForm({ ...form, entry: { ...form.entry, [key]: value }, dirty: true }); setErrors({});
    if (feedback?.action === 'save') setFeedback(undefined);
  }
  function selectDate(date: string) {
    if (!ready || busy) return;
    if (date === selected && detailY.current !== null) scroll.current?.scrollTo({ y: Math.max(0, detailY.current - 12), animated: false });
    session.setSelectedDate(date); setSelected(date); setForm(session.formForDate(date)); setErrors({}); setFeedback(undefined); pendingReveal.current = true;
  }
  function navigateMonth(offset: number) {
    const next = moveMonth(month, offset); session.setMonth(next);
    const date = session.selectedForMonth(next) ?? defaultSelectedDate(next); session.setSelectedDate(date || undefined);
    setMonth(next); setSelected(date); setForm(date ? session.formForDate(date) : newForm(next));
    setEntries([]); setReady(false); setLoadFailed(false); setErrors({}); setFeedback(undefined); pendingReveal.current = false;
  }
  function chooseForm(next: ExpenseForm) {
    const apply = () => { replaceForm(next); setErrors({}); setFeedback(undefined); setEditorOpen(true); };
    if (form.dirty) Alert.alert(t('expenses.discardTitle'), t('expenses.discardHint'), [
      { text: t('expenses.cancel'), style: 'cancel' }, { text: t('expenses.discard'), style: 'destructive', onPress: apply },
    ]); else apply();
  }
  async function save() {
    if (!ready || !notice.ready || busy || !selected) return;
    const input = { ...form.entry, date: selected };
    const invalid = validateEntry(input);
    if (Object.keys(invalid).length) { setErrors(invalid); revealForm(Object.keys(invalid)[0]); void AccessibilityInfo.announceForAccessibility(t('expenses.checkFields')); return; }
    Keyboard.dismiss(); setBusy(true); setFeedback(undefined);
    const blank = newForm(selected);
    try {
      const saved = await session.mutation(async () => {
        const value = await storage.saveEntry(input, form.editing);
        session.forms.set(selected, blank); return value;
      });
      void notice.accept();
      if (!mounted.current) return;
      setEntries(current => orderEntries([...current.filter(entry => entry.id !== saved.id), saved]));
      setForm(blank); setErrors({}); setEditorOpen(false); setFeedback({ action: 'save', code: 'saved' });
      void AccessibilityInfo.announceForAccessibility(t('expenses.saved'));
    } catch { if (mounted.current) setFeedback({ action: 'save', code: 'saveFailed' }); }
    finally { if (mounted.current) setBusy(false); }
  }
  function confirmDelete(kind: 'entry' | 'month' | 'all', entry?: ExpenseEntry) {
    Alert.alert(t(`expenses.delete${kind === 'entry' ? 'Entry' : kind === 'month' ? 'Month' : 'All'}`), t('expenses.deleteConfirm'), [
      { text: t('expenses.cancel'), style: 'cancel' }, { text: t('expenses.confirmDelete'), style: 'destructive', onPress: () => { void remove(kind, entry); } },
    ]);
  }
  async function remove(kind: 'entry' | 'month' | 'all', entry?: ExpenseEntry) {
    if (!ready || busy) return;
    setBusy(true); setFeedback(undefined);
    const clearsForm = kind !== 'entry' || form.entry.id === entry!.id;
    try {
      await session.mutation(async () => {
        if (kind === 'entry') await storage.deleteEntry(entry!.id);
        else if (kind === 'month') await storage.deleteMonth(month);
        else await storage.deleteAll();
        const removed = new Set(kind === 'entry' ? [entry!.id] : entries.map(row => row.id));
        for (const [date, cached] of session.forms) if (kind === 'all' || removed.has(cached.entry.id) || kind === 'month' && date.startsWith(month)) session.forms.delete(date);
      });
      if (!mounted.current) return;
      setEntries(current => kind === 'entry' ? current.filter(row => row.id !== entry!.id) : []);
      if (clearsForm && selected) { setForm(newForm(selected)); setErrors({}); }
      setFeedback({ action: 'delete', code: 'deleted' });
    } catch { if (mounted.current) setFeedback({ action: 'delete', code: 'deleteFailed', target: kind === 'entry' ? entry!.id : undefined }); }
    finally { if (mounted.current) setBusy(false); }
  }
  const unlocked = ready && !busy;
  const totals = useMemo(() => dailyExpenses(entries), [entries]);
  const visible = entries.filter(entry => entry.date === selected);
  const dailyTotal = totals.get(selected)?.total ?? '0';
  const dates = calendarDates(month);
  const outerWidth = Math.min(width - 12, 560);
  const monthLabel = `${t(`expenses.months.${Number(month.slice(5)) - 1}`)} ${month.slice(0, 4)}`;
  const errorFor = (key: string) => errors[key] ? t(`expenses.${errors[key]}`) : undefined;
  function message(action: Feedback['action'], target?: string) {
    if (feedback?.action !== action || feedback.target !== target) return null;
    const failure = feedback.code.endsWith('Failed');
    return <Copy accessibilityRole={failure ? 'alert' : undefined} accessibilityLiveRegion="polite" style={failure ? styles.error : styles.help}>{t(`expenses.${feedback.code}`)}</Copy>;
  }
  return <><View style={{ flex: 1 }} accessibilityElementsHidden={editorOpen} importantForAccessibility={editorOpen ? 'no-hide-descendants' : 'auto'}><Screen ref={scroll}>
    <View style={styles.heroPanel}><Copy ref={heading} accessibilityRole="header" style={styles.heading}>{t('expenses.title')}</Copy><Copy style={styles.subtitle}>{t('expenses.intro')}</Copy></View>
    <View style={[styles.card, { width: outerWidth, alignSelf: 'center', padding: 0, overflow: 'hidden' }]}>
      <MonthCalendar month={month} monthLabel={monthLabel} dates={dates} selected={selected}
        weekdays={Array.from({ length: 7 }, (_, i) => t(`expenses.weekdays.${(i + 1) % 7}`))}
        previousLabel={t('expenses.previousMonth')} nextLabel={t('expenses.nextMonth')}
        previousDisabled={!unlocked || month <= '1900-01'} nextDisabled={!unlocked || month >= '2099-12'}
        onPrevious={() => navigateMonth(-1)} onNext={() => navigateMonth(1)} onSelect={selectDate}
        disabled={!unlocked} testPrefix="expense-day" recorded={date => totals.has(date)}
        total={date => totals.has(date) ? compactDailyTotal(totals.get(date)!.total) : undefined}
        label={date => t('expenses.dateSummary', { date, count: totals.get(date)?.count ?? 0, total: totals.get(date)?.total ?? '0' })} />
      <Copy style={[styles.help, { paddingHorizontal: 10, paddingBottom: 8 }]}>{t('expenses.calendarHelp')}</Copy>
      {!ready && !loadFailed && <Copy style={{ padding: 12 }}>{t('expenses.loading')}</Copy>}
      {loadFailed && <View style={{ padding: 12 }}><Copy accessibilityRole="alert" style={styles.error}>{t(Platform.OS === 'web' ? 'expenses.nativeOnly' : 'expenses.loadFailed')}</Copy><Button title={t('expenses.retryLoad')} secondary onPress={() => { setReady(false); setLoadFailed(false); setAttempt(value => value + 1); }} /></View>}
    </View>
    {!selected && <Copy>{t('expenses.selectDate')}</Copy>}
    {selected && <>
      <View testID="expense-list" style={styles.card} onLayout={event => { detailY.current = event.nativeEvent.layout.y; if (pendingReveal.current) { scroll.current?.scrollTo({ y: Math.max(0, detailY.current - 12), animated: false }); pendingReveal.current = false; } }}>
        <Copy ref={detailHeading} accessible accessibilityRole="header" style={styles.smallHeading}>{dateLabel(selected, i18n.resolvedLanguage)}</Copy>
        <Copy style={styles.help}>{t('expenses.listTitle')}</Copy>
        <Copy testID="expense-daily-total" style={styles.smallHeading}>{t('expenses.dailyTotal')}: {inputMoney(dailyTotal)} KRW</Copy>
        <Button title={t('expenses.addEntry')} secondary disabled={!unlocked} onPress={() => { if (form.editing) chooseForm(newForm(selected)); else { if (feedback?.code === 'saved') setFeedback(undefined); setEditorOpen(true); } }} />
        {ready && !visible.length && <Copy>{t('expenses.empty')}</Copy>}
        {visible.map(entry => <View key={entry.id} testID={`expense-${entry.id}`} style={styles.note}><Copy style={styles.smallHeading}>{entry.description}</Copy><Copy>{t(`expenses.categories.${entry.category}`)}</Copy><Copy style={[styles.heading, { flexShrink: 1 }]}>{inputMoney(entry.amount)} KRW</Copy><Button title={t('expenses.editNamed', { description: entry.description })} secondary disabled={!unlocked} onPress={() => chooseForm({ entry: { ...entry }, editing: true, dirty: false })} /><Button title={t('expenses.deleteNamed', { description: entry.description })} secondary disabled={!unlocked} onPress={() => confirmDelete('entry', entry)} />{message('delete', entry.id)}</View>)}
        {!editorOpen && message('save')}
        <Button title={t('expenses.deleteMonth')} secondary disabled={!unlocked} onPress={() => confirmDelete('month')} /><Button title={t('expenses.deleteAll')} secondary disabled={!unlocked} onPress={() => confirmDelete('all')} />{message('delete')}
      </View>

    </>}
    {!editorOpen && <LocalDataNotice notice={notice} onSave />}
  </Screen></View>
    <Modal visible={editorOpen} transparent animationType="none" onRequestClose={() => { if (!busy) setEditorOpen(false); }} onShow={() => revealForm('description')}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 32, backgroundColor: '#091a15aa' }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 520, maxHeight: '100%', alignSelf: 'center', borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
            {editorOpen && <>
      <View testID="expense-form" style={{ gap: 14 }}>
        <Copy accessibilityRole="header" style={styles.heading}>{dateLabel(selected, i18n.resolvedLanguage)}</Copy>
        <Copy accessibilityRole="header" style={styles.smallHeading}>{t(form.editing ? 'expenses.editEntry' : 'expenses.addEntry')}</Copy>
        <Copy style={styles.label}>{t('expenses.category')}</Copy>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('expenses.category')} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {categories.map(category => <Pressable key={category} accessibilityRole="radio" accessibilityLabel={t(`expenses.categories.${category}`)} accessibilityState={{ checked: form.entry.category === category, disabled: !unlocked }} disabled={!unlocked} onPress={() => changeField('category', category)} style={{ flexBasis: fontScale >= 1.2 ? '100%' : '46%', flexGrow: 1, minHeight: 44, borderWidth: 1, borderColor: form.entry.category === category ? colors.selectedBorder : colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: form.entry.category === category ? colors.selected : colors.surface }}><Copy>{form.entry.category === category ? '● ' : '○ '}{t(`expenses.categories.${category}`)}</Copy></Pressable>)}
        </View>
        {errorFor('category') && <Copy style={styles.error}>{errorFor('category')}</Copy>}
        <Field ref={node => { fields.current.description = node; }} id="expense-description" label={t('expenses.description')} value={form.entry.description} editable={unlocked} maxLength={240} error={errorFor('description')} onChangeText={value => changeField('description', value)} />
        <MoneyField ref={node => { fields.current.amount = node; }} id="expense-amount" label={`${t('expenses.amount')} (KRW)`} value={form.entry.amount} editable={unlocked} error={errorFor('amount')} onChangeText={value => changeField('amount', value)} />
        <LocalDataNotice notice={notice} onSave />
        {form.dirty && <Copy style={styles.help}>{t('expenses.unsaved')}</Copy>}
        <Button title={t('expenses.saveEntry')} disabled={!ready || !notice.ready} busy={busy} onPress={() => { void save(); }} />{message('save')}
        <Button title={t('expenses.closeForm')} secondary disabled={busy} onPress={() => setEditorOpen(false)} />
      </View></>}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
