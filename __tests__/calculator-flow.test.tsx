import { act, render, screen, fireEvent } from '@testing-library/react-native';
import i18n from '../src/i18n';
import CalculatorScreen from '../src/app/index';
import { ApiFailure, calculate, getContext, type Context } from '../src/api/client';
import { apiMoneyField, reconcileWages, reconcileYears } from '../src/calculator-draft';
import { inputMoney } from '../src/validation';

jest.mock('expo-router', () => ({ usePathname: () => '/', router: { navigate: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../src/api/client', () => ({
  getContext: jest.fn(), calculate: jest.fn(),
  ApiFailure: class extends Error { constructor(public issues: { field: string; code: string }[] = []) { super('API_REQUEST_FAILED'); } },
}));

const context: Context = {
  method: 'normal', retirementDate: '2017-09-16', employmentDays: 1080, lookbackStart: '2017-06-16', lookbackDays: 92,
  eligibility: { status: 'eligible', reasons: [] },
  wagePeriods: [{ startDate: '2017-06-16', endDate: '2017-06-30', days: 15 }, { startDate: '2017-07-01', endDate: '2017-07-31', days: 31 }],
  dcPeriods: [{ year: 2024, startDate: '2024-07-01', endDate: '2024-12-31' }, { year: 2025, startDate: '2025-01-01', endDate: '2025-12-31' }],
};

beforeEach(async () => {
  jest.clearAllMocks();
  await act(() => i18n.changeLanguage('en'));
  jest.mocked(getContext).mockImplementation(async input => ({ ...context, method: input.method }));
});

it('retains every wage field through Back and unchanged employment, and reviews exact decimals', async () => {
  await render(<CalculatorScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Try an example' }));
  await fireEvent.changeText(screen.getAllByLabelText('Base pay')[0], '1000000.50');
  await fireEvent.changeText(screen.getByLabelText('Eligible bonuses in the previous 12 months'), '2000000.123456');
  await fireEvent.changeText(screen.getByLabelText(/Daily ordinary wage, if known/), '10000.50');
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to wages' }));
  expect(screen.getAllByLabelText('Base pay')[0]).toHaveDisplayValue('1000000.50');
  expect(screen.getByLabelText('Eligible bonuses in the previous 12 months')).toHaveDisplayValue('2000000.123456');
  expect(screen.getByLabelText(/Daily ordinary wage, if known/)).toHaveDisplayValue('10000.50');
  await fireEvent.press(screen.getByRole('radio', { name: 'Normal Standard severance pay' }));
  expect(screen.getAllByLabelText('Base pay')[0]).toHaveDisplayValue('1000000.50');
  await fireEvent.press(screen.getByRole('button', { name: 'Review my details' }));
  expect(screen.getByText('₩1,000,000.50')).toBeOnTheScreen();
  expect(screen.getByText('₩2,000,000.123456')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getAllByLabelText('Base pay')[0]).toHaveDisplayValue('1000000.50');
});

it('gives amount-specific inline errors and translates them without discarding the draft', async () => {
  await render(<CalculatorScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Try an example' }));
  await fireEvent.changeText(screen.getAllByLabelText('Base pay')[0], '-1');
  await fireEvent.changeText(screen.getByLabelText(/Daily ordinary wage, if known/), '0.000000');
  await fireEvent.press(screen.getByRole('button', { name: 'Review my details' }));
  expect(screen.getAllByLabelText('Base pay')[0]).toHaveProp('aria-invalid', true);
  expect(screen.getAllByLabelText('Base pay')[0]).toHaveProp('aria-describedby', 'base-0-error');
  expect(screen.getAllByLabelText('Base pay')[0]).toHaveProp('accessibilityHint', i18n.t('invalidMoney'));
  expect(screen.getByLabelText(/Daily ordinary wage, if known/)).toHaveProp('aria-invalid', true);
  expect(screen.getByText(i18n.t('positiveOrdinary'))).toBeOnTheScreen();
  await act(() => i18n.changeLanguage('my'));
  expect(screen.getByText(i18n.t('invalidMoney'))).toBeOnTheScreen();
  expect(screen.getAllByLabelText(i18n.t('basePay'))[0]).toHaveDisplayValue('-1');
  expect(calculate).not.toHaveBeenCalled();
});

it('associates a DC balance-date error with its field and preserves yearly wages', async () => {
  await render(<CalculatorScreen />);
  await fireEvent.press(screen.getByRole('radio', { name: 'DC Defined contribution pension' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Try an example' }));
  await fireEvent.changeText(screen.getAllByLabelText('Gross wages earned')[0], '999999999999999.123456');
  await fireEvent.changeText(screen.getByLabelText(/Reported DC account balance/), '1000.50');
  await fireEvent.changeText(screen.getByLabelText('Statement date'), '2025-02-30');
  await fireEvent.press(screen.getByRole('button', { name: 'Review my details' }));
  expect(screen.getByLabelText('Statement date')).toHaveProp('aria-invalid', true);
  expect(screen.getByLabelText('Statement date')).toHaveProp('aria-describedby', 'balanceDate-error');
  await fireEvent.changeText(screen.getByLabelText('Statement date'), '2025-12-31');
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to wages' }));
  expect(screen.getAllByLabelText('Gross wages earned')[0]).toHaveDisplayValue('999999999999999.123456');
  await fireEvent.press(screen.getByRole('button', { name: 'Review my details' }));
  expect(screen.getByText('₩999,999,999,999,999.123456')).toBeOnTheScreen();
  expect(screen.getByText(/₩1,000.50/)).toBeOnTheScreen();
});

it('returns structured API amount errors to the editable wage field', async () => {
  await render(<CalculatorScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Try an example' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Review my details' }));
  jest.mocked(calculate).mockRejectedValueOnce(new ApiFailure([{ field: 'wages.0.basePay', code: 'INVALID_VALUE' }]));
  await fireEvent.press(screen.getByRole('button', { name: 'Calculate my estimate' }));
  expect(screen.getAllByLabelText('Base pay')[0]).toHaveProp('aria-invalid', true);
  expect(screen.getAllByLabelText('Base pay')[0]).toHaveDisplayValue('1000000');
  expect(screen.getByText(i18n.t('invalidMoney'))).toBeOnTheScreen();
});

it('keeps only amounts whose exact API-generated periods still match', () => {
  const rows = context.wagePeriods.map(period => ({ ...period, basePay: '1000.50', allowances: '100' }));
  const changed = { ...context, wagePeriods: [{ ...context.wagePeriods[0], startDate: '2017-06-17' }, context.wagePeriods[1]] };
  expect(reconcileWages(context, rows, changed).map(row => row.basePay)).toEqual(['', '1000.50']);
  const dc = { ...context, method: 'dc' as const };
  const changedDc = { ...dc, dcPeriods: [{ ...dc.dcPeriods[0], startDate: '2024-08-01' }, dc.dcPeriods[1]] };
  expect(reconcileYears(dc, [{ year: 2024, wages: '1000.50' }, { year: 2025, wages: '2000.50' }], changedDc)).toEqual([{ year: 2024, wages: '' }, { year: 2025, wages: '2000.50' }]);
  expect(apiMoneyField('dcWages.1.wages', [{ year: 2024, wages: '' }, { year: 2025, wages: '' }])).toBe('year-2025');
  expect(inputMoney('0.000000')).toBe('0.000000');
});
