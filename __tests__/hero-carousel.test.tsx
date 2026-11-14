import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, ScrollView, useWindowDimensions, type AppStateStatus } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import i18n from '../src/i18n';
import { HeroCarousel } from '../src/modules/hub/HeroCarousel';
jest.mock('expo-router', () => ({ router: { navigate: jest.fn() }, useFocusEffect: jest.fn(), usePathname: () => '/' }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: jest.fn() }));
let focus: () => void | (() => void);
let blur: void | (() => void);
let appChange: (state: AppStateStatus) => void;
const appRemove = jest.fn(), motionRemove = jest.fn();
const dimensions = { width: 390, height: 844, scale: 3, fontScale: 1 };
const offset = (x: number) => ({ nativeEvent: { contentOffset: { x, y: 0 } } });
const hero = () => screen.getByTestId('hero-carousel');
const step = () => hero().props.snapToInterval as number;
const scrollTo = () => jest.mocked(ScrollView.prototype.scrollTo);
async function tick(ms: number) { await act(() => jest.advanceTimersByTime(ms)); }
async function settle(index: number) { await fireEvent(hero(), 'momentumScrollEnd', offset(index * step())); }
async function ready() { await render(<HeroCarousel />); await act(() => { blur = focus(); }); scrollTo().mockClear(); }
function position(current: number) { return screen.getByLabelText(i18n.t('hub.position', { current, total: 4 })); }
beforeEach(async () => {
  jest.useFakeTimers(); jest.clearAllMocks(); await i18n.changeLanguage('en');
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.mocked(useWindowDimensions).mockReturnValue(dimensions);
  jest.mocked(useFocusEffect).mockImplementation(callback => { focus = callback; });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => { appChange = callback as typeof appChange; return { remove: appRemove }; });
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: motionRemove });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
it('advances every four seconds through an adjacent seamless forward wrap', async () => {
  await ready();
  await tick(3999); expect(scrollTo()).not.toHaveBeenCalled();
  await tick(1); expect(position(2)).toBeTruthy(); expect(scrollTo()).toHaveBeenLastCalledWith({ x: 2 * step(), animated: true });
  await settle(2);
  await tick(4000); expect(position(3)).toBeTruthy(); await settle(3);
  await tick(4000); expect(position(4)).toBeTruthy(); await settle(4);
  await tick(4000); expect(position(1)).toBeTruthy();
  expect(scrollTo()).toHaveBeenLastCalledWith({ x: 5 * step(), animated: true });
  await settle(5);
  expect(scrollTo()).toHaveBeenLastCalledWith({ x: step(), animated: false });
  await tick(4000); expect(scrollTo()).toHaveBeenLastCalledWith({ x: 2 * step(), animated: true });
});
it('wraps previous and next controls through neighboring sentinels and ignores stale completions', async () => {
  await ready();
  await fireEvent.press(screen.getByLabelText(i18n.t('hub.previousSlide')));
  expect(position(4)).toBeTruthy(); expect(scrollTo()).toHaveBeenLastCalledWith({ x: 0, animated: true });
  await settle(0); expect(scrollTo()).toHaveBeenLastCalledWith({ x: 4 * step(), animated: false });
  await fireEvent.press(screen.getByLabelText(i18n.t('hub.nextSlide')));
  expect(scrollTo()).toHaveBeenLastCalledWith({ x: 5 * step(), animated: true });
  const count = scrollTo().mock.calls.length;
  await settle(0); expect(scrollTo()).toHaveBeenCalledTimes(count);
  await settle(5); expect(scrollTo()).toHaveBeenLastCalledWith({ x: step(), animated: false });
});
it('pauses during touch and drag, then restarts a full countdown after settling', async () => {
  await ready(); await tick(3000);
  await fireEvent(hero(), 'touchStart'); await tick(5000); expect(scrollTo()).not.toHaveBeenCalled();
  await fireEvent(hero(), 'scrollBeginDrag', offset(step()));
  await fireEvent(hero(), 'touchEnd');
  await fireEvent(hero(), 'scrollEndDrag', offset(2 * step()));
  await fireEvent(hero(), 'momentumScrollBegin'); await settle(2);
  expect(position(2)).toBeTruthy(); scrollTo().mockClear();
  await tick(3999); expect(scrollTo()).not.toHaveBeenCalled();
  await tick(1); expect(scrollTo()).toHaveBeenLastCalledWith({ x: 3 * step(), animated: true });
});
it('settles swipe and animated wraps even when native momentum-end is omitted', async () => {
  await ready();
  await fireEvent.press(screen.getByLabelText(i18n.t('hub.previousSlide')));
  await tick(700); expect(scrollTo()).toHaveBeenLastCalledWith({ x: 4 * step(), animated: false });
  await fireEvent(hero(), 'scrollBeginDrag', offset(4 * step()));
  await fireEvent(hero(), 'scrollEndDrag', offset(5 * step()));
  await tick(180); expect(position(1)).toBeTruthy();
  expect(scrollTo()).toHaveBeenLastCalledWith({ x: step(), animated: false });
});
it('stops for blur and inactive/background states and cleans timers and listeners on unmount', async () => {
  await ready(); await tick(3000);
  await act(() => { if (blur) blur(); }); scrollTo().mockClear();
  await tick(8000); expect(scrollTo()).not.toHaveBeenCalled();
  await act(() => { blur = focus(); }); scrollTo().mockClear();
  await tick(3999); expect(scrollTo()).not.toHaveBeenCalled();
  await tick(1); expect(position(2)).toBeTruthy(); await settle(2);
  await act(() => appChange('inactive')); scrollTo().mockClear();
  await tick(8000); expect(scrollTo()).not.toHaveBeenCalled();
  await act(() => appChange('background')); scrollTo().mockClear();
  await tick(8000); expect(scrollTo()).not.toHaveBeenCalled();
  await act(() => appChange('active')); scrollTo().mockClear();
  await tick(3999); expect(scrollTo()).not.toHaveBeenCalled();
  await tick(1); expect(position(3)).toBeTruthy();
  await screen.unmount();
  scrollTo().mockClear(); await tick(12000);
  expect(scrollTo()).not.toHaveBeenCalled(); expect(appRemove).toHaveBeenCalled(); expect(motionRemove).toHaveBeenCalled();
});
it('uses static canonical transitions with reduced motion without waiting for momentum events', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  await ready();
  await fireEvent.press(screen.getByLabelText(i18n.t('hub.previousSlide')));
  expect(position(4)).toBeTruthy(); expect(scrollTo()).toHaveBeenLastCalledWith({ x: 4 * step(), animated: false });
  await tick(4000); expect(position(1)).toBeTruthy(); expect(scrollTo()).toHaveBeenLastCalledWith({ x: step(), animated: false });
  await tick(4000); expect(position(2)).toBeTruthy(); expect(scrollTo()).toHaveBeenLastCalledWith({ x: 2 * step(), animated: false });
});
it('preserves the logical card on resize and language changes', async () => {
  await ready();
  await fireEvent.press(screen.getByLabelText(i18n.t('hub.nextSlide'))); await settle(2);
  jest.mocked(useWindowDimensions).mockReturnValue({ ...dimensions, width: 500 });
  await screen.rerender(<HeroCarousel />);
  expect(position(2)).toBeTruthy(); expect(scrollTo()).toHaveBeenLastCalledWith({ x: 2 * step(), animated: false });
  scrollTo().mockClear(); await tick(2000); await act(() => i18n.changeLanguage('my')); await tick(2000);
  expect(position(3)).toBeTruthy(); expect(scrollTo()).toHaveBeenLastCalledWith({ x: 3 * step(), animated: true });
});
it('exposes only four logical cards and two sample-ad labels, with noninteractive hidden clones', async () => {
  await ready();
  expect(screen.getAllByRole('button')).toHaveLength(6);
  expect(screen.getAllByText(i18n.t('hub.sampleAd'))).toHaveLength(2);
  const label = i18n.t('hub.usefulInfo') + '. ' + i18n.t('hub.hero.severanceInfoTitle') + '. ' + i18n.t('hub.position', { current: 1, total: 4 });
  await fireEvent.press(screen.getByLabelText(label)); expect(router.navigate).toHaveBeenCalledWith('/severance/guide');
});
