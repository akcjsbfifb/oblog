const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getPublicNotes, getNoteBySlug } = require('../db/vault-indexer');
const { getPublicRenderer, renderPublic } = require('../markdown/renderer');
const { optionalAuth } = require('../middleware/auth');
const cacheMiddleware = require('../middleware/cache');
const { applyLayout, applyLayoutSimple } = require('../views/helpers');

const router = Router();

function noteSummaryHtml(note, prefix) {
  const tags = JSON.parse(note.tags || '[]').filter(t => t !== 'public');
  const tagsHtml = tags.length
    ? '<div>' + tags.map(t => `<a href="/tag/${t}" class="tag">#${t}</a>`).join('') + '</div>'
    : '';
  const date = new Date(note.last_modified).toLocaleDateString('en-US',
    { year: 'numeric', month: 'short', day: 'numeric' });
  return `<article style="margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border)">
  <h2 style="margin:0 0 .25rem"><a href="/${prefix}/${note.slug}">${note.title}</a></h2>
  <div style="color:var(--fg-dim);font-size:.85rem;margin-bottom:.5rem">${date}</div>
  ${tagsHtml}
</article>`;
}

// GET /blog/tree - Public file tree (only public notes)
router.get('/tree', (req, res) => {
  const { getVaultTree } = require('../db/vault-indexer');
  const tree = getVaultTree(req.query.sort);
  function filterPublic(nodes) {
    if (!nodes) return [];
    return nodes.filter(node => {
      if (node.type === 'file') return node.isPublic;
      const filtered = filterPublic(node.children);
      if (filtered.length > 0) { node.children = filtered; return true; }
      return false;
    });
  }
  res.json(filterPublic(tree));
});

// GET /blog/:slug - Public note
router.get('/:slug', optionalAuth, cacheMiddleware, (req, res) => {
  const { slug } = req.params;
  const isAuth = !!req.user;
  const note = getNoteBySlug(slug);

  if (!note || !note.is_public) {
    return res.status(404).send(applyLayoutSimple('Not found', '<h1>404</h1><p>Note not found.</p>', isAuth, ''));
  }

  const fullPath = path.join(config.vaultPath, note.path);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).send(applyLayoutSimple('Not found', '<h1>404</h1><p>Note not found on disk.</p>', isAuth, ''));
  }

  const raw = fs.readFileSync(fullPath, 'utf-8');
  const rendered = renderPublic(raw);
  const tags = JSON.parse(note.tags || '[]').filter(t => t !== 'public');
  const tagsHtml = tags.length
    ? '<div style="margin-top:1.5rem">' + tags.map(t => `<a href="/tag/${t}" class="tag">#${t}</a>`).join('') + '</div>'
    : '';

  res.send(applyLayoutSimple(note.title, `${rendered}${tagsHtml}`, isAuth, slug));
});

module.exports = { router, noteSummaryHtml };
