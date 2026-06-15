const fs = require('fs');
const path = require('path');
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
  process.env.CACHE_ENABLED = 'false';
});

test('set and get cache', () => {
  jest.resetModules();
  const cache = require('../src/markdown/cache');

  cache.set('test-slug', '<html>cached</html>');
  const cached = cache.get('test-slug');

  expect(cached).toBe('<html>cached</html>');
});

test('get returns null for nonexistent cache', () => {
  jest.resetModules();
  const cache = require('../src/markdown/cache');

  const result = cache.get('nonexistent');
  expect(result).toBeNull();
});

test('get returns null when cache disabled', () => {
  process.env.CACHE_ENABLED = 'false';
  jest.resetModules();
  const cache = require('../src/markdown/cache');

  cache.set('test', 'html');
  expect(cache.get('test')).toBeNull();
});

test('invalidate removes specific cache', () => {
  jest.resetModules();
  const cache = require('../src/markdown/cache');

  cache.set('slug1', 'html1');
  cache.set('slug2', 'html2');

  cache.invalidate('slug1');

  expect(cache.get('slug1')).toBeNull();
  expect(cache.get('slug2')).toBe('html2');
});

test('invalidateAll removes all cache files', () => {
  jest.resetModules();
  const cache = require('../src/markdown/cache');

  cache.set('slug1', 'html1');
  cache.set('slug2', 'html2');

  cache.invalidateAll();

  expect(cache.get('slug1')).toBeNull();
  expect(cache.get('slug2')).toBeNull();
});

test('invalidate handles nonexistent slug gracefully', () => {
  jest.resetModules();
  const cache = require('../src/markdown/cache');

  // Should not throw
  cache.invalidate('never-existed');
});

test('invalidate handles null/undefined gracefully', () => {
  jest.resetModules();
  const cache = require('../src/markdown/cache');

  // Should not throw
  cache.invalidate(null);
  cache.invalidate(undefined);
});

test('invalidateAll handles empty cache dir', () => {
  jest.resetModules();
  const cache = require('../src/markdown/cache');

  // Should not throw on empty or nonexistent dir
  cache.invalidateAll();
});
