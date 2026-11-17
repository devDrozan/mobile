import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { darkColors, lightColors } from '../src/theme-colors';
import { contrast, remoteTheme, themeContrastIssues } from '../src/remote-theme';
import { defaultRemoteConfig, parseRemoteConfig } from '../src/remote-config-model';
import { useRemoteConfig } from '../src/remote-config';
import { AppThemeProvider, useAppTheme } from '../src/theme';
jest.mock('../src/remote-config', () => ({ useRemoteConfig: jest.fn() }));
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => 'light' }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
it.each([['light', lightColors], ['dark', darkColors]] as const)('keeps %s text, controls, results and errors readable', (_mode, colors) => {
  expect(themeContrastIssues(colors)).toEqual([]);
  expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
});
it('uses the requested brand roles, with yellow reserved for navy-on-yellow accents', () => {
  expect(lightColors.background).toBe('#F4F8FF');
  expect(lightColors.primary).toBe('#1264D8');
  expect(lightColors.accent).toBe('#FFCA28');
  expect(darkColors.accent).toBe(lightColors.accent);
  expect(contrast('#FFFFFF', lightColors.accent)).toBeLessThan(3);
});
it.each([
  { primary: '#F4F8FF', onPrimary: '#102445' }, // button passes, navigation text fails
  { accent: '#FFFFFF', onAccent: '#FFFFFF' },
  { resultBackground: '#FFFFFF' },
  { surface: '#102445' },
  { border: '#FFFFFF' },
])('rejects a remote palette that makes a real UI role unreadable: %p', overrides => {
  expect(remoteTheme(lightColors, overrides)).toEqual(lightColors);
});
it('accepts complete valid remote palettes and legacy four-field themes', () => {
  const config = { ...defaultRemoteConfig, theme: { light: lightColors, dark: darkColors } };
  expect(parseRemoteConfig(JSON.stringify(config))).toEqual(config);
  const legacy = { primary: '#1264D8', onPrimary: '#FFFFFF', brandBackground: '#1264D8', brandText: '#FFFFFF' };
  expect(parseRemoteConfig(JSON.stringify({ ...config, theme: { light: legacy, dark: {} } }))).toBeDefined();
  expect(parseRemoteConfig(JSON.stringify({ ...config, theme: { light: { tracking: '#FFFFFF' }, dark: {} } }))).toBeUndefined();
});
it('applies approved remote colors through the provider used by every module', async () => {
  const config = { ...defaultRemoteConfig, theme: { light: { primary: '#0F5ABD', accent: '#FFD54F' }, dark: {} } };
  jest.mocked(useRemoteConfig).mockReturnValue(config);
  function Probe() { const { colors } = useAppTheme(); return <Text testID="colors">{colors.primary}/{colors.accent}</Text>; }
  await render(<AppThemeProvider><Probe /></AppThemeProvider>);
  expect(screen.getByTestId('colors')).toHaveTextContent('#0F5ABD/#FFD54F');
});
