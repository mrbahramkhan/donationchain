const express = require('express');
const sms = require('../services/sms');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/send', requireAuth, async (req, res) => {
  try {
    const { to, template, params, body } = req.body || {};
    const result = await sms.sendSms({ to, template, params, body });
    if (!result.ok && !result.mock) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/notify-donation', async (req, res) => {
  try {
    const results = await sms.notifyDonation(req.body || {});
    res.json({ success: true, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/notify-application', async (req, res) => {
  try {
    const { phone, id, status } = req.body || {};
    const map = {
      received: 'application_received',
      approved: 'application_approved',
      rejected: 'application_rejected',
    };
    const template = map[status] || 'application_received';
    const result = await sms.sendSms({ to: phone, template, params: { id } });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/log', requireAuth, (_req, res) => {
  res.json({ log: sms.loadLog().slice(0, 100) });
});

router.get('/templates', (_req, res) => {
  res.json({ templates: Object.keys(sms.templates()) });
});

module.exports = router;
