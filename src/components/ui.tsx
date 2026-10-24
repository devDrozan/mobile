import { type ComponentRef, type PropsWithChildren, type Ref } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextProps, type TextInputProps } from 'react-native';
import { usePathname, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

export const colors = { green: '#123c35', text: '#243b35', muted: '#68795f', border: '#dfe7d7', background: '#f7f8f4', lime: '#d5eab5' };
export function Copy({ style, ...props }: TextProps & { ref?: Ref<ComponentRef<typeof Text>> }) { return <Text {...props} style={[styles.copy, style]} />; }
export function Button({ title, onPress, secondary = false, busy = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; busy?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }} onPress={onPress} disabled={disabled || busy} style={({ pressed }) => [styles.button, secondary && styles.secondary, (pressed || disabled || busy) && { opacity: .55 }]}>{busy && <ActivityIndicator accessible={false} color={secondary ? colors.green : '#fff'} />}<Copy style={[styles.buttonText, secondary && { color: colors.green }]}>{title}</Copy></Pressable>;
}
export function Field({ label, help, error, id, ref, ...props }: TextInputProps & { label: string; help?: string; error?: string; id?: string; ref?: Ref<ComponentRef<typeof TextInput>> }) {
  const descriptions = [help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ');
  return <View style={styles.field}><Copy style={styles.label}>{label}</Copy><TextInput ref={ref} nativeID={id} accessibilityLabel={label} accessibilityHint={[help, error].filter(Boolean).join(' ') || undefined} aria-invalid={!!error} aria-describedby={id && descriptions ? descriptions : undefined} autoCapitalize="none" autoCorrect={false} autoComplete="off" placeholderTextColor="#a0ad94" {...props} style={[styles.input, !!error && { borderColor: '#b76a52' }, props.style]} />{!!help && <Copy nativeID={id ? `${id}-help` : undefined} style={styles.help}>{help}</Copy>}{!!error && <Copy nativeID={id ? `${id}-error` : undefined} accessibilityRole="alert" style={styles.error}>{error}</Copy>}</View>;
}
export function MoneyField(props: { label: string; value: string; onChangeText: (v: string) => void; help?: string; error?: string; id?: string; ref?: Ref<ComponentRef<typeof TextInput>> }) {
  return <Field {...props} keyboardType="decimal-pad" maxLength={22} placeholder="0 KRW" />;
}
export function Screen({ children, ref, contentRef }: PropsWithChildren<{ ref?: Ref<ComponentRef<typeof ScrollView>>; contentRef?: Ref<ComponentRef<typeof View>> }>) {
  return <ScrollView ref={ref} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets><View ref={contentRef} style={styles.screen}>{children}</View></ScrollView>;
}
export function Header() {
  const { t, i18n } = useTranslation();
  const path = usePathname();
  const tabs = [{ path: '/' as const, label: 'calculator' }, { path: '/guide' as const, label: 'guide' }, { path: '/insurance' as const, label: 'insurance' }];
  return <View style={styles.header}><View style={styles.brandRow}><View style={styles.mark}><Copy style={styles.markText}>₩</Copy></View><Copy style={styles.brand}>{t('appName')}</Copy><View style={styles.language}>{(['en', 'my'] as const).map(l => <Pressable key={l} accessibilityRole="button" accessibilityLabel={l === 'en' ? 'English' : 'မြန်မာ'} onPress={() => void changeLanguage(l)} style={[styles.languageButton, i18n.language === l && { backgroundColor: '#e8efde' }]}><Copy style={{ fontSize: 11 }}>{l === 'en' ? 'EN' : 'မြန်မာ'}</Copy></Pressable>)}</View></View><View style={styles.tabs}>{tabs.map(tab => <Pressable key={tab.path} accessibilityRole="button" accessibilityState={{ selected: path === tab.path }} onPress={() => { if (path !== tab.path) router.navigate(tab.path); }} style={[styles.tab, path === tab.path && { borderBottomColor: '#7e9e63' }]}><Copy style={[styles.tabText, path === tab.path && { color: colors.green }]}>{t(tab.label)}</Copy></Pressable>)}</View></View>;
}
export const styles = StyleSheet.create({
  copy: { fontFamily: 'NotoSansMyanmar_400Regular', fontSize: 14, lineHeight: 25, color: colors.text },
  screen: { padding: 20, paddingBottom: 45, gap: 20, maxWidth: 650, width: '100%', alignSelf: 'center' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 13 },
  mark: { backgroundColor: colors.green, width: 33, height: 35, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  markText: { color: colors.lime, fontSize: 23, lineHeight: 33 },
  brand: { fontSize: 13, fontFamily: 'NotoSansMyanmar_600SemiBold', flex: 1, lineHeight: 26 },
  language: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 7, padding: 3 },
  languageButton: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, minHeight: 34, justifyContent: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: 14, gap: 12 },
  tab: { flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', justifyContent: 'center' },
  tabText: { fontSize: 11, lineHeight: 22, textAlign: 'center', color: colors.muted },
  eyebrow: { fontSize: 10, letterSpacing: .8, color: '#6c825d', lineHeight: 23 },
  title: { fontSize: 29, lineHeight: 46, letterSpacing: -.6, fontFamily: 'NotoSansMyanmar_600SemiBold', marginVertical: 8 },
  burmeseTitle: { fontSize: 26, lineHeight: 46, letterSpacing: 0 },
  subtitle: { fontSize: 13, color: colors.muted, lineHeight: 26 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 20, gap: 18 },
  heading: { fontSize: 18, lineHeight: 32, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  smallHeading: { fontSize: 14, lineHeight: 27, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  field: { gap: 7 }, label: { fontSize: 12, lineHeight: 24 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9e2d0', borderRadius: 8, paddingHorizontal: 13, paddingVertical: 11, minHeight: 48, fontSize: 15, color: colors.text, fontFamily: 'NotoSansMyanmar_400Regular' },
  help: { fontSize: 11, lineHeight: 23, color: colors.muted }, error: { fontSize: 12, lineHeight: 24, color: '#a45d45' },
  errorBox: { backgroundColor: '#fcf2ec', borderWidth: 1, borderColor: '#e9d7cb', borderRadius: 8, padding: 13 },
  button: { paddingHorizontal: 18, paddingVertical: 13, minHeight: 49, borderRadius: 8, backgroundColor: colors.green, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: '#edf3e5', borderWidth: 1, borderColor: '#dce6d0' },
  buttonText: { color: '#fff', fontSize: 13, lineHeight: 26, textAlign: 'center', flexShrink: 1 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#e9eee2' },
  note: { padding: 15, backgroundColor: '#eff4e6', borderRadius: 8, gap: 5 },
});
