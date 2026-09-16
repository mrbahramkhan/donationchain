# DonationChain

End-to-end transparent donation platform — **Web + Flutter mobile + Node backend**.

World-level donation platform — designed to run in any country. Separate donor & seeker paths. Multi-currency Zakat (Nisab + Hawl). Multi-language UI. Ledger + Merkle. Shariah board. Raast ISO 20022 payments. RBAC. Production mode by default. Accessibility CI.

**Live:** https://mrbahramkhan.github.io/donationchain/  
**Repo:** https://github.com/mrbahramkhan/donationchain

---

## Packages

| Path | Description |
|------|-------------|
| `donationchain/` | Static web app (PWA, admin, donor/seeker, Zakat+Hawl, analytics, ledger, Merkle, explorer, i18n multi-lang, Shariah, legal pages) |
| `donationchain_mobile/` | Flutter app — role select (Donate / Need help), apply, cases, donate, impact dashboard, Zakat, FCM |
| `donationchain_backend/` | Node.js API — FCM, auth/OTP, SMS, ledger, Merkle, cases/apply, zakat, payments, organizations, shariah, RBAC, Docker + CI |
| `donationchain_contracts/` | Solidity `DonationRegistry` + Hardhat |
| `DonationChain_SRS_v2.0_International.docx` | Current SRS (multi-country, multi-currency, pluggable KYC/payments) |
| `DonationChain_SRS_v1.1.docx` | Earlier SRS |

---

## Global by design

- Default currency **USD**; country selector sets local currency + Nisab
- Payment rails: **Card / Bank / local instant** first; regional wallets (JazzCash, EasyPaisa, Raast, UPI, M-Pesa…) optional per market
- Forms: national ID / passport, international phone — not CNIC-only
- Utility bills: generic electricity / gas / water / telecom — not WAPDA-only
- Languages: en, ur, ar, fr, id, ms, tr, bn, hi, sw

**Not Pakistan-only.** Pakistan rails remain available as a regional option.

## Dual registration (product rule)

| Role | Web | Mobile |
|------|-----|--------|
| **Donor** | `donor/register.html` · Login on home | Login → **Donate** |
| **Seeker (needy)** | `apply.html` | Login → **Need help** → Apply form |
| **Connection** | Cases marketplace | Cases tab — donors fund verified cases only |

Payments always go to **institutions** (hospital / school / vendor / utility), never personal cash accounts.

**OTP:** real SMS when backend `SMS_PROVIDER` is configured. Dev-only offline OTP only if Admin disables Production mode.

---

## What’s implemented (MVP / Phase 1+)

### Web
- Verified cases browse + search/filter
- Donate flow (JazzCash / EasyPaisa / Raast ISO 20022 / Card — live when keys set)
- Digital receipt + impact dashboard + CSV export
- Seeker apply form (`apply.html`)
- Donor register + dashboard
- Admin console (ops + config + roles matrix)
- Zakat calculator (Nisab + Hawl)
- Shariah Compliance Board (`/shariah/`)
- Hash-chain ledger + Merkle batch proofs + Explorer
- Smart-contract hooks (`DonationRegistry`)
- PWA, i18n (en/ur/ar/fr/id/ms/tr/bn/hi/sw), country Nisab profiles, skip-link / a11y baseline
- Organizations + privacy + theme/RBAC client

### Mobile (Flutter)
- Role select: Donate vs Need help
- OTP login (production SMS via backend)
- Apply screen (seeker)
- Cases list + Donate screen + receipt ID on success
- Impact dashboard (lifetime donated, history, empty state)
- Zakat (Nisab + Hawl)
- Admin screen
- FCM push (Firebase placeholders + setup docs)

### Backend
- Auth / OTP, SMS, FCM device registry
- `GET /api/cases`, `POST /api/cases/apply`
- Zakat config + calculate
- Payments store, ledger, Merkle, organizations, shariah
- RBAC middleware, health checks, unit tests + mocks
- Dockerfile + GitHub Actions (Backend CI, Web Deploy Pages, Pa11y a11y)

### Shared principles
- Zero middleman institutional payments
- Transparent audit trail (ledger / Merkle)
- Zakat eligibility + Hawl awareness
- Separate donor / seeker paths by design

---

## Roadmap (not in current MVP)

Aligned with full enterprise SRS (v1.0 vision / Phase 2–4):

- Live JazzCash / EasyPaisa / Raast / Stripe gateways (webhooks)
- Full Vendor / Hospital / School portals
- Real AI fraud models, NADRA VERISYS, document liveness
- Full microservices + AKS multi-region
- Corporate CSR bulk + advanced PDF reports
- Voice assistant, predictive need forecasting
- Multi-country live expansion beyond demo structure

---

## Quick start

### Web
```bash
cd donationchain
python3 -m http.server 3080
# http://localhost:3080
```
Demo OTP: `123456`

### Mobile
```bash
cd donationchain_mobile
flutter pub get
flutter run
```

### Backend
```bash
cd donationchain_backend
npm install
npm start
# http://localhost:4000/health
```

Key APIs:
- `GET  /api/cases` — verified cases (10 sample, aligned with web/mobile)
- `POST /api/cases/apply` — seeker application
- `GET  /api/zakat/config` — Nisab rates
- `POST /api/zakat/calculate` — Nisab + Hawl-aware calc

---

## Zakat (web + mobile)

- Nisab: gold standard (~7.5 tola / 87.48 g)
- Hawl: one lunar year (~354.37 days) above Nisab
- Self-declaration checkbox supported
- Zakat due only if **above Nisab AND Hawl complete**
- Web: `js/zakat.js` · Mobile: `lib/screens/zakat_screen.dart`

---

## Accessibility (WCAG 2.1 AA target)

- Config: `.pa11yci.json`
- Workflow: `.github/workflows/a11y.yml`
- Pages: home, apply, donor register, dashboard, explorer

```bash
cd donationchain && npx --yes serve -l 4173 . &
npx --yes pa11y-ci --config ../.pa11yci.json
```

---

## GitHub Pages

Push to `main` → Actions deploys `donationchain/` to GitHub Pages automatically.

---

## License

Demo / educational use.


---

## Go-live (production)

1. **Push** `main` → GitHub Actions deploys Pages automatically.
2. Backend `.env` from `donationchain_backend/.env.example`:
   - `NODE_ENV=production`
   - `JWT_SECRET` (strong random)
   - SMS (Twilio or other) — real OTP
   - `RAAST_MODE=live` + bank/PSP API keys, IBAN, webhook secret
3. Admin → **Production mode** ON (default).
4. Review Privacy / Terms with counsel.
5. Webhook URL: `https://<api-host>/api/payments/webhook/raast`

Details: `donationchain/PRODUCTION.md` · Deploy: `DEPLOY.md`

**Local commits may be ahead of GitHub** — need a valid PAT to `git push origin main`.
