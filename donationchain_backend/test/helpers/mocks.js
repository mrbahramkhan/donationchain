/**
 * Mock factories for external dependencies.
 * Use with node:test mock or by overwriting module exports.
 *
 * External systems covered:
 *  - Firebase Admin / FCM
 *  - Twilio SMS
 *  - Raast live HTTP API
 *  - Optional ethers on-chain anchor
 */

'use strict';

/** In-memory call log for assertions */
function createCallLog() {
  const calls = [];
  return {
    calls,
    push(name, args, result) {
      calls.push({ name, args, result, at: new Date().toISOString() });
    },
    of(name) {
      return calls.filter((c) => c.name === name);
    },
    clear() {
      calls.length = 0;
    },
  };
}

/**
 * Mock FCM service — never talks to Firebase.
 */
function createFcmMock(options = {}) {
  const log = createCallLog();
  const failTokens = new Set(options.failTokens || []);

  async function sendToToken(token, payload) {
    const result = failTokens.has(token)
      ? { success: false, mock: true, error: 'mock_token_invalid' }
      : {
          success: true,
          mock: true,
          messageId: `mock-msg-${Date.now()}`,
          token: String(token).slice(0, 12) + '…',
          title: payload?.title,
        };
    log.push('sendToToken', { token, payload }, result);
    return result;
  }

  async function sendToTokens(tokens, payload) {
    const results = [];
    for (const t of tokens || []) {
      results.push(await sendToToken(t, payload));
    }
    const result = {
      success: results.every((r) => r.success),
      mock: true,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
      responses: results,
    };
    log.push('sendToTokens', { tokens, payload }, result);
    return result;
  }

  async function sendToTopic(topic, payload) {
    const result = {
      success: true,
      mock: true,
      messageId: `mock-topic-${topic}-${Date.now()}`,
      topic,
      title: payload?.title,
    };
    log.push('sendToTopic', { topic, payload }, result);
    return result;
  }

  return {
    initFirebase: () => null,
    sendToToken,
    sendToTokens,
    sendToTopic,
    notifyPaymentSuccess: (token, opts) =>
      sendToToken(token, {
        title: 'Payment Confirmed ✓',
        body: `PKR ${opts.amount} for "${opts.caseTitle}"`,
        data: { type: 'payment_sent' },
      }),
    notifyCaseApproved: (token, opts) =>
      sendToToken(token, {
        title: 'Case Approved',
        body: opts.caseTitle,
        data: { type: 'case_approved' },
      }),
    notifyDonationMatched: (token, opts) =>
      sendToToken(token, {
        title: 'Donation Matched',
        body: String(opts.amount),
        data: { type: 'donation_matched' },
      }),
    notifyProofReady: (token, opts) =>
      sendToToken(token, {
        title: 'Delivery Proof Ready',
        body: opts.caseTitle,
        data: { type: 'proof_ready' },
      }),
    notifyFraudAlert: (token, opts) =>
      sendToToken(token, {
        title: '⚠ Fraud Alert',
        body: String(opts.riskScore),
        data: { type: 'fraud_alert' },
      }),
    notifyEmergency: (topic, opts) =>
      sendToTopic(topic || 'all_donors', {
        title: opts?.title || 'Emergency Appeal',
        body: opts?.body,
        data: { type: 'emergency' },
      }),
    _log: log,
  };
}

/**
 * Mock SMS service — never calls Twilio.
 */
function createSmsMock(options = {}) {
  const log = createCallLog();
  const failPhones = new Set(options.failPhones || []);

  async function sendSms({ to, template, params, body }) {
    const phone = String(to || '');
    const result = failPhones.has(phone)
      ? { ok: false, mock: true, error: 'mock_invalid_number', to: phone }
      : {
          ok: true,
          mock: true,
          id: `SMS-MOCK-${Date.now().toString(36).toUpperCase()}`,
          to: phone,
          template: template || 'custom',
          body: body || JSON.stringify(params || {}),
          provider: 'mock',
        };
    log.push('sendSms', { to, template, params, body }, result);
    return result;
  }

  async function notifyDonation(opts) {
    const out = [];
    if (opts.donorPhone) {
      out.push(
        await sendSms({
          to: opts.donorPhone,
          template: 'donation_received_donor',
          params: opts,
        })
      );
    }
    if (opts.beneficiaryPhone) {
      out.push(
        await sendSms({
          to: opts.beneficiaryPhone,
          template: 'donation_received_case',
          params: opts,
        })
      );
    }
    log.push('notifyDonation', opts, out);
    return out;
  }

  return {
    sendSms,
    notifyDonation,
    loadLog: () => log.calls.map((c) => c.result),
    normalizePkPhone: (phone) => {
      let s = String(phone || '').replace(/[\s\-()]/g, '');
      if (/^03\d{9}$/.test(s)) s = '+92' + s.slice(1);
      if (/^3\d{9}$/.test(s)) s = '+92' + s;
      if (/^92\d{10}$/.test(s)) s = '+' + s;
      return s;
    },
    templates: () => ({}),
    _log: log,
  };
}

/**
 * Mock Raast live HTTP — always sandbox-shaped responses.
 * Does not perform real fetch to bank APIs.
 */
function createRaastMock(options = {}) {
  const log = createCallLog();
  const shouldFail = options.fail === true;
  const crypto = require('crypto');

  async function initiateTransfer(opts) {
    const providerRef = `RAAST-MOCK-${crypto.randomBytes(4).toString('hex')}`;
    const result = shouldFail
      ? {
          ok: false,
          mode: 'sandbox',
          error: 'mock_decline',
          providerRef,
        }
      : {
          ok: true,
          mode: 'sandbox',
          providerRef,
          status: 'pending',
          amountPkr: opts.amountPkr,
          beneficiaryIban: opts.beneficiaryIban,
          settleMsHint: 100,
        };
    log.push('initiateTransfer', opts, result);
    return result;
  }

  async function fetchRemoteStatus(providerRef) {
    const result = {
      ok: true,
      mode: 'sandbox',
      providerRef,
      status: 'settled',
      mock: true,
    };
    log.push('fetchRemoteStatus', { providerRef }, result);
    return result;
  }

  return {
    initiateTransfer,
    fetchRemoteStatus,
    isLive: () => false,
    configPublic: () => ({
      provider: 'raast',
      mode: 'sandbox',
      currency: 'PKR',
      merchantName: 'DonationChain',
      settleMsHint: 100,
      supportsRealtimeStatus: true,
      supportsWebhook: true,
    }),
    // real crypto helpers still useful — re-export from module in tests if needed
    _log: log,
  };
}

/**
 * Apply mock exports onto an already-required module object (in-place).
 * Safe for tests that require() the real module then override.
 */
function applyMock(targetModule, mockObj) {
  for (const key of Object.keys(mockObj)) {
    if (key.startsWith('_')) continue;
    targetModule[key] = mockObj[key];
  }
  return targetModule;
}

/**
 * Install mocks into require cache before app loads.
 * Call from test before() BEFORE requiring ../src/app.
 *
 * @example
 * const { installServiceMocks } = require('./helpers/mocks');
 * const mocks = installServiceMocks();
 * const { createApp } = require('../../src/app');
 */
function installServiceMocks(options = {}) {
  const path = require('path');
  const fcmPath = path.resolve(__dirname, '../../src/services/fcm.js');
  const smsPath = path.resolve(__dirname, '../../src/services/sms.js');
  const raastPath = path.resolve(__dirname, '../../src/services/raast.js');

  const fcm = createFcmMock(options.fcm);
  const sms = createSmsMock(options.sms);
  const raast = createRaastMock(options.raast);

  // Preserve real pure helpers from raast (signature verify) when possible
  try {
    const realRaast = require(raastPath);
    raast.verifyWebhookSignature = realRaast.verifyWebhookSignature;
    raast.signWebhookPayload = realRaast.signWebhookPayload;
    raast.mapLiveStatus = realRaast.mapLiveStatus;
    raast.WEBHOOK_SECRET = realRaast.WEBHOOK_SECRET;
    raast.MERCHANT_IBAN = realRaast.MERCHANT_IBAN;
  } catch (_) {
    /* real module may be unavailable in broken node_modules */
  }

  require.cache[fcmPath] = {
    id: fcmPath,
    filename: fcmPath,
    loaded: true,
    exports: fcm,
  };
  require.cache[smsPath] = {
    id: smsPath,
    filename: smsPath,
    loaded: true,
    exports: sms,
  };
  require.cache[raastPath] = {
    id: raastPath,
    filename: raastPath,
    loaded: true,
    exports: raast,
  };

  return { fcm, sms, raast };
}

function clearServiceMocks() {
  const path = require('path');
  for (const rel of ['fcm.js', 'sms.js', 'raast.js']) {
    const p = path.resolve(__dirname, '../../src/services', rel);
    delete require.cache[p];
  }
}

module.exports = {
  createCallLog,
  createFcmMock,
  createSmsMock,
  createRaastMock,
  applyMock,
  installServiceMocks,
  clearServiceMocks,
};
