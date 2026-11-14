import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { View, Text, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalDataNoticeProvider, useLocalDataNotice, LOCAL_DATA_NOTICE_KEY } from '../src/local-data-notice';
import * as work from '../src/modules/work/storage';
import * as expenses from '../src/modules/expenses/storage';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../src/modules/work/storage', () => ({ readDisclosureAcceptance: jest.fn(async () => false) }));
jest.mock('../src/modules/expenses/storage', () => ({ readDisclosureAcceptance: jest.fn(async () => false) }));
function Consumer({ name }: { name: string }) {
  const state = useLocalDataNotice();
  return <View><Text>{name}:{state.ready ? state.accepted ? 'accepted' : 'pending' : 'loading'}</Text>{state.error && <Text>preference failed</Text>}<Pressable accessibilityLabel={name} onPress={() => { void state.accept(); }} /></View>;
}
const App = () => <LocalDataNoticeProvider><Consumer name="work" /><Consumer name="expenses" /></LocalDataNoticeProvider>;
beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); jest.mocked(work.readDisclosureAcceptance).mockResolvedValue(false); jest.mocked(expenses.readDisclosureAcceptance).mockResolvedValue(false); });
it('shares acceptance immediately across features and restores after restart', async () => {
  const view = await render(<App />);
  await waitFor(() => expect(screen.getByText('work:pending')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('work'));
  await waitFor(() => expect(screen.getByText('expenses:accepted')).toBeTruthy());
  expect(await AsyncStorage.getItem(LOCAL_DATA_NOTICE_KEY)).toBe('accepted');
  await view.unmount(); await render(<App />);
  await waitFor(() => expect(screen.getByText('work:accepted')).toBeTruthy());
});
it.each(['work', 'expenses'])('migrates an existing %s acknowledgment without financial reads', async module => {
  jest.mocked(module === 'work' ? work.readDisclosureAcceptance : expenses.readDisclosureAcceptance).mockResolvedValue(true);
  await render(<App />);
  await waitFor(() => expect(screen.getByText('expenses:accepted')).toBeTruthy());
  expect(await AsyncStorage.getItem(LOCAL_DATA_NOTICE_KEY)).toBe('accepted');
});
it('retains the notice when persistence fails and permits retry', async () => {
  await render(<App />);
  await waitFor(() => expect(screen.getByText('work:pending')).toBeTruthy());
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
  await fireEvent.press(screen.getByLabelText('work'));
  await waitFor(() => expect(screen.getAllByText('preference failed')).toHaveLength(2));
  expect(screen.getByText('expenses:pending')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('expenses'));
  await waitFor(() => expect(screen.getByText('work:accepted')).toBeTruthy());
});
