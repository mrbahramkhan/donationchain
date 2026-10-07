# Smart Contract Integration — DonationChain

## Design principle

**The contract does not hold or move donor funds.**  
PKR still flows via JazzCash / EasyPaisa / Raast / bank to verified vendors.  
The chain only stores **cryptographic proofs** for public audit.

## Contract: `DonationRegistry`

Path: `donationchain_contracts/contracts/DonationRegistry.sol`

| Function | Role |
|----------|------|
| `anchorDonation(receiptHash, dataHash, amount)` | Anchor one donation proof |
| `anchorDonationBatch(...)` | Batch backend job |
| `anchorLedgerTip(tipHash, blockIndex, note)` | Publish off-chain ledger tip |
| `isAnchored` / `getProof` | Anyone can verify |

`receiptHash = keccak256(receiptId string)`  
`dataHash = keccak256(JSON of amount/case/vendor/method)`

## Repo layout

```
donationchain_contracts/
  contracts/DonationRegistry.sol
  abi/DonationRegistry.json
  scripts/deploy.js
  hardhat.config.js
donationchain/js/
  contract-config.js   ← set deployed address
  contracts.js         ← ethers read/write helpers
```

## Deploy

```bash
cd donationchain_contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network hardhat

# Polygon Amoy testnet
export DEPLOYER_KEY=0xYOUR_PRIVATE_KEY
npx hardhat run scripts/deploy.js --network amoy
```

Put the address into `donationchain/js/contract-config.js` → `address`.

## Web app behaviour

1. Donation succeeds → off-chain **Ledger** block (SHA-256)  
2. If contract address is zero → **simulate** on-chain flag in localStorage  
3. If contract configured → UI can **Check on-chain** via RPC  
4. Owner wallet (MetaMask) can call `anchorDonation` (demo helper in `contracts.js`)

## Verify UX

- **Verify ledger** — local hash-chain  
- **Check on-chain** — `DonationRegistry.isAnchored`

## Security

- Owner key only on backend HSM / multisig  
- Never put deployer key in frontend  
- Prefer batch tip anchors for gas efficiency in production  


## Merkle batch roots

See **MERKLE.md**. Contract supports `anchorMerkleRoot(root, leafCount, label)` for daily batch audit.
