/**
 * Firebase credential loading from env JSON / file (no firebase-admin).
 */
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

function freshLoader() {
  const modPath = require.resolve('../../src/services/firebaseCredentials');
  delete require.cache[modPath];
  return require('../../src/services/firebaseCredentials');
}

describe('loadServiceAccount', () => {
  const prevSa = process.env.FIREBASE_SERVICE_ACCOUNT;
  const prevGac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let tmpFile;

  beforeEach(() => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  });

  afterEach(() => {
    if (prevSa === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT;
    else process.env.FIREBASE_SERVICE_ACCOUNT = prevSa;
    if (prevGac === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    else process.env.GOOGLE_APPLICATION_CREDENTIALS = prevGac;
    if (tmpFile) {
      try { fs.unlinkSync(tmpFile); } catch (_) {}
      tmpFile = null;
    }
  });

  it('parses FIREBASE_SERVICE_ACCOUNT JSON from env', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
      client_email: 'firebase-adminsdk@test.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n',
      project_id: 'demo',
    });
    const { loadServiceAccount } = freshLoader();
    const loaded = loadServiceAccount();
    assert.ok(loaded);
    assert.equal(loaded.source, 'env:FIREBASE_SERVICE_ACCOUNT');
    assert.ok(loaded.serviceAccount.client_email.startsWith('firebase-adminsdk'));
    assert.ok(loaded.serviceAccount.private_key.includes('\n'));
  });

  it('returns null on invalid JSON', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT = '{not-json';
    const { loadServiceAccount } = freshLoader();
    assert.equal(loadServiceAccount(), null);
  });

  it('returns null when required fields missing', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ project_id: 'x' });
    const { loadServiceAccount } = freshLoader();
    assert.equal(loadServiceAccount(), null);
  });

  it('loads from GOOGLE_APPLICATION_CREDENTIALS file path', () => {
    tmpFile = path.join(os.tmpdir(), `dc-sa-${Date.now()}.json`);
    fs.writeFileSync(
      tmpFile,
      JSON.stringify({
        client_email: 'file@test.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nXYZ\n-----END PRIVATE KEY-----\n',
        project_id: 'file-demo',
      })
    );
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpFile;
    const { loadServiceAccount } = freshLoader();
    const loaded = loadServiceAccount();
    assert.ok(loaded);
    assert.match(loaded.source, /^file:/);
    assert.equal(loaded.serviceAccount.client_email, 'file@test.iam.gserviceaccount.com');
  });

  it('prefers env JSON over file path', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
      client_email: 'env@test.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nE\n-----END PRIVATE KEY-----\n',
    });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/nonexistent/path.json';
    const { loadServiceAccount } = freshLoader();
    const loaded = loadServiceAccount();
    assert.equal(loaded.source, 'env:FIREBASE_SERVICE_ACCOUNT');
    assert.equal(loaded.serviceAccount.client_email, 'env@test.iam.gserviceaccount.com');
  });

  it('returns null when nothing configured', () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/dc-definitely-missing.json';
    const { loadServiceAccount } = freshLoader();
    assert.equal(loadServiceAccount(), null);
  });
});
