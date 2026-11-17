// AdMob is native-only. The existing component already hides banners on web;
// this adapter also keeps Metro from importing the native SDK during previews.
export default function HomeBannerAd() { return null; }
