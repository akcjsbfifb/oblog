const jwt = require('jsonwebtoken');
const config = require('../config');

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    if (req.accepts('html')) {
      return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (e) {
    res.clearCookie('token');
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.cookies?.token;
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch (_) {}
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
