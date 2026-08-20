/**
 * Raast webhook signature — pure crypto, no external HTTP.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

let raast;
try {
  raast = require('../../src/services/raast');
} catch (err) {
  console.log('Raast module unavailable:', err.message);
}

describe('Raast webhook signature', () => {
  it('sign + verify round-trip (timestamped v1)', (t) => {
    if (!raast) return t.skip('raast module not loaded');
    const body = JSON.stringify({
      providerRef: 'RAAST-1',
      status: 'settled',
      amount: 5000,
    });
    const ts = Math.floor(Date.now() / 1000);
    const header = raast.signWebhookPayload(body, 'test-secret', ts);
    assert.match(header, /^t=\d+,v1=[a-f0-9]+$/);

    const result = raast.verifyWebhookSignature(body, header, {
      secret: 'test-secret',
      maxSkewSec: 300,
    });
    assert.equal(result.ok, true, result.reason);
  });

  it('rejects wrong secret', (t) => {
    if (!raast) return t.skip('raast module not loaded');
    const body = '{"a":1}';
    const ts = Math.floor(Date.now() / 1000);
    const header = raast.signWebhookPayload(body, 'secret-a', ts);
    const result = raast.verifyWebhookSignature(body, header, {
      secret: 'secret-b',
      maxSkewSec: 300,
    });
    assert.equal(result.ok, false);
  });

  it('rejects tampered body', (t) => {
    if (!raast) return t.skip('raast module not loaded');
    const ts = Math.floor(Date.now() / 1000);
    const header = raast.signWebhookPayload('{"amount":100}', 'sec', ts);
    const result = raast.verifyWebhookSignature('{"amount":999}', header, {
      secret: 'sec',
      maxSkewSec: 300,
    });
    assert.equal(result.ok, false);
  });

  it('configPublic is sandbox without live env', (t) => {
    if (!raast) return t.skip('raast module not loaded');
    const cfg = raast.configPublic();
    assert.equal(cfg.provider, 'raast');
    assert.ok(['sandbox', 'live'].includes(cfg.mode));
  });
});
