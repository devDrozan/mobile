import { defaultSelectedDate, koreaToday } from '../src/calendar-date';
it('selects today in Korea across midnight and year boundaries', () => {
  const now = new Date('2026-12-31T15:01:00Z');
  expect(koreaToday(now)).toBe('2027-01-01');
  expect(defaultSelectedDate('2027-01', now)).toBe('2027-01-01');
  expect(defaultSelectedDate('2026-12', now)).toBe('2026-12-01');
  expect(defaultSelectedDate('2024-02', new Date('2024-02-29T05:00:00Z'))).toBe('2024-02-29');
});
