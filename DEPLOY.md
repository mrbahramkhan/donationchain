# Deploy — GitHub Pages

## One-time setup

1. Push this repo to GitHub (`main` branch).
2. **Settings → Pages → Source: GitHub Actions**
3. **Settings → Actions → General** — allow Actions (read/write for Pages).

## Automatic deploy

Any push to `main` that changes `donationchain/**` runs:

1. **Build & validate** — required files + `node --check` on all JS  
2. **Deploy** — publishes `donationchain/` to GitHub Pages  

Manual run: **Actions → Deploy Web to GitHub Pages → Run workflow**

## URL

```
https://<username>.github.io/<repo-name>/
```

If the site is at a subpath and assets 404, keep using **relative** paths (`js/app.js`, not `/js/app.js`) — already the case.

## Workflows

| File | Role |
|------|------|
| `.github/workflows/deploy-pages.yml` | Validate + deploy static web |
| `.github/workflows/ci.yml` | PR/push syntax checks (web, backend, contracts) |
