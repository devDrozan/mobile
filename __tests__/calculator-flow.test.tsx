import { enterWages } from './helpers/enter-wages';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import i18n from '../src/i18n';
import CalculatorScreen from '../src/modules/severance/CalculatorScreen';
import { ApiFailure, calculate, getContext, type Calculation, type Context } from '../src/api/client';
import { apiMoneyField, reconcileWages, reconcileYears } from '../src/calculator-draft';
import { inputMoney } from '../src/validation';
import { CalculatorSessionProvider } from '../src/calculator-session';

const renderCalculator = () => render(<CalculatorSessionProvider><CalculatorScreen /></CalculatorSessionProvider>);

jest.mock('expo-router', () => ({ usePathname: () => '/', useFocusEffect: () => undefined, router: { navigate: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../src/api/client', () => ({
  getContext: jest.fn(), calculate: jest.fn(),
  ApiFailure: class extends Error { constructor(public issues: { field: string; code: string }[] = [], public kind = 'unavailable') { super('API_REQUEST_FAILED'); } },
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

it.each(['en', 'my'])('keeps the editable %s hero wording intact and allows natural wrapping', async language => {
  await act(() => i18n.changeLanguage(language));
  await renderCalculator();
  const hero = screen.getByRole('header', { name: i18n.t('hero') });
  expect(hero.props.children).toBe(i18n.t('hero'));
  expect(hero.props.numberOfLines).toBeUndefined();
  expect(hero.props.adjustsFontSizeToFit).not.toBe(true);
  expect(hero.props.allowFontScaling).not.toBe(false);
  expect(screen.queryByRole('button', { name: i18n.t('example') })).toBeNull();
});

it('retains every wage field through Back and unchanged employment, and reviews exact decimals', async () => {
  await renderCalculator();
  await enterWages();
  await fireEvent.changeText(screen.getAllByLabelText('Base pay', { exact: false })[0], '1000000.50');
  await fireEvent.changeText(screen.getByLabelText('Eligible bonuses in the previous 12 months'), '2000000.123456');
  await fireEvent.changeText(screen.getByLabelText(/Daily ordinary wage, if known/), '10000.50');
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to wages' }));
  expect(screen.getAllByLabelText('Base pay', { exact: false })[0]).toHaveDisplayValue('1000000.50');
  expect(screen.getByLabelText('Eligible bonuses in the previous 12 months')).toHaveDisplayValue('2000000.123456');
  expect(screen.getByLabelText(/Daily ordinary wage, if known/)).toHaveDisplayValue('10000.50');
  await fireEvent.press(screen.getByRole('radio', { name: 'Normal Standard severance pay' }));
  expect(screen.getAllByLabelText('Base pay', { exact: false })[0]).toHaveDisplayValue('1000000.50');
  await fireEvent.press(screen.getByRole('button', { name: 'Review my details' }));
  expect(screen.getByText('₩1,000,000.50')).toBeOnTheScreen();
  expect(screen.getByText('₩2,000,000.123456')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getAllByLabelText('Base pay', { exact: false })[0]).toHaveDisplayValue('1000000.50');
});

it('gives amount-specific inline errors and translates them without discarding the draft', async () => {
  await renderCalculator();
  await enterWages();
  await fireEvent.changeText(screen.getAllByLabelText('Base pay', { exact: false })[0], '-1');
  await fireEvent.changeText(screen.getByLabelText(/Daily ordinary wage, if known/), '0.000000');
  await fireEvent.press(screen.getByRole('button', { name: 'Review my details' }));
  expect(screen.getAllByLabelText('Base pay', { exact: false })[0]).toHaveProp('aria-invalid', true);
  expect(screen.getAllByLabelText('Base pay', { exact: false })[0]).toHaveProp('aria-describedby', 'base-0-error');
  expect(screen.getAllByLabelText('Base pay', { exact: false })[0]).toHaveProp('accessibilityHint', i18n.t('invalidMoney'));
  expect(screen.getByLabelText(/Daily ordinary wage, if known/)).toHaveProp('aria-invalid', true);
  expect(screen.getByText(i18n.t('positiveOrdinary'))).toBeOnTheScreen();
  await act(() => i18n.changeLanguage('my'));
  expect(screen.getByText(i18n.t('invalidMoney'))).toBeOnTheScreen();
  expect(screen.getAllByLabelText(i18n.t('basePay'), { exact: false })[0]).toHaveDisplayValue('-1');
  expect(calculate).not.toHaveBeenCalled();
});

it('associates a DC balance-date error with its field and preserves yearly wages', async () => {
  await renderCalculator();
  await fireEvent.press(screen.getByRole('radio', { name: 'DC Defined contribution pension' }));
  await enterWages();
  await fireEvent.changeText(screen.getAllByLabelText('Gross wages earned', { exact: false })[0], '999999999999999.123456');
  await fireEvent.changeText(screen.getByLabelText(/Reported DC account balance/), '1000.50');
  await fireEvent.changeText(screen.getByLabelText('Statement date'), '2025-02-30');
  await fireEvent.press(screen.getByRole('button', { name: 'Review my details' }));
  expect(screen.getByLabelText('Statement date')).toHaveProp('aria-invalid', true);
  expect(screen.getByLabelText('Statement date')).toHaveProp('aria-describedby', 'balanceDate-error');
  await fireEvent.changeText(screen.getByLabelText('Statement date'), '2025-12-31');
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to wages' }));
  expect(screen.getAllByLabelText('Gross wages earned', { exact: false })[0]).toHaveDisplayValue('999999999999999.123456');
  await fireEvent.press(screen.getByRole('button', { name: 'Review my details' }));
  expect(screen.getByText('₩999,999,999,999,999.123456')).toBeOnTheScreen();
  expect(screen.getByText(/₩1,000.50/)).toBeOnTheScreen();
});

it('returns structured API amount errors to the editable wage field', async () => {
  await renderCalculator();
  await enterWages();
  await fireEvent.press(screen.getByRole('button', { name: 'Review my details' }));
  jest.mocked(calculate).mockRejectedValueOnce(new ApiFailure([{ field: 'wages.0.basePay', code: 'INVALID_VALUE' }]));
  await fireEvent.press(screen.getByRole('button', { name: 'Calculate my estimate' }));
  expect(screen.getAllByLabelText('Base pay', { exact: false })[0]).toHaveProp('aria-invalid', true);
  expect(screen.getAllByLabelText('Base pay', { exact: false })[0]).toHaveDisplayValue('1000000');
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

it('preserves a decimal point during sequential hours entry and submits the intended hours', async () => {
  await renderCalculator();
  await fireEvent.changeText(screen.getByLabelText('First working day'), '2014-10-02');
  await fireEvent.changeText(screen.getByLabelText('Last working day'), '2017-09-15');
  for (const value of ['', '1', '14', '14.', '14.5']) {
    await fireEvent.changeText(screen.getByLabelText('Scheduled hours per week'), value);
    expect(screen.getByLabelText('Scheduled hours per week')).toHaveDisplayValue(value);
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to wages' }));
  expect(getContext).toHaveBeenCalledWith({
    method: 'normal',
    employment: { startDate: '2014-10-02', lastWorkingDate: '2017-09-15', weeklyHours: 14.5, hasSpecialCircumstances: false },
  });
});

it('retains a reviewed wage draft when guidance unmounts the calculator route', async () => {
  const route = (showCalculator: boolean) => <CalculatorSessionProvider>{showCalculator ? <CalculatorScreen /> : null}</CalculatorSessionProvider>;
  const view = await render(route(true));
  await enterWages();
  await fireEvent.changeText(screen.getAllByLabelText('Base pay', { exact: false })[0], '123456.789012');
  await fireEvent.changeText(screen.getByLabelText('Eligible bonuses in the previous 12 months'), '2000000.123456');
  await fireEvent.press(screen.getByRole('button', { name: 'Review my details' }));
  await view.rerender(route(false));
  await view.rerender(route(true));
  expect(screen.getByText('₩123,456.789012')).toBeOnTheScreen();
  expect(screen.getByText('₩2,000,000.123456')).toBeOnTheScreen();
  expect(getContext).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getAllByLabelText('Base pay', { exact: false })[0]).toHaveDisplayValue('123456.789012');
  await view.unmount();
  await renderCalculator();
  expect(screen.getByLabelText('First working day')).toHaveDisplayValue('');
});

it('retains the DC scheme, yearly wages, balance and statement date across route remounts', async () => {
  const route = (showCalculator: boolean) => <CalculatorSessionProvider>{showCalculator ? <CalculatorScreen /> : null}</CalculatorSessionProvider>;
  const view = await render(route(true));
  await fireEvent.press(screen.getByRole('radio', { name: 'DC Defined contribution pension' }));
  await enterWages();
  await fireEvent.changeText(screen.getAllByLabelText('Gross wages earned', { exact: false })[0], '18000000.123456');
  await fireEvent.changeText(screen.getByLabelText(/Reported DC account balance/), '12000000.50');
  await fireEvent.changeText(screen.getByLabelText('Statement date'), '2025-12-31');
  await view.rerender(route(false));
  await view.rerender(route(true));
  expect(screen.getByRole('radio', { name: 'DC Defined contribution pension' })).toBeChecked();
  expect(screen.getAllByLabelText('Gross wages earned', { exact: false })[0]).toHaveDisplayValue('18000000.123456');
  expect(screen.getByLabelText(/Reported DC account balance/)).toHaveDisplayValue('12000000.50');
  expect(screen.getByLabelText('Statement date')).toHaveDisplayValue('2025-12-31');
  expect(getContext).toHaveBeenCalledTimes(1);
});

const stepLabel = (current: number) => `${i18n.t('stepOf', { current, total: 3 })}: ${i18n.t(['employment', 'wages', 'review'][current - 1])}`;

it('asks before a plan switch discards entered wages and honours both answers', async () => {
  await renderCalculator();
  await enterWages();
  const basePay = () => screen.queryAllByLabelText(i18n.t('basePay'), { exact: false });
  const normalRadio = () => screen.getByRole('radio', { name: 'Normal Standard severance pay' });
  expect(basePay()).toHaveLength(2);

  await fireEvent.press(screen.getByRole('radio', { name: 'DB Defined benefit pension' }));
  expect(screen.getByText(i18n.t('planChangeBody'))).toBeOnTheScreen();
  expect(basePay()).toHaveLength(2);
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('keepPlan') }));
  expect(normalRadio()).toBeChecked();
  expect(basePay()).toHaveLength(2);

  await fireEvent.press(screen.getByRole('radio', { name: 'DB Defined benefit pension' }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('changePlan') }));
  expect(screen.getByRole('radio', { name: 'DB Defined benefit pension' })).toBeChecked();
  expect(basePay()).toHaveLength(0);
  expect(screen.getByLabelText('First working day')).toBeOnTheScreen();
});

it('shows offline guidance when the request cannot reach the API', async () => {
  jest.mocked(getContext).mockRejectedValue(new ApiFailure([], 'offline'));
  await renderCalculator();
  await fireEvent.changeText(screen.getByLabelText('First working day'), '2014-10-02');
  await fireEvent.changeText(screen.getByLabelText('Last working day'), '2017-09-15');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to wages' }));
  expect(screen.getByText(i18n.t('offline'))).toBeOnTheScreen();
  expect(screen.getByLabelText('First working day')).toHaveDisplayValue('2014-10-02');
});

it('announces the current step and only marks steps the journey reached', async () => {
  await renderCalculator();
  expect(screen.getByLabelText(stepLabel(1))).toBeOnTheScreen();
  await enterWages();
  expect(screen.getByLabelText(stepLabel(2))).toBeOnTheScreen();
  // Employment is complete; Wages and Review are still ahead, not ticked.
  expect(screen.getAllByText('✓')).toHaveLength(1);
});

it('never marks wages or review complete when the outcome is ineligible', async () => {
  const ineligible = { ...context, eligibility: { status: 'ineligible' as const, reasons: ['SERVICE_UNDER_ONE_YEAR'] } };
  jest.mocked(getContext).mockResolvedValue(ineligible);
  jest.mocked(calculate).mockResolvedValue({
    method: 'normal', status: 'ineligible', rulesVersion: '2026.10.24.1', verifiedOn: '2026-10-24',
    sources: [], warnings: [], rounding: 'floor', context: ineligible, result: null,
  } as unknown as Calculation);
  await renderCalculator();
  await fireEvent.changeText(screen.getByLabelText('First working day'), '2014-10-02');
  await fireEvent.changeText(screen.getByLabelText('Last working day'), '2017-09-15');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to wages' }));
  expect(screen.getByLabelText(stepLabel(3))).toBeOnTheScreen();
  // Only Employment was completed; the skipped Wages and Review steps stay unmarked.
  expect(screen.getAllByText('✓')).toHaveLength(1);
  expect(screen.getByText(i18n.t('reasons.SERVICE_UNDER_ONE_YEAR'))).toBeOnTheScreen();
});

it('gives every wage period and DC year its own accessible field label', async () => {
  await renderCalculator();
  await enterWages();
  for (const [start, end] of [['16 Jun 2017', '30 Jun 2017'], ['1 Jul 2017', '31 Jul 2017']]) {
    expect(screen.getByLabelText(`${i18n.t('basePay')} · ${start} — ${end}`)).toBeOnTheScreen();
    expect(screen.getByLabelText(`${i18n.t('allowances')} · ${start} — ${end}`)).toBeOnTheScreen();
  }

  await renderCalculator();
  await fireEvent.press(screen.getByRole('radio', { name: 'DC Defined contribution pension' }));
  await enterWages();
  expect(screen.getByLabelText(`${i18n.t('yearWages')} · 2024`)).toBeOnTheScreen();
  expect(screen.getByLabelText(`${i18n.t('yearWages')} · 2025`)).toBeOnTheScreen();
});
