# DonationChain Web

Static transparent donation site (PWA) — deployed via GitHub Actions to Pages.

## Features
- Verified cases, search/filters, Zakat calculator (Nisab + Hawl)
- Simulated payments (JazzCash / EasyPaisa / Raast / Card)
- Digital receipts + donor impact dashboard
- Admin operations + config + RBAC matrix
- Hash-chain ledger + Merkle proofs + Explorer
- Smart contract hooks (`DonationRegistry`)
- Shariah board page, organizations, privacy
- PWA (`manifest.json` + `sw.js`), i18n EN/UR, skip-link a11y
- SHA cache-busting on deploy (`?v=<short-sha>`)
- Custom domain ready (`CNAME` → donationchain.pk)
- `404.html`, `robots.txt`, expanded `sitemap.xml`, `security.txt`

## Run locally
```bash
cd donationchain
python3 -m http.server 3080
# http://localhost:3080
```

## Demo
- OTP: `123456`
- Payments in `localStorage`
- After donate: ledger / Merkle / on-chain verify
- Explorer: `/explorer.html`

## Deploy
Push `donationchain/**` to `main` → workflow **Deploy Web to GitHub Pages**.  
See root `DEPLOY.md`.

## Docs
- `BLOCKCHAIN.md` — hash chain  
- `MERKLE.md` — Merkle proofs  
- `SMART_CONTRACT.md` — on-chain registry  
