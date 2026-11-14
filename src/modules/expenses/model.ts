import { validCalendarDate, validMoney } from '../../validation';
export const categories = ['food', 'housing', 'transport', 'utilities', 'health', 'remittance', 'other'] as const;
export type Category = typeof categories[number];
export type ExpenseEntry = { id: string; date: string; description: string; category: Category; amount: string };
export type ExpenseForm = { entry: ExpenseEntry; editing: boolean; dirty: boolean };
let sequence = 0;
export function newId() { return `e-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 12)}`; }
export function koreaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
}
export function validMonth(value: string) { return /^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(value); }
export function moveMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + offset); return date.toISOString().slice(0, 7);
}
export function newForm(period: string): ExpenseForm {
  const today = koreaDate();
  const date = period.length === 10 ? period : today.startsWith(period) ? today : `${period}-01`;
  return { entry: { id: newId(), date, description: '', category: 'other', amount: '' }, editing: false, dirty: false };
}
export function validateEntry(entry: ExpenseEntry) {
  const errors: Record<string, string> = {};
  if (!validCalendarDate(entry.date) || entry.date > '2099-12-31') errors.date = 'invalidDate';
  const description = entry.description.trim();
  if (![...description].length || [...description].length > 120) errors.description = 'invalidDescription';
  if (!categories.includes(entry.category)) errors.category = 'invalidCategory';
  if (!validMoney(entry.amount) || !/[1-9]/.test(entry.amount)) errors.amount = 'invalidAmount';
  return errors;
}
export function normalizeEntry(entry: ExpenseEntry): ExpenseEntry {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(entry.id) || Object.keys(validateEntry(entry)).length) throw new Error('INVALID_EXPENSE');
  return { id: entry.id, date: entry.date, description: entry.description.trim(), category: entry.category, amount: entry.amount };
}
export function decodeEntry(payload: string): ExpenseEntry {
  const value: unknown = JSON.parse(payload);
  if (!value || typeof value !== 'object') throw new Error('CORRUPT_EXPENSES');
  const candidate = value as Record<string, unknown>;
  if (!['id', 'date', 'description', 'category', 'amount'].every(key => typeof candidate[key] === 'string')) throw new Error('CORRUPT_EXPENSES');
  const entry = normalizeEntry(candidate as ExpenseEntry);
  if (entry.description !== candidate.description) throw new Error('CORRUPT_EXPENSES');
  return entry;
}
export function orderEntries(entries: ExpenseEntry[]) {
  return [...entries].sort((a, b) => a.date !== b.date ? (a.date > b.date ? -1 : 1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}


// Scoped local aggregation of saved expense records only. Salary/severance
// arithmetic remains on the API. Six fractional places preserve all input units.
export function sumAmounts(amounts: string[]): string {
  const scale = BigInt(1000000);
  const total = amounts.reduce((sum, amount) => {
    if (!validMoney(amount)) throw new Error('INVALID_EXPENSE_AMOUNT');
    const [whole, fraction = ''] = amount.split('.');
    return sum + BigInt(whole) * scale + BigInt(fraction.padEnd(6, '0'));
  }, BigInt(0));
  const fraction = (total % scale).toString().padStart(6, '0').replace(/0+$/, '');
  return (total / scale).toString() + (fraction ? `.${fraction}` : '');
}
export function dailyExpenses(entries: ExpenseEntry[]) {
  const grouped = new Map<string, ExpenseEntry[]>();
  for (const entry of entries) grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry]);
  return new Map([...grouped].map(([date, records]) => [date, { count: records.length, total: sumAmounts(records.map(record => record.amount)) }]));
}
export function calendarDates(month: string) {
  if (!validMonth(month)) throw new Error('INVALID_MONTH');
  const first = new Date(`${month}-01T00:00:00Z`);
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: days }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}
export function compactDailyTotal(total: string) {
  if (total.length <= 6) return total;
  const [whole, fraction = ''] = total.split('.');
  if (whole.length <= 3 && (whole !== '0' || fraction.search(/[1-9]/) < 2)) return `≈${whole}${fraction ? `.${fraction.slice(0, 2)}` : ''}`;
  const significant = whole === '0' ? fraction.replace(/^0+/, '') : whole + fraction;
  const exponent = whole === '0' ? -(fraction.length - significant.length + 1) : whole.length - 1;
  return `≈${significant[0]}${significant.length > 1 ? `.${significant[1]}` : ''}e${exponent}`;
}
