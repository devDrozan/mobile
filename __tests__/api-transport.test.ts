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
});
