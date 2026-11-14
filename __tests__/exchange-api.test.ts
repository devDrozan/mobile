describe('currency API transport and structured failures', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  afterEach(() => {
    jest.resetModules();
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL; else process.env.EXPO_PUBLIC_API_BASE_URL = originalUrl;
    if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch); else Reflect.deleteProperty(globalThis, 'fetch');
  });
  function response(code: string, status: number) {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com';
    const body = { code, message: 'Unavailable', issues: [] };
    const fetchSpy = jest.fn().mockResolvedValue({ ok: false, status, headers: { get: () => 'application/json' }, text: async () => JSON.stringify(body), json: async () => body });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSpy });
    jest.resetModules();
    const client = require('../src/modules/exchange/api') as typeof import('../src/modules/exchange/api');
    return { client, fetchSpy };
  }
  it.each([['RATE_UNAVAILABLE',503],['RATE_EXPIRED',503],['RATE_LIMITED',429],['UPSTREAM_INVALID_RESPONSE',503]])('retains structured GET error %s through the real deadline wrapper', async (code, status) => {
    const { client, fetchSpy } = response(String(code), Number(status));
    await expect(client.getRate(true)).rejects.toMatchObject({ code });
    expect(fetchSpy.mock.calls[0][0].url).toBe('https://api.example.com/v1/exchange-rates/krw-mmk/cbm?refresh=true');
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ cache: 'no-store', credentials: 'omit' });
  });
  it.each([['INVALID_AMOUNT',400],['UNSUPPORTED_CURRENCY_PAIR',400],['RATE_EXPIRED',503],['RATE_LIMITED',429]])('retains structured conversion error %s without putting financial input in URLs', async (code, status) => {
    const { client, fetchSpy } = response(String(code), Number(status));
    await expect(client.convert('KRW', 'MMK', '123.45')).rejects.toMatchObject({ code });
    const request = fetchSpy.mock.calls[0][0];
    expect(request.url).toBe('https://api.example.com/v1/currency-conversions/cbm');
    expect(JSON.parse(await request.text())).toEqual({ from: 'KRW', to: 'MMK', amount: '123.45' });
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ cache: 'no-store', credentials: 'omit' });
  });
  it('posts hundi rates in the body and returns the API result', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com';
    const payload = { from: 'KRW', to: 'MMK', amount: '100000', convertedAmount: '325925.92', belowDisplayPrecision: false, rates: { mmkPerUsd: '4400', usdPerKrw: '1350', mmkPerKrw: '3.259259259259' }, calculationVersion: 'krw-mmk-hundi-1', calculationPrecision: 80, rounding: 'FLOOR_ONCE', decimalPlaces: 2 };
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => JSON.stringify(payload), json: async () => payload });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSpy });
    jest.resetModules();
    const client = require('../src/modules/exchange/api') as typeof import('../src/modules/exchange/api');
    await expect(client.convertHundi('KRW', 'MMK', '100000', '4400', '1350')).resolves.toEqual(payload);
    const request = fetchSpy.mock.calls[0][0];
    expect(request.url).toBe('https://api.example.com/v1/currency-conversions/hundi');
    expect(JSON.parse(await request.text())).toEqual({ from: 'KRW', to: 'MMK', amount: '100000', mmkPerUsd: '4400', usdPerKrw: '1350' });
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ cache: 'no-store', credentials: 'omit' });
  });
  it.each([['INVALID_HUNDI_RATE',400],['INVALID_USD_KRW_RATE',400],['INVALID_AMOUNT',400],['RATE_LIMITED',429]])('retains structured hundi error %s without putting rates in the URL', async (code, status) => {
    const { client, fetchSpy } = response(String(code), Number(status));
    await expect(client.convertHundi('KRW', 'MMK', '100000', '4400', '1350')).rejects.toMatchObject({ code });
    const request = fetchSpy.mock.calls[0][0];
    expect(request.url).toBe('https://api.example.com/v1/currency-conversions/hundi');
    expect(JSON.parse(await request.text())).toEqual({ from: 'KRW', to: 'MMK', amount: '100000', mmkPerUsd: '4400', usdPerKrw: '1350' });
  });
});
