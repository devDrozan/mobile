import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, AppState, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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

type CarouselController = {
  move: (direction: number, automatic?: boolean) => void;
  pause: () => void; resume: () => void;
  touchStart: () => void; touchEnd: () => void;
  beginDrag: (offset: number) => void; endDrag: (offset: number) => void;
  momentumStart: () => void; momentumEnd: (offset: number) => void; scroll: (offset: number) => void;
};
const loopingSlides = [slides[slides.length - 1], ...slides, slides[0]];

export function HeroCarousel() {
  const { t } = useTranslation();
  const { colors } = useUi();
  const { width, fontScale } = useWindowDimensions();
  const styles = createStyles(colors);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const logical = useRef(0);
  const physical = useRef(1);
  const focused = useRef(false);
  const appActive = useRef(AppState.currentState === 'active');
  const reduceMotion = useRef(true);
  const controller = useRef<CarouselController | null>(null);
  const [selected, setSelected] = useState(0);
  const viewport = Math.min(618, Math.max(0, width - 32));
  const cardWidth = viewport - 40;
  const interval = cardWidth + 12;
  const showArtwork = width >= 380 && fontScale < 1.2;
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let touching = false, dragging = false, moving = false;
    let appSubscription: ReturnType<typeof AppState.addEventListener> | undefined;
    let motionSubscription: ReturnType<typeof AccessibilityInfo.addEventListener> | undefined;
    let preferenceRead = 0;
    let target: number | null = null;
    let origin: 'manual' | 'auto' | null = null;
    let offset = (logical.current + 1) * interval;
    const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
    const clearSettle = () => { if (settleTimer !== undefined) clearTimeout(settleTimer); settleTimer = undefined; };
    const canonical = () => {
      physical.current = logical.current + 1; offset = physical.current * interval;
      scroll.current?.scrollTo({ x: offset, animated: false });
    };
    function arm() {
      clearTimer();
      if (!active || !focused.current || !appActive.current || touching || dragging) return;
      timer = setTimeout(() => { timer = undefined; move(1, true); }, 4000);
    }
    function finish(value: number) {
      if (!active || touching || dragging || !moving) return;
      const index = Math.max(0, Math.min(slides.length + 1, Math.round(value / interval)));
      // Ignore a late completion from an animation interrupted by another action.
      if (target !== null && Math.abs(value / interval - target) > .25) return;
      clearSettle();
      logical.current = (index + slides.length - 1) % slides.length;
      physical.current = index; setSelected(logical.current);
      const wasAutomatic = origin === 'auto';
      moving = false; target = null; origin = null; offset = value;
      if (index === 0 || index === slides.length + 1) canonical();
      if (!wasAutomatic || timer === undefined) arm();
    }
    function settleAfter(delay: number) {
      clearSettle();
      settleTimer = setTimeout(() => { settleTimer = undefined; finish(target === null ? offset : target * interval); }, delay);
    }
    function move(direction: number, automatic = false) {
      if (!active || touching || dragging || automatic && (!focused.current || !appActive.current)) return;
      clearTimer(); clearSettle();
      if (moving) canonical();
      target = physical.current + direction;
      logical.current = (logical.current + direction + slides.length) % slides.length;
      setSelected(logical.current);
      if (reduceMotion.current) {
        moving = false; target = null; origin = null; canonical(); arm();
      } else {
        physical.current = target; moving = true; origin = automatic ? 'auto' : 'manual';
        scroll.current?.scrollTo({ x: target * interval, animated: true });
        // Some platforms omit momentum-end for scrollTo; complete the adjacent
        // transition and rewind its sentinel if native completion never arrives.
        settleAfter(700);
        if (automatic) arm();
      }
    }
    function stop() {
      clearTimer(); clearSettle(); touching = false; dragging = false; moving = false; target = null; origin = null;
      canonical();
    }
    function detach() {
      appSubscription?.remove(); motionSubscription?.remove();
      appSubscription = undefined; motionSubscription = undefined; preferenceRead++;
    }
    function resume() {
      if (!appSubscription) {
        appActive.current = AppState.currentState === 'active';
        appSubscription = AppState.addEventListener('change', state => {
          appActive.current = state === 'active';
          if (appActive.current) { canonical(); arm(); } else stop();
        });
        motionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
          reduceMotion.current = value;
          if (value && moving && target !== null && !dragging && !touching) finish(target * interval);
        });
        const read = ++preferenceRead;
        void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active && read === preferenceRead) reduceMotion.current = value; }).catch(() => { if (active && read === preferenceRead) reduceMotion.current = true; });
      }
      canonical(); arm();
    }
    const actions: CarouselController = {
      move, pause: () => { stop(); detach(); }, resume,
      touchStart: () => { touching = true; clearTimer(); },
      touchEnd: () => { touching = false; if (!dragging) { if (moving) settleAfter(target === null ? 180 : 700); else arm(); } },
      beginDrag: value => { if (!focused.current || !appActive.current) return; clearTimer(); clearSettle(); offset = value; target = null; dragging = true; moving = true; origin = 'manual'; },
      endDrag: value => { if (!focused.current || !appActive.current) return; offset = value; dragging = false; moving = true; origin = 'manual'; settleAfter(180); },
      momentumStart: () => { if (!focused.current || !appActive.current) return; moving = true; settleAfter(700); },
      momentumEnd: finish,
      scroll: value => { offset = value; if (moving && !dragging && target === null) settleAfter(180); },
    };
    controller.current = actions;
    if (focused.current) resume(); else canonical();
    return () => {
      active = false; clearTimer(); clearSettle(); detach();
      if (controller.current === actions) controller.current = null;
    };
  }, [interval]);
  useFocusEffect(useCallback(() => {
    focused.current = true; controller.current?.resume();
    return () => { focused.current = false; controller.current?.pause(); };
  }, []));
  return <View style={styles.section}>
    <ScrollView testID="hero-carousel" ref={scroll} horizontal directionalLockEnabled nestedScrollEnabled snapToInterval={interval} decelerationRate="fast" showsHorizontalScrollIndicator={false} scrollEventThrottle={16} contentOffset={{ x: interval, y: 0 }} style={{ width: viewport, alignSelf: 'center' }} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
      onTouchStart={() => controller.current?.touchStart()} onTouchEnd={() => controller.current?.touchEnd()} onTouchCancel={() => controller.current?.touchEnd()}
      onScrollBeginDrag={event => controller.current?.beginDrag(event.nativeEvent.contentOffset.x)} onScrollEndDrag={event => controller.current?.endDrag(event.nativeEvent.contentOffset.x)}
      onMomentumScrollBegin={() => controller.current?.momentumStart()} onMomentumScrollEnd={event => controller.current?.momentumEnd(event.nativeEvent.contentOffset.x)} onScroll={event => controller.current?.scroll(event.nativeEvent.contentOffset.x)}>
      {loopingSlides.map((slide, physicalIndex) => {
        const clone = physicalIndex === 0 || physicalIndex === slides.length + 1;
        const index = (physicalIndex + slides.length - 1) % slides.length;
        const content = <>
          <View style={styles.glow} />
          {showArtwork && <HeroArtwork kind={slide.art} />}
          <View style={[styles.copyArea, showArtwork && styles.copyAreaWithArt]}>
            <Copy nativeMyanmarLineMetrics style={styles.label}>{t(slide.labelKey)}</Copy>
            <Copy nativeMyanmarLineMetrics style={styles.title}>{t(slide.titleKey)}</Copy>
            <Copy nativeMyanmarLineMetrics style={styles.body}>{t(slide.bodyKey)}</Copy>
            <View style={styles.action}><Copy nativeMyanmarLineMetrics style={styles.actionText}>{t(slide.actionKey)}  →</Copy></View>
          </View>
        </>;
        return clone
          ? <View key={`clone-${physicalIndex}`} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[styles.card, { width: cardWidth, backgroundColor: slide.color }]}>{content}</View>
          : <Pressable key={slide.id} accessibilityRole="button" accessibilityLabel={t(slide.labelKey) + '. ' + t(slide.titleKey) + '. ' + t('hub.position', { current: index + 1, total: slides.length })} onPress={() => router.navigate(slide.route)} style={({ pressed }) => [styles.card, { width: cardWidth, backgroundColor: slide.color }, pressed && { opacity: .78 }]}>{content}</Pressable>;
      })}
    </ScrollView>
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('hub.previousSlide')} onPress={() => controller.current?.move(-1)} style={({ pressed }) => [styles.controlButton, pressed && { opacity: .45 }]}><Copy style={styles.controlText}>‹</Copy></Pressable>
      <View style={styles.dots} accessible accessibilityLabel={t('hub.position', { current: selected + 1, total: slides.length })} accessibilityLiveRegion="polite">{slides.map((slide, index) => <View key={slide.id} style={[styles.dot, selected === index && styles.selectedDot]} />)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('hub.nextSlide')} onPress={() => controller.current?.move(1)} style={({ pressed }) => [styles.controlButton, pressed && { opacity: .45 }]}><Copy style={styles.controlText}>›</Copy></Pressable>
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
