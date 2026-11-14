import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, Screen } from '../../components/ui';
import { useRouteHeadingFocus } from '../../components/useRouteHeadingFocus';
import { HeroCarousel } from './HeroCarousel';
import { ServiceSections } from './ServiceSections';
import HomeBannerAd from '../../components/HomeBannerAd';

export default function HomeScreen() {
  const { t } = useTranslation();
  const styles = createStyles();
  // Home had no screen-level heading, so returning here announced nothing and
  // heading navigation started at "Our Services". Announce the screen instead.
  const heading = useRouteHeadingFocus();
  return <Screen>
    <Copy ref={heading} accessible accessibilityRole="header" tabIndex={-1} style={styles.visuallyHidden}>{t('hub.home')}</Copy>
    <HeroCarousel />
    <ServiceSections />
    <HomeBannerAd />
  </Screen>;
}

function createStyles() { return StyleSheet.create({
  visuallyHidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
}); }
