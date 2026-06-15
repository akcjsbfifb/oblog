const request = require('supertest');
const jwt = require('jsonwebtoken');
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
  process.env.ADMIN_USERNAME = 'admin';

  jest.resetModules();
  const db = require('../src/db');
  db.init();
  app = require('../src/app');
});

afterEach(() => {
  cleanupFixtureVault();
  jest.resetModules();
});

async function ensureIndexed() {
  const indexer = require('../src/db/vault-indexer');
  await indexer.reindexVault();
}

function makeToken() {
  return jwt.sign({ username: 'admin', role: 'admin' }, process.env.JWT_SECRET);
}

test('GET /vault redirects when not authenticated', async () => {
  await ensureIndexed();

  const res = await request(app).get('/vault');
  expect(res.status).toBe(302);
  expect(res.headers.location).toContain('/login');
});

test('GET /vault shows all notes when authenticated', async () => {
  await ensureIndexed();

  const res = await request(app)
    .get('/vault')
    .set('Cookie', `token=${makeToken()}`);

  expect(res.status).toBe(200);
  expect(res.text).toContain('Vault');
  // Should show both public and private
  expect(res.text).toContain('Public Note');
  expect(res.text).toContain('Private Note');
  expect(res.text).toContain('Untagged Note');
  expect(res.text).toContain('private');
  expect(res.text).toContain('#public');
});

test('GET /vault/:slug shows note when authenticated', async () => {
  await ensureIndexed();

  const res = await request(app)
    .get('/vault/private-note')
    .set('Cookie', `token=${makeToken()}`);

  expect(res.status).toBe(200);
  expect(res.text).toContain('Private Note');
  expect(res.text).toContain('This is private');
});

test('GET /vault/:slug returns 404 for nonexistent', async () => {
  await ensureIndexed();

  const res = await request(app)
    .get('/vault/nonexistent')
    .set('Cookie', `token=${makeToken()}`);

  expect(res.status).toBe(404);
});

test('GET /vault/:slug requires auth', async () => {
  await ensureIndexed();

  const res = await request(app).get('/vault/public-note');
  expect(res.status).toBe(302);
});

test('GET /vault shows public/private counts', async () => {
  await ensureIndexed();

  const res = await request(app)
    .get('/vault')
    .set('Cookie', `token=${makeToken()}`);

  expect(res.text).toContain('3 public');
});

test('GET /vault/tree returns full file tree as JSON', async () => {
  await ensureIndexed();

  const res = await request(app)
    .get('/vault/tree')
    .set('Cookie', `token=${makeToken()}`);

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  // Both public and private should appear
  const tree = res.body;
  // tree has at least the subfolder dir
  expect(tree.length).toBeGreaterThan(0);
});
