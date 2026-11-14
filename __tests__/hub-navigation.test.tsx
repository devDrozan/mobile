import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Redirect, router, useLocalSearchParams, usePathname } from 'expo-router';
import i18n from '../src/i18n';
import { AppThemeProvider } from '../src/theme';
import HomeScreen from '../src/modules/hub/HomeScreen';
import SearchScreen from '../src/app/search';
import ComingSoonScreen from '../src/app/coming-soon';
import ServicesScreen from '../src/app/services';
import SalaryAlias from '../src/app/salary';
import NoticesScreen from '../src/app/notices';
import { HubFooter } from '../src/modules/hub/HubFooter';

jest.mock('expo-router', () => ({ Redirect: jest.fn(() => null), useFocusEffect: () => undefined, useLocalSearchParams: jest.fn(() => ({ id: 'work' })), usePathname: jest.fn(() => '/'), router: { navigate: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-google-mobile-ads', () => ({ BannerAd: () => null, BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'anchored' }, TestIds: { ADAPTIVE_BANNER: 'test-banner' } }));

beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'exchange' });
  await act(() => i18n.changeLanguage('en'));
});

it.each(['en', 'my'])('shows tappable services with honest availability in %s', async language => {
  await act(() => i18n.changeLanguage(language));
  await render(<AppThemeProvider><HomeScreen /></AppThemeProvider>);
  expect(screen.getByRole('header', { name: i18n.t('hub.servicesTitle') })).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: i18n.t('hub.comingSoon') })).toBeOnTheScreen();
  const severance = i18n.t('hub.modules.severance.title');
  const insurance = i18n.t('hub.modules.insurance.title');
  const work = i18n.t('hub.modules.workSalary.title');
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.openNamed', { name: severance }) + '. ' + i18n.t('hub.available') }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.openNamed', { name: insurance }) + '. ' + i18n.t('hub.available') }));
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.openNamed', { name: work }) + '. ' + i18n.t('hub.available') }));
  expect(router.navigate).toHaveBeenNthCalledWith(1, '/severance');
  expect(router.navigate).toHaveBeenNthCalledWith(2, '/insurance');
  expect(router.navigate).toHaveBeenNthCalledWith(3, '/work');
  const exchange = i18n.t('hub.modules.exchange.title');
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.openNamed', { name: exchange }) + '. ' + i18n.t('hub.available') }));
  expect(router.navigate).toHaveBeenNthCalledWith(4, '/exchange');
});

it('provides manual carousel controls and labels sample ads honestly', async () => {
  await render(<AppThemeProvider><HomeScreen /></AppThemeProvider>);
  const previous = screen.getByRole('button', { name: i18n.t('hub.previousSlide') });
  const next = screen.getByRole('button', { name: i18n.t('hub.nextSlide') });
  expect(previous).not.toBeDisabled();
  expect(screen.getAllByText(i18n.t('hub.sampleAd'))).toHaveLength(2);
  await fireEvent.press(next);
  expect(previous).not.toBeDisabled();
  await fireEvent.press(next);
  await fireEvent.press(next);
  expect(next).not.toBeDisabled();
  await fireEvent.press(next);
  expect(screen.getByLabelText(i18n.t('hub.position', { current: 1, total: 4 }))).toBeOnTheScreen();
});

it('searches local service names and handles an empty result', async () => {
  await render(<AppThemeProvider><SearchScreen /></AppThemeProvider>);
  const input = screen.getByLabelText(i18n.t('hub.searchPlaceholder'));
  expect(screen.getByRole('button', { name: /Severance Calculator/ })).toBeOnTheScreen();
  await fireEvent.changeText(input, 'salary');
  const workResult = screen.getByRole('button', { name: /Open Salary Estimate from Work Time/ });
  expect(workResult).toBeOnTheScreen();
  await fireEvent.press(workResult);
  expect(router.navigate).toHaveBeenCalledWith('/work');
  expect(screen.queryByRole('button', { name: /Severance Calculator/ })).toBeNull();
  await fireEvent.changeText(input, 'no matching service');
  expect(screen.getByText(i18n.t('hub.noResults'))).toBeOnTheScreen();
});

it.each(['finance', 'information'])('keeps %s on its specific Coming soon destination', async id => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id });
  await render(<AppThemeProvider><ComingSoonScreen /></AppThemeProvider>);
  expect(screen.getByRole('header', { name: i18n.t(`hub.modules.${id}.title`) })).toBeOnTheScreen();
  expect(screen.getByText(i18n.t('hub.plannedNotice'))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.backHome') }));
  expect(router.navigate).toHaveBeenCalledWith('/');
});

it('keeps the footer to Home, Services and Notices with no Profile destination', async () => {
  jest.mocked(usePathname).mockReturnValue('/');
  await render(<AppThemeProvider><HubFooter /></AppThemeProvider>);
  expect(screen.getAllByRole('tab')).toHaveLength(3);
  expect(screen.getByRole('tab', { name: i18n.t('hub.home') })).toBeSelected();
  await fireEvent.press(screen.getByRole('tab', { name: i18n.t('hub.servicesTab') }));
  await fireEvent.press(screen.getByRole('tab', { name: i18n.t('hub.noticesTab') }));
  expect(router.navigate).toHaveBeenCalledWith('/services');
  expect(router.navigate).toHaveBeenCalledWith('/notices');
  expect(screen.queryByText(/Profile/i)).toBeNull();
  await render(<AppThemeProvider><NoticesScreen /></AppThemeProvider>);
  expect(screen.getByText(i18n.t('hub.noticesEmpty'))).toBeOnTheScreen();
});

it.each(['en', 'my'])('opens the salary module from Services in %s', async language => {
  await act(() => i18n.changeLanguage(language));
  await render(<AppThemeProvider><ServicesScreen /></AppThemeProvider>);
  const name = i18n.t('hub.modules.workSalary.title');
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.openNamed', { name }) + '. ' + i18n.t('hub.available') }));
  expect(router.navigate).toHaveBeenCalledWith('/work');
  expect(screen.queryByRole('button', { name: i18n.t('hub.comingSoonNamed', { name }) + '. ' + i18n.t('hub.comingSoon') })).toBeNull();
});

it.each(['salary', 'work'])('redirects the historical planned %s link into the working module', async id => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id });
  await render(<AppThemeProvider><ComingSoonScreen /></AppThemeProvider>);
  expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0]).toEqual({ href: '/work' });
  expect(screen.queryByText(i18n.t('hub.plannedNotice'))).toBeNull();
});

it('keeps the salary route alias pointed at the work module', async () => {
  await render(<SalaryAlias />);
  expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0]).toEqual({ href: '/work' });
});

it.each(['en', 'my'])('puts salary first and Expenses second with working local destinations in %s', async language => {
  await act(() => i18n.changeLanguage(language));
  const { modules } = require('../src/modules/catalog') as typeof import('../src/modules/catalog');
  expect(modules.slice(0, 2).map(module => module.id)).toEqual(['work', 'expenses']);
  await render(<AppThemeProvider><ServicesScreen /></AppThemeProvider>);
  const name = i18n.t('hub.modules.expenses.title');
  await fireEvent.press(screen.getByRole('button', { name: i18n.t('hub.openNamed', { name }) + '. ' + i18n.t('hub.available') }));
  expect(router.navigate).toHaveBeenCalledWith('/expenses');
});

it('redirects the old currency Coming soon link to the available converter', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'exchange' });
  await render(<AppThemeProvider><ComingSoonScreen /></AppThemeProvider>);
  expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0]).toEqual({ href: '/exchange' });
  const { modules } = require('../src/modules/catalog') as typeof import('../src/modules/catalog');
  expect(modules.find(module => module.id === 'exchange')).toMatchObject({status:'available',route:'/exchange'});
  expect(screen.queryByText(i18n.t('hub.plannedNotice'))).toBeNull();
});
it.each(['en','my'])('opens the available converter from Services and search in %s',async language=>{
  await act(()=>i18n.changeLanguage(language));
  const label=i18n.t('hub.openNamed',{name:i18n.t('hub.modules.exchange.title')})+'. '+i18n.t('hub.available');
  const services=await render(<AppThemeProvider><ServicesScreen /></AppThemeProvider>);
  await fireEvent.press(screen.getByRole('button',{name:label}));
  expect(router.navigate).toHaveBeenLastCalledWith('/exchange');
  await services.unmount();
  await render(<AppThemeProvider><SearchScreen /></AppThemeProvider>);
  await fireEvent.changeText(screen.getByLabelText(i18n.t('hub.searchPlaceholder')),i18n.t('hub.modules.exchange.title'));
  await fireEvent.press(screen.getByRole('button',{name:label}));
  expect(router.navigate).toHaveBeenLastCalledWith('/exchange');
});
