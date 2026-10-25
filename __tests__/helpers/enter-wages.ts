import { fireEvent, screen } from '@testing-library/react-native';
import i18n from '../../src/i18n';

// Exercise the normal employment flow instead of relying on a product demo shortcut.
export async function enterWages() {
  await fireEvent.changeText(screen.getByLabelText(i18n.t('startDate')), '2014-10-02');
  await fireEvent.changeText(screen.getByLabelText(i18n.t('lastWorkingDate')), '2017-09-15');
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('continue') }));
  for (const field of screen.queryAllByLabelText(i18n.t('basePay'))) {
    await fireEvent.changeText(field, '1000000');
  }
  for (const field of screen.queryAllByLabelText(i18n.t('yearWages'))) {
    await fireEvent.changeText(field, '30000000');
  }
}
