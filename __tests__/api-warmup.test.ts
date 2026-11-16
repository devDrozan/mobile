import { jest } from '@jest/globals';

const previousUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const previousWarmup = process.env.EXPO_PUBLIC_API_WARMUP;
const dev = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
const previousFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
const response = (body: unknown, status = 200, type = 'application/json') => ({
  ok: status >= 200 && status < 300, status,
  headers: { get: (name: string) => name.toLowerCase() === 'content-type' ? type : null },
  json: async () => body,
});
const health = () => response({ status: 'ok', service: 'e9-severance-api' });
let fetchSpy: jest.Mock<(...args: any[]) => Promise<any>>;
function client() { return require('../src/api/client') as typeof import('../src/api/client'); }
function input() { return { method: 'normal', employment: { startDate: '2020-01-01', lastWorkingDate: '2026-01-01', weeklyHours: 40, hasSpecialCircumstances: false } } as const; }
beforeEach(() => {
  jest.resetModules(); jest.useFakeTimers();
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com';
  process.env.EXPO_PUBLIC_API_WARMUP = 'true';
  Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
  fetchSpy = jest.fn<(...args: any[]) => Promise<any>>();
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSpy });
});
afterEach(() => {
  jest.useRealTimers(); jest.resetModules();
  if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL; else process.env.EXPO_PUBLIC_API_BASE_URL = previousUrl;
  if (previousWarmup === undefined) delete process.env.EXPO_PUBLIC_API_WARMUP; else process.env.EXPO_PUBLIC_API_WARMUP = previousWarmup;
  if (dev) Object.defineProperty(globalThis, '__DEV__', dev);
  if (previousFetch) Object.defineProperty(globalThis, 'fetch', previousFetch);
});
it('waits through a temporary loading response before submitting financial inputs once', async () => {
  fetchSpy.mockResolvedValueOnce(response({}, 503, 'text/html')).mockResolvedValueOnce(health()).mockResolvedValueOnce(response({ status: 'calculated' }));
  const pending = client().getContext(input());
  await jest.advanceTimersByTimeAsync(0);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://api.example.com/health');
  expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ cache: 'no-store', credentials: 'omit', redirect: 'error' });
  expect(fetchSpy.mock.calls[0]?.[1].body).toBeUndefined();
  await jest.advanceTimersByTimeAsync(2000); await pending;
  expect(fetchSpy).toHaveBeenCalledTimes(3);
  expect(fetchSpy.mock.calls[2]?.[0].method).toBe('POST');
});
it('shares readiness and reuses it for subsequent requests', async () => {
  fetchSpy.mockResolvedValueOnce(health()).mockResolvedValue(response({ status: 'ok' }));
  const api = client();
  await Promise.all([api.getContext(input()), api.getContext(input())]);
  await api.getContext(input());
  expect(fetchSpy).toHaveBeenCalledTimes(4);
  expect(fetchSpy.mock.calls.filter(([request]) => typeof request === 'string')).toHaveLength(1);
});
it('does not submit financial inputs if the sleeping server stays unavailable for 90 seconds', async () => {
  fetchSpy.mockResolvedValue(response({}, 503, 'text/html'));
  const pending = client().getContext(input()).catch(error => error);
  await jest.advanceTimersByTimeAsync(90000);
  expect(await pending).toMatchObject({ kind: 'offline' });
  expect(fetchSpy.mock.calls.every(([request]) => typeof request === 'string' && request.endsWith('/health'))).toBe(true);
  await jest.advanceTimersByTimeAsync(2000);
});
it('allows an explicit retry after an offline health failure', async () => {
  fetchSpy.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(health()).mockResolvedValueOnce(response({ status: 'ok' }));
  const api = client();
  await expect(api.getContext(input())).rejects.toMatchObject({ kind: 'offline' });
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  await api.getContext(input());
  expect(fetchSpy).toHaveBeenCalledTimes(3);
});
it('rejects a different service before sending financial inputs', async () => {
  fetchSpy.mockResolvedValue(response({ status: 'ok', service: 'other' }));
  await expect(client().getContext(input())).rejects.toMatchObject({ kind: 'unavailable' });
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});
it('preserves the original request flow when warmup is disabled', async () => {
  process.env.EXPO_PUBLIC_API_WARMUP = 'false';
  fetchSpy.mockResolvedValue(response({ status: 'ok' }));
  await client().getContext(input());
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(fetchSpy.mock.calls[0]?.[0].url).toBe('https://api.example.com/v1/calculations/context');
});
