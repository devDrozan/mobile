# Google Play Console checklist — E9 Mate Myanmar

Complete after the policy site is live and before submitting the release. Answers follow
the audited behaviour in `source-audit.md`.

## 1. Privacy policy

- [ ] Play Console → **App content → Privacy policy** → enter `https://devdrozan.github.io/mobile/`
- [ ] Confirm the URL opens over HTTPS, without login, in a private browser window
- [ ] Confirm the page shows: app name, package, effective date, contact email
- [ ] Add the same URL to the store listing's privacy policy field
- [ ] Keep the page online for as long as the app is published (removing it is a policy violation)

## 2. Data safety — top-level answers

| Question | Answer | Why |
| --- | --- | --- |
| Does your app collect or share any required user data types? | **Yes** | Calculation inputs leave the device; AdMob collects advertising data |
| Is all collected user data encrypted in transit? | **Yes** | Release builds require HTTPS; Google SDK traffic is HTTPS |
| Do you provide a way for users to request deletion? | **Yes** | In-app delete actions + `rozannainghangu@gmail.com`; no account exists, so there is no server record to delete |

Data safety defines "collection" as transmitting data off the device **including
ephemeral processing**. Salary/severance inputs therefore must be declared even though
our API stores nothing.

## 3. Data safety — data types

Declare these:

| Category → type | Collected / shared | Ephemeral | User control | Purpose | Evidence |
| --- | --- | --- | --- | --- | --- |
| Financial info → **Other financial info** | Collected, not shared | **Yes** | Users can choose whether this data is collected (only sent when the user taps Calculate/Convert) | App functionality | Severance/salary/currency request bodies; API keeps nothing |
| Location → **Approximate location** | Collected **and shared** | No | Data collection is required | Advertising or marketing; Fraud prevention, security and compliance | AdMob derives general location from IP |
| Device or other IDs → **Device or other IDs** | Collected **and shared** | No | Data collection is required | Advertising or marketing; Fraud prevention, security and compliance | Android Advertising ID / app set ID via Google Mobile Ads SDK |
| App activity → **Other actions** | Collected **and shared** | No | Data collection is required | Advertising or marketing; Fraud prevention, security and compliance | Ad impressions/clicks reported by the ads SDK |
| App info and performance → **Diagnostics** | Collected **and shared** | No | Data collection is required | Advertising or marketing | Ads SDK diagnostics/measurement |

Do **not** declare:

- **Expense records** (date, description, category, amount) — on-device only, never transmitted.
- **Salary records the user saved but did not submit** — stored on-device only.
- **Language/appearance preference** — on-device only.
- Personal info, messages, photos, files, contacts, health, precise location — not accessed.

Verification step before submission: compare the three advertising rows with Google's
current AdMob Data safety guidance for the Google Mobile Ads SDK (Play Console Help
"Provide information for Google Play's Data safety section" plus the ads SDK entry in
Google's SDK index). Google occasionally revises SDK disclosures; the form must match
the SDK version pinned in `package-lock.json`.

## 4. App content declarations

- [ ] **Ads:** "Yes, my app contains ads" (Home banner via Google AdMob)
- [ ] **App access:** all functionality available without restrictions (no login)
- [ ] **Content rating questionnaire:** utility app; answer "No" to violence, sexuality,
      language, controlled substances, gambling; expect a general audience rating
- [ ] **Target audience:** 18+ only; not designed for children; not in the Families programme
- [ ] **News app:** No
- [ ] **COVID-19 apps:** No
- [ ] **Data deletion:** Yes — in-app per-record/month/all deletion; email contact for requests
- [ ] **Financial features:** the severance and salary tools are informational calculators,
      not lending, banking, payment, or money-transfer services; the currency screen is a
      reference-rate preview, not a transaction. Answer any financial-services questions
      accordingly.
- [ ] **Government affiliation:** none; the app links to official sites but is independent
- [ ] **Permissions declaration:** no sensitive runtime permission is requested. The
      merged manifest contains `INTERNET`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK`,
      `com.google.android.gms.permission.AD_ID`, and legacy storage permissions capped at
      API 32 (`READ/WRITE_EXTERNAL_STORAGE` from `expo-file-system`). If Play asks for the
      photo/media permission declaration, explain that no user media is accessed and
      consider removing the legacy declarations (see `outstanding-issues.md`, P2).

## 5. Store listing

- [ ] Developer contact email: `rozannainghangu@gmail.com` (monitored)
- [ ] Privacy policy URL present in the listing
- [ ] Description does not promise encrypted storage, statutory accuracy, guaranteed
      exchange rates, or money transfer
- [ ] Screenshots do not show real personal or financial data

## 6. Consistency checks before submitting

- [ ] Policy says ads are non-personalized **only while** `requestNonPersonalizedAdsOnly` is true
- [ ] Policy says the API keeps nothing — confirm the deployed API still has no database
      and `logger: false`
- [ ] Policy says expense data never leaves the device — confirm no expense module import
      of `../../api/*`
- [ ] Policy contact email matches the Play Console account contact
- [ ] Data safety "financial info" row is present even though processing is ephemeral
- [ ] If a production ad unit and consent message are added, update sections 5 and 15 of
      the policy and the Data safety rows before rollout
