const fs = require('fs');
const path = require('path');
const config = require('../config');

const cacheDir = path.join(config.dataPath, 'cache', 'blog');

function ensureCacheDir() {
  fs.mkdirSync(cacheDir, { recursive: true });
}

function getCachePath(slug) {
  return path.join(cacheDir, slug + '.html');
}

function get(slug) {
  if (!config.cacheEnabled) return null;
  const cachePath = getCachePath(slug);
  try {
    if (fs.existsSync(cachePath)) {
      return fs.readFileSync(cachePath, 'utf-8');
    }
  } catch (_) {}
  return null;
}

function set(slug, html) {
  if (!config.cacheEnabled) return;
  try {
    ensureCacheDir();
    fs.writeFileSync(getCachePath(slug), html, 'utf-8');
  } catch (err) {
    console.error(`[cache] Failed to write cache for ${slug}:`, err.message);
  }
}

function invalidate(slug) {
  if (!slug) return;
  try {
    const cachePath = getCachePath(slug);
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
  } catch (_) {}
}

function invalidateAll() {
  try {
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      for (const f of files) {
        try { fs.unlinkSync(path.join(cacheDir, f)); } catch (_) {}
      }
    }
  } catch (_) {}
}

module.exports = { get, set, invalidate, invalidateAll };
