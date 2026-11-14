import { useEffect, useMemo, useRef, useState, type ComponentRef, type PropsWithChildren, type Ref } from 'react';
import { AccessibilityInfo, ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextProps, type TextStyle, type TextInputProps } from 'react-native';
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
// Noto Sans Myanmar carries 1324 ascent + 860 descent per 1000 units, so a line
// box smaller than 2.184em cuts stacked marks on Android. iOS keeps the font's own
// metrics instead of a fixed box.
export const myanmarLineHeightFactor = 2.184;
const latinDisplayFonts = ['Georgia', 'serif'];
type MutableTextStyle = { -readonly [Key in keyof TextStyle]: TextStyle[Key] };

export function Copy({ style, nativeMyanmarLineMetrics = false, fixedMetrics = false, ...props }: TextProps & { nativeMyanmarLineMetrics?: boolean; fixedMetrics?: boolean; ref?: Ref<ComponentRef<typeof Text>> }) {
  const { i18n } = useTranslation();
  const { styles } = useUi();
  const burmese = i18n.resolvedLanguage === 'my';
  if (fixedMetrics) return <Text {...props} style={[styles.copy, style]} />;
  if (!burmese) {
    // The legacy opt-in only ever affected Burmese shaping, so Latin prose keeps
    // the line heights its own styles set.
    void nativeMyanmarLineMetrics;
    return <Text {...props} style={[styles.copy, style]} />;
  }
  // Fixed line boxes clip this font's upper combining marks on iOS. Preserve the
  // font's own line metrics and shaping instead of inheriting Latin spacing. On
  // Android, derive a box that clears the font's own ascent and descent.
  const merged = StyleSheet.flatten([styles.copy, style]) ?? {};
  const fontSize = merged.fontSize ?? 14;
  // TextStyle marks its members read-only, so build the override in a mutable
  // copy and hand React Native a plain style object.
  const natural = { ...merged, letterSpacing: undefined } as MutableTextStyle;
  // Georgian/serif display faces have no Myanmar glyphs and fall back to a
  // different face, so Burmese headings keep the app's Myanmar display family.
  if (latinDisplayFonts.includes(String(merged.fontFamily))) {
    natural.fontFamily = 'NotoSansMyanmar_600SemiBold';
    natural.fontWeight = undefined;
  }
  if (Platform.OS === 'ios') natural.lineHeight = undefined;
  else {
    const required = Math.ceil(fontSize * myanmarLineHeightFactor);
    natural.lineHeight = Math.max(merged.lineHeight ?? 0, required);
  }
  return <Text {...props} style={natural} />;
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
export function MoneyField(props: { label: string; editable?: boolean; accessibilityLabel?: string; value: string; onChangeText: (v: string) => void; help?: string; error?: string; id?: string; ref?: Ref<ComponentRef<typeof TextInput>> }) {
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const menuTrigger = useRef<ComponentRef<typeof View>>(null);
  const menuHeading = useRef<ComponentRef<typeof Text>>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (menuOpen || !restoreFocus.current) return;
    const frame = requestAnimationFrame(() => { restoreFocus.current = false; if (menuTrigger.current) AccessibilityInfo.sendAccessibilityEvent(menuTrigger.current, 'focus'); });
    return () => cancelAnimationFrame(frame);
  }, [menuOpen]);
  const closeMenu = () => { setMenuOpen(false); setLanguageOpen(false); };
  return <>
    <View style={styles.header} accessibilityElementsHidden={menuOpen} importantForAccessibility={menuOpen ? 'no-hide-descendants' : 'auto'}>
      <View style={styles.headerInner}>
        <View style={styles.brandRow}>
          <Copy fixedMetrics style={styles.brand}><Copy fixedMetrics style={styles.brandAccent}>E9</Copy> Mate</Copy>
          <Pressable ref={menuTrigger} accessibilityRole="button" accessibilityLabel={t('hub.menu')} accessibilityState={{ expanded: menuOpen }} onPress={() => { restoreFocus.current = true; setMenuOpen(true); }} style={({ pressed }) => [styles.headerAction, pressed && { opacity: .65 }]}><MenuIcon name="menu" color={colors.primary} /></Pressable>
        </View>
      {path !== '/' && <Pressable accessibilityRole="button" accessibilityLabel={t('hub.backHome')} onPress={() => router.navigate('/')} style={({ pressed }) => [styles.homeLink, pressed && { opacity: .65 }]}><Copy style={styles.homeLinkText}>‹  {t('hub.backHome')}</Copy></Pressable>}
      {(path === '/severance' || path === '/severance/guide' || path === '/guide') && <View accessibilityRole="tablist" style={styles.moduleTabs}>{([{ path: '/severance' as const, label: 'calculator' }, { path: '/severance/guide' as const, label: 'guide' }]).map(tab => {
        const selected = path === tab.path || (path === '/guide' && tab.path === '/severance/guide');
        return <Pressable key={tab.path} accessibilityRole="tab" accessibilityLabel={t(tab.label)} accessibilityState={{ selected }} onPress={() => { if (!selected) router.navigate(tab.path); }} style={({ pressed }) => [styles.moduleTab, selected && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }, pressed && { opacity: .65 }]}><Copy style={[styles.moduleTabText, selected && { color: colors.primary }]}>{t(tab.label)}</Copy></Pressable>;
      })}</View>}

      </View>
    </View>
    <Modal testID="header-menu-modal" visible={menuOpen} transparent animationType="none" onShow={() => { if (menuHeading.current) AccessibilityInfo.sendAccessibilityEvent(menuHeading.current, 'focus'); }} onRequestClose={closeMenu}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 }}>
        <Pressable testID="header-menu-backdrop" accessibilityRole="button" accessibilityLabel={t('hub.dismissMenu')} onPress={closeMenu} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#091a15aa' }} />
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 420, maxHeight: '100%', alignSelf: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.surface }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 12 }}>
            <Copy ref={menuHeading} accessible accessibilityRole="header" style={styles.smallHeading}>{t('hub.menu')}</Copy>
            <Pressable accessibilityRole="button" accessibilityLabel={t(resolvedTheme === 'dark' ? 'hub.switchToLight' : 'hub.switchToDark')} onPress={() => setMode(resolvedTheme === 'dark' ? 'light' : 'dark')} style={styles.popupAction}><MenuIcon name="appearance" theme={resolvedTheme} background={colors.surface} color={colors.primary} /><Copy style={{ flex: 1 }}>{t(resolvedTheme === 'dark' ? 'hub.switchToLight' : 'hub.switchToDark')}</Copy></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('language')} accessibilityState={{ expanded: languageOpen }} onPress={() => setLanguageOpen(value => !value)} style={styles.popupAction}><MenuIcon name="language" color={colors.primary} /><Copy style={{ flex: 1 }}>{t('language')}</Copy><Copy>{languageOpen ? '−' : '+'}</Copy></Pressable>
            {languageOpen && <View accessibilityRole="radiogroup" accessibilityLabel={t('language')} style={{ gap: 8 }}>{(['en', 'my'] as const).map(language => {
              const checked = i18n.resolvedLanguage === language;
              const label = language === 'en' ? 'English' : 'မြန်မာ';
              return <Pressable key={language} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked }} onPress={() => { void changeLanguage(language); closeMenu(); }} style={[styles.languageOption, checked && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }]}><Copy style={styles.languageOptionText}>{checked ? '✓ ' : ''}{label}</Copy></Pressable>;
            })}</View>}
            <Pressable accessibilityRole="button" accessibilityLabel={t('hub.search')} onPress={() => { closeMenu(); router.navigate('/search'); }} style={styles.popupAction}><MenuIcon name="search" color={colors.primary} /><Copy style={{ flex: 1 }}>{t('hub.search')}</Copy></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('aboutUs')} onPress={() => { closeMenu(); router.navigate('/about'); }} style={styles.popupAction}><MenuIcon name="about" color={colors.primary} /><Copy style={{ flex: 1 }}>{t('aboutUs')}</Copy></Pressable>
            <Button title={t('hub.closeMenu')} secondary onPress={closeMenu} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
function MenuIcon({ name, color, theme, background }: { name: 'language' | 'appearance' | 'search' | 'about' | 'menu'; color: string; theme?: 'light' | 'dark'; background?: string }) {
  const stroke = { borderColor: color, borderWidth: 2 };
  const line = { position: 'absolute' as const, height: 2, backgroundColor: color, borderRadius: 1 };
  const moon = theme === 'dark';
  return <View accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" style={{ width: 22, height: 22, flexShrink: 0 }}>
    {name === 'menu' && <>{[4, 10, 16].map(top => <View key={top} style={[line, { left: 1, right: 1, top }]} />)}</>}
    {(name === 'language' || (name === 'appearance' && !moon)) && <View style={[stroke, { position: 'absolute', width: 20, height: 20, left: 1, top: 1, borderRadius: 10 }]} />}
    {name === 'language' && <><View style={[stroke, { position: 'absolute', width: 8, height: 20, left: 7, top: 1, borderRadius: 10 }]} /><View style={[line, { left: 2, right: 2, top: 10 }]} /></>}
    {/* A sun shows a light appearance is active; a moon shows dark, so the
        header reflects the resolved theme rather than only the next action. */}
    {name === 'appearance' && !moon && <>
      <View style={[line, { left: 0, width: 4, top: 10 }]} /><View style={[line, { right: 0, width: 4, top: 10 }]} />
      <View style={[line, { top: 0, height: 4, width: 2, left: 10 }]} /><View style={[line, { bottom: 0, height: 4, width: 2, left: 10 }]} />
    </>}
    {name === 'appearance' && moon && <>
      <View style={[stroke, { position: 'absolute', width: 16, height: 16, left: 1, top: 3, borderRadius: 8 }]} />
      <View style={{ position: 'absolute', width: 14, height: 14, left: 8, top: 1, borderRadius: 7, backgroundColor: background ?? 'transparent' }} />
    </>}
    {name === 'search' && <><View style={[stroke, { position: 'absolute', width: 13, height: 13, left: 2, top: 2, borderRadius: 7 }]} /><View style={[line, { width: 9, left: 13, top: 16, transform: [{ rotate: '45deg' }] }]} /></>}
    {name === 'about' && <><View style={[stroke, { position: 'absolute', width: 20, height: 20, left: 1, top: 1, borderRadius: 10 }]} /><View style={{ position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: color, left: 10, top: 6 }} /><View style={{ position: 'absolute', width: 2, height: 7, borderRadius: 1, backgroundColor: color, left: 10, top: 11 }} /></>}
  </View>;
}
function createStyles(colors: ThemeColors) { return StyleSheet.create({
  copy: { fontFamily: 'NotoSansMyanmar_400Regular', fontSize: 14, lineHeight: 25, color: colors.text },
  screen: { padding: 16, paddingBottom: 34, gap: 14, maxWidth: 650, width: '100%', alignSelf: 'center' },
  screenBackground: { backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerInner: { width: '100%', maxWidth: 650, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 },
  brand: { fontSize: 22, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontWeight: '700', flex: 1, flexShrink: 1, lineHeight: 30, color: colors.primary },
  brandAccent: { color: colors.primary, fontSize: 22, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontWeight: '700', lineHeight: 30 },
  popupAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAction: { width: 44, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  headerActionAccent: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.accent },
  languagePanel: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  languageOption: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  languageOptionText: { color: colors.primary, fontSize: 13, lineHeight: 27 },
  homeLink: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', alignSelf: 'flex-start' },
  homeLinkText: { fontSize: 13, lineHeight: 26, color: colors.primary, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  moduleTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  moduleTab: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', backgroundColor: colors.surface },
  moduleTabText: { fontSize: 13, lineHeight: 26, color: colors.muted, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  heroPanel: { backgroundColor: colors.surfaceSubtle, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 15, gap: 3 },
  eyebrow: { fontSize: 10, letterSpacing: 1.1, color: colors.muted, lineHeight: 22, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  title: { fontSize: 28, letterSpacing: -.5, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontWeight: '700', color: colors.text },
  burmeseTitle: { fontSize: 25, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  subtitle: { fontSize: 13, color: colors.muted, lineHeight: 22, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 0, borderRadius: 22, padding: 20, gap: 14, ...Platform.select({ ios: { shadowColor: '#1c2e24', shadowOpacity: .06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 2 }, default: {} }) },
  planRow: { flexDirection: 'row', gap: 8 },
  planOption: { flex: 1, minHeight: 56, paddingHorizontal: 8, paddingVertical: 10, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  planHelp: { fontSize: 12, lineHeight: 22, color: colors.link, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  planHelpLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  progressRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', paddingVertical: 8, gap: 12 },
  progressItem: { flexBasis: 0, flexGrow: 1, flexShrink: 1, maxWidth: 90, alignItems: 'center', gap: 6 },
  progressBadge: { minWidth: 28, minHeight: 28, paddingHorizontal: 5, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  progressNumber: { fontSize: 12, color: colors.muted, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontWeight: '600', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  progressLabel: { fontSize: 11, lineHeight: 20, textAlign: 'center', color: colors.muted },
  heading: { fontSize: 20, lineHeight: 32, fontFamily: 'NotoSansMyanmar_600SemiBold', color: colors.text },
  displayHeading: { fontSize: 22, letterSpacing: -.3, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontWeight: '700', color: colors.text },
  smallHeading: { fontSize: 14, lineHeight: 24, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  field: { gap: 7 }, label: { fontSize: 13, lineHeight: 22, color: colors.text },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 52, fontSize: 15, color: colors.text, fontFamily: 'NotoSansMyanmar_400Regular' },
  help: { fontSize: 11, lineHeight: 23, color: colors.muted }, error: { fontSize: 12, lineHeight: 24, color: colors.error },
  errorBox: { backgroundColor: colors.errorBackground, borderWidth: 1, borderColor: colors.errorBorder, borderRadius: 8, padding: 13 },
  button: { paddingHorizontal: 18, paddingVertical: 13, minHeight: 49, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.secondaryBorder },
  buttonText: { color: colors.onPrimary, fontSize: 13, lineHeight: 26, textAlign: 'center', flexShrink: 1 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.divider },
  note: { padding: 15, backgroundColor: colors.surfaceSubtle, borderRadius: 8, gap: 5 },
  switchRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  visuallyHidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  footer: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 16 },
}); }
