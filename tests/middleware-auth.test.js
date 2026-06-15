const jwt = require('jsonwebtoken');

// Set env before requiring the middleware
process.env.JWT_SECRET = 'test-secret-key-12345';

test('requireAuth redirects to login when no token', () => {
  jest.resetModules();
  const { requireAuth } = require('../src/middleware/auth');

  const req = { cookies: {}, accepts: () => true, originalUrl: '/vault' };
  const res = {
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  requireAuth(req, res, next);

  expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/login'));
  expect(next).not.toHaveBeenCalled();
});

test('requireAuth calls next with valid token', () => {
  jest.resetModules();
  const { requireAuth } = require('../src/middleware/auth');

  const token = jwt.sign({ username: 'admin' }, process.env.JWT_SECRET);

  const req = { cookies: { token }, accepts: () => true };
  const res = {
    redirect: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  requireAuth(req, res, next);

  expect(next).toHaveBeenCalled();
  expect(req.user).toBeDefined();
  expect(req.user.username).toBe('admin');
});

test('requireAuth clears cookie and redirects on invalid token', () => {
  jest.resetModules();
  const { requireAuth } = require('../src/middleware/auth');

  const req = { cookies: { token: 'invalid.jwt.token' }, accepts: () => true };
  const res = {
    redirect: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  requireAuth(req, res, next);

  expect(res.clearCookie).toHaveBeenCalledWith('token');
  expect(res.redirect).toHaveBeenCalledWith('/login');
  expect(next).not.toHaveBeenCalled();
});

test('requireAuth returns 401 JSON for API requests', () => {
  jest.resetModules();
  const { requireAuth } = require('../src/middleware/auth');

  const req = { cookies: {}, accepts: () => false };
  const res = {
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  requireAuth(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
});

test('optionalAuth sets user on valid token', () => {
  jest.resetModules();
  const { optionalAuth } = require('../src/middleware/auth');

  const token = jwt.sign({ username: 'admin' }, process.env.JWT_SECRET);

  const req = { cookies: { token } };
  const res = {};
  const next = jest.fn();

  optionalAuth(req, res, next);

  expect(next).toHaveBeenCalled();
  expect(req.user).toBeDefined();
  expect(req.user.username).toBe('admin');
});

test('optionalAuth sets no user on missing token', () => {
  jest.resetModules();
  const { optionalAuth } = require('../src/middleware/auth');

  const req = { cookies: {} };
  const res = {};
  const next = jest.fn();

  optionalAuth(req, res, next);

  expect(next).toHaveBeenCalled();
  expect(req.user).toBeUndefined();
});

test('optionalAuth sets no user on invalid token (no crash)', () => {
  jest.resetModules();
  const { optionalAuth } = require('../src/middleware/auth');

  const req = { cookies: { token: 'bad-token' } };
  const res = {};
  const next = jest.fn();

  optionalAuth(req, res, next);

  expect(next).toHaveBeenCalled();
  expect(req.user).toBeUndefined();
});

test('requireAuth returns 401 JSON for expired token', () => {
  jest.resetModules();
  const { requireAuth } = require('../src/middleware/auth');

  const expiredToken = jwt.sign({ username: 'admin' }, process.env.JWT_SECRET, { expiresIn: '0s' });

  // Wait a tiny bit for expiry
  const req = { cookies: { token: expiredToken }, accepts: () => false };
  const res = {
    redirect: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  requireAuth(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
});
