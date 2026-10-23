import type { Context } from './api/client';
import { validCalendarDate, validMoney } from './validation';

export type WageRow = { startDate: string; endDate: string; basePay: string; allowances: string };
export type YearRow = { year: number; wages: string };
export type FieldErrors = Record<string, string>;

// A wage total only describes the exact period for which it was entered.
export function reconcileWages(previous: Context | undefined, rows: WageRow[], next: Context): WageRow[] {
  return next.wagePeriods.map(period => {
    const match = previous?.method === next.method && rows.find(row => row.startDate === period.startDate && row.endDate === period.endDate);
    return match || { startDate: period.startDate, endDate: period.endDate, basePay: '', allowances: '0' };
  });
}

export function reconcileYears(previous: Context | undefined, rows: YearRow[], next: Context): YearRow[] {
  return next.dcPeriods.map(period => {
    const samePeriod = previous?.method === next.method && previous.dcPeriods.some(old => old.year === period.year && old.startDate === period.startDate && old.endDate === period.endDate);
    return { year: period.year, wages: samePeriod ? rows.find(row => row.year === period.year)?.wages ?? '' : '' };
  });
}

export function validateWages(input: { method: Context['method']; wages: WageRow[]; years: YearRow[]; bonus: string; leave: string; ordinary: string; balance: string; balanceDate: string }): FieldErrors {
  const errors: FieldErrors = {};
  const check = (id: string, value: string) => { if (!validMoney(value)) errors[id] = 'invalidMoney'; };
  if (input.method === 'dc') {
    input.years.forEach(row => check(`year-${row.year}`, row.wages));
    if (input.balance) {
      check('balance', input.balance);
      if (!validCalendarDate(input.balanceDate)) errors.balanceDate = 'balanceDateRequired';
    }
  } else {
    input.wages.forEach((row, index) => { check(`base-${index}`, row.basePay); check(`allowances-${index}`, row.allowances); });
    check('bonus', input.bonus); check('leave', input.leave);
    if (input.ordinary) {
      check('ordinary', input.ordinary);
      if (!errors.ordinary && !/[1-9]/.test(input.ordinary)) errors.ordinary = 'positiveOrdinary';
    }
  }
  return errors;
}

export function apiMoneyField(field: string, years: YearRow[]): string | undefined {
  const wage = /^wages\.(\d+)\.(basePay|allowances)$/.exec(field);
  if (wage) return `${wage[2] === 'basePay' ? 'base' : 'allowances'}-${wage[1]}`;
  const year = /^dcWages\.(\d+)\.wages$/.exec(field);
  if (year && years[Number(year[1])]) return `year-${years[Number(year[1])].year}`;
  return ({ annualBonus: 'bonus', annualLeavePay: 'leave', ordinaryDailyWage: 'ordinary', 'reportedBalance.amount': 'balance', 'reportedBalance.asOf': 'balanceDate' } as Record<string, string>)[field];
}
