# E9 Mate Myanmar — Mobile

Android and iPhone worker toolkit for Myanmar E-9 workers in South Korea, built with Expo / React Native. The Home dashboard lists Salary Estimate from Work Time first, Expenses second, followed by the Severance Calculator and E-9 Insurance. Home remains the entry screen. Other tools are labelled Coming soon and open explanatory pages. The calculator supports English and Burmese with bundled Myanmar fonts and estimates gross KRW amounts before tax.

## Using the calculator

Choose a language and Normal, DB, or DC, enter employment details, complete the special-case questions, and enter wages for the displayed periods. Review the inputs before submitting, then read the eligibility explanation, estimate, breakdown, and official sources. Cases needing individual review show an explanation without a benefit total. DC required contributions and an optional reported account balance appear separately.

No account is required. Calculations need a connection to the API. Entries stay in memory while consulting guidance and returning to the calculator; only language and appearance preferences are saved for this calculator. The salary module can save its own work records and pay settings locally in SQLite. Closing or reloading the app clears the calculation session. Fractional weekly hours remain intact while typing, and reported DC balances keep their entered decimal precision on results.

On launch, the existing won logo and configured app name, **E9 Mate Myanmar**, appear for three seconds before Home opens. Local fonts and saved preferences finish loading before the handoff; an unavailable API does not delay it. Normal navigation and returning from the background do not replay the splash. The screen supports Light and Dark appearance and larger text.

Home shows one continuously looping carousel that advances every four seconds with smooth animation, alongside manual swipe and previous/next controls. Autoplay pauses during interaction, away from Home, and while backgrounded; reduced-motion preferences use static transitions. It contains useful information and clearly labelled sample E9 Mate ads, followed by service and Coming soon cards. The sample ads link to existing E9 Mate services; no paid ads run yet. Salary Estimate from Work Time combines work-time records and salary estimation into one available service in the local source. Available cards open their services; other planned cards open explanatory pages. The top bar menu holds Light/Dark, Language, Search, and About us. The Home, Services, and Notices footer appears on hub pages; Notices has an empty state, and Profile is not included yet. Search filters services locally; Language offers English and Burmese. Appearance initially follows the device until you tap its icon; the selected appearance and language are remembered. In the Severance Calculator, tabs switch between Calculator and How it works, followed by the existing Normal, DB, and DC calculation flow. Use Back to Home to leave a service. An in-progress calculation stays available during the same app session. Every screen includes the current-year copyright notice.

## Salary Estimate from Work Time

The Salary service is enabled in the local source. Open its card from Home, Services, or Search, or use `/work`. `/salary` and historical `/coming-soon?id=work` or `/coming-soon?id=salary` links redirect to `/work`. Android/iOS native release checks remain outstanding; local availability does not certify a released binary.

Choose a month, set basic salary and the five hourly rates, select calendar dates (or the accessible date list), and enter normal, overtime, and overlapping night hours. Accept the local-storage disclosure and tap **Save this month on device** to retain edits, including day removals. Unsaved salary inputs survive month changes and tool switches during the app session. Closing or reloading the app discards unsaved edits. New months copy the latest earlier saved pay settings without changing that month's records.

The API estimates the full base plus weekday overtime, Saturday work, Sunday work, and additive night premiums. Normal hourly rate is reference-only. Missing dates do not reduce the base. Tax, insurance, absence deductions, partial-month proration, public-holiday rules, and automatic statutory rate determination are excluded.

Hours accept plain hours, decimal hours, clock time, or minutes: `8` and `8.0` are 8 hours, `1.5` and `1:30` are 1 hour 30 minutes, `30` is 30 minutes, and a bare whole number above 24 is read as minutes. Values are normalised to at most two decimal hours before validation, local saving, and submission.

Annual leave (연차) sits above the calendar and is recorded per calendar year, separately from salary. Answer **Yes** to enter the employer-granted days and mark non-working dates as paid leave in the date popup; used and remaining days count across every month of that year. **No** hides the inputs and states that Korean labor law may still grant paid leave and pay for unused leave. **Not sure** shows a short Labor Standards Act guide. Leave stays on the device, is never sent to the API, and unused leave pay is never added to the estimate.

Salary settings and records persist only on this device in `e9-work-time.db` (versioned SQLite schema 1); confirmed delete-month/delete-all actions remove them. There is no cloud sync or export/backup feature. **Calculate / Retry estimate** sends only the selected month's draft to the stateless API and never saves it. Results stay in memory and are invalidated by edits. A missing disclosure or a failed request is reported directly under the button that triggered it, and a finished estimate scrolls into view after its native layout is measured. Valid calculation submissions dismiss the keyboard. The full API request, including reading the response body, times out after 15 seconds so a stalled connection can be retried. Drafts survive request/storage failures while the screen remains open. Recording and saving work offline; calculation requires connectivity. The Expo web preview does not open native SQLite and gives a recovery explanation; use the independent web/PWA for IndexedDB storage.

The SQLite dependency is pinned to SDK 58 documentation's `~58.0.14`; the bundled compatibility map recommends patch 58.0.15, which was unavailable before this environment's registry cutoff. Recheck the compatible patch with Expo before release. The SQLite dependency and config plugin require a new native binary. JavaScript exports and mocked SQLite tests do not certify native persistence, upgrades, deletion, Burmese rendering, accessibility, or device data-backup behavior. Complete Android/iOS device verification before publishing a native release.

## Monthly expenses

Salary and Expenses use compact Monday–Sunday calendars with aligned columns, rounded cells, theme-aware selection, and month navigation arrows. Expense details and Add Expense appear directly below the calendar; saved dates retain their indicators and daily totals.

Open **Expenses**, the second service after Salary Estimate from Work Time. Browse the monthly calendar and tap a Korean calendar date to enter Category, Description, and a positive KRW Amount, or view, edit, and delete that date's saved records. Successful Save automatically confirms the visible local-storage notice; there is no manual acknowledgement step. Dates show expense counts and daily totals. Exact decimal totals are computed locally offline, without rounding or salary deductions. Compact calendar totals are marked approximate, with the exact total announced accessibly and shown in full for the selected date. Add, edit, and confirmed delete actions work offline.

Expense records use the separate `e9-expenses.db` SQLite database (schema 1), with no API calls, cloud sync, analytics, or attachments. Delete-record/month/all actions affect expense data only. Uninstalling or clearing app data removes saved records. Unsaved expense forms are separate per date and survive date/month changes and tool switches in session memory. Read/write failures preserve drafts and provide retry actions; a new screen waits for any in-flight save/delete before reloading records. Expenses follows global English/Burmese and Light/Dark preferences. The independent web/PWA provides IndexedDB storage; the Expo web export explains that this native SQLite adapter is unavailable there.

## Development

In the full workspace, first run `cd mobile` from `SeverancePayCaculator`. All commands below run from this mobile project directory, where `package.json` and `app.json` live. An independent clone of `devDrozan/mobile` already has this directory as its root.

Use Node.js 24:

```sh
npm ci
cp .env.example .env
npm start
```

Set `EXPO_PUBLIC_API_BASE_URL` for the device you use:

| Device | API URL |
| --- | --- |
| iOS simulator | `http://127.0.0.1:3001` |
| Android emulator | `http://10.0.2.2:3001` |
| Physical phone | Your development computer's LAN address, port 3001 |
| Release build | Your deployed HTTPS API origin |

Release builds reject an API URL that is missing or does not use HTTPS before sending calculation data. The HTTP addresses above are for local development only.

For a physical phone, run the API with `HOST=0.0.0.0` on a trusted development network. Only a public API origin belongs in `EXPO_PUBLIC_API_BASE_URL`; no credentials or private keys.

If **Calculate** reports that the API is unreachable, the phone cannot open `EXPO_PUBLIC_API_BASE_URL`: confirm the computer's current LAN address still matches that value, start the API with `HOST=0.0.0.0`, allow port 3001 through the computer firewall, put both devices on the same network, then restart the Expo dev server so the new value is bundled. A reachable API that answers with an error shows the separate service-error message instead.

## Verification

```sh
npx expo-doctor
npm run contract:generate
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run build` exports Android, iOS, and web bundles for verification; this is not a signed native app or app-store submission. A release build needs a configured HTTPS API, final application identifiers, signing, and device QA. Use Expo's EAS workflow when those release details are ready. Native directories are generated by Expo, not maintained manually.

The three-second branded app view can be checked in Expo Go after a full reload. Native launch styling is configured with `expo-splash-screen` in `app.json` and needs a new preview or production binary to verify; Expo Go and development builds have their own launch presentation. Check cold launches in both device appearances, saved Light/Dark preferences, large text, offline startup, and background/resume. The splash reuses `assets/splash-icon.png`; its name comes from `expo.name` in `app.json`.

Launcher and splash artwork comes from the won mark in `assets/brand.svg`. Run `python3 tools/generate-icons.py` after changing it: the script uses only the Python standard library and rewrites `icon.png`, the transparent adaptive foreground, the Android 13+ monochrome layer, and the rounded splash tile. Keep the foreground mark inside the 66dp safe zone, and rebuild a native binary to see new launcher icons.

To update API types, replace `contract/openapi.json` with the chosen API release artifact and run `npm run contract:generate`. Generated types live in `src/api/schema.d.ts`.

TypeScript stays on 5.9 because `openapi-typescript@7.13.0` and `react-i18next@15.7.4` declare TypeScript 5 peer support. SDK 58 recommends TypeScript 6, so `expo.install.exclude` explicitly exempts this development dependency from version recommendations. Remove the exception when both dependencies support TypeScript 6; keep running typecheck, contract generation, tests, and platform exports in the meantime. Check the other Expo packages against SDK 58's recommended patch versions before native release.

## Upstream tooling advisories

On 2026-11-01, the lockfile includes compatible SDK 58 patches and patched `node-forge` 1.4.2. `npm audit --omit=dev` still reports advisories through Expo and test tooling: nested Zod 3, `glob`, `minimatch`, and `deepmerge`. The app's direct Zod 4 dependency is outside the reported affected range. Expo's next SDK 58 patch removes the CLI's Zod 3 dependency, but that patch was newer than this environment's package availability cutoff when checked. The other advisories have no compatible nonbreaking update in the current dependency graph; do not use npm's forced Expo or Jest downgrade. Recheck the audit and Expo Doctor before a native release. The independently deployed calculation API has its own dependency checks.

Monthly Pay Settings has a dedicated Save pay settings action. A successful save collapses its six inputs; Edit pay settings reopens the current values. This action uses the existing monthly local save (including current work records) and storage disclosure. Failed validation or storage leaves the settings open, and collapsed state is kept separately per month during the session.

Tap a work-calendar date to open its working-hours popup. Save working hours validates and stores the current monthly settings/work records locally; saved dates open a summary with Edit working hours. Closing or cancelling discards staged changes. Save failures keep inputs available for retry. The popup supports normal, overtime, and overlapping night hours with the existing limits and storage disclosure.

The shared mobile header groups appearance, language, and search under a hamburger Menu button. The popup retains the existing saved preferences and search route; close it with Close, the backdrop, or Android Back. Language selection and search also dismiss it.

Expenses shows saved records for the selected calendar date. Add Expense and Edit open a popup containing Category, Description, and Amount. Successful Save stores the record locally, updates the daily total, and closes the popup. Close preserves its per-date unsaved draft for this session; validation or storage failures keep the popup open.

## Currency Exchange

Currency Exchange is available from Home, Services and local search and opens `/exchange` directly. Historical Currency Exchange Coming soon links redirect to the converter. Home and service ordering are unchanged. Availability is a navigation/product status, not a claim that API hosting or native store release is complete.

**Official Rate** uses CBM's published KRW indicative cross rate from the market-based column. The API reads the official website's MMK per **100 KRW**, normalizes it exactly to **1 KRW**, and computes both KRW → MMK and MMK → KRW using the original per-100 quote. It verifies the separate CBM Reference Rate API against the website's reference column; that value is shown only for comparison, never substituted for the market rate. The source card shows the original/normalized rate, CBM link, date-only publication, retrieval time in **MMT (Asia/Yangon)** and freshness. Previous/expired/unavailable publications are labelled honestly.

**Hundi Rate is unchanged:** users enter MMK/USD and an editable USD/KRW rate (default 1350), with the same reset, bounds, API formula and result display. Hundi does not require CBM availability. Both modes require connectivity to the calculation API and recalculate as users type; no client financial formula is introduced.

Mobile uses `GET /v1/exchange-rates/krw-mmk/cbm` and `POST /v1/currency-conversions/cbm` for Official Rate, while Hundi retains `/v1/currency-conversions/hundi`. Deploy/restart the updated API and use a device-reachable `EXPO_PUBLIC_API_BASE_URL`; public production hosting is not supplied by this implementation. The pinned contract/types are generated independently. Legacy web reference endpoints remain unchanged.

Failed requests retain inputs and support retry; edits hide stale results and late responses are ignored. Amounts, rates and results stay in session memory, never SQLite/preferences. English/Burmese, appearance and existing local financial records are unchanged. The API owns 15-minute public-rate caching, one-minute attempt spacing, bounded requests, source validation and Myanmar-date expiry. No app build, push, store publication or production deployment is performed by this change; native device QA remains separate.

### Mobile calendar and storage notice

Calendars initially select today in Korea without opening a form. Deliberate session selections and drafts are retained. One app-wide local-storage acknowledgment is remembered on this device, including earlier module acknowledgments. Successful expense Save confirms it automatically; deleting records does not reset it. Calculation requests still submit required inputs to the API. This acknowledgment does not grant advertising consent. Feature screens reserve space for Google test banner ads above the footer; Home retains its existing banner. Live ad units and production consent setup are not enabled by this change.
