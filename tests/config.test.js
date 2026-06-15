const path = require('path');

// Ensure clean env state
beforeEach(() => {
  jest.resetModules();
  delete process.env.PORT;
  delete process.env.NODE_ENV;
  delete process.env.VAULT_PATH;
  delete process.env.DATA_PATH;
  delete process.env.OBLOG_TEST_VAULT;
  delete process.env.OBLOG_TEST_DATA;
  process.env.JWT_SECRET = 'test-secret';
});

test('config has all required keys', () => {
  const config = require('../src/config');
  expect(config).toHaveProperty('port');
  expect(config).toHaveProperty('nodeEnv');
  expect(config).toHaveProperty('vaultPath');
  expect(config).toHaveProperty('dataPath');
  expect(config).toHaveProperty('jwtSecret');
  expect(config).toHaveProperty('jwtExpiresIn');
  expect(config).toHaveProperty('adminUsername');
  expect(config).toHaveProperty('adminPasswordHash');
  expect(config).toHaveProperty('webhookSecret');
  expect(config).toHaveProperty('cacheEnabled');
  expect(config).toHaveProperty('gitRepoUrl');
  expect(config).toHaveProperty('gitBranch');
});

test('config port is parsed as integer', () => {
  process.env.PORT = '8080';
  const config = require('../src/config');
  expect(config.port).toBe(8080);
  expect(typeof config.port).toBe('number');
});

test('config falls back to default port', () => {
  const config = require('../src/config');
  expect(config.port).toBe(3000);
});

test('config resolves relative paths', () => {
  process.env.VAULT_PATH = './myvault';
  process.env.DATA_PATH = './mydata';
  jest.resetModules();
  const config = require('../src/config');
  expect(path.isAbsolute(config.vaultPath)).toBe(true);
  expect(path.isAbsolute(config.dataPath)).toBe(true);
});

test('config cacheEnabled parses boolean values', () => {
  process.env.CACHE_ENABLED = 'false';
  jest.resetModules();
  const config = require('../src/config');
  expect(config.cacheEnabled).toBe(false);

  process.env.CACHE_ENABLED = 'true';
  jest.resetModules();
  const config2 = require('../src/config');
  expect(config2.cacheEnabled).toBe(true);
});
