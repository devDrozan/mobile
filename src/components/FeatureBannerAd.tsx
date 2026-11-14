import { usePathname } from 'expo-router';
import HomeBannerAd from './HomeBannerAd';
const features = new Set(['/work', '/salary', '/expenses', '/severance', '/severance/guide', '/guide', '/insurance', '/exchange']);
export function FeatureBannerAd() {
  const pathname = usePathname().replace(/\/$/, '');
  return features.has(pathname) ? <HomeBannerAd key={pathname} /> : null;
}
