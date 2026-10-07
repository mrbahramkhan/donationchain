# DonationChain — Global Final Release v2.2.0

**Release date:** 2026-10-07  
**Codename:** Global Final Release  
**Scope:** Worldwide (multi-country · multi-currency · multi-language)  
**Stack:** Web (static PWA) + Flutter mobile + Node backend + Solidity hooks  

**Live web:** https://mrbahramkhan.github.io/donationchain/  
**Repository:** https://github.com/mrbahramkhan/donationchain  

**Governing specs**
- `DonationChain_SRS_v2.0_International.docx` (primary)
- `DonationChain_SRS_v1.1.docx` (form separation heritage)
- `docs/GAP_CHECKLIST.md` (implementation honesty matrix)

---

## 1. Release positioning

DonationChain **v2.2.0-global** is the first formal **global-level product release** of the end-to-end platform:

| Surface | Role |
|---------|------|
| **Web** | Donor discovery, donate, Zakat, bills, ledger/Merkle explorer, admin, Shariah, legal |
| **Mobile** | Role-select (Donate / Need help), apply, cases, donate, impact, Zakat, FCM |
| **Backend** | Auth/OTP, cases/apply, zakat, payments, FX quotes, Raast ISO 20022, ledger, RBAC, FCM/SMS |

**Product rule (non-negotiable):** payments go to **institutions** (hospital / school / vendor / utility) — never personal cash to beneficiaries.

**Dual path:** Donor registration and seeker apply are **separate** on web and mobile.

---

## 2. What ships in v2.2.0-global

### Global product
- Default currency **USD**; country/locale drives local currency & Nisab
- Sample cases across **EG, ID, KE, PK, TR, BD, MY, JO, MA, NG** with `country` + `currency`
- Web meta / bills UX no longer Pakistan-only
- i18n languages: en, ur, ar, fr, id, ms, tr, bn, hi, sw (coverage varies by string)
- Production mode ON by default (demo OTP off unless admin disables production)

### Transparency
- Hash-chain ledger + Merkle batch proofs + explorer
- Smart-contract registry hooks (Polygon Amoy config)
- Digital receipts; institutional payout messaging

### Islamic finance
- Zakat calculator: Nisab + Hawl
- Shariah compliance board (web + API)

### Payments / rails
- Card / bank / local instant rails (simulated + provider hooks)
- Raast ISO 20022 mapping (UETR, pain.001 fields, retry catalog) where configured
- FX quote API (`/api/fx`) for multi-currency

### Ops & quality
- Admin console (ops + config + RBAC)
- Backend unit tests + Docker + CI workflows
- GitHub Pages deploy with **SHA cache-busting** (`?v=<short-sha>`)
- a11y baseline (Pa11y / skip-link)
- Legal: privacy, terms, contact; `security.txt`; CNAME for custom domain

---

## 3. SRS v2.0 alignment (honest summary)

| SRS theme | Status in this release |
|-----------|------------------------|
| Zero middleman institutional pay | **Core** — enforced in UX + flows |
| Dual donor / seeker paths | **Done** |
| Web + Flutter + API | **Done** (MVP depth) |
| Multi-country / multi-currency | **Partial → visible** (samples, FX API, filters; full tenant isolation later) |
| Zakat + Shariah | **Done** (calculator + board) |
| Ledger / audit | **Done** (hash chain + Merkle; not full enterprise SIEM) |
| AI fraud / full KYC rails | **Not in this release** (roadmap) |
| Full vendor / NGO portals | **Not in this release** (admin + org hooks only) |
| Live multi-country gateways | **Hooks + PK stronger**; other markets config-driven |

See `docs/GAP_CHECKLIST.md` for item-level `[x] / [~] / [ ]`.

---

## 4. Version matrix

| Component | Version |
|-----------|---------|
| Product release | **2.2.0-global** |
| Web `donationchain/VERSION` | 2.2.0-global |
| Backend `package.json` | 2.2.0 |
| Mobile `pubspec.yaml` | 2.2.0+1 |

---

## 5. Install / run

```bash
# Web
cd donationchain && python3 -m http.server 3080

# Backend
cd donationchain_backend && npm install && npm start

# Mobile
cd donationchain_mobile && flutter pub get && flutter run
```

Production checklist: `donationchain/PRODUCTION.md`  
Deploy: root `DEPLOY.md` (GitHub Actions → Pages)

---

## 6. Known limitations (explicit)

1. Full multi-tenant row-level isolation not complete  
2. FX quotes not fully wired into every donate UI path  
3. OpenAPI covers case-verification slice; not entire API surface  
4. Live PSP credentials must be provisioned per market  
5. Mobile country-onboarding wizard still lightweight  

These do **not** block the global MVP release; they are Phase-next.

---

## 7. Sign-off

| Role | Status |
|------|--------|
| Product / positioning | Global Final Release declared |
| Web | Global samples + SEO/meta + deploy pipeline |
| Mobile | Global cases + currency display |
| Backend | Global cases + `?country=` / `?currency=` filter + FX |
| Compliance docs | SRS v2.0 + gap checklist + this release note |

---

*DonationChain v2.2.0-global — built for worldwide activation, country by country.*
