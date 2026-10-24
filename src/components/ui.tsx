import { useMemo, useRef, useState, type ComponentRef, type PropsWithChildren, type Ref } from 'react';
import { AccessibilityInfo, ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextProps, type TextInputProps } from 'react-native';
import { usePathname, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { useAppTheme } from '../theme';
import type { ThemeColors } from '../theme-colors';

export function useUi() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return { colors, styles };
}
export function Copy({ style, ...props }: TextProps & { ref?: Ref<ComponentRef<typeof Text>> }) {
  const { i18n } = useTranslation();
  const { styles } = useUi();
  if (Platform.OS === 'ios' && i18n.resolvedLanguage === 'my' && props.accessibilityRole === 'header') {
    // Fixed line boxes clip this font's upper combining marks on iOS. Preserve
    // the font's own line metrics and shaping instead of inheriting Latin spacing.
    const headingStyle = StyleSheet.flatten([styles.copy, style]);
    return <Text {...props} style={{ ...headingStyle, lineHeight: undefined, letterSpacing: undefined }} />;
  }
  return <Text {...props} style={[styles.copy, style]} />;
}
export function Button({ title, onPress, secondary = false, busy = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; busy?: boolean; disabled?: boolean }) {
  const { colors, styles } = useUi();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }} onPress={onPress} disabled={disabled || busy} style={({ pressed }) => [styles.button, secondary && styles.secondary, (pressed || disabled || busy) && { opacity: .55 }]}>{busy && <ActivityIndicator accessible={false} color={secondary ? colors.primary : colors.onPrimary} />}<Copy style={[styles.buttonText, secondary && { color: colors.primary }]}>{title}</Copy></Pressable>;
}
export function Field({ label, help, error, id, ref, ...props }: TextInputProps & { label: string; help?: string; error?: string; id?: string; ref?: Ref<ComponentRef<typeof TextInput>> }) {
  const { colors, styles } = useUi();
  const { resolvedTheme } = useAppTheme();
  const descriptions = [help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ');
  return <View style={styles.field}><Copy style={styles.label}>{label}</Copy><TextInput ref={ref} nativeID={id} accessibilityLabel={label} accessibilityHint={[help, error].filter(Boolean).join(' ') || undefined} aria-invalid={!!error} aria-describedby={id && descriptions ? descriptions : undefined} autoCapitalize="none" autoCorrect={false} autoComplete="off" placeholderTextColor={colors.placeholder} selectionColor={colors.primary} keyboardAppearance={Platform.OS === 'ios' ? resolvedTheme : undefined} {...props} style={[styles.input, !!error && { borderColor: colors.error }, props.style]} />{!!help && <Copy nativeID={id ? `${id}-help` : undefined} style={styles.help}>{help}</Copy>}{!!error && <Copy nativeID={id ? `${id}-error` : undefined} accessibilityRole="alert" style={styles.error}>{error}</Copy>}</View>;
}
export function MoneyField(props: { label: string; value: string; onChangeText: (v: string) => void; help?: string; error?: string; id?: string; ref?: Ref<ComponentRef<typeof TextInput>> }) {
  return <Field {...props} keyboardType="decimal-pad" maxLength={22} placeholder="0 KRW" />;
}
export function Screen({ children, ref, contentRef }: PropsWithChildren<{ ref?: Ref<ComponentRef<typeof ScrollView>>; contentRef?: Ref<ComponentRef<typeof View>> }>) {
  const { styles } = useUi();
  return <ScrollView ref={ref} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets style={styles.screenBackground}><View ref={contentRef} style={styles.screen}>{children}<CopyrightFooter /></View></ScrollView>;
}
function CopyrightFooter() {
  const { t } = useTranslation();
  const { styles } = useUi();
  return <View style={styles.footer}><Copy style={[styles.help, { textAlign: 'center' }]}>{t('copyright', { year: new Date().getFullYear(), creator: 'devrozan' })}</Copy></View>;
}
export function Header() {
  const { t, i18n } = useTranslation();
  const { colors, styles } = useUi();
  const { mode, setMode } = useAppTheme();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const appearanceToggle = useRef<ComponentRef<typeof View>>(null);
  const path = usePathname();
  const tabs = [{ path: '/' as const, label: 'calculator' }, { path: '/guide' as const, label: 'guide' }, { path: '/insurance' as const, label: 'insurance' }];
  const modeLabels = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' } as const;
  return <View style={styles.header}>
    <View style={styles.brandRow}><View style={styles.mark}><Copy style={styles.markText}>₩</Copy></View><Copy style={styles.brand}>{t('appName')}</Copy><View style={styles.language}>{(['en', 'my'] as const).map(l => <Pressable key={l} accessibilityRole="button" accessibilityLabel={l === 'en' ? 'English' : 'မြန်မာ'} accessibilityState={{ selected: i18n.resolvedLanguage === l }} onPress={() => void changeLanguage(l)} style={[styles.languageButton, i18n.resolvedLanguage === l && { backgroundColor: colors.selected }]}><Copy style={{ fontSize: 11 }}>{l === 'en' ? 'EN' : 'မြန်မာ'}</Copy></Pressable>)}</View></View>
    <View style={styles.tabs}>{tabs.map(tab => <Pressable key={tab.path} accessibilityRole="button" accessibilityState={{ selected: path === tab.path }} onPress={() => { setAppearanceOpen(false); if (path !== tab.path) router.navigate(tab.path); }} style={[styles.tab, path === tab.path && { borderBottomColor: colors.selectedBorder }]}><Copy style={[styles.tabText, path === tab.path && { color: colors.primary }]}>{t(tab.label)}</Copy></Pressable>)}</View>
    <View style={styles.utilities}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: path === '/about' }} onPress={() => { setAppearanceOpen(false); if (path !== '/about') router.navigate('/about'); }} style={[styles.utilityButton, path === '/about' && { backgroundColor: colors.selected }]}><Copy style={styles.utilityText}>{t('about')}</Copy></Pressable>
      <Pressable ref={appearanceToggle} accessibilityRole="button" accessibilityLabel={`${t('appearance')}: ${t(modeLabels[mode])}`} accessibilityState={{ expanded: appearanceOpen }} onPress={() => setAppearanceOpen(open => !open)} style={[styles.utilityButton, { flex: 1 }, appearanceOpen && { backgroundColor: colors.selected }]}><Copy style={styles.utilityText}>{t('appearance')} · {t(modeLabels[mode])} {appearanceOpen ? '⌃' : '⌄'}</Copy></Pressable>
    </View>
    {appearanceOpen && <View accessibilityRole="radiogroup" accessibilityLabel={t('appearance')} style={styles.appearanceOptions}>{(['system', 'light', 'dark'] as const).map(nextMode => <Pressable key={nextMode} accessibilityRole="radio" accessibilityLabel={t(modeLabels[nextMode])} accessibilityState={{ checked: mode === nextMode }} aria-checked={mode === nextMode} onPress={() => { setMode(nextMode); setAppearanceOpen(false); requestAnimationFrame(() => { const target = appearanceToggle.current; target?.focus(); if (target && Platform.OS !== 'web') AccessibilityInfo.sendAccessibilityEvent(target, 'focus'); }); }} style={[styles.appearanceOption, mode === nextMode && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }]}><Copy style={styles.utilityText}>{mode === nextMode ? '✓ ' : ''}{t(modeLabels[nextMode])}</Copy></Pressable>)}</View>}
  </View>;
}
function createStyles(colors: ThemeColors) { return StyleSheet.create({
  copy: { fontFamily: 'NotoSansMyanmar_400Regular', fontSize: 14, lineHeight: 25, color: colors.text },
  screen: { padding: 20, paddingBottom: 45, gap: 20, maxWidth: 650, width: '100%', alignSelf: 'center' },
  screenBackground: { backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 13 },
  mark: { backgroundColor: colors.brandBackground, width: 33, height: 35, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  markText: { color: colors.brandText, fontSize: 23, lineHeight: 33 },
  brand: { fontSize: 13, fontFamily: 'NotoSansMyanmar_600SemiBold', flex: 1, lineHeight: 26 },
  language: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 7, padding: 3 },
  languageButton: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, minHeight: 44, minWidth: 36, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: 14, gap: 12 },
  tab: { flex: 1, minHeight: 44, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', justifyContent: 'center' },
  tabText: { fontSize: 11, lineHeight: 22, textAlign: 'center', color: colors.muted },
  utilities: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 5 },
  utilityButton: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, justifyContent: 'center' },
  utilityText: { fontSize: 11, lineHeight: 23, color: colors.primary, textAlign: 'center' },
  appearanceOptions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  appearanceOption: { flex: 1, minHeight: 48, padding: 8, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 7 },
  eyebrow: { fontSize: 10, letterSpacing: .8, color: colors.muted, lineHeight: 23 },
  title: { fontSize: 29, lineHeight: 46, letterSpacing: -.6, fontFamily: 'NotoSansMyanmar_600SemiBold', marginVertical: 8 },
  burmeseTitle: { fontSize: 26, lineHeight: 46, fontFamily: 'NotoSansMyanmar_600SemiBold', marginVertical: 8 },
  subtitle: { fontSize: 13, color: colors.muted, lineHeight: 26 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 20, gap: 18 },
  heading: { fontSize: 18, lineHeight: 32, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  smallHeading: { fontSize: 14, lineHeight: 27, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  field: { gap: 7 }, label: { fontSize: 12, lineHeight: 24 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 11, minHeight: 48, fontSize: 15, color: colors.text, fontFamily: 'NotoSansMyanmar_400Regular' },
  help: { fontSize: 11, lineHeight: 23, color: colors.muted }, error: { fontSize: 12, lineHeight: 24, color: colors.error },
  errorBox: { backgroundColor: colors.errorBackground, borderWidth: 1, borderColor: colors.errorBorder, borderRadius: 8, padding: 13 },
  button: { paddingHorizontal: 18, paddingVertical: 13, minHeight: 49, borderRadius: 8, backgroundColor: colors.primary, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.secondaryBorder },
  buttonText: { color: colors.onPrimary, fontSize: 13, lineHeight: 26, textAlign: 'center', flexShrink: 1 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.divider },
  note: { padding: 15, backgroundColor: colors.surfaceSubtle, borderRadius: 8, gap: 5 },
  footer: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 16 },
}); }
