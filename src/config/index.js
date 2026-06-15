const path = require('path');

const env = (key, fallback) => process.env[key] ?? fallback;

module.exports = {
  port: parseInt(env('PORT', '3000'), 10),
  nodeEnv: env('NODE_ENV', 'development'),
  vaultPath: path.resolve(env('VAULT_PATH', './vault')),
  dataPath: path.resolve(env('DATA_PATH', './data')),
  jwtSecret: env('JWT_SECRET', 'dev_secret_change_me'),
  jwtExpiresIn: env('JWT_EXPIRES_IN', '30d'),
  adminUsername: env('ADMIN_USERNAME', 'admin'),
  adminPasswordHash: env('ADMIN_PASSWORD_HASH', ''),
  webhookSecret: env('WEBHOOK_SECRET', ''),
  cacheEnabled: env('CACHE_ENABLED', 'true') === 'true',
  gitRepoUrl: env('GIT_REPO_URL', ''),
  gitBranch: env('GIT_BRANCH', 'main'),
};
