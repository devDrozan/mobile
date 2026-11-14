import type { paths } from '../../api/schema';
import { validMoney } from '../../validation';
export type SalaryInput = paths['/v1/salary-estimates']['post']['requestBody']['content']['application/json'];
export type SalaryResult = paths['/v1/salary-estimates']['post']['responses'][200]['content']['application/json'];
export type PaySettings = SalaryInput['settings'];
export type WorkEntry = SalaryInput['entries'][number];
export const settingKeys = ['basicSalary', 'normalRate', 'overtimeRate', 'saturdayRate', 'sundayRate', 'nightRate'] as const;
export const hourKeys = ['normalHours', 'overtimeHours', 'nightHours'] as const;
export const blankSettings = (): PaySettings => ({ basicSalary: '0', normalRate: '0', overtimeRate: '0', saturdayRate: '0', sundayRate: '0', nightRate: '0' });
export const emptyMonth = (month: string, settings = blankSettings()): SalaryInput => ({ month, settings: { ...settings }, entries: [] });
export const blankEntry = (date: string): WorkEntry => ({ date, normalHours: '0', overtimeHours: '0', nightHours: '0' });
export function koreaMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}
export function moveMonth(month: string, offset: number): string {
  const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
export function monthDates(month: string): string[] {
  const first = new Date(`${month}-01T00:00:00Z`);
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}
const hundredths = (value: string) => { const [whole, fraction = ''] = value.split('.'); return Number(whole) * 100 + Number(fraction.padEnd(2, '0')); };
function fromHundredths(value: number): string {
  const whole = Math.floor(value / 100);
  const fraction = value % 100;
  if (!fraction) return String(whole);
  return `${whole}.${fraction % 10 === 0 ? String(fraction / 10) : String(fraction).padStart(2, '0')}`;
}
const minutesToHundredths = (minutes: number) => Math.round(minutes * 5 / 3);
// Accept the ways people actually type time. A bare whole number through 24 is
// hours; anything larger is minutes because a 30-hour day is almost certainly a
// mistyped 30 minutes. Clock time (1:30) and decimal hours (1.5) are explicit.
export function normalizeHours(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const clock = text.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (clock) return fromHundredths(minutesToHundredths(Number(clock[1]) * 60 + Number(clock[2])));
  if (text.includes(':')) return null;
  if (text.includes('.')) {
    const match = text.match(/^(\d*)\.(\d*)$/);
    if (!match || (!match[1] && !match[2])) return null;
    const whole = match[1] || '0';
    if (whole.replace(/^0+/, '').length > 3) return null;
    const fraction = (match[2] + '000').slice(0, 3);
    return fromHundredths(Number(whole) * 100 + Number(fraction.slice(0, 2)) + (Number(fraction[2]) >= 5 ? 1 : 0));
  }
  if (!/^\d{1,4}$/.test(text)) return null;
  const amount = Number(text);
  return fromHundredths(amount <= 24 ? amount * 100 : minutesToHundredths(amount));
}
export function normalizeSalaryInput(input: SalaryInput): SalaryInput {
  const hours = (value: string) => normalizeHours(value) ?? value;
  return { ...input, entries: input.entries.map(entry => ({ ...entry, normalHours: hours(entry.normalHours), overtimeHours: hours(entry.overtimeHours), nightHours: hours(entry.nightHours) })) };
}
export function validateMonth(input: SalaryInput): Record<string, string> {
  const errors: Record<string, string> = {};
  settingKeys.forEach(key => { if (!validMoney(input.settings[key])) errors[`settings.${key}`] = 'INVALID_VALUE'; });
  const dates = new Set(monthDates(input.month)); const seen = new Set<string>();
  input.entries.forEach((entry, index) => {
    const prefix = `entries.${index}`;
    if (!dates.has(entry.date)) errors[`${prefix}.date`] = 'INVALID_DATE';
    if (seen.has(entry.date)) errors[`${prefix}.date`] = 'DUPLICATE_DATE';
    seen.add(entry.date);
    hourKeys.forEach(key => { if (normalizeHours(entry[key]) === null) errors[`${prefix}.${key}`] = 'INVALID_HOURS'; });
    if (hourKeys.some(key => errors[`${prefix}.${key}`])) return;
    const total = hundredths(normalizeHours(entry.normalHours)!) + hundredths(normalizeHours(entry.overtimeHours)!);
    if (total > 2400) errors[`${prefix}.overtimeHours`] = 'DAILY_HOURS_EXCEEDED';
    if (hundredths(normalizeHours(entry.nightHours)!) > total) errors[`${prefix}.nightHours`] = 'NIGHT_HOURS_EXCEEDED';
  });
  return errors;
}

export function decodeStoredMonth(payload: string, expectedMonth?: string): SalaryInput {
  const value: unknown = JSON.parse(payload);
  if (!value || typeof value !== 'object' || !('month' in value) || typeof value.month !== 'string' || !/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(value.month) || expectedMonth && value.month !== expectedMonth || !('settings' in value) || !value.settings || typeof value.settings !== 'object' || !('entries' in value) || !Array.isArray(value.entries)) throw new Error('INVALID_STORED_DATA');
  const settings = value.settings as Record<string, unknown>;
  if (!settingKeys.every(key => key in settings && typeof settings[key] === 'string')) throw new Error('INVALID_STORED_DATA');
  if (!value.entries.every(entry => entry && typeof entry === 'object' && typeof entry.date === 'string' && hourKeys.every(key => typeof entry[key] === 'string'))) throw new Error('INVALID_STORED_DATA');
  const draft = value as SalaryInput;
  if (Object.keys(validateMonth(draft)).length) throw new Error('INVALID_STORED_DATA');
  const normalized = normalizeSalaryInput(draft);
  // Read only approved input properties; saved estimates or unknown fields never
  // enter the module session or the API submission.
  return { month: normalized.month, settings: Object.fromEntries(settingKeys.map(key => [key, normalized.settings[key]])) as PaySettings, entries: normalized.entries.map(entry => ({ date: entry.date, normalHours: entry.normalHours, overtimeHours: entry.overtimeHours, nightHours: entry.nightHours })) };
}
