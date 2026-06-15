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

  // Git sync if configured
  if (config.gitRepoUrl) {
    console.log('[oblog] Git repo configured, syncing...');
    await syncRepo();
  }

  // Index vault
  await reindexVault();

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
