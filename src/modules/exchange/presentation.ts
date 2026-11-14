import type { Quote } from './api';
export const DEFAULT_USD_KRW = '1350';
export const validAmount = (amount: string) => /^(0|[1-9]\d{0,14})(\.\d{1,2})?$/.test(amount);
// Mirrors the API bound for user-entered rates: above zero, up to six whole digits and four decimals.
export const validRate = (rate: string) => /^(0|[1-9]\d{0,5})(\.\d{1,4})?$/.test(rate) && Number(rate) > 0;
export const isExpired = (quote: Quote, now = Date.now()) => !Number.isFinite(Date.parse(quote.expiresAt)) || Date.parse(quote.expiresAt) <= now;
export function officialLink(value: string) { try { return new URL(value).protocol === 'https:' ? value : undefined; } catch { return undefined; } }

export function mmtTime(value: string, language: string) {
  return new Intl.DateTimeFormat(language === 'my' ? 'my-MM' : 'en-GB', { timeZone: 'Asia/Yangon', dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value));
}
