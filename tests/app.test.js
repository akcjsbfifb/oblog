const request = require('supertest');
const { createFixtureVault, cleanupFixtureVault } = require('./helpers');

let vaultDir, dataDir, app;

beforeEach(() => {
  const fix = createFixtureVault();
  vaultDir = fix.vaultDir;
  dataDir = fix.dataDir;
  process.env.VAULT_PATH = vaultDir;
  process.env.DATA_PATH = dataDir;
  process.env.JWT_SECRET = 'test-secret-key-12345';
  process.env.GIT_REPO_URL = '';
  process.env.CACHE_ENABLED = 'false';
  process.env.NODE_ENV = 'test';

  jest.resetModules();
  const db = require('../src/db');
  db.init();
  app = require('../src/app');
});

afterEach(() => {
  cleanupFixtureVault();
  jest.resetModules();
});

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('status', 'ok');
  expect(res.body).toHaveProperty('uptime');
});

test('POST /webhook/github returns 200', async () => {
  const res = await request(app)
    .post('/webhook/github')
    .send({ ref: 'refs/heads/main' });

  expect(res.status).toBe(200);
});

test('POST /webhook/github with wrong signature returns 401 when webhook secret set', async () => {
  process.env.WEBHOOK_SECRET = 'mysecret';
  jest.resetModules();
  const db = require('../src/db');
  db.init();
  app = require('../src/app');

  const res = await request(app)
    .post('/webhook/github')
    .set('x-hub-signature-256', 'sha256=wrong')
    .send({ ref: 'refs/heads/main' });

  expect(res.status).toBe(401);
});

test('POST /webhook/github with no secret configured skips verification', async () => {
  process.env.WEBHOOK_SECRET = '';
  jest.resetModules();
  const db = require('../src/db');
  db.init();
  app = require('../src/app');

  const res = await request(app)
    .post('/webhook/github')
    .send({ ref: 'refs/heads/main' });

  expect(res.status).toBe(200);
});

test('POST /admin/sync requires key', async () => {
  process.env.WEBHOOK_SECRET = 'adminkey';
  jest.resetModules();
  const db = require('../src/db');
  db.init();
  app = require('../src/app');

  const res = await request(app)
    .post('/admin/sync')
    .set('x-admin-key', 'wrong')
    .send({});

  expect(res.status).toBe(401);
});

test('POST /admin/sync with correct key returns 200', async () => {
  process.env.WEBHOOK_SECRET = 'adminkey';
  jest.resetModules();
  const db = require('../src/db');
  db.init();
  app = require('../src/app');

  const res = await request(app)
    .post('/admin/sync')
    .set('x-admin-key', 'adminkey')
    .send({});

  expect(res.status).toBe(200);
});

test('non-existent route returns 404', async () => {
  const res = await request(app).get('/nonexistent/path');
  expect(res.status).toBe(404);
});

test('malformed route with special chars returns 404', async () => {
  const res = await request(app).get('/blog/../../../etc/passwd');
  // Should not crash, should return 404 or appropriate error
  expect([404, 500]).toContain(res.status);
});
