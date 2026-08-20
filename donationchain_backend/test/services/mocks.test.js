/**
 * Mock factories — verify external deps never leave the process.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createFcmMock,
  createSmsMock,
  createRaastMock,
} = require('../helpers/mocks');

describe('FCM mock', () => {
  it('sendToToken returns mock success without Firebase', async () => {
    const fcm = createFcmMock();
    const res = await fcm.sendToToken('device-token-abc', {
      title: 'Hi',
      body: 'Test',
    });
    assert.equal(res.success, true);
    assert.equal(res.mock, true);
    assert.ok(res.messageId);
    assert.equal(fcm._log.of('sendToToken').length, 1);
  });

  it('can simulate token failure', async () => {
    const fcm = createFcmMock({ failTokens: ['bad-token'] });
    const res = await fcm.sendToToken('bad-token', { title: 'X', body: 'Y' });
    assert.equal(res.success, false);
    assert.equal(res.error, 'mock_token_invalid');
  });

  it('sendToTokens aggregates results', async () => {
    const fcm = createFcmMock({ failTokens: ['bad'] });
    const res = await fcm.sendToTokens(['good', 'bad'], { title: 'T', body: 'B' });
    assert.equal(res.successCount, 1);
    assert.equal(res.failureCount, 1);
    assert.equal(res.mock, true);
  });

  it('topic + domain helpers log calls', async () => {
    const fcm = createFcmMock();
    await fcm.sendToTopic('all_donors', { title: 'Emergency', body: 'Help' });
    await fcm.notifyPaymentSuccess('tok', { amount: 5000, caseTitle: 'Surgery' });
    assert.equal(fcm._log.of('sendToTopic').length, 1);
    assert.equal(fcm._log.of('sendToToken').length, 1);
  });
});

describe('SMS mock', () => {
  it('sendSms returns mock success without Twilio', async () => {
    const sms = createSmsMock();
    const res = await sms.sendSms({
      to: '+923001234567',
      template: 'application_received',
      params: { caseId: 'C1' },
    });
    assert.equal(res.ok, true);
    assert.equal(res.mock, true);
    assert.equal(res.provider, 'mock');
    assert.equal(sms._log.of('sendSms').length, 1);
  });

  it('can simulate invalid number', async () => {
    const sms = createSmsMock({ failPhones: ['+92000'] });
    const res = await sms.sendSms({ to: '+92000', body: 'hi' });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'mock_invalid_number');
  });

  it('notifyDonation fans out to both phones', async () => {
    const sms = createSmsMock();
    const out = await sms.notifyDonation({
      donorPhone: '+923001111111',
      beneficiaryPhone: '+923002222222',
      amount: 1000,
      receiptId: 'R1',
      caseTitle: 'Food',
    });
    assert.equal(out.length, 2);
    assert.equal(out.every((r) => r.mock), true);
  });

  it('normalizePkPhone handles local formats', () => {
    const sms = createSmsMock();
    assert.equal(sms.normalizePkPhone('03001234567'), '+923001234567');
    assert.equal(sms.normalizePkPhone('3001234567'), '+923001234567');
    assert.equal(sms.normalizePkPhone('923001234567'), '+923001234567');
  });
});

describe('Raast mock', () => {
  it('initiateTransfer stays in sandbox (no live HTTP)', async () => {
    const raast = createRaastMock();
    assert.equal(raast.isLive(), false);
    const res = await raast.initiateTransfer({
      amountPkr: 2500,
      beneficiaryIban: 'PK36SCBL0000001123456702',
      beneficiaryName: 'City Hospital',
    });
    assert.equal(res.ok, true);
    assert.equal(res.mode, 'sandbox');
    assert.ok(String(res.providerRef).startsWith('RAAST-MOCK-'));
    assert.equal(raast._log.of('initiateTransfer').length, 1);
  });

  it('can simulate decline', async () => {
    const raast = createRaastMock({ fail: true });
    const res = await raast.initiateTransfer({ amountPkr: 100, beneficiaryIban: 'PK00' });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'mock_decline');
  });

  it('fetchRemoteStatus returns settled mock', async () => {
    const raast = createRaastMock();
    const res = await raast.fetchRemoteStatus('RAAST-MOCK-abc');
    assert.equal(res.status, 'settled');
    assert.equal(res.mock, true);
  });

  it('configPublic never reports live', () => {
    const cfg = createRaastMock().configPublic();
    assert.equal(cfg.mode, 'sandbox');
    assert.equal(cfg.provider, 'raast');
  });
});
