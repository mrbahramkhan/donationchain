# DonationChain Web

Professional transparent donation demo (static).

## Features
- Verified cases, search/filters, Zakat calculator
- Simulated payments (JazzCash / EasyPaisa / Raast / Card)
- Digital receipts + donor impact dashboard
- Admin operations pipeline + fraud queue
- **Hash-chain ledger** (`js/ledger.js`)
- **Merkle batch proofs** (`js/merkle.js`)
- **Smart contract hooks** (`DonationRegistry` + `js/contracts.js`)
- **Explorer** (`explorer.html`) — tip, batches, multi-layer verify
- PWA manifest + service worker

## Run
```bash
cd donationchain
python3 -m http.server 3080
# http://localhost:3080
```

## Demo
- OTP: `123456`
- Payments stored in `localStorage`
- After donate: Verify → ledger / Merkle / on-chain buttons
- Explorer: `/explorer.html`

## Docs
- `BLOCKCHAIN.md` — hash chain
- `MERKLE.md` — Merkle proofs
- `SMART_CONTRACT.md` — on-chain registry
