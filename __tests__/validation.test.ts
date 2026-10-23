import { employmentSchema, validMoney, validCalendarDate } from '../src/validation';
import en from '../src/locales/en.json';
import my from '../src/locales/my.json';
describe('mobile input handling', () => {
  it('rejects impossible dates before rendering a review screen', () => {
    expect(validCalendarDate('2025-02-30')).toBe(false);
    expect(validCalendarDate('2024-02-29')).toBe(true);
    expect(employmentSchema.safeParse({ startDate: '2025-02-30', lastWorkingDate: '2025-12-31', weeklyHours: 40, hasSpecialCircumstances: false }).success).toBe(false);
  });
  it('rejects negative or formatted wages and keeps decimal strings', () => {
    expect(validMoney('3000000.50')).toBe(true);
    expect(validMoney('-1')).toBe(false);
    expect(validMoney('3,000,000')).toBe(false);
  });
  it('includes matching Burmese keys for all launch strings', () => {
    const keys = (object: Record<string, unknown>, prefix = ''): string[] => Object.entries(object).flatMap(([key, value]) => value && typeof value === 'object' ? keys(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]);
    expect(keys(my).sort()).toEqual(keys(en).sort());
  });
});
