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
  const indexer = require('../src/db/vault-indexer');

  // We need to index before testing routes
  app = require('../src/app');
});

afterEach(() => {
  cleanupFixtureVault();
  jest.resetModules();
});

// Need async index before each test
async function ensureIndexed() {
  const indexer = require('../src/db/vault-indexer');
  await indexer.reindexVault();
}

test('GET / returns blog listing with no public notes initially', async () => {
  // Run indexer
  await ensureIndexed();

  const res = await request(app).get('/');
  expect(res.status).toBe(200);
  expect(res.text).toContain('Oblog');
});

test('GET / shows public notes after indexing', async () => {
  await ensureIndexed();

  const res = await request(app).get('/');
  expect(res.status).toBe(200);
  // Should show public notes
  expect(res.text).toContain('Public Note');
  expect(res.text).toContain('/blog/public-note');
  // Should NOT show private notes
  expect(res.text).not.toContain('/blog/private-note');
});

test('GET /blog/:slug returns public note', async () => {
  await ensureIndexed();

  const res = await request(app).get('/blog/public-note');
  expect(res.status).toBe(200);
  expect(res.text).toContain('Public Note');
  expect(res.text).toContain('This is a public note');
});

test('GET /blog/:slug returns 404 for private note', async () => {
  await ensureIndexed();

  const res = await request(app).get('/blog/private-note');
  expect(res.status).toBe(404);
});

test('GET /blog/:slug returns 404 for nonexistent note', async () => {
  await ensureIndexed();

  const res = await request(app).get('/blog/nonexistent');
  expect(res.status).toBe(404);
});

test('GET /tag/:tag filters by tag', async () => {
  await ensureIndexed();

  const res = await request(app).get('/tag/tag1');
  expect(res.status).toBe(200);
  expect(res.text).toContain('#tag1');
});

test('GET /tag/:tag shows empty for unused tag', async () => {
  await ensureIndexed();

  const res = await request(app).get('/tag/neverused');
  expect(res.status).toBe(200);
  expect(res.text).toContain('No public notes');
});

test('GET /blog/tree returns public file tree as JSON', async () => {
  await ensureIndexed();

  const res = await request(app).get('/blog/tree');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  // Should only include public notes
  const findNoteInTree = (nodes, slug) => {
    if (!nodes) return false;
    for (const n of nodes) {
      if (n.slug === slug) return true;
      if (n.children && findNoteInTree(n.children, slug)) return true;
    }
    return false;
  };
  expect(findNoteInTree(res.body, 'public-note')).toBe(true);
  expect(findNoteInTree(res.body, 'private-note')).toBe(false);
});

test('GET /login returns login page', async () => {
  await ensureIndexed();

  const res = await request(app).get('/login');
  expect(res.status).toBe(200);
  expect(res.text).toContain('Login');
  expect(res.text).toContain('username');
  expect(res.text).toContain('password');
});
