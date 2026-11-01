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
export function validateMonth(input: SalaryInput): Record<string, string> {
  const errors: Record<string, string> = {};
  settingKeys.forEach(key => { if (!validMoney(input.settings[key])) errors[`settings.${key}`] = 'INVALID_VALUE'; });
  const dates = new Set(monthDates(input.month)); const seen = new Set<string>();
  input.entries.forEach((entry, index) => {
    const prefix = `entries.${index}`;
    if (!dates.has(entry.date)) errors[`${prefix}.date`] = 'INVALID_DATE';
    if (seen.has(entry.date)) errors[`${prefix}.date`] = 'DUPLICATE_DATE';
    seen.add(entry.date);
    hourKeys.forEach(key => { if (!/^(0|[1-9]\d?)(\.\d{1,2})?$/.test(entry[key])) errors[`${prefix}.${key}`] = 'INVALID_HOURS'; });
    if (hourKeys.some(key => errors[`${prefix}.${key}`])) return;
    const total = hundredths(entry.normalHours) + hundredths(entry.overtimeHours);
    if (total > 2400) errors[`${prefix}.overtimeHours`] = 'DAILY_HOURS_EXCEEDED';
    if (hundredths(entry.nightHours) > total) errors[`${prefix}.nightHours`] = 'NIGHT_HOURS_EXCEEDED';
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
  // Read only approved input properties; saved estimates or unknown fields never
  // enter the module session or the API submission.
  return { month: draft.month, settings: Object.fromEntries(settingKeys.map(key => [key, draft.settings[key]])) as PaySettings, entries: draft.entries.map(entry => ({ date: entry.date, normalHours: entry.normalHours, overtimeHours: entry.overtimeHours, nightHours: entry.nightHours })) };
}
