/**
 * DonationChain FCM Sender Service
 * Uses Firebase Admin SDK (HTTP v1 under the hood)
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let initialized = false;

function initFirebase() {
  if (initialized) return admin;

  const credPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '../../config/serviceAccountKey.json');

  if (!fs.existsSync(credPath)) {
    console.warn(
      '[FCM] serviceAccountKey.json not found. Set GOOGLE_APPLICATION_CREDENTIALS or place key at config/serviceAccountKey.json'
    );
    console.warn('[FCM] Running in MOCK mode — notifications will be logged only.');
    return null;
  }

  const serviceAccount = require(credPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  initialized = true;
  console.log('[FCM] Firebase Admin initialized');
  return admin;
}

/**
 * Send to a single device token
 */
async function sendToToken(token, { title, body, data = {}, imageUrl }) {
  const app = initFirebase();
  if (!app) {
    console.log('[FCM MOCK] → token:', token?.slice(0, 20) + '...', { title, body, data });
    return { success: true, mock: true, messageId: 'mock-' + Date.now() };
  }

  const message = {
    token,
    notification: { title, body, ...(imageUrl ? { imageUrl } : {}) },
    data: stringifyData(data),
    android: {
      priority: 'high',
      notification: {
        channelId: 'donationchain_high',
        sound: 'default',
        priority: 'high',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true,
        },
      },
    },
  };

  const messageId = await admin.messaging().send(message);
  return { success: true, messageId };
}

/**
 * Send to multiple tokens (multicast, max 500)
 */
async function sendToTokens(tokens, { title, body, data = {} }) {
  const app = initFirebase();
  if (!app) {
    console.log('[FCM MOCK] → multicast', tokens.length, { title, body });
    return { success: true, mock: true, successCount: tokens.length, failureCount: 0 };
  }

  const message = {
    tokens,
    notification: { title, body },
    data: stringifyData(data),
    android: {
      priority: 'high',
      notification: { channelId: 'donationchain_high', sound: 'default' },
    },
  };

  const res = await admin.messaging().sendEachForMulticast(message);
  return {
    success: res.failureCount === 0,
    successCount: res.successCount,
    failureCount: res.failureCount,
    responses: res.responses,
  };
}

/**
 * Send to a topic (e.g. "emergency", "all_donors")
 */
async function sendToTopic(topic, { title, body, data = {} }) {
  const app = initFirebase();
  if (!app) {
    console.log('[FCM MOCK] → topic:', topic, { title, body });
    return { success: true, mock: true, messageId: 'mock-topic-' + Date.now() };
  }

  const message = {
    topic,
    notification: { title, body },
    data: stringifyData(data),
    android: {
      priority: 'high',
      notification: { channelId: 'donationchain_high', sound: 'default' },
    },
  };

  const messageId = await admin.messaging().send(message);
  return { success: true, messageId };
}

// --- Domain helpers matching DonationChain SRS events ---

async function notifyPaymentSuccess(token, { amount, caseTitle, donationId }) {
  return sendToToken(token, {
    title: 'Payment Confirmed ✓',
    body: `PKR ${Number(amount).toLocaleString()} sent directly for "${caseTitle}". Proof coming within 48h.`,
    data: {
      type: 'payment_sent',
      donation_id: String(donationId || ''),
      amount: String(amount),
    },
  });
}

async function notifyCaseApproved(token, { caseTitle, caseId }) {
  return sendToToken(token, {
    title: 'Case Approved',
    body: `"${caseTitle}" is now live for donors.`,
    data: { type: 'case_approved', case_id: String(caseId || '') },
  });
}

async function notifyDonationMatched(token, { caseTitle, amount, donationId }) {
  return sendToToken(token, {
    title: 'Donation Matched',
    body: `Your donation of PKR ${Number(amount).toLocaleString()} was matched to "${caseTitle}".`,
    data: {
      type: 'donation_matched',
      donation_id: String(donationId || ''),
    },
  });
}

async function notifyProofReady(token, { caseTitle, caseId }) {
  return sendToToken(token, {
    title: 'Delivery Proof Ready',
    body: `Geo-tagged proof for "${caseTitle}" is now in your Impact dashboard.`,
    data: { type: 'proof_ready', case_id: String(caseId || '') },
  });
}

async function notifyFraudAlert(token, { caseId, riskScore }) {
  return sendToToken(token, {
    title: '⚠ Fraud Alert',
    body: `High risk score (${riskScore}) on case #${caseId}. Review required.`,
    data: {
      type: 'fraud_alert',
      case_id: String(caseId || ''),
      risk_score: String(riskScore || ''),
    },
  });
}

async function notifyEmergency(topic = 'all_donors', { title, body, campaignId }) {
  return sendToTopic(topic, {
    title: title || 'Emergency Appeal',
    body: body || 'A new emergency campaign needs your support.',
    data: { type: 'emergency', campaign_id: String(campaignId || '') },
  });
}

function stringifyData(data) {
  // FCM data values must be strings
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    out[k] = v == null ? '' : String(v);
  }
  return out;
}

module.exports = {
  initFirebase,
  sendToToken,
  sendToTokens,
  sendToTopic,
  notifyPaymentSuccess,
  notifyCaseApproved,
  notifyDonationMatched,
  notifyProofReady,
  notifyFraudAlert,
  notifyEmergency,
};
