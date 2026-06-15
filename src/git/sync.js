const simpleGit = require('simple-git');
const fs = require('fs');
const config = require('../config');

let git = null;

function getGit() {
  if (!git && config.gitRepoUrl) {
    if (!fs.existsSync(config.vaultPath)) {
      fs.mkdirSync(config.vaultPath, { recursive: true });
    }
    git = simpleGit(config.vaultPath);
  }
  return git;
}

async function isGitRepo() {
  if (!config.gitRepoUrl) return false;
  const g = getGit();
  if (!g) return false;
  try {
    return fs.existsSync(config.vaultPath) && fs.existsSync(config.vaultPath + '/.git');
  } catch {
    return false;
  }
}

async function cloneRepo() {
  const g = getGit();
  if (!g || !config.gitRepoUrl) {
    console.log('[git] No GIT_REPO_URL configured, skipping clone');
    return false;
  }

  if (await isGitRepo()) {
    console.log('[git] Repo already cloned, pulling instead');
    return pullRepo();
  }

  console.log(`[git] Cloning ${config.gitRepoUrl} into ${config.vaultPath}`);
  try {
    // Ensure vault dir is empty or doesn't exist
    if (fs.existsSync(config.vaultPath)) {
      const files = fs.readdirSync(config.vaultPath);
      if (files.length > 0) {
        console.log('[git] Vault dir is not empty, skipping clone');
        return false;
      }
    }

    await g.clone(config.gitRepoUrl, '.', ['--branch', config.gitBranch, '--depth', '1']);
    console.log('[git] Clone successful');
    return true;
  } catch (err) {
    console.error('[git] Clone failed:', err.message);
    return false;
  }
}

async function pullRepo() {
  const g = getGit();
  if (!g || !(await isGitRepo())) return false;

  console.log('[git] Pulling latest changes...');
  try {
    await g.fetch('origin', config.gitBranch);
    await g.merge(['origin/' + config.gitBranch]);
    console.log('[git] Pull successful');
    return true;
  } catch (err) {
    console.error('[git] Pull failed:', err.message);
    return false;
  }
}

async function syncRepo() {
  if (!config.gitRepoUrl) return false;

  if (await isGitRepo()) {
    return pullRepo();
  } else {
    return cloneRepo();
  }
}

module.exports = { syncRepo, isGitRepo, cloneRepo, pullRepo };
