/**
 * FCM notification routes — staff/admin only.
 * Sending to arbitrary tokens requires auth + notify permissions.
 */
const express = require('express');
const fcm = require('../services/fcm');
const deviceTokens = require('../services/deviceTokens');
const { requireAuth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// All notification sends require authenticated staff with permission
router.use(requireAuth);

/**
 * Resolve target token: explicit body.token, or lookup by body.userId from registry.
 */
function resolveToken(body) {
  if (body?.token) return { token: String(body.token), source: 'body' };
  if (body?.userId) {
    const tokens = deviceTokens.getTokens(body.userId);
    if (tokens.length) return { token: tokens[0], source: 'registry', userId: String(body.userId) };
    return { error: 'no_token_for_user', userId: String(body.userId) };
  }
  return { error: 'token_or_userId_required' };
}

function purgeIfUnregistered(result, token) {
  if (!result || result.mock) return;
  const errCode =
    result.errorCode ||
    result.code ||
    (result.error && result.error.includes && result.error.includes('not-registered')
      ? 'messaging/registration-token-not-registered'
      : null);
  // firebase-admin often throws; when we return structured fail:
  if (
    result.success === false &&
    String(result.error || result.message || '').includes('not-registered')
  ) {
    deviceTokens.removeToken(token);
  }
  if (errCode === 'messaging/registration-token-not-registered') {
    deviceTokens.removeToken(token);
  }
}

/** POST /api/notifications/send — notify:send */
router.post('/send', requirePermission('notify:send'), async (req, res) => {
  try {
    const { title, body, data, imageUrl } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ error: 'title, body are required' });
    }
    const resolved = resolveToken(req.body);
    if (resolved.error) {
      return res.status(400).json({ error: resolved.error, userId: resolved.userId });
    }
    const result = await fcm.sendToToken(resolved.token, { title, body, data, imageUrl });
    purgeIfUnregistered(result, resolved.token);
    res.json({ ...result, tokenSource: resolved.source });
  } catch (err) {
    if (String(err.message || err).includes('not-registered') && req.body?.token) {
      deviceTokens.removeToken(req.body.token);
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/notifications/multicast — notify:send */
router.post('/multicast', requirePermission('notify:send'), async (req, res) => {
  try {
    const { tokens, userIds, title, body, data } = req.body || {};
    let list = Array.isArray(tokens) ? tokens.map(String) : [];
    if (Array.isArray(userIds)) {
      for (const uid of userIds) {
        list.push(...deviceTokens.getTokens(uid));
      }
    }
    list = [...new Set(list.filter(Boolean))];
    if (!list.length || !title || !body) {
      return res.status(400).json({ error: 'tokens[] or userIds[], title, body are required' });
    }
    const result = await fcm.sendToTokens(list, { title, body, data });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/notifications/topic — notify:send (broadcast) */
router.post('/topic', requirePermission('notify:send'), async (req, res) => {
  try {
    const { topic, title, body, data } = req.body || {};
    if (!topic || !title || !body) {
      return res.status(400).json({ error: 'topic, title, body are required' });
    }
    const result = await fcm.sendToTopic(topic, { title, body, data });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- Domain events — notify:events ---

router.post('/events/payment-success', requirePermission('notify:events'), async (req, res) => {
  try {
    const { amount, caseTitle, donationId } = req.body || {};
    if (amount == null || !caseTitle) {
      return res.status(400).json({ error: 'amount, caseTitle required (token or userId)' });
    }
    const resolved = resolveToken(req.body);
    if (resolved.error) return res.status(400).json({ error: resolved.error });
    const result = await fcm.notifyPaymentSuccess(resolved.token, { amount, caseTitle, donationId });
    res.json({ ...result, tokenSource: resolved.source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/case-approved', requirePermission('notify:events'), async (req, res) => {
  try {
    const { caseTitle, caseId } = req.body || {};
    if (!caseTitle) return res.status(400).json({ error: 'caseTitle required' });
    const resolved = resolveToken(req.body);
    if (resolved.error) return res.status(400).json({ error: resolved.error });
    const result = await fcm.notifyCaseApproved(resolved.token, { caseTitle, caseId });
    res.json({ ...result, tokenSource: resolved.source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/donation-matched', requirePermission('notify:events'), async (req, res) => {
  try {
    const { caseTitle, amount, donationId } = req.body || {};
    if (!caseTitle || amount == null) {
      return res.status(400).json({ error: 'caseTitle, amount required' });
    }
    const resolved = resolveToken(req.body);
    if (resolved.error) return res.status(400).json({ error: resolved.error });
    const result = await fcm.notifyDonationMatched(resolved.token, { caseTitle, amount, donationId });
    res.json({ ...result, tokenSource: resolved.source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/proof-ready', requirePermission('notify:events'), async (req, res) => {
  try {
    const { caseTitle, caseId } = req.body || {};
    if (!caseTitle) return res.status(400).json({ error: 'caseTitle required' });
    const resolved = resolveToken(req.body);
    if (resolved.error) return res.status(400).json({ error: resolved.error });
    const result = await fcm.notifyProofReady(resolved.token, { caseTitle, caseId });
    res.json({ ...result, tokenSource: resolved.source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/fraud-alert', requirePermission('notify:events'), async (req, res) => {
  try {
    const { caseId, riskScore } = req.body || {};
    if (!caseId) return res.status(400).json({ error: 'caseId required' });
    const resolved = resolveToken(req.body);
    if (resolved.error) return res.status(400).json({ error: resolved.error });
    const result = await fcm.notifyFraudAlert(resolved.token, { caseId, riskScore });
    res.json({ ...result, tokenSource: resolved.source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/emergency', requirePermission('notify:send'), async (req, res) => {
  try {
    const { topic = 'all_donors', title, body, campaignId } = req.body || {};
    const result = await fcm.notifyEmergency(topic, { title, body, campaignId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
