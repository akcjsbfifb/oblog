require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const config = require('./config');
const db = require('./db');
const { reindexVault } = require('./db/vault-indexer');
const { syncRepo } = require('./git/sync');

async function init() {
  console.log('[oblog] Starting...');
  console.log(`[oblog] Environment: ${config.nodeEnv}`);
  console.log(`[oblog] Vault path: ${config.vaultPath}`);

  // Initialize database
  db.init();
  console.log('[oblog] Database initialized');

  // Configure SSH key from env var (base64) if provided
  const sshPrivateKey = process.env.SSH_PRIVATE_KEY;
  if (sshPrivateKey) {
    const fs = require('fs');
    const keyPath = config.sshKeyPath;
    const keyDir = require('path').dirname(keyPath);
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true });
    }
    fs.writeFileSync(keyPath, Buffer.from(sshPrivateKey, 'base64').toString('utf-8'));
    fs.chmodSync(keyPath, 0o600);
    process.env.GIT_SSH_COMMAND = `ssh -i ${keyPath} -o StrictHostKeyChecking=accept-new`;
    console.log('[oblog] SSH key configured from SSH_PRIVATE_KEY env var');
  } else if (config.sshKeyPath && require('fs').existsSync(config.sshKeyPath)) {
    require('fs').chmodSync(config.sshKeyPath, 0o600);
    process.env.GIT_SSH_COMMAND = `ssh -i ${config.sshKeyPath} -o StrictHostKeyChecking=accept-new`;
    console.log('[oblog] SSH key configured from mounted file');
  }

  // Git sync if configured
  if (config.gitRepoUrl) {
    console.log('[oblog] Git repo configured, syncing...');
    await syncRepo();
  }

  // Index vault
  await reindexVault();

  // Periodic git sync + reindex
  const cronInterval = parseInt(process.env.CRON_SYNC_MINUTES || '5', 10);
  if (cronInterval > 0 && config.gitRepoUrl) {
    const cron = require('node-cron');
    const cache = require('./markdown/cache');
    cron.schedule(`*/${cronInterval} * * * *`, async () => {
      try {
        console.log('[cron] Syncing...');
        await syncRepo();
        await reindexVault();
        cache.invalidateAll();
        console.log('[cron] Sync complete');
      } catch (err) {
        console.error('[cron] Sync error:', err.message);
      }
    });
    console.log(`[oblog] Cron sync enabled: every ${cronInterval} min`);
  }

  // Start server
  const app = require('./app');
  app.listen(config.port, () => {
    console.log(`[oblog] Server running on http://localhost:${config.port}`);
    console.log(`[oblog] Public blog: http://localhost:${config.port}/`);
    console.log(`[oblog] Login: http://localhost:${config.port}/login`);
    console.log(`[oblog] Vault (requires login): http://localhost:${config.port}/vault`);
  });
}

init().catch(err => {
  console.error('[oblog] Failed to start:', err);
  process.exit(1);
});
