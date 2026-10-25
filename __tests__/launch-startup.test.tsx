import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useFonts } from '@expo-google-fonts/noto-sans-myanmar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootLayout from '../src/app/_layout';
import i18n from '../src/i18n';
import { darkColors } from '../src/theme-colors';

jest.mock('@expo-google-fonts/noto-sans-myanmar', () => ({ useFonts: jest.fn(), NotoSansMyanmar_400Regular: 1, NotoSansMyanmar_600SemiBold: 2 }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(async () => undefined), hideAsync: jest.fn(async () => undefined) }));
jest.mock('expo-router', () => ({ Stack: () => { const { Text } = require('react-native'); return <Text>Main interface</Text>; } }));
jest.mock('../src/components/ui', () => ({ Header: () => null }));

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  await i18n.changeLanguage('en');
  jest.mocked(useFonts).mockReturnValue([true, null]);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

async function showAndWait() {
  await fireEvent(screen.getByTestId('launch-screen'), 'layout', {
    nativeEvent: { layout: { width: 393, height: 852, x: 0, y: 0 } },
  });
  await act(async () => undefined);
  await act(async () => { jest.advanceTimersByTime(3000); });
}

it('restores Burmese and a saved dark appearance before revealing the main interface', async () => {
  await AsyncStorage.multiSet([['e9-language', 'my'], ['e9-theme', 'dark']]);
  await render(<RootLayout />);
  expect(screen.getByTestId('launch-screen')).toHaveStyle({ backgroundColor: darkColors.background });
  await showAndWait();
  expect(i18n.resolvedLanguage).toBe('my');
  expect(screen.getByText('Main interface')).toBeVisible();
});

it('waits for fonts even after three seconds and then reveals the main interface', async () => {
  jest.mocked(useFonts).mockReturnValue([false, null]);
  const view = await render(<RootLayout />);
  await showAndWait();
  expect(screen.queryByText('Main interface')).toBeNull();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  await view.rerender(<RootLayout />);
  expect(screen.getByText('Main interface')).toBeVisible();
});

it('falls back when font loading and preference storage fail instead of trapping the launch', async () => {
  jest.mocked(useFonts).mockReturnValue([false, new Error('Font unavailable')]);
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('Storage unavailable'));
  await render(<RootLayout />);
  await showAndWait();
  expect(i18n.resolvedLanguage).toBe('en');
  expect(screen.getByText('Main interface')).toBeVisible();
});
