const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getAllNotes, getNoteBySlug, getVaultTree } = require('../db/vault-indexer');
const { getPrivateRenderer, renderPrivate } = require('../markdown/renderer');
const { requireAuth } = require('../middleware/auth');
const { applyLayoutSimple } = require('../views/helpers');

const router = Router();

router.use(requireAuth);

function noteSummaryHtml(note) {
  const tags = JSON.parse(note.tags || '[]').filter(t => t !== 'public');
  const tagsHtml = tags.length
    ? '<div>' + tags.map(t => `<a href="/tag/${t}" class="tag">#${t}</a>`).join('') + '</div>'
    : '';
  const date = new Date(note.last_modified).toLocaleDateString('en-US',
    { year: 'numeric', month: 'short', day: 'numeric' });
  const vis = note.is_public
    ? '<span style="color:var(--green);margin-left:.5rem">#public</span>'
    : '<span style="color:var(--red);margin-left:.5rem">private</span>';
  return `<article style="margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border)">
  <h2 style="margin:0 0 .25rem"><a href="/vault/${note.slug}">${note.title}</a></h2>
  <div style="color:var(--fg-dim);font-size:.85rem;margin-bottom:.5rem">${date}${vis}</div>
  ${tagsHtml}
</article>`;
}

// GET /vault - All notes
router.get('/', (req, res) => {
  const notes = getAllNotes();
  const itemsHtml = notes.map(noteSummaryHtml).join('') ||
    '<p style="color:var(--fg-dim);text-align:center;margin:3rem 0">No notes in vault.</p>';
  const publicCount = notes.filter(n => n.is_public).length;
  res.send(applyLayoutSimple('Vault',
    `<h1>Vault</h1>
<div style="color:var(--fg-dim);font-size:.85rem;margin-bottom:1.5rem">
  Total: ${notes.length} note${notes.length !== 1 ? 's' : ''} (${publicCount} public)
</div>${itemsHtml}`, true, ''));
});

// GET /vault/tree - File tree as JSON
router.get('/tree', (req, res) => {
  const tree = getVaultTree();
  res.json(tree);
});

// GET /vault/:slug - Any note
router.get('/:slug', (req, res) => {
  const { slug } = req.params;
  const note = getNoteBySlug(slug);

  if (!note) {
    return res.status(404).send(applyLayoutSimple('Not found', '<h1>404</h1><p>Note not found.</p>', true, ''));
  }

  const fullPath = path.join(config.vaultPath, note.path);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).send(applyLayoutSimple('Not found', '<h1>404</h1><p>Note not found on disk.</p>', true, ''));
  }

  const raw = fs.readFileSync(fullPath, 'utf-8');
  const rendered = renderPrivate(raw);
  const tags = JSON.parse(note.tags || '[]').filter(t => t !== 'public');
  const tagsHtml = tags.length
    ? '<div style="margin-top:1.5rem">' + tags.map(t => `<a href="/tag/${t}" class="tag">#${t}</a>`).join('') + '</div>'
    : '';
  const vis = note.is_public ? '<span style="color:var(--green)">#public</span>' : '<span style="color:var(--red)">private</span>';

  const meta = `<div class="note-meta">
  <span style="color:var(--fg-dim)">${note.path}</span> &middot;
  <span style="color:var(--fg-dim)">${new Date(note.last_modified).toLocaleString('en-US')}</span> &middot;
  ${vis}
</div>`;

  res.send(applyLayoutSimple(note.title, `${meta}${rendered}${tagsHtml}`, true, slug));
});

module.exports = router;
