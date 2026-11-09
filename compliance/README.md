# E9 Mate Myanmar — privacy compliance pack

Internal notes for publishing `com.e9mate.myanmar`'s privacy policy and store disclosures.
Not part of the public website (`mobile/docs/`).

**Status: published on 9 November 2026.**

- Live URL: <https://devdrozan.github.io/mobile/>
- Source: `devDrozan/mobile`, branch `main`, folder `/docs`, commit `8f36bc8`
- Verified: page and `styles.css` return HTTP 200 over HTTPS; the served HTML matches the
  committed file byte for byte; `http://` redirects to `https://`; HSTS is present
- GitHub Pages build: `built`, HTTPS enforced

Publishing the page does **not** clear the release blockers. The P0 items in
`outstanding-issues.md` describe the app binary and the store forms, not the policy page.

| Document | Purpose |
| --- | --- |
| `source-audit.md` | What the shipped code actually does: storage, network calls, permissions, SDKs |
| `play-console-checklist.md` | Field-by-field Play Console / Data safety answers |
| `admob-checklist.md` | AdMob privacy, consent and ad-unit requirements |
| `pages-deployment.md` | GitHub Pages setup and the public HTTPS URL |
| `outstanding-issues.md` | Gaps that must be closed before publishing, with priorities |

## What was created

- `mobile/docs/index.html` — English Privacy Policy (single page, no JavaScript)
- `mobile/docs/styles.css` — responsive light/dark styles, print styles
- `mobile/docs/.nojekyll` — keeps GitHub Pages from running Jekyll

## Change control

The page is now public and referenced only by this workspace until the Play Console and
AdMob fields are filled in. Any edit must keep the page accurate for the binary that is
actually released, bump the effective date in `docs/index.html`, and re-run the checks in
`pages-deployment.md` §3. Do not remove the page while the app is published.

## Contact used on the policy

`rozannainghangu@gmail.com` (provided by the owner on 9 November 2026).
