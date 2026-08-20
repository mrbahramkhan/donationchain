/**
 * Database / persistence mocks for DonationChain backend.
 *
 * Current storage is file-JSON + in-memory Maps (demo).
 * These helpers:
 *  1. Provide pure in-memory stand-ins (no disk)
 *  2. Isolate real modules under a temp DONATIONCHAIN_DATA_DIR
 *  3. Install mocks into require.cache before app boot
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

/** Create unique temp data dir for a test suite */
function createTempDataDir(prefix = 'dc-test-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return dir;
}

function removeTempDataDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

/**
 * Isolate real file-backed services by pointing DONATIONCHAIN_DATA_DIR
 * at a fresh temp folder. Call in before(), cleanup in after().
 */
function useIsolatedDataDir() {
  const prev = process.env.DONATIONCHAIN_DATA_DIR;
  const dir = createTempDataDir();
  process.env.DONATIONCHAIN_DATA_DIR = dir;

  // Clear cached modules that captured paths at load time
  const services = ['ledger.js', 'merkle.js', 'auth.js', 'sms.js'];
  for (const name of services) {
    const p = path.resolve(__dirname, '../../src/services', name);
    delete require.cache[p];
  }

  return {
    dir,
    restore() {
      if (prev === undefined) delete process.env.DONATIONCHAIN_DATA_DIR;
      else process.env.DONATIONCHAIN_DATA_DIR = prev;
      for (const name of services) {
        const p = path.resolve(__dirname, '../../src/services', name);
        delete require.cache[p];
      }
      removeTempDataDir(dir);
    },
  };
}

/**
 * In-memory payments store (mirrors src/services/paymentsStore.js API).
 */
function createPaymentsStoreMock(seed = []) {
  const payments = new Map();
  const byIdempotency = new Map();

  for (const p of seed) {
    payments.set(p.id, { ...p });
    if (p.idempotencyKey) byIdempotency.set(p.idempotencyKey, p.id);
  }

  return {
    save(payment) {
      payments.set(payment.id, payment);
      if (payment.idempotencyKey) byIdempotency.set(payment.idempotencyKey, payment.id);
      return payment;
    },
    get(id) {
      return payments.get(id) || null;
    },
    getByIdempotency(key) {
      const id = byIdempotency.get(key);
      return id ? payments.get(id) : null;
    },
    list(limit = 50) {
      return Array.from(payments.values())
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, limit);
    },
    update(id, patch) {
      const p = payments.get(id);
      if (!p) return null;
      Object.assign(p, patch, { updatedAt: new Date().toISOString() });
      payments.set(id, p);
      return p;
    },
    clear() {
      payments.clear();
      byIdempotency.clear();
    },
    _size: () => payments.size,
  };
}

/**
 * In-memory ledger — same hash-chain rules, no disk I/O.
 */
function createLedgerMock() {
  const chain = [];

  function sha256(message) {
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  function ensureGenesis() {
    if (chain.length) return chain;
    const data = {
      type: 'GENESIS',
      message: 'DonationChain Verification Ledger',
      network: 'donationchain-test',
    };
    const hash = sha256('0' + '0' + JSON.stringify(data));
    chain.push({
      index: 0,
      timestamp: new Date().toISOString(),
      data,
      prevHash: '0',
      hash,
    });
    return chain;
  }

  function getChain() {
    return ensureGenesis();
  }

  function appendDonation(record) {
    const c = getChain();
    const prev = c[c.length - 1];
    const data = {
      type: 'DONATION',
      receiptId: record.receiptId || record.id,
      amount: record.amount,
      caseTitle: record.caseTitle || record.case || '',
      vendor: record.vendor || '',
      method: record.method || '',
    };
    const timestamp = new Date().toISOString();
    const hash = sha256(prev.hash + timestamp + JSON.stringify(data));
    const block = {
      index: c.length,
      timestamp,
      data,
      prevHash: prev.hash,
      hash,
    };
    c.push(block);
    return block;
  }

  function verifyChain(c = getChain()) {
    for (let i = 0; i < c.length; i++) {
      const block = c[i];
      const expectedPrev = i === 0 ? '0' : c[i - 1].hash;
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
    return { valid: true, blocks: c.length, tip: c[c.length - 1]?.hash || null };
  }

  function findByReceipt(receiptId) {
    return getChain().find((b) => b.data && b.data.receiptId === receiptId) || null;
  }

  return {
    getChain,
    appendDonation,
    verifyChain,
    findByReceipt,
    sha256,
    clear() {
      chain.length = 0;
    },
    _chain: chain,
  };
}

/**
 * In-memory cases / applications store.
 */
function createCasesStoreMock(seedCases = []) {
  const cases = seedCases.map((c) => ({ ...c }));
  const applications = [];
  let seq = 1000;

  return {
    listCases() {
      return cases.slice();
    },
    getCase(id) {
      return cases.find((c) => String(c.id) === String(id)) || null;
    },
    addApplication(app) {
      const rec = {
        id: app.id || `APP-${++seq}`,
        status: 'submitted',
        createdAt: new Date().toISOString(),
        ...app,
      };
      applications.push(rec);
      return rec;
    },
    listApplications() {
      return applications.slice();
    },
    getApplication(id) {
      return applications.find((a) => a.id === id) || null;
    },
    updateApplication(id, patch) {
      const a = applications.find((x) => x.id === id);
      if (!a) return null;
      Object.assign(a, patch, { updatedAt: new Date().toISOString() });
      return a;
    },
    clear() {
      applications.length = 0;
    },
  };
}

/**
 * In-memory admin users (auth) — no admin-users.json on disk.
 */
function createAuthUsersMock(seedUsers = []) {
  const users = seedUsers.map((u) => ({ ...u }));

  return {
    loadUsers() {
      return users.map((u) => ({ ...u }));
    },
    saveUsers(list) {
      users.length = 0;
      for (const u of list) users.push({ ...u });
    },
    findByUsername(username) {
      return users.find((u) => u.username === username) || null;
    },
    clear() {
      users.length = 0;
    },
    _users: users,
  };
}

/**
 * Install in-memory paymentsStore into require cache.
 */
function installPaymentsStoreMock(seed) {
  const storePath = path.resolve(__dirname, '../../src/services/paymentsStore.js');
  const mock = createPaymentsStoreMock(seed);
  require.cache[storePath] = {
    id: storePath,
    filename: storePath,
    loaded: true,
    exports: mock,
  };
  return mock;
}

function installLedgerMock() {
  const ledgerPath = path.resolve(__dirname, '../../src/services/ledger.js');
  const mock = createLedgerMock();
  require.cache[ledgerPath] = {
    id: ledgerPath,
    filename: ledgerPath,
    loaded: true,
    exports: mock,
  };
  return mock;
}

function clearDataMocks() {
  for (const name of ['paymentsStore.js', 'ledger.js', 'merkle.js', 'auth.js']) {
    const p = path.resolve(__dirname, '../../src/services', name);
    delete require.cache[p];
  }
}

module.exports = {
  createTempDataDir,
  removeTempDataDir,
  useIsolatedDataDir,
  createPaymentsStoreMock,
  createLedgerMock,
  createCasesStoreMock,
  createAuthUsersMock,
  installPaymentsStoreMock,
  installLedgerMock,
  clearDataMocks,
};
