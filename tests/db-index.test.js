const Database = require('better-sqlite3');
const { createFixtureVault, cleanupFixtureVault } = require('./helpers');
const path = require('path');

let vaultDir, dataDir;

beforeEach(() => {
  const fix = createFixtureVault();
  vaultDir = fix.vaultDir;
  dataDir = fix.dataDir;
  process.env.VAULT_PATH = vaultDir;
  process.env.DATA_PATH = dataDir;
});

afterEach(() => {
  cleanupFixtureVault();
  jest.resetModules();
});

function getDb() {
  jest.resetModules();
  const dbModule = require('../src/db');
  const db = dbModule.init();
  return { db, dbModule };
}

test('init creates database file', () => {
  const { db } = getDb();
  const dbPath = path.join(dataDir, 'oblog.db');
  const fs = require('fs');
  expect(fs.existsSync(dbPath)).toBe(true);
  expect(db).toBeDefined();
});

test('init creates all tables', () => {
  const { db } = getDb();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const names = tables.map(t => t.name);
  expect(names).toContain('notes');
  expect(names).toContain('links');
  expect(names).toContain('assets');
});

test('init creates indexes', () => {
  const { db } = getDb();
  const idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all();
  expect(idx.length).toBeGreaterThanOrEqual(5);
});

test('getDb throws if not initialized', () => {
  jest.resetModules();
  const dbMod = require('../src/db/index');
  expect(() => dbMod.getDb()).toThrow('not initialized');
});

test('WAL mode is enabled', () => {
  const { db } = getDb();
  const row = db.prepare('PRAGMA journal_mode').get();
  expect(row.journal_mode).toBe('wal');
});
