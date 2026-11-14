import { fireEvent, render, screen } from '@testing-library/react-native';
import { usePathname } from 'expo-router';
import { FeatureBannerAd } from '../src/components/FeatureBannerAd';
let mockAdProps: Record<string, any>;
jest.mock('expo-router', () => ({ usePathname: jest.fn(() => '/work') }));
jest.mock('react-native-google-mobile-ads', () => ({
  BannerAd: (props: Record<string, any>) => { mockAdProps = props; const { View } = require('react-native'); return <View testID="test-ad" {...props} />; },
  BannerAdSize: { LARGE_ANCHORED_ADAPTIVE_BANNER: 'large-adaptive' }, TestIds: { ADAPTIVE_BANNER: 'google-test-banner' },
}));
it.each(['/work', '/salary', '/expenses', '/severance', '/severance/guide', '/guide', '/insurance', '/exchange'])('reserves one test ad slot on %s', async route => {
  jest.mocked(usePathname).mockReturnValue(route);
  await render(<FeatureBannerAd />);
  expect(screen.getAllByTestId('test-ad')).toHaveLength(1);
  expect(mockAdProps.unitId).toBe('google-test-banner');
  expect(mockAdProps.requestOptions.requestNonPersonalizedAdsOnly).toBe(true);
  expect(screen.getByTestId('ad-banner-slot')).toHaveStyle({ flexShrink: 0, minHeight: 50 });
  await fireEvent(screen.getByTestId('test-ad'), 'sizeChange', { height: 90, width: 320 });
  expect(screen.getByTestId('ad-banner-slot')).toHaveStyle({ minHeight: 90 });
  await fireEvent(screen.getByTestId('test-ad'), 'adFailedToLoad', new Error('offline'));
  expect(screen.queryByTestId('ad-banner-slot')).toBeNull();
});
it.each(['/', '/services', '/about', '/coming-soon'])('does not duplicate home or show ads on %s', async route => {
  jest.mocked(usePathname).mockReturnValue(route);
  await render(<FeatureBannerAd />);
  expect(screen.queryByTestId('test-ad')).toBeNull();
});
