import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Calculation } from '../src/api/client';
import i18n from '../src/i18n';
import { Result } from '../src/components/Result';
import { Button } from '../src/components/ui';

jest.mock('expo-router', () => ({ usePathname: () => '/', router: { navigate: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

function dcResult(balance: string): Calculation {
  return {
    method: 'dc', status: 'eligible', rulesVersion: '2026.10.24.1', verifiedOn: '2026-10-24',
    sources: [], warnings: ['DC_BALANCE_SEPARATE'], rounding: 'floor',
    context: {
      method: 'dc', retirementDate: '2026-01-01', employmentDays: 365,
      lookbackStart: '2025-10-01', lookbackDays: 92,
      eligibility: { status: 'eligible', reasons: [] }, wagePeriods: [],
      dcPeriods: [{ year: 2025, startDate: '2025-01-01', endDate: '2025-12-31' }],
    },
    result: {
      kind: 'dc', requiredContributionKrw: '2500000', rawContributionKrw: '2500000',
      totalWagesKrw: '30000000', years: [{ year: 2025, wagesKrw: '30000000', contributionKrw: '2500000' }],
      reportedBalance: { amount: balance, asOf: '2026-10-24' },
    },
  };
}

beforeEach(async () => { await act(() => i18n.changeLanguage('en')); });

it.each([
  ['en', '12000000.50', '₩12,000,000.50'],
  ['my', '12000000.50', '₩12,000,000.50'],
  ['en', '999999999999999.123456', '₩999,999,999,999,999.123456'],
  ['my', '0.000000', '₩0.000000'],
])('preserves the reported balance exactly in %s (%s)', async (language, amount, displayed) => {
  await act(() => i18n.changeLanguage(language));
  await render(<Result value={dcResult(amount)} />);
  expect(screen.getByText(displayed)).toBeOnTheScreen();
});

it.each(['Calculate my estimate', 'ခန့်မှန်းငွေတွက်ရန်'])('keeps the loading action named and prevents repeat submission: %s', async title => {
  const onPress = jest.fn();
  const view = await render(<Button title={title} onPress={onPress} />);
  expect(screen.getByRole('button', { name: title })).toBeEnabled();

  await view.rerender(<Button title={title} onPress={onPress} busy />);
  const loading = screen.getByRole('button', { name: title });
  expect(loading).toBeDisabled();
  expect(loading).toHaveProp('accessibilityState', { disabled: true, busy: true });
  expect(screen.getByText(title)).toBeOnTheScreen();
  await fireEvent.press(loading);
  expect(onPress).not.toHaveBeenCalled();
});
