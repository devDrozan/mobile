import { fireEvent, render, screen, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import '../src/i18n';
import i18n from '../src/i18n';
import WorkSalaryScreen from '../src/modules/work/WorkSalaryScreen';
import { emptyMonth, type SalaryInput, type SalaryResult } from '../src/modules/work/model';
import * as storage from '../src/modules/work/storage';
import { estimateSalary } from '../src/api/client';
jest.mock('../src/components/useRouteHeadingFocus', () => ({ useRouteHeadingFocus: () => ({ current: null }) }));
jest.mock('expo-router', () => ({ usePathname: () => '/work', router: { navigate: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../src/modules/work/storage', () => ({ loadMonth: jest.fn(), saveMonth: jest.fn(), deleteMonth: jest.fn(), deleteAll: jest.fn() }));
jest.mock('../src/api/client', () => ({ estimateSalary: jest.fn(), ApiFailure: class extends Error { issues = []; } }));
const load = jest.mocked(storage.loadMonth), save = jest.mocked(storage.saveMonth), calculate = jest.mocked(estimateSalary);
const response: SalaryResult = { month: '2026-11', currency: 'KRW', formulaVersion: 'salary-user-rates-1', rounding: 'FLOOR_ONCE_TO_WHOLE_KRW', assumptions: [], hours: { normal: '0', weekdayOvertime: '0', saturday: '0', sunday: '0', night: '0' }, components: { base: '2000000', weekdayOvertime: '0', saturday: '0', sunday: '0', night: '0' }, rawAmountKrw: '2000000', amountKrw: '2000000' };
beforeEach(async () => {
  jest.clearAllMocks(); await i18n.changeLanguage('en');
  load.mockImplementation(async month => ({ draft: emptyMonth(month), consented: false }));
  save.mockResolvedValue(); calculate.mockResolvedValue(response);
});
async function ready() { await render(<WorkSalaryScreen />); await waitFor(() => expect(screen.queryByText('Loading local records…')).toBeNull()); }
it('requires disclosure and preserves a draft on save failure', async () => {
  await ready();
  await fireEvent.changeText(screen.getByLabelText('Basic monthly salary (KRW)'), '2000000.50');
  await fireEvent.press(screen.getByLabelText('Save this month on device'));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByText('Accept the storage and submission disclosure first.')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('I understand local storage and selected-month submission.'));
  save.mockRejectedValueOnce(new Error('storage'));
  await fireEvent.press(screen.getByLabelText('Save this month on device'));
  await waitFor(() => expect(screen.getByText('Local storage failed. Your draft is retained. Retry loading or saving.')).toBeTruthy());
  expect(screen.getByLabelText('Basic monthly salary (KRW)').props.value).toBe('2000000.50');
  await fireEvent.press(screen.getByLabelText('Save this month on device'));
  await waitFor(() => expect(screen.getByText('Month saved on this device.')).toBeTruthy());
  expect(save.mock.calls[1][0].settings.basicSalary).toBe('2000000.50');
});
it('ignores an outdated estimate after a draft edit and retries', async () => {
  let resolve!: (result: SalaryResult) => void;
  calculate.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await ready(); await fireEvent.press(screen.getByLabelText('I understand local storage and selected-month submission.'));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await fireEvent.changeText(screen.getByLabelText('Basic monthly salary (KRW)'), '4000000');
  await act(async () => { resolve(response); });
  expect(screen.queryByText('2,000,000 KRW')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await waitFor(() => expect(screen.getByText('2,000,000 KRW')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Overtime work hours'), '2.5');
  expect(screen.queryByText('2,000,000 KRW')).toBeNull();
});
it('keeps month drafts isolated and requires confirmation before deletion', async () => {
  const confirm = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await ready(); await fireEvent.changeText(screen.getByLabelText('Basic monthly salary (KRW)'), '1234');
  await fireEvent.press(screen.getByLabelText('Next month'));
  await waitFor(() => expect(screen.getByLabelText('Basic monthly salary (KRW)').props.value).toBe('0'));
  await fireEvent.press(screen.getByLabelText('Previous month'));
  await waitFor(() => expect(screen.getByLabelText('Basic monthly salary (KRW)').props.value).toBe('1234'));
  await fireEvent.press(screen.getByLabelText('Delete selected month'));
  expect(confirm).toHaveBeenCalled(); expect(storage.deleteMonth).not.toHaveBeenCalled();
  confirm.mockRestore();
});
it('shows Burmese labels and blocks unsafe hour combinations', async () => {
  await i18n.changeLanguage('my'); await ready();
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.normalHours')), '24');
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.overtimeHours')), '0.01');
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.saveMonth')));
  expect(screen.getByText(i18n.t('salary.errors.DAILY_HOURS_EXCEEDED'))).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});
it('preserves entered values on a failed calculation and supports explicit retry', async () => {
  calculate.mockRejectedValueOnce(new Error('offline'));
  await ready(); await fireEvent.press(screen.getByLabelText('I understand local storage and selected-month submission.'));
  await fireEvent.changeText(screen.getByLabelText('Basic monthly salary (KRW)'), '2000000');
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await waitFor(() => expect(screen.getByText('Could not calculate. Your entries are retained; check internet and tap Calculate again.')).toBeTruthy());
  expect(screen.getByLabelText('Basic monthly salary (KRW)').props.value).toBe('2000000');
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await waitFor(() => expect(screen.getByText('2,000,000 KRW')).toBeTruthy());
});

it('blocks month navigation until persisted records finish loading', async () => {
  let resolve!: (value: { draft: SalaryInput; consented: boolean }) => void;
  load.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await render(<WorkSalaryScreen />);
  const next = screen.getByRole('button', { name: 'Next month' });
  const previous = screen.getByRole('button', { name: 'Previous month' });
  expect(next).toBeDisabled(); expect(previous).toBeDisabled();
  await fireEvent.press(next); await fireEvent.press(previous);
  expect(load).toHaveBeenCalledTimes(1);
  const saved = emptyMonth(load.mock.calls[0][0]); saved.settings.basicSalary = '2500000.50';
  await act(async () => { resolve({ draft: saved, consented: true }); });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next month' })).not.toBeDisabled());
  expect(screen.getByLabelText('Basic monthly salary (KRW)').props.value).toBe('2500000.50');
});
