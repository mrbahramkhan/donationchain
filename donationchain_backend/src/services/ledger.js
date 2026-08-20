/**
 * Server-side DonationChain verification ledger (hash chain).
 * In-memory for demo; persist to DB/file in production.
 * Optional: anchor tip hash to public L2 later.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DONATIONCHAIN_DATA_DIR
  ? path.resolve(process.env.DONATIONCHAIN_DATA_DIR)
  : path.join(__dirname, '../../data');
const DATA_PATH = path.join(DATA_DIR, 'ledger.json');

function sha256(message) {
  return crypto.createHash('sha256').update(message).digest('hex');
}

function loadChain() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function saveChain(chain) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(chain, null, 2));
}

function ensureGenesis(chain) {
  if (chain.length) return chain;
  const data = {
    type: 'GENESIS',
    message: 'DonationChain Verification Ledger',
    network: 'donationchain-server-v1',
  };
  const hash = sha256('0' + '0' + JSON.stringify(data));
  const genesis = {
    index: 0,
    timestamp: new Date().toISOString(),
    data,
    prevHash: '0',
    hash,
  };
  chain.push(genesis);
  saveChain(chain);
  return chain;
}

function getChain() {
  return ensureGenesis(loadChain());
}

function appendDonation(record) {
  const chain = getChain();
  const prev = chain[chain.length - 1];
  const data = {
    type: 'DONATION',
    receiptId: record.receiptId || record.id,
    amount: record.amount,
    method: record.method,
    case: record.case || record.caseTitle,
    vendor: record.vendor,
    anonymous: !!record.anonymous,
  };
  const timestamp = new Date().toISOString();
  const hash = sha256(prev.hash + timestamp + JSON.stringify(data));
  const block = {
    index: chain.length,
    timestamp,
    data,
    prevHash: prev.hash,
    hash,
  };
  chain.push(block);
  saveChain(chain);
  return block;
}

function verifyChain(chain = getChain()) {
  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];
    const expectedPrev = i === 0 ? '0' : chain[i - 1].hash;
    if (block.prevHash !== expectedPrev) {
      return { valid: false, error: `Broken link at #${i}`, brokenIndex: i };
    }
    let recomputed;
    if (i === 0) {
      recomputed = sha256('0' + '0' + JSON.stringify(block.data));
    } else {
      recomputed = sha256(block.prevHash + block.timestamp + JSON.stringify(block.data));
    }
    if (recomputed !== block.hash) {
      return { valid: false, error: `Hash mismatch at #${i}`, brokenIndex: i };
    }
  }
  return {
    valid: true,
    blocks: chain.length,
    tip: chain[chain.length - 1]?.hash || null,
  };
}

function findByReceipt(receiptId) {
  return getChain().find((b) => b.data && b.data.receiptId === receiptId) || null;
}

module.exports = {
  getChain,
  appendDonation,
  verifyChain,
  findByReceipt,
  sha256,
};
