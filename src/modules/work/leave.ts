import { validCalendarDate } from '../../validation';

export type LeavePolicy = 'yes' | 'no' | 'unsure';
export type LeaveRecord = {
  year: number;
  policy: LeavePolicy | null;
  entitlementDays: string;
  dates: string[];
};
export type LeaveBalance = { used: number; remaining: string; over: string };

export const blankLeave = (year: number): LeaveRecord => ({ year, policy: null, entitlementDays: '', dates: [] });

const daysHundredths = (value: string) => {
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
};
const formatDays = (value: number) => {
  const whole = Math.floor(value / 100);
  const fraction = value % 100;
  if (!fraction) return String(whole);
  return `${whole}.${fraction % 10 === 0 ? String(fraction / 10) : String(fraction).padStart(2, '0')}`;
};
const validDays = (value: string) => /^(0|[1-9]\d{0,2})(\.\d{1,2})?$/.test(value) && daysHundredths(value) <= 36500;

export function validateLeave(record: LeaveRecord): string | undefined {
  if (!Number.isInteger(record.year) || record.year < 1900 || record.year > 2100) return 'year';
  if (record.policy !== null && record.policy !== 'yes' && record.policy !== 'no' && record.policy !== 'unsure') return 'policy';
  if (record.policy === 'yes' && record.entitlementDays !== '' && !validDays(record.entitlementDays)) return 'days';
  if (record.dates.some(date => !validCalendarDate(date) || !date.startsWith(`${record.year}-`))) return 'dates';
  return undefined;
}

export function leaveBalance(record: LeaveRecord): LeaveBalance {
  const entitlement = validDays(record.entitlementDays) ? daysHundredths(record.entitlementDays) : 0;
  const used = new Set(record.dates).size;
  const remaining = Math.max(0, entitlement - used * 100);
  const over = Math.max(0, used * 100 - entitlement);
  return { used, remaining: formatDays(remaining), over: over ? formatDays(over) : '0' };
}

export function toggleLeaveDate(record: LeaveRecord, date: string, marked: boolean): LeaveRecord {
  const dates = marked
    ? [...new Set([...record.dates, date])].sort()
    : record.dates.filter(value => value !== date);
  return { ...record, dates };
}

export function decodeStoredLeave(payload: string, year: number): LeaveRecord {
  const value: unknown = JSON.parse(payload);
  if (!value || typeof value !== 'object' || !('year' in value) || value.year !== year || !('policy' in value) || !('entitlementDays' in value) || typeof value.entitlementDays !== 'string' || !('dates' in value) || !Array.isArray(value.dates) || !value.dates.every(date => typeof date === 'string')) throw new Error('INVALID_STORED_DATA');
  const record: LeaveRecord = { year, policy: value.policy as LeavePolicy | null, entitlementDays: value.entitlementDays, dates: [...new Set(value.dates as string[])].sort() };
  if (validateLeave(record)) throw new Error('INVALID_STORED_DATA');
  return record;
}
