const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const matter = require('gray-matter');
const { getDb } = require('./index');
const config = require('../config');

const IGNORE_DIRS = new Set([
  '.obsidian', '.trash', '.git', '.stfolder',
  '.stversions', 'node_modules',
]);
const IGNORE_PREFIXES = ['.', '_'];
const MARKDOWN_EXT = '.md';
const ASSET_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp',
  '.pdf', '.mp4', '.webm', '.mp3', '.ogg', '.wav',
  '.csv', '.json', '.xml', '.yaml', '.yml',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
]);

function slugify(filename) {
  return filename
    .replace(/\.md$/i, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100) || 'untitled';
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function extractWikilinks(content) {
  const wikilinks = [];
  const embedRegex = /!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const linkRegex = /(?<!!)\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match;

  while ((match = embedRegex.exec(content)) !== null) {
    wikilinks.push({ target: match[1].trim(), type: 'embed' });
  }
  while ((match = linkRegex.exec(content)) !== null) {
    wikilinks.push({ target: match[1].trim(), type: 'wikilink' });
  }

  return wikilinks;
}

function extractTags(content) {
  const tags = new Set();
  const regex = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function resolveNotePath(db, targetName) {
  const clean = targetName.replace(/\.md$/i, '').trim().toLowerCase();
  const row = db.prepare('SELECT path FROM notes WHERE LOWER(title) = ? OR slug = ?').get(clean, clean);
  if (row) return row.path;

  const like = db.prepare("SELECT path FROM notes WHERE LOWER(path) LIKE ?").get(`%${clean}.md`);
  if (like) return like.path;

  return null;
}

function fileShouldBeIgnored(entryPath, vaultPath) {
  const rel = path.relative(vaultPath, entryPath);
  const parts = rel.split(path.sep);
  for (const part of parts) {
    if (IGNORE_DIRS.has(part)) return true;
    for (const prefix of IGNORE_PREFIXES) {
      if (part.startsWith(prefix)) return true;
    }
  }
  return false;
}

function getAllFiles(dir, vaultPath) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (fileShouldBeIgnored(fullPath, vaultPath)) continue;
      if (entry.isDirectory()) {
        results.push(...getAllFiles(fullPath, vaultPath));
      } else {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Skip directories we can't read
  }
  return results;
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
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
  return mimeMap[ext] || 'application/octet-stream';
}

async function reindexVault() {
  const db = getDb();
  const vaultPath = config.vaultPath;

  if (!fs.existsSync(vaultPath)) {
    console.log(`[indexer] Vault path does not exist: ${vaultPath}`);
    return;
  }

  console.log(`[indexer] Scanning vault: ${vaultPath}`);
  const allFiles = getAllFiles(vaultPath, vaultPath);

  const mdFiles = allFiles.filter(f => f.toLowerCase().endsWith(MARKDOWN_EXT));
  const assetFiles = allFiles.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ASSET_EXTS.has(ext) && !f.toLowerCase().endsWith('.excalidraw.md');
  });

  const insertNote = db.prepare(`
    INSERT OR REPLACE INTO notes (path, title, slug, is_public, frontmatter, tags, content_hash, last_modified, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteLinks = db.prepare('DELETE FROM links WHERE source_path = ?');
  const insertLink = db.prepare('INSERT INTO links (source_path, target_path, link_type) VALUES (?, ?, ?)');

  let indexed = 0;
  let skipped = 0;

  const transaction = db.transaction(() => {
    for (const fullPath of mdFiles) {
      const relPath = path.relative(vaultPath, fullPath);
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const hash = hashContent(raw);

        const existing = db.prepare('SELECT content_hash FROM notes WHERE path = ?').get(relPath);
        if (existing && existing.content_hash === hash) {
          skipped++;
          continue;
        }

        const parsed = matter(raw);
        const allTags = extractTags(parsed.content);
        const isPublic = allTags.includes('public') ? 1 : 0;
        const title = extractTitle(raw) || path.basename(fullPath, MARKDOWN_EXT);
        const slug = slugify(path.basename(fullPath, MARKDOWN_EXT));
        const lastModified = fs.statSync(fullPath).mtime.toISOString();

        insertNote.run(
          relPath,
          title,
          slug,
          isPublic,
          JSON.stringify(parsed.data),
          JSON.stringify(allTags),
          hash,
          lastModified,
          new Date().toISOString()
        );

        deleteLinks.run(relPath);

        const wikilinks = extractWikilinks(parsed.content);
        for (const link of wikilinks) {
          insertLink.run(relPath, link.target, link.type);
        }

        indexed++;
      } catch (err) {
        console.error(`[indexer] Error processing ${relPath}:`, err.message);
      }
    }
  });

  transaction();

  // Asset indexing
  const upsertAsset = db.prepare('INSERT OR REPLACE INTO assets (path, mime_type, referenced_by_public) VALUES (?, ?, ?)');
  const countAssetRefs = db.prepare(`
    SELECT COUNT(*) as cnt FROM links
    JOIN notes ON links.source_path = notes.path
    WHERE notes.is_public = 1 AND links.link_type = 'embed' AND links.target_path = ?
  `);

  db.transaction(() => {
    for (const fullPath of assetFiles) {
      const relPath = path.relative(vaultPath, fullPath);
      const mime = getMimeType(fullPath);
      const { cnt } = countAssetRefs.get(path.basename(fullPath)) || { cnt: 0 };
      upsertAsset.run(relPath, mime, cnt > 0 ? 1 : 0);
    }
  })();

  // Update asset references: any embed from a public note → asset is public
  db.prepare(`
    UPDATE assets SET referenced_by_public = 1
    WHERE path IN (
      SELECT DISTINCT assets.path FROM assets
      JOIN links ON links.target_path = assets.path
      JOIN notes ON links.source_path = notes.path
      WHERE links.link_type = 'embed' AND notes.is_public = 1
    )
  `).run();

  // Remove assets that no longer exist
  const dbAssets = db.prepare('SELECT path FROM assets').all();
  for (const asset of dbAssets) {
    if (!fs.existsSync(path.join(vaultPath, asset.path))) {
      db.prepare('DELETE FROM assets WHERE path = ?').run(asset.path);
    }
  }

  // Remove notes that no longer exist
  const dbNotes = db.prepare('SELECT path FROM notes').all();
  for (const note of dbNotes) {
    if (!fs.existsSync(path.join(vaultPath, note.path))) {
      db.prepare('DELETE FROM notes WHERE path = ?').run(note.path);
      db.prepare('DELETE FROM links WHERE source_path = ?').run(note.path);
    }
  }

  console.log(`[indexer] Done: ${indexed} indexed, ${skipped} skipped, ${assetFiles.length} assets`);
}

function getNoteBySlug(slug) {
  const db = getDb();
  return db.prepare('SELECT * FROM notes WHERE slug = ?').get(slug);
}

function getNoteByPath(relPath) {
  const db = getDb();
  return db.prepare('SELECT * FROM notes WHERE path = ?').get(relPath);
}

function getPublicNotes() {
  const db = getDb();
  return db.prepare('SELECT * FROM notes WHERE is_public = 1 ORDER BY last_modified DESC').all();
}

function getAllNotes() {
  const db = getDb();
  return db.prepare('SELECT * FROM notes ORDER BY last_modified DESC').all();
}

function isPublicNote(relPath) {
  const db = getDb();
  const row = db.prepare('SELECT is_public FROM notes WHERE path = ?').get(relPath);
  return row ? row.is_public === 1 : false;
}

function getAssetInfo(relPath) {
  const db = getDb();
  return db.prepare('SELECT * FROM assets WHERE path = ?').get(relPath);
}

function resolveWikilink(targetName) {
  const db = getDb();
  return resolveNotePath(db, targetName);
}

function getVaultTree() {
  const db = getDb();
  const notes = db.prepare('SELECT path, title, slug, is_public FROM notes ORDER BY path').all();
  const dirs = db.prepare('SELECT DISTINCT path FROM assets ORDER BY path').all().map(r => r.path);

  // All files/folders in vault
  const allPaths = new Set();
  notes.forEach(n => allPaths.add(n.path));
  dirs.forEach(d => allPaths.add(d));

  // Build tree structure
  const root = { name: '/', type: 'dir', children: [] };
  const dirMap = { '': root };

  // Sort all paths and build tree
  const sortedPaths = [...allPaths].sort();

  for (const fullPath of sortedPaths) {
    const parts = fullPath.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const parentPath = currentPath;
      currentPath = currentPath ? currentPath + '/' + parts[i] : parts[i];
      const isLast = i === parts.length - 1;

      if (!dirMap[currentPath]) {
        const isFile = isLast && !dirs.includes(fullPath) && !notes.find(n => n.path === fullPath);

        // Check if it's a directory (either has children or is a known dir path)
        const node = {
          name: parts[i],
          path: currentPath,
          type: isLast && !dirs.includes(currentPath) && dirs.filter(d => d.startsWith(currentPath + '/')).length === 0 ? 'file' : 'dir',
          children: [],
        };

        // If it's a markdown file, add metadata
        if (currentPath.endsWith('.md')) {
          const note = notes.find(n => n.path === currentPath);
          if (note) {
            node.slug = note.slug;
            node.title = note.title;
            node.isPublic = !!note.is_public;
          }
        }

        dirMap[currentPath] = node;
        if (dirMap[parentPath]) {
          dirMap[parentPath].children.push(node);
        }
      }
    }
  }

  return root.children;
}

module.exports = {
  reindexVault,
  getNoteBySlug,
  getNoteByPath,
  getPublicNotes,
  getAllNotes,
  isPublicNote,
  getAssetInfo,
  resolveWikilink,
  getVaultTree,
};
