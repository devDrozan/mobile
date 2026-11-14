import { enterWages } from './helpers/enter-wages';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Button, Platform, StyleSheet, Text, useColorScheme, type TextStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, usePathname } from 'expo-router';
import i18n from '../src/i18n';
import { AppThemeProvider, useAppTheme } from '../src/theme';
import { darkColors, lightColors } from '../src/theme-colors';
import { Copy, Header } from '../src/components/ui';
import AboutScreen from '../src/app/about';
import { InfoContent } from '../src/components/InfoContent';
import { CalculatorSessionProvider } from '../src/calculator-session';
import CalculatorScreen from '../src/modules/severance/CalculatorScreen';
import { getContext, type Context } from '../src/api/client';

jest.mock('expo-router', () => ({ usePathname: jest.fn(() => '/'), useFocusEffect: () => undefined, router: { navigate: jest.fn() } }));
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../src/api/client', () => ({
  getContext: jest.fn(), calculate: jest.fn(),
  ApiFailure: class extends Error { constructor(public issues: { field: string; code: string }[] = []) { super('API_REQUEST_FAILED'); } },
}));

function ThemeProbe() {
  const { mode, resolvedTheme, setMode } = useAppTheme();
  return <>
    <Text testID="appearance">{mode}/{resolvedTheme}</Text>
    <Button title="Use light" onPress={() => setMode('light')} />
    <Button title="Use dark" onPress={() => setMode('dark')} />
    <Button title="Use system" onPress={() => setMode('system')} />
  </>;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.mocked(usePathname).mockReturnValue('/');
  jest.mocked(useColorScheme).mockReturnValue('light');
  await act(() => i18n.changeLanguage('en'));
});

afterEach(() => jest.restoreAllMocks());

it('follows system changes until a manual appearance is selected, then remembers that choice', async () => {
  const tree = () => <AppThemeProvider><ThemeProbe /></AppThemeProvider>;
  const view = await render(tree());
  expect(screen.getByTestId('appearance')).toHaveTextContent('system/light');
  jest.mocked(useColorScheme).mockReturnValue('dark');
  await view.rerender(tree());
  expect(screen.getByTestId('appearance')).toHaveTextContent('system/dark');
  await fireEvent.press(screen.getByRole('button', { name: 'Use light' }));
  expect(screen.getByTestId('appearance')).toHaveTextContent('light/light');
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('e9-theme', 'light'));
  await view.unmount();
  await render(tree());
  await waitFor(() => expect(screen.getByTestId('appearance')).toHaveTextContent('light/light'));
  await fireEvent.press(screen.getByRole('button', { name: 'Use system' }));
  expect(screen.getByTestId('appearance')).toHaveTextContent('system/dark');
});

it('does not let a late preference read replace a new user choice', async () => {
  let finishRead!: (value: string | null) => void;
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(new Promise(resolve => { finishRead = resolve; }));
  await render(<AppThemeProvider><ThemeProbe /></AppThemeProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'Use dark' }));
  await act(async () => { finishRead('light'); });
  expect(screen.getByTestId('appearance')).toHaveTextContent('dark/dark');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('e9-theme', 'dark');
});

it('ignores invalid saved values and still changes appearance when storage fails', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('invalid');
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('storage unavailable'));
  await render(<AppThemeProvider><ThemeProbe /></AppThemeProvider>);
  expect(screen.getByTestId('appearance')).toHaveTextContent('system/light');
  await fireEvent.press(screen.getByRole('button', { name: 'Use dark' }));
  expect(screen.getByTestId('appearance')).toHaveTextContent('dark/dark');
});

it.each(['en', 'my'])('groups theme, language and search in the hamburger popup in %s', async language => {
  await act(() => i18n.changeLanguage(language));
  await render(<AppThemeProvider><Header /></AppThemeProvider>);
  expect(screen.getByText('E9')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: i18n.t('hub.search') })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.menu') }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.switchToDark') }));
  expect(screen.getByRole('button', { name: i18n.t('hub.switchToLight') })).toBeOnTheScreen();
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('e9-theme', 'dark');
  const languageButton = screen.getByRole('button', { name: i18n.t('language') });
  await fireEvent.press(languageButton); expect(languageButton).toBeExpanded();
  expect(screen.getByRole('radio', { name: language === 'en' ? 'English' : 'မြန်မာ' })).toBeChecked();
  await fireEvent.press(screen.getByRole('radio', { name: language === 'en' ? 'မြန်မာ' : 'English' }));
  expect(screen.getByRole('button', { name: i18n.t('hub.menu') })).not.toBeExpanded();
  expect(screen.queryByRole('radio')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.menu') }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.search') }));
  expect(router.navigate).toHaveBeenCalledWith('/search');
  expect(screen.getByRole('button', { name: i18n.t('hub.menu') })).not.toBeExpanded();
});
it('follows device theme until the popup theme action is tapped', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('system');
  jest.mocked(useColorScheme).mockReturnValue('dark');
  const tree = () => <AppThemeProvider><Header /></AppThemeProvider>;
  const view = await render(tree());
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.menu') }));
  expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeOnTheScreen();
  jest.mocked(useColorScheme).mockReturnValue('light'); await view.rerender(tree());
  await fireEvent.press(screen.getByRole('button', { name: 'Switch to dark mode' }));
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('e9-theme', 'dark');
  jest.mocked(useColorScheme).mockReturnValue('light'); await view.rerender(tree());
  expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeOnTheScreen();
});
it('dismisses the popup via Close and backdrop and resets it on route changes', async () => {
  jest.mocked(usePathname).mockReturnValue('/severance');
  const tree = () => <AppThemeProvider><Header /></AppThemeProvider>;
  const view = await render(tree());
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.menu') }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.closeMenu') }));
  expect(screen.queryByRole('button', { name: i18n.t('hub.search') })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.menu') }));
  await fireEvent.press(screen.getByTestId('header-menu-backdrop', { includeHiddenElements: true }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.menu') }));
  await fireEvent(screen.getByTestId('header-menu-modal', { includeHiddenElements: true }), 'requestClose');
  expect(screen.queryByRole('button', { name: i18n.t('hub.search') })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.menu') }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('language') }));
  jest.mocked(usePathname).mockReturnValue('/severance/guide'); await view.rerender(tree());
  expect(screen.getByRole('button', { name: i18n.t('hub.menu') })).not.toBeExpanded();
  expect(screen.queryByRole('radio')).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: i18n.t('calculator') }));
  expect(router.navigate).toHaveBeenCalledWith('/severance');
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.backHome') }));
  expect(router.navigate).toHaveBeenCalledWith('/');
});

it('opens About us from the header menu and closes the popup', async () => {
  await render(<AppThemeProvider><Header /></AppThemeProvider>);
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.menu') }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('aboutUs') }));
  expect(router.navigate).toHaveBeenCalledWith('/about');
  expect(screen.queryByRole('button', { name: i18n.t('hub.search') })).toBeNull();
});

it('retains the current wage draft and step through theme, language and About navigation', async () => {
  const context: Context = {
    method: 'normal', retirementDate: '2017-09-16', employmentDays: 1080, lookbackStart: '2017-06-16', lookbackDays: 92,
    eligibility: { status: 'eligible', reasons: [] },
    wagePeriods: [{ startDate: '2017-06-16', endDate: '2017-06-30', days: 15 }], dcPeriods: [],
  };
  jest.mocked(getContext).mockResolvedValue(context);
  const route = (calculator: boolean) => <AppThemeProvider><CalculatorSessionProvider><Header />{calculator ? <CalculatorScreen /> : <AboutScreen />}</CalculatorSessionProvider></AppThemeProvider>;
  const view = await render(route(true));
  await enterWages();
  await fireEvent.changeText(screen.getByLabelText('Base pay', { exact: false }), '123456.789012');
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.menu') }));
  await fireEvent.press(screen.getByRole('button', { name: 'Switch to dark mode' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Language' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'မြန်မာ' }));
  expect(screen.getByLabelText(i18n.t('basePay'), { exact: false })).toHaveDisplayValue('123456.789012');
  await view.rerender(route(false));
  expect(screen.getByText(i18n.t('aboutCreator'))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.menu') }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.switchToLight') }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('language') }));
  await fireEvent.press(screen.getByRole('radio', { name: 'English' }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.backHome') }));
  await view.rerender(route(true));
  expect(screen.getByLabelText('Base pay', { exact: false })).toHaveDisplayValue('123456.789012');
  expect(getContext).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('e9-theme', 'dark');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('e9-theme', 'light');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('e9-language', 'my');
  expect(jest.mocked(AsyncStorage.setItem).mock.calls.every(([key]) => ['e9-theme', 'e9-language'].includes(key))).toBe(true);
});

it.each(['en', 'my'])('shows the approved About content, copyright and return action in %s', async language => {
  await act(() => i18n.changeLanguage(language));
  await render(<AppThemeProvider><AboutScreen /></AppThemeProvider>);
  expect(screen.getByText(i18n.t('aboutCreator'))).toBeOnTheScreen();
  expect(screen.getByText(i18n.t('aboutPurpose'))).toBeOnTheScreen();
  expect(screen.getByText(i18n.t('aboutScopeDetails'))).toBeOnTheScreen();
  expect(screen.getByText(i18n.t('aboutScopeEstimate'))).toBeOnTheScreen();
  expect(screen.getByText(i18n.t('copyright', { year: new Date().getFullYear() }))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.backHome') }));
  expect(router.navigate).toHaveBeenCalledWith('/');
});

it.each([
  ['ios', 'my'], ['android', 'my'], ['ios', 'en'],
] as const)('leaves room for About paragraphs without shrinking or truncation on %s in %s', async (platform, language) => {
  jest.replaceProperty(Platform, 'OS', platform);
  await act(() => i18n.changeLanguage(language));
  await render(<AboutScreen />);
  for (const key of ['aboutPurpose', 'aboutScopeDetails', 'aboutScopeEstimate']) {
    const paragraph = screen.getByText(i18n.t(key));
    const style = StyleSheet.flatten<TextStyle>(paragraph.props.style) ?? {};
    expect(style.fontSize).toBeGreaterThanOrEqual(key === 'aboutPurpose' ? 14 : 13);
    expect(paragraph.props.numberOfLines).toBeUndefined();
    expect(paragraph.props.adjustsFontSizeToFit).not.toBe(true);
    expect(paragraph.props.allowFontScaling).not.toBe(false);
    if (platform === 'ios' && language === 'my') {
      expect(style.lineHeight).toBeUndefined();
      expect(style.letterSpacing).toBeUndefined();
    } else if (language === 'my') {
      // The bundled font has 1324 ascent + 860 descent per 1000 units.
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize! * 2.184);
    } else {
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize! * 1.4);
    }
  }
});

it('protects native Myanmar body and heading marks from inherited fixed line boxes and tracking', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  await act(() => i18n.changeLanguage('my'));
  const inherited = [{ fontSize: 15, lineHeight: 20 }, { letterSpacing: -.6 }];
  await render(<>
    <Copy testID="body" nativeMyanmarLineMetrics style={inherited}>နားလည်နိုင်ရန်</Copy>
    <Copy testID="heading" accessibilityRole="header" style={inherited}>ရည်ရွယ်ချက်</Copy>
  </>);
  for (const id of ['body', 'heading']) {
    const text = screen.getByTestId(id);
    const style = StyleSheet.flatten<TextStyle>(text.props.style) ?? {};
    expect(style.fontSize).toBe(15);
    expect(style.lineHeight).toBeUndefined();
    expect(style.letterSpacing).toBeUndefined();
    expect(text.props.nativeMyanmarLineMetrics).toBeUndefined();
  }
});

it.each([
  ['ios', 'my', 'guide'], ['ios', 'my', 'insurance'],
  ['android', 'my', 'guide'], ['android', 'my', 'insurance'],
  ['ios', 'en', 'guide'], ['ios', 'en', 'insurance'],
] as const)('keeps %s %s %s prose clear without clipping or font shrinking', async (platform, language, view) => {
  jest.replaceProperty(Platform, 'OS', platform);
  await act(() => i18n.changeLanguage(language));
  await render(<InfoContent view={view} />);
  const keys = view === 'guide'
    ? ['guideSub', 'normalGuide', 'dbGuide', 'dcGuide', 'eligibilityGuide']
    : ['insuranceSub', 'insuranceBody', 'insuranceBody2'];
  for (const key of keys) {
    const paragraph = screen.getByText(i18n.t(key));
    const style = StyleSheet.flatten<TextStyle>(paragraph.props.style) ?? {};
    expect(style.fontSize).toBeGreaterThanOrEqual(13);
    expect(paragraph.props.numberOfLines).toBeUndefined();
    expect(paragraph.props.adjustsFontSizeToFit).not.toBe(true);
    expect(paragraph.props.allowFontScaling).not.toBe(false);
    if (platform === 'ios' && language === 'my') {
      expect(style.lineHeight).toBeUndefined();
      expect(style.letterSpacing).toBeUndefined();
    } else if (language === 'my') {
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize! * 2.184);
    } else {
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize! * 1.4);
    }
  }
});

function luminance(hex: string) {
  const raw = hex.replace('#', '');
  const normalized = raw.length === 3 ? [...raw].map(value => value + value).join('') : raw;
  const channels = normalized.match(/../g)!.map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}

it.each([['light', lightColors], ['dark', darkColors]] as const)('keeps non-text state indicators visible in the %s palette', (_name, colors) => {
  // 1.4.11 asks for 3:1 against the adjacent colour for borders, switches and
  // carousel dots that carry meaning rather than decoration.
  const pairs = [
    [colors.selectedBorder, colors.selected], [colors.selectedBorder, colors.surface],
    [colors.switchOn, colors.surfaceSubtle], [colors.switchOff, colors.surfaceSubtle],
    [colors.muted, colors.background],
  ];
  for (const [foreground, background] of pairs) {
    const a = luminance(foreground), b = luminance(background);
    expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toBeGreaterThanOrEqual(3);
  }
});

it.each([['light', lightColors], ['dark', darkColors]] as const)('keeps essential text readable in the %s palette', (_name, colors) => {
  const pairs = [
    [colors.text, colors.surface], [colors.muted, colors.surface], [colors.muted, colors.surfaceSubtle],
    [colors.link, colors.surface], [colors.placeholder, colors.surface], [colors.onPrimary, colors.primary], [colors.onAccent, colors.accent], [colors.error, colors.errorBackground],
    [colors.resultText, colors.resultBackground], [colors.resultMuted, colors.resultBackground], [colors.resultWarning, colors.resultBackground],
  ];
  for (const [foreground, background] of pairs) {
    const a = luminance(foreground), b = luminance(background);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  }
});
