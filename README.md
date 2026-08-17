# DonationChain

End-to-end transparent donation platform (Pakistan-focused, international-ready).

**Web + Flutter mobile + Node backend** — separate donor & seeker paths, Zakat (Nisab + Hawl), ledger, accessibility CI.

## Packages

| Path | Description |
|------|-------------|
| `donationchain/` | Static web app (PWA, admin, donor, seeker apply, Zakat+Hawl, ledger, Merkle, i18n EN/UR) |
| `donationchain_mobile/` | Flutter app — role select (Donate / Need help), apply form, cases, Zakat Nisab+Hawl, FCM |
| `donationchain_backend/` | Node.js API — FCM, auth, SMS, ledger, Merkle, **cases/apply**, **zakat config** |
| `donationchain_contracts/` | Solidity `DonationRegistry` + Hardhat |
| `DonationChain_SRS_v1.1.docx` | SRS with separate forms + connection model |

## Dual registration (product rule)

| Role | Web | Mobile |
|------|-----|--------|
| **Donor** | `donor/register.html` | Login → “Donate” |
| **Seeker (needy)** | `apply.html` | Login → “Need help” → Apply form |
| **Connection** | Cases marketplace | Cases tab — donors fund verified cases only |

Payments always go to **institutions** (hospital/school/vendor), never personal cash.

## Quick start — Web

```bash
cd donationchain
python3 -m http.server 3080
# http://localhost:3080
```

Demo OTP: `123456`

## Quick start — Mobile

```bash
cd donationchain_mobile
flutter pub get
flutter run
```

## Quick start — Backend

```bash
cd donationchain_backend
npm install
npm start
# http://localhost:4000/health
```

Key APIs:

- `GET  /api/cases` — verified cases
- `POST /api/cases/apply` — seeker application
- `GET  /api/zakat/config` — Nisab rates
- `POST /api/zakat/calculate` — Nisab + Hawl-aware calc

## Zakat (web + mobile)

- Nisab: gold standard (~7.5 tola / 87.48 g)
- Hawl: one lunar year (~354.37 days) above Nisab
- Self-declaration checkbox supported
- Zakat due only if **above Nisab AND Hawl complete**
- Web: `js/zakat.js` · Mobile: `lib/screens/zakat_screen.dart`

## Accessibility (WCAG 2.1 AA target)

- Config: `.pa11yci.json`
- Workflow: `.github/workflows/a11y.yml`
- Pages: home, apply, donor register, dashboard, explorer

```bash
cd donationchain && npx --yes serve -l 4173 . &
npx --yes pa11y-ci --config ../.pa11yci.json
```

## GitHub Pages

Push to `main` → Actions deploys `donationchain/` to GitHub Pages automatically.

Repo: https://github.com/mrbahramkhan/donationchain

## License

Demo / educational use.
