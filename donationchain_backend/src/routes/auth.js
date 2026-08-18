const express = require('express');
const auth = require('../services/auth');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// In-memory rate limit (per IP)
const attempts = new Map();
const MAX = 5;
const WINDOW_MS = 15 * 60 * 1000;

function rateLimit(ip) {
  const now = Date.now();
  let a = attempts.get(ip) || { count: 0, reset: now + WINDOW_MS };
  if (now > a.reset) a = { count: 0, reset: now + WINDOW_MS };
  a.count += 1;
  attempts.set(ip, a);
  if (a.count > MAX) return { limited: true, retryAfter: Math.ceil((a.reset - now) / 1000) };
  return { limited: false };
}

router.post('/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const rl = rateLimit(ip);
  if (rl.limited) {
    return res.status(429).json({ error: 'Too many attempts', retryAfter: rl.retryAfter });
  }
  const { username, password } = req.body || {};
  const result = auth.login(username || 'admin', password);
  if (!result.ok) return res.status(result.status || 401).json({ error: result.error });
  attempts.delete(ip);
  res.json(result);
});

router.get('/me', requireAuth, (req, res) => {
  const { hasPermission, isStaffRole } = require('../rbac');
  res.json({
    user: {
      id: req.user.sub,
      username: req.user.username,
      role: req.user.role,
      isStaff: isStaffRole(req.user.role),
    },
    permissions: {
      'cases:applications_admin': hasPermission(req.user.role, 'cases:applications_admin'),
      'cases:zakat_eligibility': hasPermission(req.user.role, 'cases:zakat_eligibility'),
      'admin:dashboard': hasPermission(req.user.role, 'admin:dashboard'),
      'admin:config': hasPermission(req.user.role, 'admin:config'),
      'audit:read': hasPermission(req.user.role, 'audit:read'),
    },
    exp: req.user.exp,
  });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const result = auth.changePassword(req.user.username, currentPassword, newPassword);
  if (!result.ok) return res.status(result.status || 400).json({ error: result.error });
  res.json({ success: true });
});

router.post('/logout', requireAuth, (_req, res) => {
  // Stateless JWT — client discards token
  res.json({ success: true });
});

module.exports = router;
