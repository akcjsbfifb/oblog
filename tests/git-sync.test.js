const { createFixtureVault, cleanupFixtureVault } = require('./helpers');
const path = require('path');
const fs = require('fs');

let vaultDir, dataDir;

beforeEach(() => {
  const fix = createFixtureVault();
  vaultDir = fix.vaultDir;
  dataDir = fix.dataDir;
  process.env.VAULT_PATH = vaultDir;
  process.env.DATA_PATH = dataDir;
  process.env.GIT_REPO_URL = '';
});

afterEach(() => {
  cleanupFixtureVault();
  jest.resetModules();
  delete process.env.GIT_REPO_URL;
});

test('syncRepo returns false when no GIT_REPO_URL configured', async () => {
  jest.resetModules();
  const git = require('../src/git/sync');
  const result = await git.syncRepo();
  expect(result).toBe(false);
});

test('isGitRepo returns false when no git config', async () => {
  jest.resetModules();
  const git = require('../src/git/sync');
  const result = await git.isGitRepo();
  expect(result).toBe(false);
});

test('isGitRepo returns false for non-git directory', async () => {
  jest.resetModules();
  process.env.GIT_REPO_URL = 'git@github.com:test/test.git';
  const git = require('../src/git/sync');
  const result = await git.isGitRepo();
  expect(result).toBe(false);
});

test('cloneRepo skips when no GIT_REPO_URL', async () => {
  jest.resetModules();
  const git = require('../src/git/sync');
  const result = await git.cloneRepo();
  expect(result).toBe(false);
});

test('pullRepo skips when not a git repo', async () => {
  jest.resetModules();
  const git = require('../src/git/sync');
  const result = await git.pullRepo();
  expect(result).toBe(false);
});

test('cloneRepo returns false for non-empty vault', async () => {
  jest.resetModules();
  process.env.GIT_REPO_URL = 'git@github.com:test/test.git';
  const git = require('../src/git/sync');
  // Vault already has files from fixture
  const result = await git.cloneRepo();
  expect(result).toBe(false);
});

// Note: Full git clone/pull tests would need actual git repos.
// These are integration-level and better tested in e2e.
