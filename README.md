# E9 Mate Myanmar — Mobile

Android and iPhone worker toolkit for Myanmar E-9 workers in South Korea, built with Expo / React Native. The Home dashboard opens the Severance Calculator, Salary Estimate from Work Time, and E-9 Insurance. Other tools are labelled Coming soon and open explanatory pages. The calculator supports English and Burmese with bundled Myanmar fonts and estimates gross KRW amounts before tax.

## Using the calculator

Choose a language and Normal, DB, or DC, enter employment details, complete the special-case questions, and enter wages for the displayed periods. Review the inputs before submitting, then read the eligibility explanation, estimate, breakdown, and official sources. Cases needing individual review show an explanation without a benefit total. DC required contributions and an optional reported account balance appear separately.

No account is required. Calculations need a connection to the API. Entries stay in memory while consulting guidance and returning to the calculator; only language and appearance preferences are saved for this calculator. The salary module can save its own work records and pay settings locally in SQLite. Closing or reloading the app clears the calculation session. Fractional weekly hours remain intact while typing, and reported DC balances keep their entered decimal precision on results.

On launch, the existing won logo and configured app name, **E9 Mate Myanmar**, appear for three seconds before Home opens. Local fonts and saved preferences finish loading before the handoff; an unavailable API does not delay it. Normal navigation and returning from the background do not replay the splash. The screen supports Light and Dark appearance and larger text.

Home shows one swipeable carousel with useful information and clearly labelled sample E9 Mate ads, followed by service and Coming soon cards. The sample ads link to existing E9 Mate services; no paid ads run yet. Salary Estimate from Work Time combines work-time records and salary estimation into one available service in the local source. Available cards open their services; other planned cards open explanatory pages. The top bar has clickable Light/Dark, Language, and Search icons. The Home, Services, and Notices footer appears on hub pages; Notices has an empty state, and Profile is not included yet. Search filters services locally; Language offers English and Burmese. Appearance initially follows the device until you tap its icon; the selected appearance and language are remembered. About us is linked from Home. In the Severance Calculator, tabs switch between Calculator and How it works, followed by the existing Normal, DB, and DC calculation flow. Use Back to Home to leave a service. An in-progress calculation stays available during the same app session. Every screen includes the current-year copyright notice.

## Salary Estimate from Work Time

The Salary service is enabled in the local source. Open its card from Home, Services, or Search, or use `/work`. `/salary` and historical `/coming-soon?id=work` or `/coming-soon?id=salary` links redirect to `/work`. Android/iOS native release checks remain outstanding; local availability does not certify a released binary.

Choose a month, set basic salary and the five hourly rates, select calendar dates (or the accessible date list), and enter normal, overtime, and overlapping night hours. Accept the local-storage disclosure and tap **Save this month on device** to retain edits, including day removals. Month switching retains unsaved drafts during this screen session; leaving the screen or closing the app discards unsaved edits. New months copy the latest earlier saved pay settings without changing that month's records.

The API estimates the full base plus weekday overtime, Saturday work, Sunday work, and additive night premiums. Normal hourly rate is reference-only. Missing dates do not reduce the base. Tax, insurance, absence deductions, partial-month proration, public-holiday rules, and automatic statutory rate determination are excluded.

Salary settings and records persist only on this device in `e9-work-time.db` (versioned SQLite schema 1); confirmed delete-month/delete-all actions remove them. There is no cloud sync or export/backup feature. **Calculate / Retry estimate** sends only the selected month's draft to the stateless API and never saves it. Results stay in memory and are invalidated by edits. Drafts survive request/storage failures while the screen remains open. Recording and saving work offline; calculation requires connectivity. The Expo web preview does not open native SQLite and gives a recovery explanation; use the independent web/PWA for IndexedDB storage.

The SQLite dependency is pinned to SDK 58 documentation's `~58.0.14`; the bundled compatibility map recommends patch 58.0.15, which was unavailable before this environment's registry cutoff. Recheck the compatible patch with Expo before release. The SQLite dependency and config plugin require a new native binary. JavaScript exports and mocked SQLite tests do not certify native persistence, upgrades, deletion, Burmese rendering, accessibility, or device data-backup behavior. Complete Android/iOS device verification before publishing a native release.

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
