import { Pressable, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Copy, useUi } from '../../components/ui';
import type { ThemeColors } from '../../theme-colors';

const tabs = [
  { path: '/' as const, labelKey: 'hub.home', icon: 'home' as const },
  { path: '/services' as const, labelKey: 'hub.servicesTab', icon: 'services' as const },
  { path: '/notices' as const, labelKey: 'hub.noticesTab', icon: 'notices' as const },
];

export function HubFooter() {
  const path = usePathname();
  const { t } = useTranslation();
  const { colors } = useUi();
  const styles = createStyles(colors);
  if (!tabs.some(tab => tab.path === path)) return null;
  return <View style={styles.footer}><View accessibilityRole="tablist" style={styles.tabs}>{tabs.map(tab => {
    const selected = tab.path === path;
    return <Pressable key={tab.path} accessibilityRole="tab" accessibilityLabel={t(tab.labelKey)} accessibilityState={{ selected }} onPress={() => { if (!selected) router.navigate(tab.path); }} style={({ pressed }) => [styles.tab, pressed && { opacity: .65 }]}>
      <HubIcon name={tab.icon} color={selected ? colors.primary : colors.muted} />
      <Copy nativeMyanmarLineMetrics style={[styles.label, selected && styles.selectedLabel]}>{t(tab.labelKey)}</Copy>
      {selected && <View style={styles.selectedDot} />}
    </Pressable>;
  })}</View></View>;
}

function HubIcon({ name, color }: { name: 'home' | 'services' | 'notices'; color: string }) {
  const line = { borderColor: color, borderWidth: 2 };
  return <View accessible={false} style={{ width: 25, height: 25, alignItems: 'center', justifyContent: 'center' }}>
    {name === 'home' && <><View style={[line, { width: 16, height: 16, transform: [{ rotate: '45deg' }], borderRightWidth: 0, borderBottomWidth: 0, position: 'absolute', top: 4 }]} /><View style={[line, { width: 15, height: 12, position: 'absolute', bottom: 2, borderTopWidth: 0 }]} /></>}
    {name === 'services' && <View style={{ width: 24, height: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{Array.from({ length: 4 }, (_, index) => <View key={index} style={[line, { width: 10, height: 10, borderRadius: 2 }]} />)}</View>}
    {name === 'notices' && <><View style={[line, { width: 17, height: 18, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderBottomWidth: 0, position: 'absolute', top: 2 }]} /><View style={{ width: 21, height: 2, borderRadius: 1, backgroundColor: color, position: 'absolute', bottom: 4 }} /><View style={{ width: 5, height: 3, borderRadius: 3, backgroundColor: color, position: 'absolute', bottom: 0 }} /></>}
  </View>;
}

function createStyles(colors: ThemeColors) { return StyleSheet.create({
  footer: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  tabs: { flexDirection: 'row', width: '100%', maxWidth: 650, alignSelf: 'center', minHeight: 62 },
  tab: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 1 },
  label: { color: colors.muted, fontSize: 11, lineHeight: 21 },
  selectedLabel: { color: colors.primary, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  selectedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, position: 'absolute', bottom: 2 },
}); }
