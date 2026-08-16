# CI/CD — Auto deploy

Har **push to `main`** automatically:

1. **CI** — web + backend JS syntax, contracts present  
2. **Deploy** — validates `donationchain/` → publishes site  

## One-time Pages setup

https://github.com/mrbahramkhan/donationchain/settings/pages

**Recommended (branch method):**

- Source: **Deploy from a branch**
- Branch: **`gh-pages`** / folder: **/ (root)**

**Optional:** Source **GitHub Actions** (official deploy action).

## Live URL

https://mrbahramkhan.github.io/donationchain/

## Flow

```text
git push origin main
    → CI (parallel checks)
    → Build & validate
    → Deploy Pages (Actions) + gh-pages branch
```

Manual: **Actions → Deploy Web to GitHub Pages → Run workflow**
