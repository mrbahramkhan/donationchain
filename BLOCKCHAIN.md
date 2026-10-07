# Blockchain Verification — DonationChain

## What was implemented

Append-only **SHA-256 hash chain** (blockchain-style ledger) for donation integrity.

| Layer | Implementation |
|-------|----------------|
| Web | `js/ledger.js` — browser Web Crypto SHA-256, localStorage chain |
| Payment flow | Each successful donation appends a block (receipt + amount + vendor + prevHash) |
| Receipt UI | Shows block index + short tx hash + “Anchored on ledger” |
| Verify page | `#verify` — enter receipt ID → recompute / validate chain |
| Backend | `src/services/ledger.js` + `GET/POST /api/ledger/*` |

## Block structure

```json
{
  "index": 1,
  "timestamp": "2026-08-03T…",
  "data": {
    "type": "DONATION",
    "receiptId": "DC-…",
    "amount": 5000,
    "method": "jazzcash",
    "case": "…",
    "vendor": "…"
  },
  "prevHash": "<previous block hash>",
  "hash": "sha256(prevHash + timestamp + JSON.stringify(data))"
}
```

Genesis block: `prevHash = "0"`.

## API (backend)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ledger` | Tip hash + validity + counts |
| GET | `/api/ledger/chain` | Full chain |
| GET | `/api/ledger/verify/:receiptId` | Lookup + chain validity |
| POST | `/api/ledger/anchor` | Append donation `{ receiptId, amount, … }` |

## Production roadmap

1. Persist chain in PostgreSQL (append-only table)
2. Periodically **anchor tip hash** on public L2 (Polygon, Base) via a single tx
3. Publish explorer URL: `https://…/tx/{anchorTx}`
4. Optional: Merkle batch of daily donations → one on-chain root

This demo is **not** a cryptocurrency and does not move funds on-chain — it proves **record integrity**.


## Smart contract layer

See **SMART_CONTRACT.md** and `donationchain_contracts/`.

Off-chain hash chain remains the high-throughput record.
`DonationRegistry` on Polygon (or Hardhat local) anchors proofs / ledger tips for public verifiability.
