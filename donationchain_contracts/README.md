# DonationChain Smart Contracts

## Contract: `DonationRegistry`

- **Does not custody funds** — PKR rails stay JazzCash / Raast / bank
- Anchors donation proofs + off-chain ledger tip hashes on EVM (Polygon recommended)
- Owner-only write (backend wallet / multisig)

### Functions
| Function | Purpose |
|----------|---------|
| `anchorDonation(receiptHash, dataHash, amount)` | Single proof |
| `anchorDonationBatch(...)` | Batch job |
| `anchorLedgerTip(tipHash, blockIndex, note)` | Off-chain chain tip |
| `isAnchored(receiptHash)` / `getProof` | Public verify |

### Deploy
```bash
cd donationchain_contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network hardhat

# Testnet (Polygon Amoy)
export DEPLOYER_KEY=0x...
export AMOY_RPC_URL=https://rpc-amoy.polygon.technology
npx hardhat run scripts/deploy.js --network amoy
```

Copy deployed address into `donationchain/js/contract-config.js`.
