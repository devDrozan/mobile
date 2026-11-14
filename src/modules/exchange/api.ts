import { api, ApiFailure, withApiDeadline } from '../../api/client';
import type { paths } from '../../api/schema';
export type Quote = paths['/v1/exchange-rates/krw-mmk/cbm']['get']['responses'][200]['content']['application/json'];
export type Conversion = paths['/v1/currency-conversions/cbm']['post']['responses'][200]['content']['application/json'];
export type HundiConversion = paths['/v1/currency-conversions/hundi']['post']['responses'][200]['content']['application/json'];
export type Currency = 'KRW' | 'MMK';
export class ExchangeFailure extends Error { constructor(public code: string) { super(code); } }
async function request<T>(operation: () => Promise<T>) {
  try { return await operation(); }
  catch (error) {
    if (error instanceof ExchangeFailure) throw error;
    throw new ExchangeFailure(error instanceof ApiFailure && error.kind === 'offline' ? 'NETWORK' : 'RATE_UNAVAILABLE');
  }
}
export function getRate(refresh = false): Promise<Quote> {
  return request(async () => {
    const { data, error } = await withApiDeadline(signal => api.GET('/v1/exchange-rates/krw-mmk/cbm', { params: { query: { refresh: refresh ? 'true' : undefined } }, signal }));
    if (error || !data) throw new ExchangeFailure(error?.code ?? 'RATE_UNAVAILABLE'); return data;
  });
}
export function convert(from: Currency, to: Currency, amount: string): Promise<Conversion> {
  return request(async () => {
    const { data, error } = await withApiDeadline(signal => api.POST('/v1/currency-conversions/cbm', { body: { from, to, amount }, signal }));
    if (error || !data) throw new ExchangeFailure(error?.code ?? 'REQUEST_FAILED'); return data;
  });
}
// The user's own MMK/USD and USD/KRW rates are sent per request; the API owns the arithmetic.
export function convertHundi(from: Currency, to: Currency, amount: string, mmkPerUsd: string, usdPerKrw: string): Promise<HundiConversion> {
  return request(async () => {
    const { data, error } = await withApiDeadline(signal => api.POST('/v1/currency-conversions/hundi', { body: { from, to, amount, mmkPerUsd, usdPerKrw }, signal }));
    if (error || !data) throw new ExchangeFailure(error?.code ?? 'REQUEST_FAILED'); return data;
  });
}
