import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Button, Text, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import i18n from '../src/i18n';
import { AppThemeProvider, useAppTheme } from '../src/theme';
import { darkColors, lightColors } from '../src/theme-colors';
import { AboutContent } from '../src/components/AboutContent';
import { Header } from '../src/components/ui';
import AboutScreen from '../src/app/about';
import { CalculatorSessionProvider } from '../src/calculator-session';
import CalculatorScreen from '../src/app/index';
import { getContext, type Context } from '../src/api/client';

jest.mock('expo-router', () => ({ usePathname: () => '/', router: { navigate: jest.fn() } }));
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
  jest.mocked(useColorScheme).mockReturnValue('light');
  await act(() => i18n.changeLanguage('en'));
});

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

it('opens the appearance controls, marks the current choice and applies a selected mode', async () => {
  await render(<AppThemeProvider><Header /></AppThemeProvider>);
  const toggle = screen.getByRole('button', { name: 'Appearance: System' });
  expect(toggle).not.toBeExpanded();
  await fireEvent.press(toggle);
  expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
  await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }));
  expect(screen.getByRole('button', { name: 'Appearance: Dark' })).not.toBeExpanded();
  expect(screen.queryByRole('radio')).toBeNull();
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('e9-theme', 'dark');
});

it('retains the current wage draft and step through theme changes and About navigation', async () => {
  const context: Context = {
    method: 'normal', retirementDate: '2017-09-16', employmentDays: 1080, lookbackStart: '2017-06-16', lookbackDays: 92,
    eligibility: { status: 'eligible', reasons: [] },
    wagePeriods: [{ startDate: '2017-06-16', endDate: '2017-06-30', days: 15 }], dcPeriods: [],
  };
  jest.mocked(getContext).mockResolvedValue(context);
  const route = (calculator: boolean) => <AppThemeProvider><CalculatorSessionProvider><ThemeProbe />{calculator ? <CalculatorScreen /> : <AboutContent />}</CalculatorSessionProvider></AppThemeProvider>;
  const view = await render(route(true));
  await fireEvent.press(screen.getByRole('button', { name: 'Try an example' }));
  await fireEvent.changeText(screen.getByLabelText('Base pay'), '123456.789012');
  await fireEvent.press(screen.getByRole('button', { name: 'Use dark' }));
  expect(screen.getByLabelText('Base pay')).toHaveDisplayValue('123456.789012');
  await view.rerender(route(false));
  expect(screen.getByText('Created by devrozan')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Use light' }));
  await view.rerender(route(true));
  expect(screen.getByLabelText('Base pay')).toHaveDisplayValue('123456.789012');
  expect(getContext).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('e9-theme', 'dark');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('e9-theme', 'light');
  expect(jest.mocked(AsyncStorage.setItem).mock.calls.every(([key]) => key === 'e9-theme')).toBe(true);
});

it.each(['en', 'my'])('shows the approved About content, copyright and return action in %s', async language => {
  await act(() => i18n.changeLanguage(language));
  await render(<AppThemeProvider><AboutScreen /></AppThemeProvider>);
  expect(screen.getByText(i18n.t('aboutCreator'))).toBeOnTheScreen();
  expect(screen.getByText(i18n.t('aboutPurpose'))).toBeOnTheScreen();
  expect(screen.getByText(i18n.t('aboutScope'))).toBeOnTheScreen();
  expect(screen.getByText(i18n.t('copyright', { year: new Date().getFullYear() }))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('returnCalculator') }));
  expect(router.navigate).toHaveBeenCalledWith('/');
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

it.each([['light', lightColors], ['dark', darkColors]] as const)('keeps essential text readable in the %s palette', (_name, colors) => {
  const pairs = [
    [colors.text, colors.surface], [colors.muted, colors.surface], [colors.muted, colors.surfaceSubtle],
    [colors.link, colors.surface], [colors.placeholder, colors.surface], [colors.onPrimary, colors.primary], [colors.error, colors.errorBackground],
    [colors.resultText, colors.resultBackground], [colors.resultMuted, colors.resultBackground], [colors.resultWarning, colors.resultBackground],
  ];
  for (const [foreground, background] of pairs) {
    const a = luminance(foreground), b = luminance(background);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  }
});
