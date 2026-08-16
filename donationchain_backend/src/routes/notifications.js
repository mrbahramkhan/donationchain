const express = require('express');
const fcm = require('../services/fcm');

const router = express.Router();

/**
 * POST /api/notifications/send
 * Body: { token, title, body, data? }
 */
router.post('/send', async (req, res) => {
  try {
    const { token, title, body, data, imageUrl } = req.body;
    if (!token || !title || !body) {
      return res.status(400).json({ error: 'token, title, body are required' });
    }
    const result = await fcm.sendToToken(token, { title, body, data, imageUrl });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/multicast
 * Body: { tokens: string[], title, body, data? }
 */
router.post('/multicast', async (req, res) => {
  try {
    const { tokens, title, body, data } = req.body;
    if (!Array.isArray(tokens) || !tokens.length || !title || !body) {
      return res.status(400).json({ error: 'tokens[], title, body are required' });
    }
    const result = await fcm.sendToTokens(tokens, { title, body, data });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/topic
 * Body: { topic, title, body, data? }
 */
router.post('/topic', async (req, res) => {
  try {
    const { topic, title, body, data } = req.body;
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

// --- Domain event endpoints ---

/** POST /api/notifications/events/payment-success */
router.post('/events/payment-success', async (req, res) => {
  try {
    const { token, amount, caseTitle, donationId } = req.body;
    if (!token || amount == null || !caseTitle) {
      return res.status(400).json({ error: 'token, amount, caseTitle required' });
    }
    const result = await fcm.notifyPaymentSuccess(token, { amount, caseTitle, donationId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/notifications/events/case-approved */
router.post('/events/case-approved', async (req, res) => {
  try {
    const { token, caseTitle, caseId } = req.body;
    if (!token || !caseTitle) {
      return res.status(400).json({ error: 'token, caseTitle required' });
    }
    const result = await fcm.notifyCaseApproved(token, { caseTitle, caseId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/notifications/events/donation-matched */
router.post('/events/donation-matched', async (req, res) => {
  try {
    const { token, caseTitle, amount, donationId } = req.body;
    if (!token || !caseTitle || amount == null) {
      return res.status(400).json({ error: 'token, caseTitle, amount required' });
    }
    const result = await fcm.notifyDonationMatched(token, { caseTitle, amount, donationId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/notifications/events/proof-ready */
router.post('/events/proof-ready', async (req, res) => {
  try {
    const { token, caseTitle, caseId } = req.body;
    if (!token || !caseTitle) {
      return res.status(400).json({ error: 'token, caseTitle required' });
    }
    const result = await fcm.notifyProofReady(token, { caseTitle, caseId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/notifications/events/fraud-alert */
router.post('/events/fraud-alert', async (req, res) => {
  try {
    const { token, caseId, riskScore } = req.body;
    if (!token || !caseId) {
      return res.status(400).json({ error: 'token, caseId required' });
    }
    const result = await fcm.notifyFraudAlert(token, { caseId, riskScore });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/notifications/events/emergency */
router.post('/events/emergency', async (req, res) => {
  try {
    const { topic = 'all_donors', title, body, campaignId } = req.body;
    const result = await fcm.notifyEmergency(topic, { title, body, campaignId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
