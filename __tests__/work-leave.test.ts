import { blankLeave, decodeStoredLeave, leaveBalance, toggleLeaveDate, validateLeave } from '../src/modules/work/leave';

it('tracks used and remaining annual leave across months in one year', () => {
  const leave = blankLeave(2026); leave.policy = 'yes'; leave.entitlementDays = '15';
  let next = toggleLeaveDate(leave, '2026-11-30', true);
  next = toggleLeaveDate(next, '2026-12-01', true);
  expect(leaveBalance(next)).toEqual({ used: 2, remaining: '13', over: '0' });
  expect(toggleLeaveDate(next, '2026-11-30', false).dates).toEqual(['2026-12-01']);
});

it('reports fractional balances and over-use against the recorded entitlement', () => {
  const leave = blankLeave(2026); leave.policy = 'yes'; leave.entitlementDays = '1.5';
  const used = toggleLeaveDate(toggleLeaveDate(leave, '2026-11-02', true), '2026-11-03', true);
  expect(leaveBalance(used)).toEqual({ used: 2, remaining: '0', over: '0.5' });
});

it('validates year-scoped leave settings and decodes stored records', () => {
  const leave = blankLeave(2026); leave.policy = 'yes'; leave.entitlementDays = '15.5';
  expect(validateLeave(leave)).toBeUndefined();
  expect(decodeStoredLeave(JSON.stringify(leave), 2026)).toEqual(leave);
  expect(validateLeave({ ...leave, entitlementDays: '365.5' })).toBe('days');
  expect(validateLeave({ ...leave, dates: ['2025-12-31'] })).toBe('dates');
  expect(() => decodeStoredLeave(JSON.stringify(leave), 2027)).toThrow('INVALID_STORED_DATA');
});
