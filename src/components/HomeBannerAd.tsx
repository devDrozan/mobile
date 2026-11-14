import { useState } from 'react';
import { Platform, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

/** Test units only. Keep ads in normal layout flow, never over screen controls. */
export default function HomeBannerAd() {
  const [failed, setFailed] = useState(false);
  const [height, setHeight] = useState(50);
  if (Platform.OS === 'web' || failed) return null;
  return <View testID="ad-banner-slot" style={{ alignItems: 'center', marginVertical: 8, minHeight: height, flexShrink: 0 }}>
    <BannerAd unitId={TestIds.ADAPTIVE_BANNER}
      size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      onAdLoaded={dimensions => setHeight(dimensions.height)}
      onSizeChange={dimensions => setHeight(dimensions.height)}
      onAdFailedToLoad={() => setFailed(true)} />
  </View>;
}
