import { koreaToday } from '../src/calendar-date';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, act, within } from '@testing-library/react-native';
import { AccessibilityInfo, Alert, Keyboard, ScrollView } from 'react-native';
import '../src/i18n';
import i18n from '../src/i18n';
import WorkSalaryScreen from '../src/modules/work/WorkSalaryScreen';
import { SalaryDraftSessionProvider } from '../src/modules/work/session';
import { emptyMonth, type SalaryInput, type SalaryResult } from '../src/modules/work/model';
import * as storage from '../src/modules/work/storage';
import { estimateSalary, ApiFailure } from '../src/api/client';
jest.mock('../src/components/useRouteHeadingFocus', () => ({ useRouteHeadingFocus: () => ({ current: null }) }));
jest.mock('expo-router', () => ({ usePathname: () => '/work', router: { navigate: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../src/modules/work/storage', () => ({ loadMonth: jest.fn(), saveMonth: jest.fn(), deleteMonth: jest.fn(), deleteAll: jest.fn(), loadLeave: jest.fn(), saveLeave: jest.fn() }));
jest.mock('../src/api/client', () => ({
  estimateSalary: jest.fn(),
  ApiFailure: class extends Error {
    issues: { field: string; code: string }[];
    kind: string;
    constructor(issues: { field: string; code: string }[] = [], kind = issues.length ? 'invalid' : 'unavailable') { super('API_REQUEST_FAILED'); this.issues = issues; this.kind = kind; }
  },
}));
const load = jest.mocked(storage.loadMonth), save = jest.mocked(storage.saveMonth), calculate = jest.mocked(estimateSalary);
const loadLeave = jest.mocked(storage.loadLeave), saveLeave = jest.mocked(storage.saveLeave);
const response: SalaryResult = { month: '2026-11', currency: 'KRW', formulaVersion: 'salary-user-rates-1', rounding: 'FLOOR_ONCE_TO_WHOLE_KRW', assumptions: [], hours: { normal: '0', weekdayOvertime: '0', saturday: '0', sunday: '0', night: '0' }, components: { base: '2000000', weekdayOvertime: '0', saturday: '0', sunday: '0', night: '0' }, rawAmountKrw: '2000000', amountKrw: '2000000' };
beforeEach(async () => {
  jest.clearAllMocks(); await AsyncStorage.clear(); await i18n.changeLanguage('en');
  load.mockImplementation(async month => ({ draft: emptyMonth(month), consented: false }));
  save.mockResolvedValue(); calculate.mockResolvedValue(response);
  loadLeave.mockResolvedValue(null); saveLeave.mockResolvedValue();
});
afterEach(() => { jest.restoreAllMocks(); });
function controlledFrames() {
  let nextId = 0;
  const pending = new Map<number, Parameters<typeof requestAnimationFrame>[0]>();
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => { pending.set(++nextId, callback); return nextId; });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(id => { if (id != null) pending.delete(id); });
  return async () => { await act(() => { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(0)); }); };
}
const layoutAt = (y: number) => ({ nativeEvent: { layout: { x: 0, y, width: 320, height: 240 } } });
async function ready() { await render(<WorkSalaryScreen />); await waitFor(() => expect(screen.queryByText('Loading local records…')).toBeNull()); }
it('requires disclosure and preserves a draft on save failure', async () => {
  await ready();
  await fireEvent.changeText(screen.getByLabelText('Basic monthly salary (KRW)'), '2000000.50');
  await fireEvent.press(screen.getByLabelText('Save this month on device'));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByText('Accept the storage and submission disclosure first.')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
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
  await ready(); await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await fireEvent.changeText(screen.getByLabelText('Basic monthly salary (KRW)'), '4000000');
  await act(async () => { resolve(response); });
  expect(screen.queryByText('2,000,000 KRW')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await waitFor(() => expect(screen.getByText('2,000,000 KRW')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.openDay')));
  await fireEvent.changeText(screen.getByLabelText('Overtime work hours'), '2.5');
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.saveDay')));
  await waitFor(() => expect(screen.queryByLabelText(i18n.t('salary.saveDay'))).toBeNull());
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
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.openDay')));
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.normalHours')), '24');
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.overtimeHours')), '0.01');
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.saveDay')));
  expect(screen.getByText(i18n.t('salary.errors.DAILY_HOURS_EXCEEDED'))).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});
it('preserves entered values on a failed calculation and supports explicit retry', async () => {
  calculate.mockRejectedValueOnce(new Error('offline'));
  await ready(); await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
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

it('answers a Calculate tap beside the button when consent is missing', async () => {
  await ready();
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  expect(calculate).not.toHaveBeenCalled();
  const summary = screen.getByTestId('salary-summary');
  expect(within(summary).getByText('Accept the storage and submission disclosure first.')).toBeTruthy();
  expect(screen.getAllByText('Accept the storage and submission disclosure first.')).toHaveLength(1);
});

it('answers a failed calculation beside the button and reveals the retry', async () => {
  calculate.mockRejectedValueOnce(new Error('offline'));
  await ready();
  await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  const message = 'Could not calculate. Your entries are retained; check internet and tap Calculate again.';
  await waitFor(() => expect(within(screen.getByTestId('salary-summary')).getByText(message)).toBeTruthy());
  expect(screen.getAllByText(message)).toHaveLength(1);
});

it('waits for late result layout and scrolls to the result instead of the summary heading', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  const flushFrame = controlledFrames();
  await ready();
  await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
  await fireEvent(screen.getByTestId('salary-summary'), 'layout', layoutAt(900));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await waitFor(() => expect(screen.getByText('2,000,000 KRW')).toBeTruthy());
  await flushFrame();
  expect(scrollTo).not.toHaveBeenCalled();
  await fireEvent(screen.getByTestId('salary-result'), 'layout', layoutAt(240));
  await flushFrame();
  expect(scrollTo).toHaveBeenCalledWith({ y: 1128, animated: expect.any(Boolean) });
});

it('keeps the reveal pending when the summary layout arrives after the result layout', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  const flushFrame = controlledFrames();
  await ready();
  await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await waitFor(() => expect(screen.getByTestId('salary-result')).toBeTruthy());
  await fireEvent(screen.getByTestId('salary-result'), 'layout', layoutAt(180));
  await flushFrame();
  expect(scrollTo).not.toHaveBeenCalled();
  await fireEvent(screen.getByTestId('salary-summary'), 'layout', layoutAt(1000));
  await flushFrame();
  expect(scrollTo).toHaveBeenCalledWith({ y: 1168, animated: expect.any(Boolean) });
});

it('dismisses the keyboard only after inputs and disclosure pass validation', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  await ready();
  await fireEvent.changeText(screen.getByLabelText('Basic monthly salary (KRW)'), 'bad');
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  expect(dismiss).not.toHaveBeenCalled(); expect(calculate).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Basic monthly salary (KRW)'), '2000000');
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  expect(dismiss).not.toHaveBeenCalled(); expect(calculate).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(dismiss.mock.invocationCallOrder[0]).toBeLessThan(calculate.mock.invocationCallOrder[0]);
});

it('reveals calculation failures beside the retry button even after late summary layout and retries', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  const flushFrame = controlledFrames();
  calculate.mockRejectedValue(new ApiFailure([], 'offline'));
  await ready();
  await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await flushFrame();
  expect(scrollTo).not.toHaveBeenCalled();
  await fireEvent(screen.getByTestId('salary-summary'), 'layout', layoutAt(900));
  await flushFrame();
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 888, animated: expect.any(Boolean) });
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await flushFrame();
  expect(scrollTo).toHaveBeenCalledTimes(2);
});

it('cancels outdated result reveals after editing and on unmount', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  const flushFrame = controlledFrames();
  await ready();
  await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
  await fireEvent(screen.getByTestId('salary-summary'), 'layout', layoutAt(900));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await fireEvent(screen.getByTestId('salary-result'), 'layout', layoutAt(200));
  const obsoleteLayout = screen.getByTestId('salary-result').props.onLayout;
  await fireEvent.changeText(screen.getByLabelText('Basic monthly salary (KRW)'), '4000000');
  await act(() => obsoleteLayout(layoutAt(200)));
  await flushFrame();
  expect(scrollTo).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await fireEvent(screen.getByTestId('salary-result'), 'layout', layoutAt(300));
  await screen.unmount();
  await flushFrame();
  expect(scrollTo).not.toHaveBeenCalled();
});

it('uses static scrolling when the reduced-motion preference cannot be read', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValueOnce(new Error('preference unavailable'));
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  const flushFrame = controlledFrames();
  await ready();
  await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
  await fireEvent(screen.getByTestId('salary-summary'), 'layout', layoutAt(900));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await fireEvent(screen.getByTestId('salary-result'), 'layout', layoutAt(200));
  await flushFrame();
  expect(scrollTo).toHaveBeenCalledWith({ y: 1088, animated: false });
});

it('separates an unreachable API from an API error response', async () => {
  const summary = () => screen.getByTestId('salary-summary');
  await ready();
  await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
  calculate.mockRejectedValueOnce(new ApiFailure([], 'offline'));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await waitFor(() => expect(within(summary()).getByText('Could not reach the salary API. Your entries are retained; check the internet connection and that the API is running, then tap Calculate again.')).toBeTruthy());
  calculate.mockRejectedValueOnce(new ApiFailure([], 'server'));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await waitFor(() => expect(within(summary()).getByText('The salary API could not complete the request. Your entries are retained; tap Calculate again shortly.')).toBeTruthy());
  calculate.mockRejectedValueOnce(new ApiFailure([], 'unavailable'));
  await fireEvent.press(screen.getByLabelText('Calculate / Retry estimate'));
  await waitFor(() => expect(within(summary()).getByText('This build has no reachable salary API address. Set EXPO_PUBLIC_API_BASE_URL to the API origin and rebuild.')).toBeTruthy());
});


it('retains unsaved salary inputs after leaving and reopening the tool', async () => {
  const view = await render(<SalaryDraftSessionProvider><WorkSalaryScreen /></SalaryDraftSessionProvider>);
  await waitFor(() => expect(screen.queryByText('Loading local records…')).toBeNull());
  await fireEvent.changeText(screen.getByLabelText('Basic monthly salary (KRW)'), '98765.432100');
  await view.rerender(<SalaryDraftSessionProvider>{null}</SalaryDraftSessionProvider>);
  await view.rerender(<SalaryDraftSessionProvider><WorkSalaryScreen /></SalaryDraftSessionProvider>);
  await waitFor(() => expect(screen.queryByText('Loading local records…')).toBeNull());
  expect(screen.getByLabelText('Basic monthly salary (KRW)').props.value).toBe('98765.432100');
});

it('collapses pay settings only after successful explicit save and restores exact values with Edit', async () => {
  await ready();
  await fireEvent.changeText(screen.getByLabelText('Basic monthly salary (KRW)'), '2000000.50');
  await fireEvent.press(screen.getByLabelText('Save pay settings'));
  expect(save).not.toHaveBeenCalled(); expect(screen.getByLabelText('Basic monthly salary (KRW)')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('I understand local storage and calculation API submission.'));
  save.mockRejectedValueOnce(new Error('disk full'));
  await fireEvent.press(screen.getByLabelText('Save pay settings'));
  await waitFor(() => expect(screen.getByText('Local storage failed. Your draft is retained. Retry loading or saving.')).toBeTruthy());
  expect(screen.getByLabelText('Basic monthly salary (KRW)').props.value).toBe('2000000.50');
  await fireEvent.press(screen.getByLabelText('Save pay settings'));
  await waitFor(() => expect(screen.getByLabelText('Edit pay settings')).toBeTruthy());
  expect(screen.queryByLabelText('Basic monthly salary (KRW)')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Next month'));
  await waitFor(() => expect(screen.getByLabelText('Basic monthly salary (KRW)')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Previous month'));
  await waitFor(() => expect(screen.getByLabelText('Edit pay settings')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Edit pay settings'));
  expect(screen.getByLabelText('Basic monthly salary (KRW)').props.value).toBe('2000000.50');
  expect(screen.getByLabelText('Normal hourly rate (reference only) (KRW)')).toBeTruthy();
});
it('reopens collapsed pay settings for server field errors and supports Burmese controls', async () => {
  await i18n.changeLanguage('my'); await ready();
  await fireEvent.press(screen.getByLabelText(i18n.t('localData.accept')));
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.saveSettings')));
  await waitFor(() => expect(screen.getByLabelText(i18n.t('salary.editSettings'))).toBeTruthy());
  calculate.mockRejectedValueOnce(new ApiFailure([{ field: 'settings.basicSalary', code: 'INVALID_AMOUNT' }]));
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.calculate')));
  await waitFor(() => expect(screen.getByLabelText(`${i18n.t('salary.basicSalary')} (KRW)`)).toBeTruthy());
  expect(screen.queryByLabelText(i18n.t('salary.editSettings'))).toBeNull();
});

it('opens date hours in a popup, saves offline locally, and reviews or edits the saved day', async () => {
  await ready(); await fireEvent.press(screen.getByLabelText(i18n.t('localData.accept')));
  const date = `${load.mock.calls[0][0]}-07`;
  await fireEvent.press(screen.getByTestId(`salary-day-${date}`));
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.normalHours')), '8.25');
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.overtimeHours')), '2');
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.nightHours')), '1.5');
  save.mockRejectedValueOnce(new Error('disk full'));
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.saveDay')));
  await waitFor(() => expect(screen.getByText(i18n.t('salary.storageFailed'))).toBeTruthy());
  expect(screen.getByLabelText(i18n.t('salary.normalHours')).props.value).toBe('8.25');
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.saveDay')));
  await waitFor(() => expect(screen.queryByLabelText(i18n.t('salary.saveDay'))).toBeNull());
  expect(save.mock.calls.at(-1)![0].entries).toEqual([{ date, normalHours: '8.25', overtimeHours: '2', nightHours: '1.5' }]);
  expect(calculate).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId(`salary-day-${date}`));
  expect(screen.getByLabelText(i18n.t('salary.editDay'))).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.editDay')));
  expect(screen.getByLabelText(i18n.t('salary.normalHours')).props.value).toBe('8.25');
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.normalHours')), '9');
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.closeDay')));
  await fireEvent.press(screen.getByTestId(`salary-day-${date}`));
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.editDay')));
  expect(screen.getByLabelText(i18n.t('salary.normalHours')).props.value).toBe('8.25');
});

it('tracks annual leave by year and saves a non-working date as paid leave', async () => {
  await ready();
  const month = load.mock.calls[0][0];
  const year = Number(month.slice(0, 4));
  const date = `${month}-07`;
  await fireEvent.press(screen.getByLabelText(i18n.t('localData.accept')));
  await fireEvent.press(screen.getByRole('radio', { name: i18n.t('salary.leave.yes') }));
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.leave.days', { year })), '15');
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.leave.save')));
  await waitFor(() => expect(saveLeave).toHaveBeenCalledWith(expect.objectContaining({ year, policy: 'yes', entitlementDays: '15' })));
  expect(screen.getByText(i18n.t('salary.leave.used', { used: 0 }))).toBeTruthy();
  expect(screen.getByText(i18n.t('salary.leave.remaining', { remaining: '15' }))).toBeTruthy();
  await fireEvent.press(screen.getByTestId(`salary-day-${date}`));
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.leave.dayToggle')));
  expect(screen.queryByLabelText(i18n.t('salary.normalHours'))).toBeNull();
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.saveDay')));
  await waitFor(() => expect(screen.queryByLabelText(i18n.t('salary.saveDay'))).toBeNull());
  expect(save.mock.calls.at(-1)![1]).toEqual(expect.objectContaining({ year, policy: 'yes', dates: [date] }));
  expect(screen.getByText(i18n.t('salary.leave.used', { used: 1 }))).toBeTruthy();
  expect(screen.getByText(i18n.t('salary.leave.remaining', { remaining: '14' }))).toBeTruthy();
});

it('hides leave inputs for No and shows the eligibility guide for Not sure', async () => {
  await ready();
  const year = Number(load.mock.calls[0][0].slice(0, 4));
  await fireEvent.press(screen.getByRole('radio', { name: i18n.t('salary.leave.no') }));
  expect(screen.queryByLabelText(i18n.t('salary.leave.days', { year }))).toBeNull();
  expect(screen.getByText(i18n.t('salary.leave.noNotice'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: i18n.t('salary.leave.unsure') }));
  expect(screen.queryByLabelText(i18n.t('salary.leave.days', { year }))).toBeNull();
  expect(screen.getByText(i18n.t('salary.leave.unsureGuide'))).toBeTruthy();
});

it('normalizes clock time and minute input before saving and calculating', async () => {
  await ready();
  const date = `${load.mock.calls[0][0]}-08`;
  await fireEvent.press(screen.getByLabelText(i18n.t('localData.accept')));
  await fireEvent.press(screen.getByTestId(`salary-day-${date}`));
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.normalHours')), '1:30');
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.overtimeHours')), '30');
  await fireEvent.changeText(screen.getByLabelText(i18n.t('salary.nightHours')), '1.5');
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.saveDay')));
  await waitFor(() => expect(screen.queryByLabelText(i18n.t('salary.saveDay'))).toBeNull());
  const expected = [{ date, normalHours: '1.5', overtimeHours: '0.5', nightHours: '1.5' }];
  expect(save.mock.calls.at(-1)![0].entries).toEqual(expected);
  await fireEvent.press(screen.getByLabelText(i18n.t('salary.calculate')));
  await waitFor(() => expect(calculate).toHaveBeenCalled());
  expect(calculate.mock.calls.at(-1)![0].entries).toEqual(expected);
});

it('initially highlights today in Korea without opening a data-entry popup', async () => {
  await ready();
  expect(screen.getByTestId(`salary-day-${koreaToday()}`).props.accessibilityState.selected).toBe(true);
  expect(screen.queryByLabelText(i18n.t('salary.closeDay'))).toBeNull();
});
