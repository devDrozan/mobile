# AdMob privacy and consent checklist — E9 Mate Myanmar

Complete alongside `play-console-checklist.md`. Items are ordered by release risk.
Facts about the current implementation come from `source-audit.md`.

## 1. Account and app linkage

- [ ] The app exists in AdMob and is linked to the Play listing for `com.e9mate.myanmar`
- [ ] AdMob app ID `ca-app-pub-7752680457121386~8251446871` matches `app.json` →
      `react-native-google-mobile-ads.androidAppId`
- [ ] App is marked ready / not "needs verification" in AdMob
- [ ] The Play store listing uses the same developer name as the AdMob account

## 2. Ad unit (blocker)

The code currently requests `TestIds.ADAPTIVE_BANNER`, a Google test unit. Test units only
serve labelled test ads and never earn revenue, and a release built with one is not a
production ad integration.

- [ ] Create a **Banner** ad unit in AdMob for this app
- [ ] Replace `TestIds.ADAPTIVE_BANNER` in `src/components/HomeBannerAd.tsx` with that unit ID
- [ ] Keep the test unit for development builds (for example: use the test ID when `__DEV__`)
- [ ] Rebuild the release binary; verify a real ad loads on a physical device
- [ ] Confirm the banner never covers content and sits away from tappable controls

## 3. Privacy policy link

- [ ] AdMob → **Apps → App settings → Privacy policy URL** → `https://devdrozan.github.io/mobile/`
      (field shown for some account configurations)
- [ ] Play Console → **App content → Privacy policy** → same URL
- [ ] The policy page itself is public, HTTPS, and needs no login
- [ ] The policy explains advertising identifiers, AdMob, and the Google links (it does, section 5)

## 4. Consent — current state and decision

The app requests **non-personalized ads only** (`requestNonPersonalizedAdsOnly: true`) and
ships **no consent SDK** (no Google UMP, no `AdsConsent`, no ATT prompt).

What Google currently requires:

| Region | Requirement | Applies to this app today? |
| --- | --- | --- |
| EEA + UK | Google-certified CMP integrated with IAB TCF **when serving personalized ads** (since 16 Jan 2024) | No — no personalized ads are requested |
| Switzerland | Same requirement **when serving personalized ads** (since 31 Jul 2024) | No — same reason |
| EEA/UK/CH, non-personalized | Without consent for IAB TCF Purpose 1, Google serves **limited ads** | Yes — expected behaviour, lower revenue |

Decide one of these before release and record the choice:

**Option A — stay non-personalized (lowest effort, current code).**
- [ ] Keep `requestNonPersonalizedAdsOnly: true`
- [ ] Accept that EEA/UK/CH users without a consent signal may receive limited ads
- [ ] Keep the policy statement "we currently request only non-personalized ads" true
- [ ] Do not claim a consent banner exists in the store listing or policy

**Option B — add the Google UMP SDK now (recommended, prepares personalization).**
- [ ] Add `react-native-google-mobile-ads` UMP usage (`AdsConsent.requestInfoUpdate`,
      `loadAndShowConsentFormIfRequired`) before initializing ads
- [ ] Create a **European regulations message** in AdMob → Privacy & messaging, targeted at
      EEA/UK/CH, with a "Do not consent" option and the privacy policy URL above
- [ ] Set `requestNonPersonalizedAdsOnly` from the consent result instead of hard-coding `true`
- [ ] Test with a debug geography override for EEA and for outside-EEA
- [ ] Add a **Privacy options** entry if the form must remain reachable after first run
- [ ] Update policy section 5 and the Data safety answers before shipping personalization

- [ ] US state privacy message (AdMob → Privacy & messaging) considered for US users
- [ ] Consent choices are not required to use non-advertising features (calculators, expenses)

## 5. Age treatment

- [ ] Do **not** tag requests as child-directed; the app is for adult E-9 workers
- [ ] Play Console target audience excludes children; not in the Families programme
- [ ] AdMob → **App settings → Max ad content rating** set to a general-audience rating
      (for example "G" / everyone) so adult creatives are filtered
- [ ] If the app is ever listed for children, re-run this section: personalized ads and
      several data uses become prohibited

## 6. app-ads.txt

`app-ads.txt` is not required for a simple AdMob banner, but it is the ownership signal
AdMob uses to verify the app and it is required by some demand sources.

- [ ] Note the limitation: the site is a **project page** on `devdrozan.github.io`. AdMob
      crawls `https://<hostname>/app-ads.txt`, i.e. `https://devdrozan.github.io/app-ads.txt`,
      which this repository cannot serve. A custom domain, or a `devdrozan.github.io`
      user-site repository, is required for verification.
- [ ] If a custom domain is added later: publish `app-ads.txt` at its root with
      `google.com, pub-7752680457121386, DIRECT`, then set the Play listing developer
      website to that domain and request a crawl in AdMob
- [ ] Until then, do not set the Play developer website to `https://devdrozan.github.io/mobile/`
      expecting app-ads.txt verification to succeed

## 7. Ad implementation policy checks

- [ ] Never click your own live ads or ask others to; use test units for QA
- [ ] Ads do not overlap app content, sit under a system bar, or appear on a blank/loading screen
- [ ] No ad is disguised as a button, menu item, or app content
- [ ] The Home promotional carousel is labelled as the app's own content
      (`SAMPLE AD · E9 MATE`, `E9 Mate promotion · no paid ad`). Do not let it look like a
      third-party ad or place a real banner so that the two are confused
- [ ] One banner placement only; no interstitial on launch, no app-open ad, no forced view
- [ ] No reward, unlock, or benefit is offered for viewing or clicking an ad
- [ ] Ad load failures degrade gracefully (the Home screen must stay usable, no empty gap)
- [ ] Remove or gate `console.log('Banner Ad error:', error)` for release builds (P1)

## 8. Consistency gates before submitting

- [ ] The binary's consent behaviour matches the policy: NPA-only, no consent banner claimed
- [ ] The policy's advertising section names Google AdMob and links Google's policies
- [ ] Data safety advertising rows match the SDK actually bundled
      (`react-native-google-mobile-ads` version in `package-lock.json`)
- [ ] Ad unit in the release build is a production unit, and test ads do not appear
- [ ] If anything above changes, update the effective date in `docs/index.html`

## Reference links

- AdMob policies and restrictions — <https://support.google.com/admob/answer/6128543>
- Consent management requirements (EEA/UK/CH) — <https://support.google.com/admob/answer/13554116>
- Create a European regulations message for apps — <https://support.google.com/admob/answer/10113207>
- Set up app-ads.txt — <https://support.google.com/admob/answer/9363762>
- How Google uses data from apps that use its services — <https://policies.google.com/technologies/partner-sites>
