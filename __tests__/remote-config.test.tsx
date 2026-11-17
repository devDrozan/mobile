import { act, render, screen } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultRemoteConfig, localizedConfigText, parseRemoteConfig } from '../src/remote-config-model';
import { RemoteConfigProvider, readCachedConfig, remoteConfigCacheKey, useRemoteConfig } from '../src/remote-config';
import { remoteTheme } from '../src/remote-theme';
import { lightColors } from '../src/theme-colors';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const next = { ...defaultRemoteConfig, revision: 'server-2' };
function Probe() { return <Text testID="revision">{useRemoteConfig().revision}</Text>; }
let onState: (state: AppStateStatus) => void;
const response = (value: unknown) => ({ ok: true, headers: { get: (key: string) => key === 'content-type' ? 'application/json' : null }, text: async () => JSON.stringify(value) }) as Response;
beforeEach(async () => {
  jest.useFakeTimers(); await AsyncStorage.clear(); jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com';
  global.fetch = jest.fn().mockResolvedValue(response(next));
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => { onState = listener as typeof onState; return { remove: jest.fn() }; });
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); delete process.env.EXPO_PUBLIC_API_BASE_URL; });
it('validates schema, bounded cache age and bilingual content', () => {
  expect(parseRemoteConfig(JSON.stringify(next))).toEqual(next);
  for (const raw of ['{', 'x'.repeat(32769), JSON.stringify({ ...next, schemaVersion: 2 }), JSON.stringify({ ...next, security: false })]) expect(parseRemoteConfig(raw)).toBeUndefined();
  const savedAt = Date.now();
  expect(readCachedConfig(JSON.stringify({ savedAt, config: next }))).toEqual(next);
  expect(readCachedConfig(JSON.stringify({ savedAt: savedAt + 1, config: next }))).toBeUndefined();
  expect(readCachedConfig(JSON.stringify({ savedAt: savedAt - 8 * 86400000, config: next }))).toBeUndefined();
  expect(localizedConfigText({ en: 'Notice', my: 'အသိပေးချက်' }, 'my-MM')).toBe('အသိပေးချက်');
  expect(remoteTheme(lightColors, { primary: '#ffffff', onPrimary: '#ffffff' })).toEqual(lightColors);
});
it('fetches only public config and caches validated data, throttling foreground refreshes', async () => {
  await render(<RemoteConfigProvider><Probe /></RemoteConfigProvider>);
  expect(screen.getByTestId('revision')).toHaveTextContent('server-2');
  expect(fetch).toHaveBeenCalledWith('https://api.example.com/v1/mobile-config', expect.objectContaining({ credentials: 'omit', redirect: 'error', cache: 'no-store' }));
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(remoteConfigCacheKey, expect.stringContaining('server-2'));
  await act(() => onState('active')); expect(fetch).toHaveBeenCalledTimes(1);
  await act(() => jest.advanceTimersByTime(3600000));
  await act(() => onState('active')); expect(fetch).toHaveBeenCalledTimes(2);
});
it('retains a valid cached config offline and expires it back to defaults', async () => {
  await AsyncStorage.setItem(remoteConfigCacheKey, JSON.stringify({ savedAt: Date.now(), config: next }));
  jest.mocked(fetch).mockRejectedValue(new Error('offline'));
  await render(<RemoteConfigProvider><Probe /></RemoteConfigProvider>);
  expect(screen.getByTestId('revision')).toHaveTextContent('server-2');
  await act(() => jest.advanceTimersByTime(7 * 86400000));
  expect(screen.getByTestId('revision')).toHaveTextContent('bundled-v1');
});
it('uses defaults for invalid settings or broken storage', async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('storage'));
  jest.mocked(fetch).mockResolvedValue(response({ ...next, schemaVersion: 2 }));
  await render(<RemoteConfigProvider><Probe /></RemoteConfigProvider>);
  expect(screen.getByTestId('revision')).toHaveTextContent('bundled-v1');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
it('never blocks startup on a stalled request, ignores late data after its deadline', async () => {
  let finish!: (value: Response) => void;
  jest.mocked(fetch).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await render(<RemoteConfigProvider><Probe /></RemoteConfigProvider>);
  expect(screen.getByTestId('revision')).toHaveTextContent('bundled-v1');
  await act(() => jest.advanceTimersByTime(90000));
  await act(() => finish(response(next)));
  expect(screen.getByTestId('revision')).toHaveTextContent('bundled-v1');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
it('does not send requests to an insecure production origin', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://user:secret@api.example.com';
  await render(<RemoteConfigProvider><Probe /></RemoteConfigProvider>);
  expect(fetch).not.toHaveBeenCalled();
});

it('retries temporary Render loading responses within a foreground refresh', async () => {
  jest.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 503, headers: { get: () => 'text/html' } } as unknown as Response).mockResolvedValue(response(next));
  await render(<RemoteConfigProvider><Probe /></RemoteConfigProvider>);
  expect(screen.getByTestId('revision')).toHaveTextContent('bundled-v1');
  await act(() => jest.advanceTimersByTime(2000));
  expect(screen.getByTestId('revision')).toHaveTextContent('server-2');
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('stops Render loading retries when backgrounded', async () => {
  jest.mocked(fetch).mockResolvedValue({ ok: false, status: 503, headers: { get: () => 'text/html' } } as unknown as Response);
  await render(<RemoteConfigProvider><Probe /></RemoteConfigProvider>);
  await act(() => onState('background'));
  await act(() => jest.advanceTimersByTime(90000));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('revision')).toHaveTextContent('bundled-v1');
});
