# E9 Mate Myanmar — privacy compliance pack

Internal notes for publishing `com.e9mate.myanmar`'s privacy policy and store disclosures.
Not part of the public website (`mobile/docs/`).

**Status: prepared, not published.** The policy and website exist locally. No GitHub
Pages site has been enabled and nothing has been pushed.

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

## Publish gate

Do not push `mobile/docs/` or enable Pages until the owner approves the policy text and
resolves the P0 items in `outstanding-issues.md`. The policy describes the app as
released with a production AdMob unit and a consent mechanism; those must match the
binary that ships.

## Contact used on the policy

`rozannainghangu@gmail.com` (provided by the owner on 9 November 2026).
