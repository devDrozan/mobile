import { koreaToday } from '../src/calendar-date';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import i18n from '../src/i18n';
import ExpensesScreen from '../src/modules/expenses/ExpensesScreen';
import { ExpenseSessionProvider } from '../src/modules/expenses/session';
import { normalizeEntry, type ExpenseEntry } from '../src/modules/expenses/model';
import * as storage from '../src/modules/expenses/storage';
jest.mock('../src/components/useRouteHeadingFocus', () => ({ useRouteHeadingFocus: () => ({ current: null }) }));
jest.mock('expo-router', () => ({ usePathname: () => '/expenses', router: { navigate: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../src/modules/expenses/storage', () => ({ loadMonth: jest.fn(), saveEntry: jest.fn(), deleteEntry: jest.fn(), deleteMonth: jest.fn(), deleteAll: jest.fn() }));
const load = jest.mocked(storage.loadMonth), save = jest.mocked(storage.saveEntry);
let stored: ExpenseEntry[], acknowledged: boolean;
beforeEach(async () => {
  jest.clearAllMocks(); await AsyncStorage.clear(); stored = []; acknowledged = false; await i18n.changeLanguage('en');
  load.mockImplementation(async month => ({ entries: stored.filter(row => row.date.startsWith(`${month}-`)), consented: acknowledged }));
  save.mockImplementation(async entry => { const value = normalizeEntry(entry); stored = [...stored.filter(row => row.id !== value.id), value]; acknowledged = true; return value; });
  jest.mocked(storage.deleteEntry).mockImplementation(async id => { stored = stored.filter(row => row.id !== id); });
  jest.mocked(storage.deleteMonth).mockImplementation(async month => { stored = stored.filter(row => !row.date.startsWith(`${month}-`)); });
  jest.mocked(storage.deleteAll).mockImplementation(async () => { stored = []; acknowledged = false; });
});
async function ready() { const view = await render(<ExpenseSessionProvider><ExpensesScreen /></ExpenseSessionProvider>); await waitFor(() => expect(screen.queryByText(i18n.t('expenses.loading'))).toBeNull()); return view; }
const date = (day = '07') => `${load.mock.calls.at(-1)![0]}-${day}`;
async function close() { if (screen.queryByLabelText(i18n.t('expenses.closeForm'))) await fireEvent.press(screen.getByLabelText(i18n.t('expenses.closeForm'))); }
async function add() { if (!screen.queryByTestId('expense-form')) await fireEvent.press(screen.getByLabelText(i18n.t('expenses.addEntry'))); }
async function select(day = '07') { await close(); await fireEvent.press(screen.getByTestId(`expense-day-${date(day)}`)); await add(); }
async function fill(description = 'Synthetic lunch', amount = '123456789012345.000001') {
  await add();
  await fireEvent.changeText(screen.getByLabelText(i18n.t('expenses.description')), description);
  await fireEvent.changeText(screen.getByLabelText(`${i18n.t('expenses.amount')} (KRW)`), amount);
}
async function submit() { await fireEvent.press(screen.getByLabelText(i18n.t('expenses.saveEntry'))); }
const checkbox = () => screen.getByRole('checkbox');
it('opens a selected date and acknowledges only after a successful save; failed writes preserve inputs', async () => {
  await ready(); expect(screen.queryByTestId('expense-form')).toBeNull();
  expect(checkbox().props.accessibilityState).toMatchObject({ checked: false, disabled: true });
  await select(); await fill(); save.mockRejectedValueOnce(new Error('disk full')); await submit();
  await waitFor(() => expect(screen.getByText(i18n.t('expenses.saveFailed'))).toBeTruthy());
  expect(checkbox().props.accessibilityState).toMatchObject({ checked: false });
  expect(screen.getByLabelText('Description').props.value).toBe('Synthetic lunch');
  await submit(); await waitFor(() => expect(screen.queryByRole('checkbox')).toBeNull());
  expect(screen.getByTestId('expense-daily-total')).toHaveTextContent('Daily total: 123,456,789,012,345.000001 KRW');
  expect(screen.getByTestId(`expense-day-${date()}`).props.accessibilityLabel).toContain('123456789012345.000001');
  await fireEvent.press(screen.getByLabelText('Edit expense: Synthetic lunch'));
  expect(screen.getByLabelText('Amount (KRW)').props.value).toBe('123456789012345.000001');
});
it('updates daily totals after add, edit and confirmed deletion without mixing dates', async () => {
  await ready(); await select(); await fill('One', '0.1'); await submit();
  await waitFor(() => expect(stored).toHaveLength(1));
  await fill('Two', '0.2'); await submit(); await waitFor(() => expect(stored).toHaveLength(2));
  expect(screen.getByTestId('expense-daily-total')).toHaveTextContent('Daily total: 0.3 KRW');
  await select('08'); expect(screen.queryByLabelText('Edit expense: One')).toBeNull();
  await fill('Draft on eight', '4'); await select(); await fill('Draft on seven', '5'); await select('08');
  expect(screen.getByLabelText('Description').props.value).toBe('Draft on eight');
  await select(); expect(screen.getByLabelText('Description').props.value).toBe('Draft on seven');
  const confirmation = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await close(); await fireEvent.press(screen.getByLabelText('Edit expense: One'));
  await act(async () => { confirmation.mock.calls.at(-1)?.[2]?.find(action => action.style === 'destructive')?.onPress?.(); });
  await fill('One', '1.1'); await submit();
  await waitFor(() => expect(screen.getByTestId('expense-daily-total')).toHaveTextContent('Daily total: 1.3 KRW'));
  await fireEvent.press(screen.getByLabelText('Delete expense: One')); expect(storage.deleteEntry).not.toHaveBeenCalled();
  await act(async () => { confirmation.mock.calls.at(-1)?.[2]?.find(action => action.style === 'destructive')?.onPress?.(); });
  await waitFor(() => expect(screen.getByTestId('expense-daily-total')).toHaveTextContent('Daily total: 0.2 KRW'));
  await fireEvent.press(screen.getByLabelText('Delete all expenses'));
  await act(async () => { confirmation.mock.calls.at(-1)?.[2]?.find(action => action.style === 'destructive')?.onPress?.(); });
  await waitFor(() => expect(screen.queryByRole('checkbox')).toBeNull());
  confirmation.mockRestore();
});
it('recovers read failures and preserves date drafts through month and screen switches', async () => {
  load.mockRejectedValueOnce(new Error('denied')); const view = await ready();
  expect(screen.getByTestId(`expense-day-${date()}`)).toBeDisabled();
  await fireEvent.press(screen.getByLabelText('Retry loading expenses'));
  await waitFor(() => expect(screen.getByTestId(`expense-day-${date()}`)).not.toBeDisabled());
  await select(); await fill(); await close(); await fireEvent.press(screen.getByLabelText('Next expense month'));
  await waitFor(() => expect(screen.queryByText(i18n.t('expenses.loading'))).toBeNull());
  expect(screen.queryByTestId('expense-form')).toBeNull(); await select(); await fill('Next month', '2');
  await close(); await fireEvent.press(screen.getByLabelText('Previous expense month'));
  await waitFor(() => expect(screen.queryByText(i18n.t('expenses.loading'))).toBeNull()); await add();
  await waitFor(() => expect(screen.getByLabelText('Description').props.value).toBe('Synthetic lunch'));
  await view.rerender(<ExpenseSessionProvider>{null}</ExpenseSessionProvider>);
  await view.rerender(<ExpenseSessionProvider><ExpensesScreen /></ExpenseSessionProvider>);
  await waitFor(() => expect(screen.queryByText(i18n.t('expenses.loading'))).toBeNull()); await add();
  expect(screen.getByLabelText('Save expense')).not.toBeDisabled();
  expect(screen.getByLabelText('Description').props.value).toBe('Synthetic lunch');
});
it('cleans the shared date draft when a pending save completes across screen switches', async () => {
  let finish!: () => void; const gate = new Promise<void>(resolve => { finish = resolve; });
  save.mockImplementationOnce(async entry => { await gate; const value = normalizeEntry(entry); stored = [value]; acknowledged = true; return value; });
  const view = await ready(); await select(); await fill(); await submit();
  await view.rerender(<ExpenseSessionProvider>{null}</ExpenseSessionProvider>);
  await view.rerender(<ExpenseSessionProvider><ExpensesScreen /></ExpenseSessionProvider>);
  expect(screen.getByText(i18n.t('expenses.loading'))).toBeTruthy(); await act(async () => { finish(); });
  await waitFor(() => expect(screen.queryByText(i18n.t('expenses.loading'))).toBeNull());
  expect(screen.getByTestId('expense-daily-total')).toHaveTextContent('Daily total: 123,456,789,012,345.000001 KRW');
  await add(); expect(screen.getByLabelText('Description').props.value).toBe('');
});
it('shows Burmese calendar and field errors without saving or checking acknowledgement', async () => {
  await i18n.changeLanguage('my'); await ready(); await select(); await fill(' ', '0'); await submit();
  expect(screen.getByText(i18n.t('expenses.invalidDescription'))).toBeTruthy();
  expect(screen.getByText(i18n.t('expenses.invalidAmount'))).toBeTruthy(); expect(save).not.toHaveBeenCalled();
  expect(checkbox().props.accessibilityState).toMatchObject({ checked: false });
});

it('initially highlights today in Korea without opening a data-entry popup', async () => {
  await ready();
  expect(screen.getByTestId(`expense-day-${koreaToday()}`).props.accessibilityState.selected).toBe(true);
  expect(screen.queryByLabelText(i18n.t('expenses.closeForm'))).toBeNull();
});
