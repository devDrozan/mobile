import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, Screen, useUi } from '../components/ui';
import { useRouteHeadingFocus } from '../components/useRouteHeadingFocus';
import { ModuleSymbol } from '../modules/ModuleSymbol';
import { openModule } from '../modules/hub/moduleNavigation';
import { modules } from '../modules/catalog';
import type { ThemeColors } from '../theme-colors';

export default function SearchScreen() {
  const { t } = useTranslation();
  const { colors } = useUi();
  const styles = createStyles(colors);
  const heading = useRouteHeadingFocus();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase();
  const results = normalized
    ? modules.filter(module => (t(module.titleKey) + ' ' + t(module.descriptionKey)).toLocaleLowerCase().includes(normalized))
    : modules;
  const summary = t(results.length ? 'hub.searchResults' : 'hub.noResults');
  // Live regions are Android-only, so announce the summary on iOS as well.
  useEffect(() => {
    if (Platform.OS === 'ios' && normalized) AccessibilityInfo.announceForAccessibility(summary);
  }, [normalized, summary]);
  return <Screen>
    <Copy ref={heading} accessible accessibilityRole="header" tabIndex={-1} style={styles.title}>{t('hub.searchTitle')}</Copy>
    <TextInput value={query} onChangeText={setQuery} accessibilityLabel={t('hub.searchPlaceholder')} placeholder={t('hub.searchPlaceholder')} placeholderTextColor={colors.placeholder} selectionColor={colors.primary} autoCapitalize="none" autoCorrect={false} style={styles.input} />
    {/* A single polite region announces the state: the hint for the full list and
        matching count, the empty card for no results, so no sentence is repeated. */}
    {(!normalized || results.length > 0) && <Copy nativeMyanmarLineMetrics accessibilityLiveRegion="polite" style={styles.hint}>{t(normalized ? 'hub.searchResults' : 'hub.searchHint')}</Copy>}
    {results.length === 0 ? <View style={styles.empty}><Copy accessibilityLiveRegion="polite" style={styles.emptyTitle}>{t('hub.noResults')}</Copy><Copy nativeMyanmarLineMetrics style={styles.hint}>{t('hub.noResultsHint')}</Copy></View> : results.map(module => {
      const available = module.status === 'available';
      const title = t(module.titleKey);
      return <Pressable key={module.id} accessibilityRole="button" accessibilityLabel={t(available ? 'hub.openNamed' : 'hub.comingSoonNamed', { name: title }) + '. ' + t(available ? 'hub.available' : 'hub.comingSoon')} onPress={() => openModule(module)} style={({ pressed }) => [styles.result, pressed && { opacity: .65 }]}>
        <View style={styles.symbol}><ModuleSymbol id={module.id} color={colors.primary} size={22} /></View>
        <View style={styles.resultText}><Copy nativeMyanmarLineMetrics style={styles.resultTitle}>{title}</Copy><Copy nativeMyanmarLineMetrics style={styles.status}>{t(available ? 'hub.available' : 'hub.comingSoon')}</Copy></View>
        <Copy style={styles.arrow}>›</Copy>
      </Pressable>;
    })}
  </Screen>;
}

function createStyles(colors: ThemeColors) { return StyleSheet.create({
  title: { color: colors.text, fontSize: 23, lineHeight: 38, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  input: { minHeight: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontFamily: 'NotoSansMyanmar_400Regular', fontSize: 15 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 25 },
  empty: { padding: 18, backgroundColor: colors.surfaceSubtle, borderRadius: 14, gap: 5 },
  emptyTitle: { color: colors.text, fontSize: 16, lineHeight: 30, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  result: { minHeight: 68, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  symbol: { width: 32, alignItems: 'center' },
  resultText: { flex: 1 },
  resultTitle: { color: colors.text, fontSize: 14, lineHeight: 27, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  status: { color: colors.muted, fontSize: 11, lineHeight: 22 },
  arrow: { color: colors.primary, fontSize: 23, lineHeight: 32 },
}); }
