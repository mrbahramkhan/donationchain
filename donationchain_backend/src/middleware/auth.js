/**
 * DonationChain auth middleware
 * - requireAuth: valid JWT Bearer required
 * - optionalAuth: attach user if token present
 * - requireRole / requirePermission / requireStaff: RBAC gates
 */
const auth = require('../services/auth');
const { hasPermission, normalizeRole, isStaffRole } = require('../rbac');

function requireAuth(req, res, next) {
  const token = auth.extractBearer(req);
  const result = auth.verifyJwt(token);
  if (!result.ok) {
    return res.status(401).json({ error: 'Unauthorized', reason: result.error });
  }
  req.user = result.payload;
  if (req.user && req.user.role) {
    req.user.role = normalizeRole(req.user.role);
  }
  next();
}

function optionalAuth(req, res, next) {
  const token = auth.extractBearer(req);
  if (!token) return next();
  const result = auth.verifyJwt(token);
  if (result.ok) {
    req.user = result.payload;
    if (req.user.role) req.user.role = normalizeRole(req.user.role);
  }
  next();
}

function requireRole(...roles) {
  const normalized = roles.map(normalizeRole);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userRole = normalizeRole(req.user.role);
    if (normalized.length && !normalized.includes(userRole) && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden', requiredRoles: normalized, role: userRole });
    }
    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        permission,
        role: req.user.role,
      });
    }
    next();
  };
}

function requireStaff(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!isStaffRole(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden', reason: 'staff_only' });
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requirePermission,
  requireStaff,
};
