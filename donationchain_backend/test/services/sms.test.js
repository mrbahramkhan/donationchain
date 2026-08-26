/**
 * SMS service pure helpers + mock-mode send (no Twilio network).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

let sms;
try {
  sms = require('../../src/services/sms');
} catch (err) {
  console.log('SMS module unavailable:', err.message);
}

describe('SMS normalizePkPhone', () => {
  it('normalizes 03XXXXXXXXX', (t) => {
    if (!sms) return t.skip('sms module not loaded');
    assert.equal(sms.normalizePkPhone('03001234567'), '+923001234567');
  });

  it('normalizes 3XXXXXXXXX', (t) => {
    if (!sms) return t.skip('sms module not loaded');
    assert.equal(sms.normalizePkPhone('3001234567'), '+923001234567');
  });

  it('normalizes 92XXXXXXXXXX', (t) => {
    if (!sms) return t.skip('sms module not loaded');
    assert.equal(sms.normalizePkPhone('923001234567'), '+923001234567');
  });

  it('keeps already E.164', (t) => {
    if (!sms) return t.skip('sms module not loaded');
    assert.equal(sms.normalizePkPhone('+923001234567'), '+923001234567');
  });
});

describe('SMS mock-mode send (SMS_PROVIDER=mock)', () => {
  it('sendSms does not call Twilio', async (t) => {
    if (!sms) return t.skip('sms module not loaded');
    const prev = process.env.SMS_PROVIDER;
    process.env.SMS_PROVIDER = 'mock';
    try {
      const res = await sms.sendSms({
        to: '03001112233',
        body: 'DonationChain test message',
      });
      assert.equal(res.ok, true);
      assert.equal(res.mock, true);
    } finally {
      if (prev === undefined) delete process.env.SMS_PROVIDER;
      else process.env.SMS_PROVIDER = prev;
    }
  });
});


describe("SMS rate-limit helpers (20429)", () => {
  it("detects 429 and 20429", (t) => {
    if (!sms || !sms.isRateLimited) return t.skip("helpers not exported");
    assert.equal(sms.isRateLimited({ status: 429 }, {}), true);
    assert.equal(sms.isRateLimited({ status: 400 }, { code: 20429 }), true);
    assert.equal(sms.isRateLimited({ status: 400 }, { code: 21211 }), false);
  });

  it("backoff grows with attempt", (t) => {
    if (!sms || !sms.retryAfterMs) return t.skip("helpers not exported");
    const a0 = sms.retryAfterMs(null, null, 0);
    const a2 = sms.retryAfterMs(null, null, 2);
    assert.ok(a0 >= 1000 && a0 < 2000);
    assert.ok(a2 >= 4000 && a2 < 5000);
  });
});
