import { blankEntry, blankSettings, emptyMonth, koreaMonth, monthDates, moveMonth, normalizeHours, normalizeSalaryInput, validateMonth } from '../src/modules/work/model';
it('uses Korean month and timezone-independent month boundaries', () => {
  expect(koreaMonth(new Date('2026-10-31T16:00:00Z'))).toBe('2026-11');
  expect(moveMonth('2026-01', -1)).toBe('2025-12');
  expect(moveMonth('2026-12', 1)).toBe('2027-01');
  expect(monthDates('2024-02')).toHaveLength(29);
  expect(monthDates('2025-02')).toHaveLength(28);
});
it('validates fractional hours without binary boundary errors and night overlap', () => {
  const draft = emptyMonth('2026-11');
  draft.entries = [{ date: '2026-11-02', normalHours: '23.99', overtimeHours: '0.01', nightHours: '24' }];
  expect(validateMonth(draft)).toEqual({});
  draft.entries[0].overtimeHours = '0.02';
  expect(validateMonth(draft)['entries.0.overtimeHours']).toBe('DAILY_HOURS_EXCEEDED');
  draft.entries[0] = { ...blankEntry('2026-11-02'), nightHours: '0.01' };
  expect(validateMonth(draft)['entries.0.nightHours']).toBe('NIGHT_HOURS_EXCEEDED');
  draft.entries[0].normalHours = 'abc';
  expect(validateMonth(draft)['entries.0.normalHours']).toBe('INVALID_HOURS');
});
it('parses clock time, decimal hours, and minute-only input into decimal hours', () => {
  expect(normalizeHours('1:30')).toBe('1.5');
  expect(normalizeHours('1.5')).toBe('1.5');
  expect(normalizeHours('30')).toBe('0.5');
  expect(normalizeHours('8')).toBe('8');
  expect(normalizeHours('24')).toBe('24');
  expect(normalizeHours('25')).toBe('0.42');
  expect(normalizeHours('1:20')).toBe('1.33');
  expect(normalizeHours('1.005')).toBe('1.01');
  expect(normalizeHours('1.001')).toBe('1');
  expect(normalizeHours('24:00')).toBe('24');
  expect(normalizeHours('1:90')).toBeNull();
  expect(normalizeHours('abc')).toBeNull();
  expect(normalizeHours('')).toBeNull();
});
it('accepts flexible entry formats for validation but normalizes stored and submitted hours', () => {
  const draft = emptyMonth('2026-11');
  draft.entries = [{ date: '2026-11-02', normalHours: '1:30', overtimeHours: '30', nightHours: '1.5' }];
  expect(validateMonth(draft)).toEqual({});
  expect(normalizeSalaryInput(draft).entries[0]).toEqual({ date: '2026-11-02', normalHours: '1.5', overtimeHours: '0.5', nightHours: '1.5' });
});
it('rejects out-of-month/duplicate dates and isolates copied pay settings', () => {
  const settings = blankSettings(); settings.basicSalary = '2000000.50';
  const draft = emptyMonth('2026-11', settings);
  draft.settings.basicSalary = '3000000';
  expect(settings.basicSalary).toBe('2000000.50');
  draft.entries = [blankEntry('2026-12-01'), blankEntry('2026-12-01')];
  const errors = validateMonth(draft);
  expect(errors['entries.0.date']).toBe('INVALID_DATE');
  expect(errors['entries.1.date']).toBe('DUPLICATE_DATE');
});
