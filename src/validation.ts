import { z } from 'zod';
export function validCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01' && value <= '2100-12-31';
}
const requiredDate = z.string().min(1, 'required').refine(v => v === '' || validCalendarDate(v), 'invalidDate');
export const employmentSchema = z.object({
  startDate: requiredDate,
  lastWorkingDate: requiredDate,
  weeklyHours: z.number({ error: 'validHours' }).min(0, 'validHours').max(168, 'validHours'),
  hasSpecialCircumstances: z.boolean(),
}).refine(v => !v.startDate || !v.lastWorkingDate || v.lastWorkingDate >= v.startDate, { path: ['lastWorkingDate'], message: 'dateOrder' });
export type EmploymentValues = z.infer<typeof employmentSchema>;
export const moneyPattern = /^(0|[1-9]\d{0,14})(\.\d{1,6})?$/;
export const validMoney = (v: string) => moneyPattern.test(v);
export function money(value: string) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value)); }
// Review the accepted input exactly; converting to Number can lose decimal precision.
export function inputMoney(value: string) {
  const [whole, fraction] = value.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`);
}
export function dateLabel(value: string, language = 'en') {
  return new Intl.DateTimeFormat(language === 'my' ? 'my-MM' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}
