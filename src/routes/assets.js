const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getAssetInfo } = require('../db/vault-indexer');
const { optionalAuth } = require('../middleware/auth');

const router = Router();

// GET /assets/* - Serve assets with access control
router.get('/*', optionalAuth, (req, res) => {
  const assetPath = req.params[0];
  const sanitized = path.normalize(assetPath).replace(/^(\.\.[\/\\])+/, '');

  // Try exact match first, then search for file anywhere in vault
  let fullPath = path.join(config.vaultPath, sanitized);

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    // Try to find the file by basename somewhere in vault
    const basename = path.basename(sanitized);
    const searchResult = findFileInVault(basename);
    if (!searchResult) {
      return res.status(404).send('Asset not found');
    }
    fullPath = searchResult;
  }

  // Check access control
  const relPath = path.relative(config.vaultPath, fullPath);
  const assetInfo = getAssetInfo(relPath);

  if (!req.user && assetInfo && !assetInfo.referenced_by_public) {
    // Asset exists but is not referenced by any public note → 404
    return res.status(404).send('Asset not found');
  }

  // Serve the file
  const ext = path.extname(fullPath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
  };

  const mime = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(fullPath).pipe(res);
});

function findFileInVault(basename) {
  // Search recursively for the file
  function search(dir, target) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (['.obsidian', '.trash', '.git', '.stfolder'].includes(entry.name)) continue;

        const full = path.join(dir, entry.name);
        if (entry.isFile() && entry.name === target) {
          return full;
        }
        if (entry.isDirectory()) {
          const found = search(full, target);
          if (found) return found;
        }
      }
    } catch (_) {}
    return null;
  }

  return search(config.vaultPath, basename);
}

module.exports = router;
