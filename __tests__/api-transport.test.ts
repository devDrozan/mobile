describe('API transport security', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const originalDev = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');

  afterEach(() => {
    jest.resetModules();
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = originalUrl;
    if (originalDev) Object.defineProperty(globalThis, '__DEV__', originalDev);
    if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch);
    else Reflect.deleteProperty(globalThis, 'fetch');
  });

  it('does not send financial data to an HTTP API in a production build', async () => {
    Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://example.com';
    const fetchSpy = jest.fn();
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSpy });
    jest.resetModules();
    const { getContext, ApiFailure } = require('../src/api/client') as typeof import('../src/api/client');

    await expect(getContext({} as Parameters<typeof getContext>[0])).rejects.toBeInstanceOf(ApiFailure);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows an HTTPS API in a production build', async () => {
    Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com';
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ status: 'ok' }) });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSpy });
    jest.resetModules();
    const { getContext } = require('../src/api/client') as typeof import('../src/api/client');

    await getContext({} as Parameters<typeof getContext>[0]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0].url).toBe('https://api.example.com/v1/calculations/context');
  });

  it.each(['', 'not-an-origin', 'file:///tmp/api'])('rejects an unusable API origin before creating a request: %s', async url => {
    Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
    process.env.EXPO_PUBLIC_API_BASE_URL = url;
    const fetchSpy = jest.fn();
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSpy });
    jest.resetModules();
    const { estimateSalary } = require('../src/api/client') as typeof import('../src/api/client');
    await expect(estimateSalary({} as Parameters<typeof estimateSalary>[0])).rejects.toMatchObject({ kind: 'unavailable' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('API failure kinds', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  afterEach(() => {
    jest.resetModules();
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = originalUrl;
    if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch);
    else Reflect.deleteProperty(globalThis, 'fetch');
  });
  function respondWith(body: unknown, status = 500) {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: false, status, headers: { get: () => 'application/json' }, text: async () => JSON.stringify(body), json: async () => body });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSpy });
    jest.resetModules();
    return require('../src/api/client') as typeof import('../src/api/client');
  }
  const body = ({} as Parameters<typeof import('../src/api/client').estimateSalary>[0]);

  it('reports a reachable API error as a service fault, not a missing address', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3001';
    const client = respondWith({ code: 'REQUEST_FAILED', message: 'failed', issues: [] });
    await expect(client.estimateSalary(body)).rejects.toMatchObject({ kind: 'server', issues: [] });
  });

  it('keeps field issues as an invalid request', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3001';
    const issues = [{ field: 'entries.0.date', code: 'DUPLICATE_DATE' }];
    const client = respondWith({ code: 'INVALID_INPUT', message: 'failed', issues }, 400);
    await expect(client.estimateSalary(body)).rejects.toMatchObject({ kind: 'invalid', issues });
  });
});

describe('complete API request deadline', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = originalUrl;
    if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch);
    else Reflect.deleteProperty(globalThis, 'fetch');
  });

  it('times out and aborts when headers arrive but the result body stalls', async () => {
    jest.useFakeTimers();
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3001';
    let started!: () => void;
    const parsing = new Promise<void>(resolve => { started = resolve; });
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: () => { started(); return new Promise(() => {}); },
    });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSpy });
    jest.resetModules();
    const { estimateSalary } = require('../src/api/client') as typeof import('../src/api/client');
    const result = estimateSalary({} as Parameters<typeof estimateSalary>[0]);
    const settled = result.then(() => 'unexpected success', error => error.kind);
    await parsing;
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(15000);
    await expect(settled).resolves.toBe('offline');
    expect(fetchSpy.mock.calls[0][1].signal.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('returns a complete response and removes its deadline', async () => {
    jest.useFakeTimers();
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3001';
    const result = { amountKrw: '2440000' };
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => result,
    });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSpy });
    jest.resetModules();
    const { estimateSalary } = require('../src/api/client') as typeof import('../src/api/client');
    await expect(estimateSalary({} as Parameters<typeof estimateSalary>[0])).resolves.toEqual(result);
    expect(jest.getTimerCount()).toBe(0);
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ cache: 'no-store', credentials: 'omit' });
  });

  it('reports malformed response JSON as a service failure and allows retry', async () => {
    jest.useFakeTimers();
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3001';
    const fetchSpy = jest.fn().mockResolvedValueOnce({
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => { throw new SyntaxError('Invalid response JSON'); },
    }).mockResolvedValueOnce({
      ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ amountKrw: '2440000' }),
    });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSpy });
    jest.resetModules();
    const { estimateSalary } = require('../src/api/client') as typeof import('../src/api/client');
    const body = {} as Parameters<typeof estimateSalary>[0];
    await expect(estimateSalary(body)).rejects.toMatchObject({ kind: 'server' });
    await expect(estimateSalary(body)).resolves.toMatchObject({ amountKrw: '2440000' });
    expect(jest.getTimerCount()).toBe(0);
  });
});
