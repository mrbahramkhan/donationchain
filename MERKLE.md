# Merkle Tree Proofs — DonationChain

## Why Merkle?

Instead of putting every donation on-chain, batch N donations into a **binary Merkle tree** and anchor only the **root** (32 bytes). Any single donation can later prove inclusion with a short sibling path (~log₂ N hashes).

```
   Root  ← anchor on-chain (anchorMerkleRoot)
  /    \
 H01    H23
 / \    / \
L0 L1  L2 L3   ← leaf = SHA256(donation JSON)
```

## Implementation

| Layer | File |
|-------|------|
| Browser | `js/merkle.js` |
| Backend | `src/services/merkle.js` + `routes/merkle.js` |
| Contract | `DonationRegistry.anchorMerkleRoot` + `verifyMerkleKeccak` |
| UI | Verify section → **Merkle proof** button |

## Leaf format

```json
SHA256({ id, amount, method, case, vendor, blockHash })
```

Parent nodes: **sorted-pair** SHA-256 (left/right ordered by hex so proof is order-stable).

## Flow

1. User donates → hash-chain block (ledger)  
2. `Merkle.rebuildFromDonations()` rebuilds batch from all local receipts  
3. User opens **Verify** → enters receipt ID → **Merkle proof**  
4. UI shows root, leaf, sibling path, valid/invalid  
5. Production backend: `POST /api/merkle/batch` daily → `anchorMerkleRoot` on Polygon  

## API

| Method | Path | Body / params |
|--------|------|----------------|
| POST | `/api/merkle/batch` | `{ records: [...], label? }` |
| GET | `/api/merkle/proof/:receiptId` | inclusion proof |
| GET | `/api/merkle/batches` | list roots |
| POST | `/api/merkle/verify` | `{ leaf, proof, root }` |

## On-chain note

- Off-chain proofs use **SHA-256** (Web Crypto / Node crypto).  
- `verifyMerkleKeccak` on the contract is for **EVM-native** demos (keccak pairs).  
- For strict SHA-256 on-chain verification, use a SHA-256 precompile, verify off-chain, or store only the root and trust the published proof JSON.

## Gas savings

| Approach | On-chain writes for 1,000 donations |
|----------|-------------------------------------|
| Per-donation `anchorDonation` | 1,000 txs |
| Daily Merkle root | 1 tx |
