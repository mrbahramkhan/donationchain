const auth = require('../services/auth');

function requireAuth(req, res, next) {
  const token = auth.extractBearer(req);
  const result = auth.verifyJwt(token);
  if (!result.ok) {
    return res.status(401).json({ error: 'Unauthorized', reason: result.error });
  }
  req.user = result.payload;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
