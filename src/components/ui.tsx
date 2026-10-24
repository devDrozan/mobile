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
  const path = usePathname();
  return <HeaderContent key={path} path={path} />;
}
function HeaderContent({ path }: { path: string }) {
  const { t, i18n } = useTranslation();
  const { colors, styles } = useUi();
  const { resolvedTheme, setMode } = useAppTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsToggle = useRef<ComponentRef<typeof View>>(null);
  const tabs = [{ path: '/' as const, label: 'calculator' }, { path: '/guide' as const, label: 'guide' }, { path: '/insurance' as const, label: 'insurance' }];
  const modeLabels = { light: 'themeLight', dark: 'themeDark' } as const;
  function closeSettings(restoreFocus = false) {
    setSettingsOpen(false);
    if (restoreFocus) requestAnimationFrame(() => {
      const target = settingsToggle.current;
      target?.focus();
      if (target && Platform.OS !== 'web') AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
    });
  }
  return <View style={styles.header}>
    <View style={styles.brandRow}>
      <View style={styles.mark}><Copy style={styles.markText}>₩</Copy></View><Copy style={styles.brand}>{t('appName')}</Copy>
      <Pressable ref={settingsToggle} accessibilityRole="button" accessibilityLabel={t('menu')} accessibilityState={{ expanded: settingsOpen }} aria-expanded={settingsOpen} onPress={() => settingsOpen ? closeSettings(true) : setSettingsOpen(true)} style={({ pressed }) => [styles.settingsToggle, settingsOpen && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }, pressed && { opacity: .65 }]}><MenuIcon name={settingsOpen ? 'close' : 'menu'} color={colors.primary} /></Pressable>
    </View>
    <View style={styles.tabs}>{tabs.map(tab => <Pressable key={tab.path} accessibilityRole="button" accessibilityState={{ selected: path === tab.path }} onPress={() => { closeSettings(); if (path !== tab.path) router.navigate(tab.path); }} style={[styles.tab, path === tab.path && { borderBottomColor: colors.selectedBorder }]}><Copy style={[styles.tabText, path === tab.path && { color: colors.primary }]}>{t(tab.label)}</Copy></Pressable>)}</View>
    {settingsOpen && <ScrollView style={styles.settingsPanel} contentContainerStyle={styles.settingsContent} keyboardShouldPersistTaps="handled" onAccessibilityEscape={() => closeSettings(true)}>
      <View style={styles.settingsSection}>
        <View style={styles.menuRowLabel}><MenuIcon name="language" color={colors.primary} /><Copy style={[styles.label, styles.menuLabelText]}>{t('language')}</Copy></View>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('language')} style={styles.settingsOptions}>{(['en', 'my'] as const).map(language => {
          const checked = i18n.resolvedLanguage === language;
          const label = language === 'en' ? 'English' : 'မြန်မာ';
          return <Pressable key={language} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked }} aria-checked={checked} onPress={() => void changeLanguage(language)} style={[styles.settingsOption, checked && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }]}><Copy style={styles.settingsOptionText}>{checked ? '✓ ' : ''}{label}</Copy></Pressable>;
        })}</View>
      </View>
      <View style={styles.settingsSection}>
        <View style={styles.menuRowLabel}><MenuIcon name="appearance" color={colors.primary} /><Copy style={[styles.label, styles.menuLabelText]}>{t('appearance')}</Copy></View>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('appearance')} style={styles.settingsOptions}>{(['light', 'dark'] as const).map(nextMode => <Pressable key={nextMode} accessibilityRole="radio" accessibilityLabel={t(modeLabels[nextMode])} accessibilityState={{ checked: resolvedTheme === nextMode }} aria-checked={resolvedTheme === nextMode} onPress={() => setMode(nextMode)} style={[styles.settingsOption, resolvedTheme === nextMode && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }]}><Copy style={styles.settingsOptionText}>{resolvedTheme === nextMode ? '✓ ' : ''}{t(modeLabels[nextMode])}</Copy></Pressable>)}</View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('aboutUs')} onPress={() => { closeSettings(path === '/about'); if (path !== '/about') router.navigate('/about'); }} style={({ pressed }) => [styles.menuAbout, pressed && { opacity: .65 }]}><MenuIcon name="info" color={colors.primary} /><Copy style={[styles.label, { flex: 1 }]}>{t('aboutUs')}</Copy><MenuIcon name="chevron" color={colors.primary} /></Pressable>
    </ScrollView>}
  </View>;
}
function MenuIcon({ name, color }: { name: 'menu' | 'close' | 'language' | 'appearance' | 'info' | 'chevron'; color: string }) {
  const stroke = { borderColor: color, borderWidth: 1.5 };
  const line = { position: 'absolute' as const, height: 1.5, backgroundColor: color, borderRadius: 1 };
  return <View accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" style={{ width: 22, height: 22, flexShrink: 0 }}>
    {name === 'menu' && [5, 10, 15].map(top => <View key={top} style={[line, { left: 2, right: 2, top }]} />)}
    {name === 'close' && [-45, 45].map(angle => <View key={angle} style={[line, { left: 2, right: 2, top: 10, transform: [{ rotate: `${angle}deg` }] }]} />)}
    {(name === 'language' || name === 'appearance' || name === 'info') && <View style={[stroke, { position: 'absolute', width: 20, height: 20, left: 1, top: 1, borderRadius: 10 }]} />}
    {name === 'language' && <><View style={[stroke, { position: 'absolute', width: 8, height: 20, left: 7, top: 1, borderRadius: 10 }]} /><View style={[line, { left: 2, right: 2, top: 10 }]} /></>}
    {name === 'appearance' && <View style={{ position: 'absolute', left: 11, top: 2.5, width: 8.5, height: 17, borderTopRightRadius: 9, borderBottomRightRadius: 9, backgroundColor: color }} />}
    {name === 'info' && <><View style={{ position: 'absolute', width: 2, height: 2, left: 10, top: 6, borderRadius: 1, backgroundColor: color }} /><View style={{ position: 'absolute', width: 1.5, height: 6, left: 10.25, top: 10, backgroundColor: color }} /></>}
    {name === 'chevron' && <View style={{ position: 'absolute', width: 7, height: 7, left: 6, top: 7, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: color, transform: [{ rotate: '45deg' }] }} />}
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
  settingsToggle: { width: 44, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: 14, gap: 12 },
  tab: { flex: 1, minHeight: 44, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', justifyContent: 'center' },
  tabText: { fontSize: 11, lineHeight: 22, textAlign: 'center', color: colors.muted },
  settingsPanel: { maxHeight: 330, flexGrow: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceSubtle },
  settingsContent: { paddingHorizontal: 16, paddingVertical: 4, maxWidth: 650, width: '100%', alignSelf: 'center' },
  settingsSection: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuRowLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, flexBasis: 112, flexGrow: 1 },
  menuLabelText: { flexShrink: 1 },
  settingsOptions: { flexDirection: 'row', gap: 3, padding: 3, flexBasis: 184, flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 9 },
  settingsOption: { flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', borderRadius: 6 },
  settingsOptionText: { fontSize: 13, lineHeight: 28, color: colors.primary, textAlign: 'center' },
  menuAbout: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 12 },
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
