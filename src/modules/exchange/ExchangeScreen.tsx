import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Copy, Field, Screen, useUi } from '../../components/ui';
import { useRouteHeadingFocus } from '../../components/useRouteHeadingFocus';
import { convert, convertHundi, ExchangeFailure, getRate, type Conversion, type Currency, type HundiConversion, type Quote } from './api';
import { DEFAULT_USD_KRW, isExpired, mmtTime, officialLink, validAmount, validRate } from './presentation';
type Mode = 'official' | 'hundi';
type Outcome = { kind: 'official'; value: Conversion } | { kind: 'hundi'; value: HundiConversion };
const MODES: readonly Mode[] = ['official', 'hundi'];
const DIRECTIONS = [['KRW', 'MMK'], ['MMK', 'KRW']] as const;
function failure(value: unknown) { return value instanceof ExchangeFailure ? value.code : 'REQUEST_FAILED'; }
export default function ExchangeScreen() {
  const { t, i18n } = useTranslation(); const tr = (key: string, options?: Record<string, unknown>) => t(`exchange.${key}`, options);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const { styles, colors } = useUi(); const heading = useRouteHeadingFocus();
  const [mode, setMode] = useState<Mode>('official'), [from, setFrom] = useState<Currency>('KRW');
  const to: Currency = from === 'KRW' ? 'MMK' : 'KRW';
  const [amount, setAmount] = useState(''), [hundiRate, setHundiRate] = useState(''), [usdKrw, setUsdKrw] = useState(DEFAULT_USD_KRW);
  const [quote, setQuote] = useState<Quote>(), [outcome, setOutcome] = useState<{ key: string; value: Outcome }>();
  const [rateError, setRateError] = useState(''), [calcError, setCalcError] = useState<{ key: string; code: string }>();
  const [loading, setLoading] = useState(true), [pendingKey, setPendingKey] = useState<string>();
  const [now, setNow] = useState(Date.now);
  const mounted = useRef(true), calc = useRef(0), immediate = useRef(false), rateGeneration = useRef(0);
  const loadRate = useCallback(async (refresh: boolean) => {
    const token = ++rateGeneration.current; setLoading(true); setRateError('');
    try { const value = await getRate(refresh); if (mounted.current && token === rateGeneration.current) { setQuote(value); setNow(Date.now()); } }
    catch (value) { if (mounted.current && token === rateGeneration.current) setRateError(failure(value)); }
    finally { if (mounted.current && token === rateGeneration.current) setLoading(false); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const token = ++rateGeneration.current;
    void getRate(false).then(value => { if (mounted.current && token === rateGeneration.current) { setQuote(value); setNow(Date.now()); } })
      .catch(value => { if (mounted.current && token === rateGeneration.current) setRateError(failure(value)); })
      .finally(() => { if (mounted.current && token === rateGeneration.current) setLoading(false); });
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, []);
  const fresh = !!quote && !isExpired(quote, now), ratesIncomplete = !validRate(hundiRate) || !validRate(usdKrw);
  // Results and errors are keyed to the exact input that produced them, so a new
  // keystroke hides stale output without a synchronous state write in the effect.
  const key = `${mode}|${from}|${amount}|${hundiRate}|${usdKrw}`;
  const shown = outcome?.key === key ? outcome.value : undefined;
  const error = calcError?.key === key ? calcError.code : '';
  const converting = pendingKey === key;
  // Every keystroke supersedes the previous request, so a late response can never replace newer input.
  useEffect(() => {
    const token = ++calc.current;
    if (!validAmount(amount) || mode === 'hundi' && ratesIncomplete || mode === 'official' && !fresh) { immediate.current = false; return; }
    const delay = immediate.current ? 0 : 400; immediate.current = false;
    const timer = setTimeout(() => {
      setPendingKey(key); setCalcError(undefined);
      const pending: Promise<Outcome> = mode === 'official'
        ? convert(from, from === 'KRW' ? 'MMK' : 'KRW', amount).then(value => ({ kind: 'official' as const, value }))
        : convertHundi(from, from === 'KRW' ? 'MMK' : 'KRW', amount, hundiRate, usdKrw).then(value => ({ kind: 'hundi' as const, value }));
      void pending.then(value => { if (mounted.current && token === calc.current) { setOutcome({ key, value }); if (value.kind === 'official') { rateGeneration.current++; setLoading(false); setRateError(''); setQuote(value.value.quote); setNow(Date.now()); } } })
        .catch(value => { if (mounted.current && token === calc.current) setCalcError({ key, code: failure(value) }); })
        .finally(() => { if (mounted.current && token === calc.current) setPendingKey(current => current === key ? undefined : current); });
    }, delay);
    return () => clearTimeout(timer);
  }, [amount, from, mode, hundiRate, usdKrw, ratesIncomplete, fresh, key]);
  function source(value: Quote) {
    const expired = isExpired(value, now), url = officialLink(value.sourceUrl);
    return <View style={{ gap: 8 }}>
      <Copy style={expired || value.freshness === 'PREVIOUS_PUBLISHED_RATE' ? styles.error : styles.help}>{tr(expired ? 'expired' : value.freshness === 'PUBLISHED_TODAY' ? 'today' : 'previous')}</Copy>
      <Copy style={styles.help}>{tr('marketLabel')}</Copy>
      <Copy style={styles.smallHeading}>{t('exchange.originalQuote', { rate: value.mmkPer100Krw })}</Copy>
      <Copy style={styles.smallHeading}>{t('exchange.normalizedQuote', { rate: value.mmkPerKrw })}</Copy>
      {url ? <Copy accessibilityRole="link" accessibilityLabel={`${tr('source')}: ${value.sourceName}`} onPress={() => { void Linking.openURL(url).catch(() => { if (mounted.current) setRateError('LINK_FAILED'); }); }} style={{ color: colors.link, textDecorationLine: 'underline', paddingVertical: 8 }}>{value.sourceName} ↗</Copy> : <Copy>{value.sourceName}</Copy>}
      <Copy style={styles.help}>{tr('published')}: {value.publicationDate} · MMT</Copy>
      <Copy style={styles.help}>{tr('retrieved')}: {mmtTime(value.retrievedAt, i18n.language)} · MMT</Copy>
      <Copy style={styles.help}>{tr('noPublishedTime')}</Copy>
      <Copy style={styles.help}>{t('exchange.referenceComparison', { rate: value.referenceMmkPerKrw })}</Copy>
      {value.freshness === 'PREVIOUS_PUBLISHED_RATE' && <Copy style={styles.help}>{tr('oldWarning')}</Copy>}
    </View>;
  }

  const modeOption = (option: Mode) => {
    const checked = mode === option;
    return <Pressable key={option} accessibilityRole="radio" accessibilityLabel={tr(`mode.${option}`)} accessibilityState={{ checked }} onPress={() => setMode(option)} style={[styles.planOption, checked && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }]}><Copy style={styles.planHelp}>{tr(`mode.${option}`)}</Copy></Pressable>;
  };
  const directionOption = ([source, target]: readonly [Currency, Currency]) => {
    const checked = from === source;
    return <Pressable key={source} accessibilityRole="radio" accessibilityLabel={`${tr('from')} ${source} ${tr('to')} ${target}`} accessibilityState={{ checked }} onPress={() => { if (!checked) { immediate.current = true; setFrom(source); } }} style={[styles.planOption, checked && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }]}><Copy style={styles.planHelp}>{source} → {target}</Copy></Pressable>;
  };
  return <Screen ref={scroll}><View style={styles.heroPanel}><Copy style={styles.eyebrow}>{tr('service')}</Copy><Copy ref={heading} accessibilityRole="header" style={styles.heading}>{tr('title')}</Copy><Copy style={styles.subtitle}>{tr('intro')}</Copy></View>
    <View style={styles.card}><Copy accessibilityRole="header" style={styles.smallHeading}>{tr('modeLabel')}</Copy><View accessibilityRole="radiogroup" accessibilityLabel={tr('modeLabel')} style={styles.planRow}>{MODES.map(modeOption)}</View><Copy style={styles.help}>{tr(mode === 'official' ? 'officialIntro' : 'hundiIntro')}</Copy></View>
    <View style={styles.card} testID="exchange-converter"><Copy accessibilityRole="header" style={styles.smallHeading}>{tr('direction')}</Copy><View accessibilityRole="radiogroup" accessibilityLabel={tr('direction')} style={styles.planRow}>{DIRECTIONS.map(directionOption)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><View><Copy style={styles.help}>{tr('from')}</Copy><Copy style={styles.heading}>{from}</Copy></View><Button title={tr('swap')} secondary onPress={() => { immediate.current = true; setFrom(to); }} /><View><Copy style={styles.help}>{tr('to')}</Copy><Copy style={styles.heading}>{to}</Copy></View></View>
      <Field id="exchange-amount" label={`${tr('amount')} (${from})`} keyboardType="decimal-pad" maxLength={18} value={amount} help={tr('instant')} error={amount && !validAmount(amount) ? tr('errors.INVALID_AMOUNT') : undefined} onChangeText={setAmount} />
      {converting && <Copy accessibilityLiveRegion="polite">{tr('calculating')}</Copy>}
      {error && <Copy accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{t(`exchange.errors.${error}`, { defaultValue: tr('errors.REQUEST_FAILED') })}</Copy>}
      {!error && mode === 'official' && !fresh && !loading && <Copy style={styles.help}>{tr('officialUnavailableHint')}</Copy>}
      {shown && <View testID="exchange-result" accessibilityLiveRegion="polite" style={styles.note}><Copy accessibilityRole="header" style={styles.smallHeading}>{tr(shown.kind === 'official' ? 'result' : 'resultHundi')}</Copy><Copy style={styles.heading}>{shown.value.convertedAmount} {shown.value.to}</Copy>{shown.value.belowDisplayPrecision && <Copy>{tr('belowPrecision')}</Copy>}<Copy style={styles.help}>{t('exchange.rounding', { digits: shown.value.decimalPlaces })}</Copy>{shown.kind === 'hundi' && <Copy style={styles.help}>{t('exchange.mmkPerKrwApplied', { rate: shown.value.rates.mmkPerKrw })}</Copy>}<Copy style={styles.help}>{tr('version')}: {shown.value.calculationVersion} · {tr('precision')}: {shown.value.calculationPrecision}</Copy></View>}
      <Copy style={styles.help}>{mode === 'official' ? tr('privacy') : tr('hundiPrivacy')}</Copy>
    </View>
    {mode === 'official'
      ? <View style={styles.card}><Copy accessibilityRole="header" style={styles.smallHeading}>{tr('officialTitle')}</Copy>{loading && <Copy accessibilityLiveRegion="polite">{tr('loading')}</Copy>}{quote && source(quote)}{rateError && <Copy accessibilityRole="alert" style={styles.error}>{rateError === 'LINK_FAILED' ? tr('linkFailed') : t(`exchange.errors.${rateError}`, { defaultValue: tr('rateUnavailable') })}</Copy>}{!quote && !loading && <Copy>{tr('rateUnavailable')}</Copy>}<Button title={tr('refresh')} secondary busy={loading} disabled={converting} onPress={() => { void loadRate(true); }} /></View>
      : <View style={styles.card}><Copy accessibilityRole="header" style={styles.smallHeading}>{tr('hundiTitle')}</Copy><Field id="exchange-mmk-per-usd" label={tr('mmkPerUsd')} keyboardType="decimal-pad" maxLength={11} value={hundiRate} help={tr('hundiRateHelp')} error={hundiRate && !validRate(hundiRate) ? tr('errors.INVALID_HUNDI_RATE') : undefined} onChangeText={setHundiRate} /><Field id="exchange-usd-per-krw" label={tr('usdPerKrw')} keyboardType="decimal-pad" maxLength={11} value={usdKrw} help={tr('usdPerKrwHelp')} error={usdKrw && !validRate(usdKrw) ? tr('errors.INVALID_USD_KRW_RATE') : undefined} onChangeText={setUsdKrw} /><Button title={tr('reset')} secondary onPress={() => setUsdKrw(DEFAULT_USD_KRW)} /><Copy style={styles.help}>{tr('formula')}</Copy></View>}
    <View style={styles.note}><Copy>{tr(mode === 'official' ? 'disclaimer' : 'hundiDisclaimer')}</Copy></View>
  </Screen>;
}
