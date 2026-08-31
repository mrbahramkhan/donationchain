# CI/CD — GitHub Actions deploy

Har **push to `main`** (jab `donationchain/` change ho) automatically:

1. **CI** — web + backend syntax checks  
2. **Deploy Web to GitHub Pages** — validate → publish site  

**Live:** https://mrbahramkhan.github.io/donationchain/

---

## One-time setup (required)

### 1. Pages source = GitHub Actions

1. Open: https://github.com/mrbahramkhan/donationchain/settings/pages  
2. **Build and deployment → Source:** **GitHub Actions**  
3. Save  

(Fallback: Source = Deploy from a branch → `gh-pages` / `/ (root)` — workflow dual-publish karta hai.)

### 2. Workflow permissions (usually automatic)

Repo → **Settings → Actions → General**:

- **Workflow permissions:** Read and write permissions  
- **Allow GitHub Actions to create and approve pull requests** (optional)

Workflow already requests:

```yaml
permissions:
  contents: write
  pages: write
  id-token: write
```

### 3. Environment (first deploy ke baad)

Pehli successful run ke baad GitHub `github-pages` environment bana deta hai.  
Settings → Environments → `github-pages` — protection rules optional.

---

## Workflows

| File | Name | Trigger |
|------|------|---------|
| `.github/workflows/deploy-pages.yml` | **Deploy Web to GitHub Pages** | Push `main` + path `donationchain/**`, ya manual |
| `.github/workflows/ci.yml` | CI | Push / PR |
| `.github/workflows/backend.yml` | Backend CI | Backend changes |
| `.github/workflows/a11y.yml` | Accessibility (Pa11y) | Configured pages |

### Deploy jobs (deploy-pages.yml)

1. **Build & validate** — required HTML/JS files, `node --check` on all `js/*.js`, copy to `_site`  
2. **Deploy (GitHub Pages)** — `actions/deploy-pages@v4`  
3. **Deploy (gh-pages fallback)** — `peaceiris/actions-gh-pages` → branch `gh-pages`

---

## Deploy kaise chalaye

### Auto (recommended)

```bash
git add donationchain/
git commit -m "update web"
git push origin main
```

Sirf `donationchain/**` (ya workflow file) change par deploy trigger hota hai.

### Manual (bina code change)

1. https://github.com/mrbahramkhan/donationchain/actions  
2. Left sidebar: **Deploy Web to GitHub Pages**  
3. **Run workflow** → branch `main`  
4. Optional: `force_gh_pages = true`

---

## Flow

```text
git push origin main
    → path filter (donationchain/**)
    → Build & validate
    → Upload Pages artifact
    → Deploy (Actions Pages)  →  https://mrbahramkhan.github.io/donationchain/
    → Optional: publish gh-pages branch
```

---

## Custom domain (optional)

1. DNS: A records (GitHub IPs) + CNAME `www` → `mrbahramkhan.github.io`  
2. Settings → Pages → Custom domain = `donationchain.pk`  
3. Repo file: `donationchain/CNAME` with content `donationchain.pk`  
4. Enforce HTTPS  
5. Cloudflare: pehle DNS-only, phir SSL **Full** → **Full (strict)**

Details: project chat / registrar docs.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Workflow nahi chala | Path filter — `donationchain/` change + push, ya **Run workflow** manual |
| Pages 404 | Settings → Source = **GitHub Actions**; pehli deploy wait |
| Permission denied | Settings → Actions → General → Workflow permissions = Read and write |
| Deploy failed on missing file | Workflow required list check; local `donationchain/` complete ho |
| Old site dikhe | Hard refresh / CDN wait 1–2 min; Actions log mein new SHA confirm |

---

## Local commits abhi pending

Agar machine pe `main` origin se ahead hai:

```bash
git push origin main
```

Push ke baad Actions tab mein **Deploy Web to GitHub Pages** green hone do, phir live URL open karo.

---

## SHA-based cache busting

Deploy workflow rewrites **local** asset URLs in `_site/**/*.html` only (source tree stays clean):

- `js/*.js`, `css/*.css`, `manifest.json`, `sw.js` → `?v=<short-sha>`
- CDN scripts (Tailwind, Font Awesome, etc.) **unchanged**
- Service worker register path also versioned

Example after deploy:

```html
<script src="js/app.js?v=a1b2c3d"></script>
<link rel="stylesheet" href="css/theme.css?v=a1b2c3d" />
```

Local `python3 -m http.server` still uses unversioned paths — fine for development.

