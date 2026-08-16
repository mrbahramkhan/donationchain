/**
 * Server-side Merkle tree for donation batches.
 * SHA-256, sorted-pair parenting (matches js/merkle.js).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/merkle_batches.json');

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function hashPair(aHex, bHex) {
  const a = aHex.replace(/^0x/, '').toLowerCase();
  const b = bHex.replace(/^0x/, '').toLowerCase();
  const [left, right] = a < b ? [a, b] : [b, a];
  return sha256Hex(Buffer.concat([Buffer.from(left, 'hex'), Buffer.from(right, 'hex')]));
}

function leafFromDonation(record) {
  const payload = JSON.stringify({
    id: record.id || record.receiptId,
    amount: Number(record.amount),
    method: record.method || '',
    case: record.case || record.caseTitle || '',
    vendor: record.vendor || '',
    blockHash: record.blockHash || '',
  });
  return sha256Hex(payload);
}

function buildTree(leaves) {
  if (!leaves.length) {
    const empty = sha256Hex('EMPTY');
    return { levels: [[empty]], root: empty };
  }
  let level = leaves.map((l) => l.replace(/^0x/, '').toLowerCase());
  const levels = [level.slice()];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) next.push(level[i]);
      else next.push(hashPair(level[i], level[i + 1]));
    }
    levels.push(next);
    level = next;
  }
  return { levels, root: level[0] };
}

function getProof(leaves, index) {
  const { levels, root } = buildTree(leaves);
  if (index < 0 || index >= levels[0].length) throw new Error('index out of range');
  const proof = [];
  let idx = index;
  for (let layer = 0; layer < levels.length - 1; layer++) {
    const level = levels[layer];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    if (siblingIdx < level.length) {
      proof.push({
        sibling: level[siblingIdx],
        position: isRight ? 'left' : 'right',
      });
    }
    idx = Math.floor(idx / 2);
  }
  return { leaf: levels[0][index], index, proof, root };
}

function verifyProof(leaf, proof, root) {
  let hash = leaf.replace(/^0x/, '').toLowerCase();
  const expected = root.replace(/^0x/, '').toLowerCase();
  for (const step of proof) {
    hash = hashPair(hash, step.sibling);
  }
  return hash === expected;
}

function loadBatches() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function saveBatches(batches) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(batches, null, 2));
}

function createBatch(records, label) {
  const items = records.map((r) => {
    const leaf = leafFromDonation(r);
    return { receiptId: r.id || r.receiptId, amount: r.amount, leaf };
  });
  const leaves = items.map((i) => i.leaf);
  const tree = buildTree(leaves);
  const batch = {
    id: 'MB-' + Date.now().toString(36).toUpperCase(),
    label: label || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    root: tree.root,
    leafCount: leaves.length,
    items,
  };
  const batches = loadBatches();
  batches.unshift(batch);
  saveBatches(batches.slice(0, 100));
  return batch;
}

function proofForReceipt(receiptId) {
  const batches = loadBatches();
  for (const batch of batches) {
    const idx = batch.items.findIndex((i) => i.receiptId === receiptId);
    if (idx === -1) continue;
    const leaves = batch.items.map((i) => i.leaf);
    const proof = getProof(leaves, idx);
    const valid = verifyProof(proof.leaf, proof.proof, batch.root);
    return { found: true, valid, batchId: batch.id, batchLabel: batch.label, root: batch.root, ...proof };
  }
  return { found: false, error: 'Receipt not in any batch' };
}

module.exports = {
  sha256Hex,
  leafFromDonation,
  buildTree,
  getProof,
  verifyProof,
  createBatch,
  proofForReceipt,
  loadBatches,
};
