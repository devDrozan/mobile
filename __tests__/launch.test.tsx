import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { LaunchGate } from '../src/components/LaunchGate';
import appConfig from '../app.json';

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(async () => undefined) }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(SplashScreen.hideAsync).mockReset().mockResolvedValue(undefined);
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

async function showLaunch() {
  await fireEvent(screen.getByTestId('launch-screen'), 'layout', {
    nativeEvent: { layout: { width: 393, height: 852, x: 0, y: 0 } },
  });
  await act(async () => undefined);
}
async function advance(ms: number) {
  await act(async () => { jest.advanceTimersByTime(ms); });
}

it('shows the configured brand for three seconds and keeps main controls unmounted until then', async () => {
  await render(<LaunchGate ready><Text>Main calculator</Text></LaunchGate>);
  expect(screen.getByRole('header', { name: appConfig.expo.name })).toBeVisible();
  expect(screen.queryByText('Main calculator')).toBeNull();
  await showLaunch();
  await advance(2999);
  expect(screen.getByTestId('launch-screen')).toBeVisible();
  await advance(1);
  expect(screen.queryByTestId('launch-screen')).toBeNull();
  expect(screen.getByText('Main calculator')).toBeVisible();
});

it('waits for local readiness after the minimum time and does not replay after rerenders', async () => {
  const view = await render(<LaunchGate ready={false}><Text>Main calculator</Text></LaunchGate>);
  await showLaunch();
  await advance(3000);
  expect(screen.queryByText('Main calculator')).toBeNull();
  await view.rerender(<LaunchGate ready><Text>Main calculator</Text></LaunchGate>);
  expect(screen.getByText('Main calculator')).toBeVisible();
  await view.rerender(<LaunchGate ready={false}><Text>Guidance screen</Text></LaunchGate>);
  expect(screen.getByText('Guidance screen')).toBeVisible();
  expect(screen.queryByTestId('launch-screen')).toBeNull();
});

it('starts counting only once the native cover is hidden and ignores repeat layouts', async () => {
  let hide!: () => void;
  jest.mocked(SplashScreen.hideAsync).mockImplementation(() => new Promise(resolve => { hide = resolve; }));
  await render(<LaunchGate ready><Text>Main calculator</Text></LaunchGate>);
  await showLaunch();
  await advance(3000);
  expect(screen.queryByText('Main calculator')).toBeNull();
  await act(async () => hide());
  await advance(2000);
  await showLaunch();
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  await advance(1000);
  expect(screen.getByText('Main calculator')).toBeVisible();
});

it('continues when native hiding is unavailable and cleans up its timer on unmount', async () => {
  jest.mocked(SplashScreen.hideAsync).mockRejectedValue(new Error('Preview unavailable'));
  const view = await render(<LaunchGate ready><Text>Main calculator</Text></LaunchGate>);
  await showLaunch();
  await advance(3000);
  expect(screen.getByText('Main calculator')).toBeVisible();
  await view.unmount();
  const timeout = jest.spyOn(global, 'setTimeout');
  const clear = jest.spyOn(global, 'clearTimeout');
  const next = await render(<LaunchGate ready><Text>New launch</Text></LaunchGate>);
  await showLaunch();
  const timerIndex = timeout.mock.calls.findIndex(([, delay]) => delay === 3000);
  const launchTimer = timeout.mock.results[timerIndex].value;
  await advance(1000);
  await next.unmount();
  expect(clear).toHaveBeenCalledWith(launchTimer);
});
