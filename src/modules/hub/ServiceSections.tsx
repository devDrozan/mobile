import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, useUi } from '../../components/ui';
import type { ThemeColors } from '../../theme-colors';
import { modules, type ModuleDefinition } from '../catalog';
import { ModuleSymbol } from '../ModuleSymbol';
import { openModule } from './moduleNavigation';

export function ServiceSections() {
  const { t, i18n } = useTranslation();
  const { colors } = useUi();
  const { width, fontScale } = useWindowDimensions();
  const styles = createStyles(colors);
  // Half-width cards leave only ~76dp for a title at 360dp, so long combined
  // service names broke into 4–5 lines and pushed their status row out of line
  // with the neighbouring card. Keep one column until there is room for two.
  const oneColumn = width < 480 || fontScale >= 1.2 || (i18n.resolvedLanguage === 'my' && width < 600);
  return <>
    <View style={styles.section}>
      <Copy accessibilityRole="header" style={styles.sectionTitle}>{t('hub.servicesTitle')}</Copy>
      <Copy nativeMyanmarLineMetrics style={styles.sectionIntro}>{t('hub.servicesIntro')}</Copy>
      <View style={styles.grid}>{modules.filter(module => module.section === 'services').map(module => <ServiceCard key={module.id} module={module} oneColumn={oneColumn} />)}</View>
    </View>
    <View style={styles.section}>
      <Copy accessibilityRole="header" style={styles.sectionTitle}>{t('hub.comingSoon')}</Copy>
      <Copy nativeMyanmarLineMetrics style={styles.sectionIntro}>{t('hub.comingIntro')}</Copy>
      <View style={styles.grid}>{modules.filter(module => module.section === 'coming').map(module => <ServiceCard key={module.id} module={module} oneColumn={oneColumn} compact />)}</View>
    </View>
  </>;
}

function ServiceCard({ module, oneColumn, compact = false }: { module: ModuleDefinition; oneColumn: boolean; compact?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useUi();
  const styles = createStyles(colors);
  const available = module.status === 'available';
  const title = t(module.titleKey);
  const accent = module.id === 'work' ? { background: colors.accent, text: colors.onAccent } : { background: colors.primary, text: colors.onPrimary };
  return <Pressable accessibilityRole="button" accessibilityLabel={t(available ? 'hub.openNamed' : 'hub.comingSoonNamed', { name: title }) + '. ' + t(available ? 'hub.available' : 'hub.comingSoon')} onPress={() => openModule(module)} style={({ pressed }) => [styles.card, oneColumn ? styles.fullCard : styles.halfCard, compact && styles.compactCard, available && styles.availableCard, pressed && { transform: [{ scale: .98 }] }]}>
    <View style={[styles.cardHeader, available && styles.availableHeader]}>
      <View accessible={false} style={[styles.symbolTile, { backgroundColor: accent.background, borderColor: accent.background }]}><ModuleSymbol id={module.id} color={accent.text} size={26} /></View>
      <Copy nativeMyanmarLineMetrics style={styles.cardTitle}>{title}</Copy>
    </View>
    {!available && <View style={styles.badgeSlot}><Copy nativeMyanmarLineMetrics style={styles.plannedBadge}>{t('hub.comingSoon')}</Copy></View>}
    <Copy nativeMyanmarLineMetrics style={styles.description}>{t(module.descriptionKey)}</Copy>
    <View accessible={false} style={styles.arrowCircle}><Copy style={styles.arrow}>→</Copy></View>
  </Pressable>;
}

function createStyles(colors: ThemeColors) { return StyleSheet.create({
  section: { gap: 7 },
  sectionTitle: { color: colors.text, fontSize: 22, lineHeight: 38, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  sectionIntro: { color: colors.muted, fontSize: 13, lineHeight: 26, marginBottom: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { minHeight: 190, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 20, padding: 12, gap: 4, overflow: 'hidden' },
  halfCard: { flexBasis: '47%', flexGrow: 1 },
  fullCard: { flexBasis: '100%' },
  compactCard: { minHeight: 190 },
  availableCard: { minHeight: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 72 },
  availableHeader: { minHeight: 48 },
  symbolTile: { width: 48, height: 48, borderWidth: 1, borderRadius: 15, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardTitle: { color: colors.text, fontSize: 14, lineHeight: 23, flex: 1, flexShrink: 1, minWidth: 0, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  // Anchoring the status and description to the bottom keeps the badge row level
  // across cards whose titles wrap to different lengths.
  badgeSlot: { minHeight: 22, justifyContent: 'center', marginTop: 'auto' },
  plannedBadge: { color: colors.onAccent, alignSelf: 'flex-start', backgroundColor: colors.accent, paddingHorizontal: 9, borderRadius: 11, fontSize: 10, lineHeight: 22, overflow: 'hidden' },
  description: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  arrowCircle: { alignSelf: 'flex-end', width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: colors.primary, fontSize: 17, lineHeight: 25 },
}); }
