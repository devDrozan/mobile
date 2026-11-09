# GitHub Pages deployment — privacy policy site

Target URL: **https://devdrozan.github.io/mobile/** — **live since 9 November 2026**.

Source: `devDrozan/mobile`, branch `main`, folder `/docs`, published by commit `8f36bc8`.

## Deployment record

| Check | Result |
| --- | --- |
| GitHub Pages build | `built`, no error |
| `GET https://devdrozan.github.io/mobile/` | `200`, `content-type: text/html; charset=utf-8` |
| `GET …/styles.css` | `200`, `content-type: text/css` |
| `GET http://devdrozan.github.io/mobile/` | `301` to HTTPS |
| HSTS header | `strict-transport-security: max-age=31556952` |
| HTTPS enforcement | `https_enforced: true` |
| Served HTML vs committed file | identical SHA-256 |

Remaining: add the URL to Play Console and AdMob (section 4). The steps below are kept as
the reproducible procedure for a rebuild or a future move.

## 0. Before you start

- [ ] The `devDrozan/mobile` repository is **public** (Pages on a free plan requires it)
- [ ] The policy text has been approved by the owner
- [ ] The contact email on the page is correct and monitored
- [ ] The effective date is correct

## 1. Commit only the policy files

The working tree currently holds unrelated feature work. Do not sweep it into the
policy commit.

```sh
cd mobile
git status --short
git add docs compliance
git commit -m "Add privacy policy site and compliance checklists"
```

If you are on a feature branch, merge or cherry-pick this commit onto `main` rather than
pushing the whole branch:

```sh
git switch main
git pull --ff-only
git cherry-pick <policy-commit-sha>
git push origin main
```

`docs/` is the published site. `compliance/` is internal reference material and is not
linked from the page, but it will be readable in the public repository — keep it free of
secrets and personal data.

## 2. Enable Pages

1. Open `https://github.com/devDrozan/mobile/settings/pages`
2. **Build and deployment → Source:** `Deploy from a branch`
3. **Branch:** `main`, **Folder:** `/docs`
4. **Save**
5. Wait for the "Your site is live" banner (usually 30–90 seconds)
6. Tick **Enforce HTTPS** once the certificate is issued (may take a few minutes; the
   checkbox is unavailable until then)

Equivalent with the GitHub CLI:

```sh
gh api -X POST repos/devDrozan/mobile/pages \
  -f 'source[branch]=main' -f 'source[path]=/docs'
gh api -X PUT repos/devDrozan/mobile/pages -F https_enforced=true
```

`docs/.nojekyll` is included so Pages serves the files as-is without Jekyll processing.

## 3. Verify the deployment

```sh
curl -sI https://devdrozan.github.io/mobile/ | head -20
curl -s  https://devdrozan.github.io/mobile/ | grep -o '<title>.*</title>'
curl -sI https://devdrozan.github.io/mobile/styles.css | head -5
```

Expected:

- `HTTP/2 200` for the page and for `styles.css`
- `content-type: text/html; charset=utf-8` for the page
- `<title>Privacy Policy — E9 Mate Myanmar</title>`
- Any `http://` request to the URL redirects to `https://`
- The page renders with no console errors and makes **no third-party requests** apart from
  the two local files

Browser checks:

- [ ] Phone-width layout: no horizontal scrolling (tables scroll inside their own container)
- [ ] Dark mode via OS setting: readable contrast
- [ ] Keyboard: skip link appears on first Tab; every link is reachable
- [ ] Print preview: no clipped tables, links show their URLs
- [ ] Effective date, app name, package, and email visible without scrolling far
- [ ] No login, no cookie banner, no form

## 4. Add the URL to the stores

- [ ] Play Console → **App content → Privacy policy** → `https://devdrozan.github.io/mobile/`
- [ ] Play Console → **Store presence → Store settings → Store listing contact details →
      Website** (optional; see the app-ads.txt caveat in `admob-checklist.md`)
- [ ] AdMob → **Apps → App settings → Privacy policy URL** (where the field is shown)
- [ ] Re-check that the Play listing privacy policy field is not empty after any app update

## 5. Keeping it live

- Removing the policy URL, or letting the page return 404, is a Play policy violation
  while the app is published.
- Never delete `docs/` from `main` without publishing a replacement first.
- If the site must move, publish the new page, update Play Console and AdMob, then keep a
  redirect or leave the old page in place.

## 6. Rollback

If the page must be withdrawn before it is referenced anywhere:

```sh
# stop serving it
gh api -X DELETE repos/devDrozan/mobile/pages
# or revert the commit
git revert <policy-commit-sha> && git push origin main
```

After the app is published, do **not** delete the page. Replace its content with a short
notice pointing to the current policy instead.

## 7. Optional custom domain

A custom domain (for example `e9mate.app`) would give a stable URL, allow a root-level
`app-ads.txt`, and avoid depending on the `github.io` hostname. It requires buying a
domain and configuring DNS — external actions outside this workspace. If adopted, update
the canonical link in `docs/index.html`, the Play Console field, and the AdMob field.
