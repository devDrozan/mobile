import { render, screen, fireEvent } from '@testing-library/react-native';
import '../src/i18n';
import { MoneyField } from '../src/components/ui';
jest.mock('expo-router', () => ({ usePathname: () => '/', router: { navigate: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

it('keeps entered money as a decimal string and provides an accessible input label', async () => {
  const onChangeText = jest.fn();
  await render(<MoneyField label="Gross wages" value="1000" onChangeText={onChangeText} />);
  await fireEvent.changeText(screen.getByLabelText('Gross wages'), '1000.50');
  expect(onChangeText).toHaveBeenCalledWith('1000.50');
});
