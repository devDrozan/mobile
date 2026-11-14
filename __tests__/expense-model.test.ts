import { decodeEntry, koreaDate, newForm, normalizeEntry, orderEntries, validateEntry, type ExpenseEntry } from '../src/modules/expenses/model';
const row = (): ExpenseEntry => ({ id: 'example-1', date: '2024-02-29', description: 'Groceries', category: 'food', amount: '999999999999999.123456' });
it('preserves exact money text, trims descriptions, and uses Korean dates', () => {
  expect(normalizeEntry({ ...row(), description: '  Groceries  ' })).toEqual(row());
  expect(decodeEntry(JSON.stringify(row())).amount).toBe('999999999999999.123456');
  expect(koreaDate(new Date('2026-11-06T16:00:00Z'))).toBe('2026-11-07');
  expect(newForm('2026-01').entry.date).toBe('2026-01-01');
});
it.each(['0', '0.000000', '-1', '1e3', '1000000000000000', '1.1234567'])('rejects unsupported amount %s', amount => {
  expect(validateEntry({ ...row(), amount }).amount).toBe('invalidAmount');
});
it('rejects invalid dates, categories, descriptions and corrupt persisted shapes', () => {
  expect(validateEntry({ ...row(), date: '2025-02-29' }).date).toBe('invalidDate');
  expect(validateEntry({ ...row(), date: '2100-01-01' }).date).toBe('invalidDate');
  expect(validateEntry({ ...row(), description: ' ' }).description).toBe('invalidDescription');
  expect(validateEntry({ ...row(), description: 'x'.repeat(121) }).description).toBe('invalidDescription');
  expect(validateEntry({ ...row(), category: 'bogus' as ExpenseEntry['category'] }).category).toBe('invalidCategory');
  for (const value of [null, {}, { ...row(), amount: 1 }, { ...row(), description: ' Groceries ' }]) expect(() => decodeEntry(JSON.stringify(value))).toThrow();
});
it('sorts newest dates first with a stable ID tie break', () => {
  const values = [{ ...row(), id: 'b' }, { ...row(), id: 'a' }, { ...row(), id: 'c', date: '2024-03-01' }];
  expect(orderEntries(values).map(value => value.id)).toEqual(['c', 'a', 'b']);
  expect(values[0].id).toBe('b');
});

import { sumAmounts, dailyExpenses, calendarDates, compactDailyTotal } from '../src/modules/expenses/model';
it('aggregates exact daily amounts offline and separates dates', () => {
  expect(sumAmounts(['0.1','0.2'])).toBe('0.3');
  expect(sumAmounts(['999999999999999.999999','0.000001'])).toBe('1000000000000000');
  expect(sumAmounts([])).toBe('0');
  expect(compactDailyTotal('0.000001')).toBe('≈1e-6');
  expect(calendarDates('2024-02')).toHaveLength(29);
  expect(calendarDates('2025-02').at(-1)).toBe('2025-02-28');
  const grouped = dailyExpenses([{...row(),amount:'0.1'}, {...row(),id:'two',amount:'0.2'}, {...row(),date:'2024-03-01',amount:'5'}]);
  expect(grouped.get('2024-02-29')).toEqual({count:2,total:'0.3'});
});
