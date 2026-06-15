const { createFixtureVault, cleanupFixtureVault } = require('./helpers');

let vaultDir, dataDir;

beforeEach(() => {
  const fix = createFixtureVault();
  vaultDir = fix.vaultDir;
  dataDir = fix.dataDir;
  process.env.VAULT_PATH = vaultDir;
  process.env.DATA_PATH = dataDir;
  process.env.CACHE_ENABLED = 'true';
});

afterEach(() => {
  cleanupFixtureVault();
  jest.resetModules();
});

test('cacheMiddleware serves cached content', () => {
  jest.resetModules();
  const cache = require('../src/markdown/cache');
  const cacheMiddleware = require('../src/middleware/cache');

  cache.set('test-slug', '<html>cached page</html>');

  const req = { params: { slug: 'test-slug' } };
  const res = {
    send: jest.fn(),
    setHeader: jest.fn(),
  };
  const next = jest.fn();

  cacheMiddleware(req, res, next);

  expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
  expect(res.send).toHaveBeenCalledWith('<html>cached page</html>');
  expect(next).not.toHaveBeenCalled();
});

test('cacheMiddleware calls next on cache miss', () => {
  jest.resetModules();
  const cache = require('../src/markdown/cache');
  const cacheMiddleware = require('../src/middleware/cache');

  // Clear any existing cache
  cache.invalidate('miss-slug');

  const req = { params: { slug: 'miss-slug' } };
  const originalSend = jest.fn();
  const res = {
    send: originalSend,
    setHeader: jest.fn(),
    statusCode: 200,
  };
  const next = jest.fn();

  cacheMiddleware(req, res, next);

  expect(next).toHaveBeenCalled();
  // The send function should be wrapped (replaced)
  expect(res.send).not.toBe(originalSend);
});

test('cacheMiddleware calls next when no slug param', () => {
  jest.resetModules();
  const cacheMiddleware = require('../src/middleware/cache');

  const req = { params: {} };
  const res = { send: jest.fn() };
  const next = jest.fn();

  cacheMiddleware(req, res, next);

  expect(next).toHaveBeenCalled();
});

test('cacheMiddleware wrap sets X-Cache MISS header on successful response', () => {
  jest.resetModules();
  const cache = require('../src/markdown/cache');
  const cacheMiddleware = require('../src/middleware/cache');

  cache.invalidate('test-slug-2');

  const req = { params: { slug: 'test-slug-2' } };
  const res = {
    send: jest.fn(),
    setHeader: jest.fn(),
    statusCode: 200,
  };
  const next = jest.fn();

  cacheMiddleware(req, res, next);

  // Simulate what the route handler would do
  res.send('<html>new page</html>');

  expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
  // Cache should now contain this
  expect(cache.get('test-slug-2')).toBe('<html>new page</html>');
});
