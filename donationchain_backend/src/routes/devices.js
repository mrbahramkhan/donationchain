/**
 * Device FCM token registration — JWT-bound.
 * POST   /api/devices/register     { token }           — auth required; userId from JWT
 * DELETE /api/devices/register     { token }           — auth; remove own token
 * DELETE /api/devices              — auth; remove all own tokens
 * GET    /api/devices/me           — auth; list own tokens (masked)
 * GET    /api/devices/:userId      — staff only; list tokens for user (masked)
 */
const express = require('express');
const deviceTokens = require('../services/deviceTokens');
const { requireAuth, requireStaff } = require('../middleware/auth');

const router = express.Router();

function maskToken(t) {
  const s = String(t);
  if (s.length < 16) return '***';
  return s.slice(0, 8) + '…' + s.slice(-4);
}

/** Register / refresh FCM token for the authenticated user */
router.post('/register', requireAuth, (req, res) => {
  const token = req.body?.token;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token required' });
  }
  // Never trust body.userId — bind to JWT subject
  const userId = req.user.sub || req.user.id || req.user.username;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized', reason: 'missing_subject' });
  }
  const result = deviceTokens.register(userId, token);
  if (!result.ok) return res.status(400).json(result);
  res.json({
    success: true,
    userId: result.userId,
    tokenCount: result.tokenCount,
    registered: result.registered,
  });
});

/** Unregister one token for current user */
router.delete('/register', requireAuth, (req, res) => {
  const token = req.body?.token || req.query?.token;
  if (!token) return res.status(400).json({ error: 'token required' });
  const userId = req.user.sub || req.user.id || req.user.username;
  // Only remove if token belongs to this user
  const owner = deviceTokens.getUserForToken(token);
  if (owner && owner !== String(userId)) {
    return res.status(403).json({ error: 'Forbidden', reason: 'token_not_owned' });
  }
  deviceTokens.unregister(userId, token);
  res.json({ success: true });
});

/** Unregister all tokens for current user (logout all devices) */
router.delete('/', requireAuth, (req, res) => {
  const userId = req.user.sub || req.user.id || req.user.username;
  deviceTokens.unregisterAll(userId);
  res.json({ success: true });
});

/** List own tokens (masked) */
router.get('/me', requireAuth, (req, res) => {
  const userId = req.user.sub || req.user.id || req.user.username;
  const tokens = deviceTokens.getTokens(userId).map(maskToken);
  res.json({ userId: String(userId), tokens, count: tokens.length });
});

/** Staff: list tokens for a user (masked) — never return raw tokens in list APIs */
router.get('/:userId', requireAuth, requireStaff, (req, res) => {
  const tokens = deviceTokens.getTokens(req.params.userId).map(maskToken);
  if (!tokens.length) return res.status(404).json({ error: 'not found' });
  res.json({ userId: req.params.userId, tokens, count: tokens.length });
});

module.exports = router;
