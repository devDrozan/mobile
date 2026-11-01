import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Copy, useUi } from '../../components/ui';
import type { ThemeColors } from '../../theme-colors';

type Slide = {
  id: string;
  labelKey: string;
  titleKey: string;
  bodyKey: string;
  actionKey: string;
  route: '/severance' | '/severance/guide' | '/insurance';
  color: string;
  art: 'calculator' | 'coins' | 'insurance';
};
const slides: readonly Slide[] = [
  { id: 'severance-info', labelKey: 'hub.usefulInfo', titleKey: 'hub.hero.severanceInfoTitle', bodyKey: 'hub.hero.severanceInfoBody', actionKey: 'hub.learnMore', route: '/severance/guide', color: '#113c29', art: 'calculator' },
  { id: 'severance-ad', labelKey: 'hub.sampleAd', titleKey: 'hub.hero.severanceAdTitle', bodyKey: 'hub.hero.severanceAdBody', actionKey: 'hub.openTool', route: '/severance', color: '#263e28', art: 'coins' },
  { id: 'insurance-info', labelKey: 'hub.usefulInfo', titleKey: 'hub.hero.insuranceInfoTitle', bodyKey: 'hub.hero.insuranceInfoBody', actionKey: 'hub.learnMore', route: '/insurance', color: '#15394a', art: 'insurance' },
  { id: 'insurance-ad', labelKey: 'hub.sampleAd', titleKey: 'hub.hero.insuranceAdTitle', bodyKey: 'hub.hero.insuranceAdBody', actionKey: 'hub.openTool', route: '/insurance', color: '#2f3448', art: 'insurance' },
];

export function HeroCarousel() {
  const { t } = useTranslation();
  const { colors } = useUi();
  const { width, fontScale } = useWindowDimensions();
  const styles = createStyles(colors);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [selected, setSelected] = useState(0);
  const viewport = Math.min(618, Math.max(0, width - 32));
  const cardWidth = viewport - 40;
  const interval = cardWidth + 12;
  const showArtwork = width >= 380 && fontScale < 1.2;
  function show(index: number) {
    const next = Math.max(0, Math.min(slides.length - 1, index));
    setSelected(next);
    scroll.current?.scrollTo({ x: next * interval, animated: false });
  }
  function sync(offset: number) { setSelected(Math.max(0, Math.min(slides.length - 1, Math.round(offset / interval)))); }
  return <View style={styles.section}>
    <ScrollView ref={scroll} horizontal directionalLockEnabled nestedScrollEnabled snapToInterval={interval} decelerationRate="fast" showsHorizontalScrollIndicator={false} style={{ width: viewport, alignSelf: 'center' }} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} onScrollEndDrag={event => sync(event.nativeEvent.contentOffset.x)} onMomentumScrollEnd={event => sync(event.nativeEvent.contentOffset.x)}>
      {slides.map((slide, index) => <Pressable key={slide.id} accessibilityRole="button" accessibilityLabel={t(slide.labelKey) + '. ' + t(slide.titleKey) + '. ' + t('hub.position', { current: index + 1, total: slides.length })} onPress={() => router.navigate(slide.route)} style={({ pressed }) => [styles.card, { width: cardWidth, backgroundColor: slide.color }, pressed && { opacity: .78 }]}>
        <View style={styles.glow} />
        {showArtwork && <HeroArtwork kind={slide.art} />}
        <View style={[styles.copyArea, showArtwork && styles.copyAreaWithArt]}>
          <Copy nativeMyanmarLineMetrics style={styles.label}>{t(slide.labelKey)}</Copy>
          <Copy nativeMyanmarLineMetrics style={styles.title}>{t(slide.titleKey)}</Copy>
          <Copy nativeMyanmarLineMetrics style={styles.body}>{t(slide.bodyKey)}</Copy>
          <View style={styles.action}><Copy nativeMyanmarLineMetrics style={styles.actionText}>{t(slide.actionKey)}  →</Copy></View>
        </View>
      </Pressable>)}
    </ScrollView>
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('hub.previousSlide')} accessibilityState={{ disabled: selected === 0 }} disabled={selected === 0} onPress={() => show(selected - 1)} style={({ pressed }) => [styles.controlButton, (selected === 0 || pressed) && { opacity: .45 }]}><Copy style={styles.controlText}>‹</Copy></Pressable>
      <View style={styles.dots} accessible accessibilityLabel={t('hub.position', { current: selected + 1, total: slides.length })} accessibilityLiveRegion="polite">{slides.map((slide, index) => <View key={slide.id} style={[styles.dot, selected === index && styles.selectedDot]} />)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('hub.nextSlide')} accessibilityState={{ disabled: selected === slides.length - 1 }} disabled={selected === slides.length - 1} onPress={() => show(selected + 1)} style={({ pressed }) => [styles.controlButton, (selected === slides.length - 1 || pressed) && { opacity: .45 }]}><Copy style={styles.controlText}>›</Copy></Pressable>
    </View>
  </View>;
}

function HeroArtwork({ kind }: { kind: Slide['art'] }) {
  if (kind === 'calculator') return <View accessible={false} style={art.wrap}><View style={art.paper} /><View style={art.calculator}><View style={art.display}><Copy style={art.displayText}>₩</Copy></View><View style={art.keys}>{Array.from({ length: 9 }, (_, index) => <View key={index} style={art.key} />)}</View></View></View>;
  if (kind === 'coins') return <View accessible={false} style={art.wrap}><View style={art.coinBack}><Copy style={art.coinText}>₩</Copy></View><View style={art.coinFront}><Copy style={art.coinText}>₩</Copy></View></View>;
  return <View accessible={false} style={art.wrap}><View style={art.shield}><Copy style={art.shieldText}>✚</Copy></View></View>;
}
const art = StyleSheet.create({
  wrap: { position: 'absolute', right: 10, bottom: 24, width: 108, height: 132, alignItems: 'center', justifyContent: 'center', opacity: .85 },
  paper: { position: 'absolute', right: 4, top: 0, width: 69, height: 88, borderRadius: 9, backgroundColor: '#acc9a2', transform: [{ rotate: '-12deg' }] },
  calculator: { position: 'absolute', right: 3, bottom: 0, width: 86, height: 109, borderRadius: 15, borderWidth: 2, borderColor: '#658b6c', backgroundColor: '#183f31', padding: 8, transform: [{ rotate: '9deg' }] },
  display: { height: 29, borderRadius: 5, backgroundColor: '#071e18', alignItems: 'center', justifyContent: 'center' },
  displayText: { color: '#d5eeac', fontSize: 19, lineHeight: 26 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  key: { width: 17, height: 14, borderRadius: 4, backgroundColor: '#82ad82' },
  coinBack: { position: 'absolute', top: 12, right: 4, width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: '#bad383', backgroundColor: '#718f48', alignItems: 'center', justifyContent: 'center' },
  coinFront: { position: 'absolute', bottom: 4, left: 2, width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: '#d6e7a3', backgroundColor: '#91ad64', alignItems: 'center', justifyContent: 'center' },
  coinText: { color: '#23402b', fontSize: 32, lineHeight: 43, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  shield: { width: 88, height: 104, borderWidth: 5, borderColor: '#a4c8d3', backgroundColor: '#347184', borderTopLeftRadius: 39, borderTopRightRadius: 39, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, alignItems: 'center', justifyContent: 'center' },
  shieldText: { color: '#e2f6ef', fontSize: 47, lineHeight: 63, fontFamily: 'NotoSansMyanmar_600SemiBold' },
});

function createStyles(colors: ThemeColors) { return StyleSheet.create({
  section: { gap: 3 },
  card: { minHeight: 225, borderRadius: 22, borderWidth: 1, borderColor: '#5c805f', padding: 18, overflow: 'hidden', justifyContent: 'center' },
  glow: { position: 'absolute', width: 180, height: 180, right: -45, top: -100, borderRadius: 90, backgroundColor: 'rgba(177,229,137,0.14)' },
  copyArea: { gap: 8, alignItems: 'flex-start' },
  copyAreaWithArt: { width: '72%' },
  label: { color: '#193628', backgroundColor: '#d1eaa7', fontSize: 10, lineHeight: 22, paddingHorizontal: 11, borderRadius: 12, overflow: 'hidden', fontFamily: 'NotoSansMyanmar_600SemiBold' },
  title: { color: '#f4f8ed', fontSize: 22, lineHeight: 36, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  body: { color: '#d5e5d4', fontSize: 12, lineHeight: 24 },
  action: { minHeight: 40, paddingHorizontal: 14, borderRadius: 21, borderWidth: 1, borderColor: '#9cc993', backgroundColor: '#2b5637', justifyContent: 'center', marginTop: 3 },
  actionText: { color: '#f3f9ed', fontSize: 12, lineHeight: 25, fontFamily: 'NotoSansMyanmar_600SemiBold' },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  controlButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  controlText: { color: colors.primary, fontSize: 26, lineHeight: 34 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 76, justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  selectedDot: { width: 20, backgroundColor: colors.primary },
}); }
