# Source audit — what the app actually does

Audited on 9 November 2026 against the working tree of `mobile/` (Expo SDK 58,
`react-native` 0.88.1) and `api/`. Every statement in the published policy is derived
from the items below. Re-run this audit whenever the app or its dependencies change.

## 1. Identity and platform

| Item | Value | Source |
| --- | --- | --- |
| App name | E9 Mate Myanmar | `mobile/app.json` |
| Android package | `com.e9mate.myanmar` | `mobile/app.json` |
| Expo SDK | 58 (`expo ~58.0.21`) | `mobile/package.json` |
| Version | 0.1.0 | `mobile/app.json` |
| Android backup | Disabled (`allowBackup: false`) | `mobile/app.json` |
| Stated platform | Android (iOS config exists but was not audited as a release target) | `mobile/app.json` |

## 2. Data stored on the device

| Store | Contents | Written by |
| --- | --- | --- |
| AsyncStorage `e9-language` | `en` / `my` | `src/i18n.ts` |
| AsyncStorage `e9-theme` | `system` / `light` / `dark` | `src/theme.tsx` |
| SQLite `e9-work-time.db` | `work_months(month, payload)` and `work_preferences` (disclosure flag). Payload: month, six pay settings, dated normal/overtime/night hours | `src/modules/work/storage.native.ts` |
| SQLite `e9-expenses.db` | `expense_entries(id, date, payload)` and `expense_preferences`. Payload: date, description (≤120 chars), category, amount | `src/modules/expenses/storage.native.ts` |
| Memory only | Severance calculator drafts/results, unsaved salary/expense forms, currency amounts/results | Screens and hooks |

Notes:

- `PRAGMA secure_delete = ON` is set; this overwrites deleted rows but is not encryption.
- `useSQLCipher: true` is configured in `app.json`, but **no `PRAGMA key` is ever set and
  `PRAGMA cipher_version` is never checked**. Per Expo's SDK 58 SQLite documentation,
  SQLCipher only encrypts after `PRAGMA key` succeeds; without it the database is stored
  unencrypted. The policy therefore makes **no encryption-at-rest claim**.
- Expense records are never transmitted. Confirmed: no API import in
  `src/modules/expenses/*`.
- Web preview throws `NATIVE_STORAGE_REQUIRED` and shows an explanation; it does not
  write local data.

## 3. Network transmission

Client: `mobile/src/api/client.ts` (openapi-fetch, 15 s deadline, `cache: 'no-store'`,
`credentials: 'omit'`). Release builds reject non-HTTPS API origins before sending.

| Endpoint | Trigger | Body | Server retention |
| --- | --- | --- | --- |
| `POST /v1/calculations/context` | Severance flow | Employment dates, weekly hours, special-case answers | None |
| `POST /v1/calculations` | "Calculate" | Employment context + wage periods/amounts, bonus, leave, DC balance | None |
| `POST /v1/salary-estimates` | Salary "Calculate / Retry estimate" | Month, pay settings, dated hours | None |
| `GET /v1/exchange-rates/krw-mmk` | Exchange screen load/refresh | No body | None |
| `POST /v1/currency-conversions` | Exchange "Convert" | `from`, `to`, `amount` | None |

Server (`api/src/server.ts`, `api/src/exchange.ts`):

- No database, no file writes, no queue; calculations are pure functions.
- Fastify `logger: false` — request bodies and results are not logged.
- `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, body limit 32 KB,
  rate limit 100 requests/minute per client.
- CORS allow-list is configured per deployment; native requests send no Origin.
- Exchange rates: public snapshot held **only in backend process memory** (≤15 min TTL,
  60 s refresh guard). Provider URL/token are server-only environment variables and the
  feature is disabled unless `EXCHANGE_RATE_ACCESS_APPROVED=true`.
- `EXCHANGE_RATE_FEED_TOKEN` is a server secret; no client-exposed env var contains one.

Not transmitted: expense records, saved salary months other than the selected one,
language/appearance preferences, advertising identifiers, contacts, location, or files.

## 4. Advertising

| Item | Value |
| --- | --- |
| SDK | `react-native-google-mobile-ads` ^17.4.0 (Google Mobile Ads / AdMob) |
| Placement | One anchored adaptive banner on Home only (`src/components/HomeBannerAd.tsx`) |
| Ad unit | **`TestIds.ADAPTIVE_BANNER`** — Google test unit, not a production unit |
| AdMob app ID | `ca-app-pub-7752680457121386~8251446871` (`app.json` plugin) |
| Request options | `requestNonPersonalizedAdsOnly: true` |
| Consent SDK | **None.** No UMP/`AdsConsent`, no ATT prompt, no privacy-options entry |
| Logging | `console.log('Banner Ad error:', error)` on ad load failure (no user data) |

Manifest permissions contributed by libraries:

- `react-native-google-mobile-ads`: `INTERNET`, `WAKE_LOCK`, `ACCESS_NETWORK_STATE`
- Google Play services Ads (AAR): `com.google.android.gms.permission.AD_ID`
- `expo-file-system` (transitive): `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`
  with `maxSdkVersion="32"`

No other ad network, mediation, or analytics SDK is present.

## 5. Not present (verified by dependency list and grep)

No Firebase, Google Analytics, Sentry, Crashlytics, Segment, Amplitude, notifications,
location, camera, microphone, contacts, calendar, biometrics, SecureStore, webview,
user accounts, payments, or remote config. No push tokens. No ATT prompt.

## 6. External links opened

`Linking.openURL` to: MOEL retirement-pay calculator and guidance, EPS insurance page,
KB Kookmin Bank rate page, Korea Money Brokerage Corp. rate page, and Google policy
pages. Opening a link leaves the app; those sites have their own policies.

## 7. Cross-checks and inconsistencies

1. **SQLCipher configured but unused.** `useSQLCipher: true` suggests encrypted local
   databases; no key is set, so they are not encrypted. The policy avoids any encryption
   claim. Either implement a key (and document where it is stored) or remove the flag so
   the build cannot be mistaken for encrypted storage.
2. **Ad unit is a Google test ID.** `TestIds.ADAPTIVE_BANNER` serves test ads only. A
   release with this value is not a production ad integration and the AdMob app ID in
   `app.json` is never exercised. The policy describes general AdMob behaviour; the
   binary must match before submission.
3. **No consent mechanism.** The policy says a consent choice will be presented where
   required (EEA/UK/CH) *if personalized ads are enabled*. Since the app requests only
   non-personalized ads today, the statement is accurate — but Google's EEA consent
   requirements and Play's User Data policy still need a decision (see
   `outstanding-issues.md`).
4. **Currency module is "Coming soon · preview" in copy but functional in code.** It
   calls the API and can return live reference rates when the server is configured. The
   policy covers it. Do not describe conversion as an available money-transfer service
   in the store listing.
5. **Play Data safety "financial info".** Salary and severance inputs leave the device,
   so they must be declared even though processing is ephemeral and nothing is stored.
   Expense amounts stay on-device and must **not** be declared.
6. **`allowBackup: false`** means Android cloud backup does not copy the SQLite files.
   The policy states this; keep the flag when building.
7. **Ad error logging** writes to the device console. It contains only an ad error code
   and no user data, but remove or gate it for production hygiene.
