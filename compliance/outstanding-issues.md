# Outstanding compliance issues

Priorities:

- **P0** — must be fixed before the first Play release; the policy or the binary is
  currently inaccurate/incomplete without it.
- **P1** — fix before or immediately after launch; a reviewer or user can reasonably
  object.
- **P2** — hygiene and future-proofing.

## P0 — release blockers

### P0-1. The release build ships a Google **test** ad unit
`src/components/HomeBannerAd.tsx` uses `TestIds.ADAPTIVE_BANNER`. Test units never serve
real ads and are not a production integration. Create a banner unit in AdMob and use it
for release builds; keep the test ID for development. See `admob-checklist.md` §2.

### P0-2. A release build has no API address unless it is provided at build time
`src/api/client.ts` falls back to `''` in production, and `hasUsableApiUrl('')` is false,
so every calculation fails with an "unavailable" error. The release must be built with
`EXPO_PUBLIC_API_BASE_URL` set to the deployed **HTTPS** origin. This is a functional
blocker that also makes the policy's API section describe something the binary cannot do.

- [ ] Set `EXPO_PUBLIC_API_BASE_URL=https://<api-host>` in the release build environment
- [ ] Confirm the value is HTTPS (non-HTTPS is rejected in release, by design)
- [ ] Confirm the deployed API has no database and `logger: false`

### P0-3. `useSQLCipher: true` is configured but no key is ever set
`app.json` declares SQLCipher for `expo-sqlite`, but no `PRAGMA key` is executed and no
`cipher_version` check exists. Per Expo's SDK 58 SQLite documentation, SQLCipher only
encrypts once a key is set, so the databases are stored unencrypted today. The policy
therefore makes **no encryption-at-rest claim**; if the flag stays, a reviewer or a
security tester may reasonably read it as a false claim.

Choose one:

- [ ] **Remove** `useSQLCipher: true` so the configuration matches the behaviour, or
- [ ] **Implement** it: derive/store a key (for example in `expo-secure-store`), run
      `PRAGMA key` before any query, verify `PRAGMA cipher_version`, migrate existing
      databases, and update the policy's Security section only after it is verified

### P0-4. Play Data safety must declare the calculation inputs
Severance/salary/currency inputs leave the device, and Play treats that as collection even
when processing is ephemeral. Complete the form using `play-console-checklist.md` §3,
including "Financial info → Other financial info" marked **ephemeral**. Expense data must
**not** be declared. An empty or contradictory Data safety form is a common rejection cause.

### P0-5. The policy must keep matching the shipped binary
The policy states: non-personalized ads only, no analytics, no server storage, expense data
never transmitted, Android backup disabled. Each of these is currently true. If any changes
before release — especially enabling personalized ads — sections 5, 9, and 15 and the Data
safety rows must be updated **in the same release**.

## P1 — fix before or immediately after launch

### P1-1. No consent mechanism and no CMP decision
No UMP/`AdsConsent` integration exists. Google requires a certified CMP only when serving
personalized ads in the EEA/UK/CH; with non-personalized ads, users without a Purpose 1
consent signal may receive limited ads. Decide Option A or Option B in
`admob-checklist.md` §4 and record the decision, so the store answers and the policy stay
truthful.

### P1-2. Currency module is presented as "Coming soon" but is reachable and functional
The catalog marks `exchange` as `planned`, the hub card shows "Coming soon · preview", yet
the `/exchange` route calls the API and can display a live reference rate. This is not a
privacy problem, but a store reviewer comparing the listing to the app may find it
inconsistent. Align the copy (either enable the module properly or gate the route), and
never describe it as a transfer service or a guaranteed rate.

### P1-3. Legacy storage permissions in the merged manifest
`expo-file-system` contributes `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` capped at
`maxSdkVersion="32"`. The app does not read user files. Play may ask for a declaration, and
the permissions look broader than the app's behaviour.

- [ ] Add `android.blockedPermissions` for both (or stop depending on `expo-file-system`
      if nothing uses it)
- [ ] Re-run `npx expo config --type introspect` and confirm the merged manifest
- [ ] Re-check Data safety after the change

### P1-4. Ad error logging in production
`console.log('Banner Ad error:', error)` writes an ad error code to the device console. It
contains no user data, but remove it or gate it behind `__DEV__` for release hygiene.

### P1-5. app-ads.txt cannot be verified on a project page
AdMob looks for `https://devdrozan.github.io/app-ads.txt`, which this repository cannot
serve. Not fatal for a plain banner, but it blocks app-ads.txt verification and some demand.
A custom domain or a `devdrozan.github.io` user site is required. Keep this in mind before
setting the store's developer website field.

### P1-6. No in-app path to the policy
Nothing in the app links to the privacy policy. Play does not require an in-app link, but
AdMob privacy messaging and user trust are better with one. A simple "Privacy" row on the
About screen pointing at `https://devdrozan.github.io/mobile/` would close this without new
data collection.

### P1-7. Contact and deletion workflow
`rozannainghangu@gmail.com` is the only contact channel. Deletion is normally local, but a
request that arrives by email still needs an answer.

- [ ] Monitor the address (Play shows it publicly)
- [ ] Reply to deletion/access requests within 30 days
- [ ] Keep the reply wording consistent with the policy: no account, no server records

## P2 — hygiene and future-proofing

- [ ] Keep `allowBackup: false`; a future change to backup behaviour requires a policy update
- [ ] **iOS:** if the app is ever published on the App Store, add the ATT prompt before any
      advertising identifier access, and update sections 5 and 7 of the policy
- [ ] **Store listing claims:** no "encrypted", "statutory/guaranteed", "live exchange rate",
      or "money transfer" wording; no screenshots with real salary or expense data
- [ ] **Rate limiting and CORS:** confirm the deployed API keeps the 100 req/min limit,
      `Cache-Control: no-store`, and a CORS allow-list that contains only the real web
      origins (native clients send no Origin)
- [ ] **Policy maintenance:** bump the effective date on every material change; consider a
      short change log below the summary if updates become frequent
- [ ] **Burmese translation:** the policy is English-only. Optional, but Play reviewers and
      Myanmar users may expect a Burmese version; if added, host it as a second page and
      link both directions
- [ ] **Website hosting:** GitHub Pages logs are disclosed in section 16; if the site ever
      moves to a host that sets cookies or collects analytics, the policy must change
- [ ] **Third-party SDK review:** re-run `source-audit.md` whenever a dependency is added;
      a single analytics or crash-reporting SDK would invalidate sections 5 and 6
