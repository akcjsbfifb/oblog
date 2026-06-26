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

test('GET /login shows form when not authenticated', async () => {
  const res = await request(app).get('/login');
  expect(res.status).toBe(200);
  expect(res.text).toContain('password');
  expect(res.text).toContain('Sign in');
});

test('GET /login redirects when already authenticated', async () => {
  const token = jwt.sign({ username: 'admin' }, process.env.JWT_SECRET);

  const res = await request(app)
    .get('/login')
    .set('Cookie', `token=${token}`);

  expect(res.status).toBe(302);
  expect(res.headers.location).toBe('/vault');
});

test('POST /login with valid credentials redirects to vault', async () => {
  // First call will auto-set the hash for password 'admin'
  const res = await request(app)
    .post('/login')
    .type('form')
    .send('username=admin&password=admin');

  expect(res.status).toBe(302);
  expect(res.headers.location).toBe('/vault');
  // Should set cookie
  expect(res.headers['set-cookie']).toBeDefined();
  expect(res.headers['set-cookie'][0]).toContain('token=');
});

test('POST /login with invalid password returns 401', async () => {
  // Force a hash for consistent testing
  const bcrypt = require('bcryptjs');
  process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('secret', 10);

  jest.resetModules();
  const db = require('../src/db');
  db.init();
  app = require('../src/app');

  const res = await request(app)
    .post('/login')
    .type('form')
    .send('username=admin&password=wrong');

  expect(res.status).toBe(401);
  expect(res.text).toContain('Invalid password');
});

test('POST /login with invalid username returns 401', async () => {
  const res = await request(app)
    .post('/login')
    .type('form')
    .send('username=nobody&password=anything');

  expect(res.status).toBe(401);
});

test('POST /login with redirect query follows redirect', async () => {
  process.env.ADMIN_PASSWORD_HASH = '';

  jest.resetModules();
  const db = require('../src/db');
  db.init();
  app = require('../src/app');

  const res = await request(app)
    .post('/login')
    .type('form')
    .send('username=admin&password=admin&redirect=/vault/some-note');

  expect(res.status).toBe(302);
  expect(res.headers.location).toBe('/vault/some-note');
});

test('POST /logout clears cookie and redirects', async () => {
  const res = await request(app).post('/logout');
  expect(res.status).toBe(302);
  expect(res.headers.location).toBe('/');
  expect(res.headers['set-cookie']).toBeDefined();
});

test('GET /login with redirect param preserves it in form', async () => {
  const res = await request(app).get('/login?redirect=/blog/test');
  expect(res.status).toBe(200);
  expect(res.text).toContain('/blog/test');
});
