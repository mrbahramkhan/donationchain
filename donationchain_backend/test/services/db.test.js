/**
 * Database / persistence mocks — no real disk pollution of production data/.
 */
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const {
  createPaymentsStoreMock,
  createLedgerMock,
  createCasesStoreMock,
  createAuthUsersMock,
  useIsolatedDataDir,
  installPaymentsStoreMock,
  clearDataMocks,
} = require('../helpers/db');

describe('PaymentsStore mock (in-memory DB)', () => {
  let store;

  beforeEach(() => {
    store = createPaymentsStoreMock();
  });

  it('save + get round-trip', () => {
    const p = store.save({
      id: 'pay_1',
      amount: 5000,
      status: 'pending',
      createdAt: '2026-08-20T10:00:00.000Z',
    });
    assert.equal(p.id, 'pay_1');
    assert.equal(store.get('pay_1').amount, 5000);
    assert.equal(store.get('missing'), null);
  });

  it('idempotency key lookup', () => {
    store.save({
      id: 'pay_2',
      idempotencyKey: 'idem-abc',
      amount: 100,
      createdAt: '2026-08-20T11:00:00.000Z',
    });
    assert.equal(store.getByIdempotency('idem-abc').id, 'pay_2');
    assert.equal(store.getByIdempotency('nope'), null);
  });

  it('update patches status', () => {
    store.save({
      id: 'pay_3',
      status: 'pending',
      createdAt: '2026-08-20T12:00:00.000Z',
    });
    const updated = store.update('pay_3', { status: 'settled' });
    assert.equal(updated.status, 'settled');
    assert.ok(updated.updatedAt);
    assert.equal(store.update('missing', { status: 'x' }), null);
  });

  it('list sorts newest first and respects limit', () => {
    store.save({ id: 'a', createdAt: '2026-01-01T00:00:00.000Z' });
    store.save({ id: 'b', createdAt: '2026-06-01T00:00:00.000Z' });
    store.save({ id: 'c', createdAt: '2026-03-01T00:00:00.000Z' });
    const list = store.list(2);
    assert.equal(list.length, 2);
    assert.equal(list[0].id, 'b');
    assert.equal(list[1].id, 'c');
  });

  it('clear empties store', () => {
    store.save({ id: 'x', createdAt: '2026-01-01T00:00:00.000Z' });
    store.clear();
    assert.equal(store._size(), 0);
  });
});

describe('Ledger mock (in-memory hash chain)', () => {
  let ledger;

  beforeEach(() => {
    ledger = createLedgerMock();
  });

  it('starts with genesis block', () => {
    const chain = ledger.getChain();
    assert.equal(chain.length, 1);
    assert.equal(chain[0].data.type, 'GENESIS');
    assert.equal(chain[0].prevHash, '0');
  });

  it('appendDonation links prevHash and verifies', () => {
    const block = ledger.appendDonation({
      receiptId: 'RCP-001',
      amount: 10000,
      caseTitle: 'Surgery',
      vendor: 'Hospital',
      method: 'raast',
    });
    assert.equal(block.index, 1);
    assert.equal(block.data.receiptId, 'RCP-001');
    assert.equal(block.prevHash, ledger.getChain()[0].hash);

    const check = ledger.verifyChain();
    assert.equal(check.valid, true);
    assert.equal(check.blocks, 2);
  });

  it('findByReceipt locates donation block', () => {
    ledger.appendDonation({ receiptId: 'RCP-FIND', amount: 1 });
    const found = ledger.findByReceipt('RCP-FIND');
    assert.ok(found);
    assert.equal(found.data.amount, 1);
    assert.equal(ledger.findByReceipt('NOPE'), null);
  });

  it('detects tampered chain', () => {
    ledger.appendDonation({ receiptId: 'RCP-T', amount: 50 });
    ledger._chain[1].data.amount = 999999; // tamper without rehash
    const check = ledger.verifyChain();
    assert.equal(check.valid, false);
    assert.ok(check.error);
  });
});

describe('Cases store mock', () => {
  it('seeds cases and records applications', () => {
    const db = createCasesStoreMock([
      { id: 1, title: 'Heart Surgery', amount: 85000 },
    ]);
    assert.equal(db.listCases().length, 1);
    const app = db.addApplication({
      fullName: 'Ali',
      category: 'medical',
      amountNeeded: 50000,
    });
    assert.ok(app.id.startsWith('APP-'));
    assert.equal(app.status, 'submitted');
    assert.equal(db.listApplications().length, 1);
    db.updateApplication(app.id, { status: 'approved' });
    assert.equal(db.getApplication(app.id).status, 'approved');
  });
});

describe('Auth users mock', () => {
  it('load/save without touching disk', () => {
    const authDb = createAuthUsersMock([
      { username: 'admin', role: 'super_admin', passwordHash: 'x' },
    ]);
    assert.equal(authDb.findByUsername('admin').role, 'super_admin');
    authDb.saveUsers([{ username: 'ops', role: 'regional_admin' }]);
    assert.equal(authDb.loadUsers().length, 1);
    assert.equal(authDb.findByUsername('admin'), null);
  });
});

describe('Isolated data dir (real ledger module, temp disk)', () => {
  let isolation;

  before(() => {
    isolation = useIsolatedDataDir();
  });

  after(() => {
    if (isolation) isolation.restore();
  });

  it('ledger writes only under temp dir', (t) => {
    let ledger;
    try {
      ledger = require('../../src/services/ledger');
    } catch (err) {
      return t.skip('ledger module unavailable: ' + err.message);
    }
    const block = ledger.appendDonation({
      receiptId: 'TEMP-RCP',
      amount: 2500,
      caseTitle: 'Test',
    });
    assert.ok(block.hash);
    const file = path.join(isolation.dir, 'ledger.json');
    assert.ok(fs.existsSync(file), 'ledger.json should exist in temp dir');
    // production data/ledger.json must not be required for this test
    const prod = path.resolve(__dirname, '../../data/ledger.json');
    // if prod exists it should not equal temp content path
    assert.notEqual(file, prod);
    const check = ledger.verifyChain();
    assert.equal(check.valid, true);
  });
});

describe('installPaymentsStoreMock into require cache', () => {
  after(() => clearDataMocks());

  it('require paymentsStore returns mock instance', () => {
    const mock = installPaymentsStoreMock([
      {
        id: 'seed_1',
        amount: 42,
        status: 'settled',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
    const store = require('../../src/services/paymentsStore');
    assert.equal(store.get('seed_1').amount, 42);
    store.save({
      id: 'seed_2',
      amount: 7,
      createdAt: '2026-08-02T00:00:00.000Z',
    });
    assert.equal(mock._size(), 2);
  });
});
