const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { router: blogRoutes, noteSummaryHtml } = require('./routes/public');
const privateRoutes = require('./routes/private');
const authRoutes = require('./routes/auth');
const assetsRoutes = require('./routes/assets');
const { errorHandler, notFoundHandler } = require('./middleware/error');
const { optionalAuth } = require('./middleware/auth');
const config = require('./config');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cookie parsing
app.use(cookieParser());

// Rate limiting on auth endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, try again later.',
});
app.use('/login', loginLimiter);

// GET / - Blog home
const { applyLayoutSimple } = require('./views/helpers');
const { getPublicNotes } = require('./db/vault-indexer');

app.get('/', optionalAuth, (req, res) => {
  const isAuth = !!req.user;
  const notes = getPublicNotes();
  const itemsHtml = notes.map(n => noteSummaryHtml(n, 'blog')).join('') ||
    '<p style="color:var(--fg-dim);text-align:center;margin:3rem 0">No public notes yet. Add <code>#public</code> to a note to show it here.</p>';
  res.send(applyLayoutSimple('Blog', itemsHtml, isAuth, ''));
});

// GET /tag/:tag
app.get('/tag/:tag', optionalAuth, (req, res) => {
  const tag = req.params.tag.toLowerCase();
  const isAuth = !!req.user;
  const notes = getPublicNotes().filter(n => {
    const t = JSON.parse(n.tags || '[]');
    return t.includes(tag);
  });
  const itemsHtml = notes.map(n => noteSummaryHtml(n, 'blog')).join('') ||
    `<p style="color:var(--fg-dim);text-align:center;margin:3rem 0">No public notes with tag #${tag}.</p>`;
  res.send(applyLayoutSimple(`#${tag} - Blog`, `<h1>#${tag}</h1>${itemsHtml}`, isAuth, ''));
});

// Routes
app.use('/blog', blogRoutes);
app.use('/assets', assetsRoutes);
app.use('/', authRoutes);
app.use('/vault', privateRoutes);

// Webhook
app.post('/webhook/github', express.json(), (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const crypto = require('crypto');

  if (!signature || !config.webhookSecret) {
    res.status(200).send('OK - no verification configured');
  } else {
    const hmac = crypto.createHmac('sha256', config.webhookSecret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
    const sigBuf = Buffer.from(signature);
    const digBuf = Buffer.from(digest);
    if (sigBuf.length !== digBuf.length || !crypto.timingSafeEqual(sigBuf, digBuf)) {
      return res.status(401).send('Unauthorized');
    }
  }

  res.status(200).send('OK');

  // Process async
  const { syncRepo } = require('./git/sync');
  const { reindexVault } = require('./db/vault-indexer');
  const { invalidateRenderers } = require('./markdown/renderer');
  const cache = require('./markdown/cache');

  setImmediate(async () => {
    try {
      if (config.gitRepoUrl) {
        await syncRepo();
      }
      await reindexVault();
      invalidateRenderers();
      cache.invalidateAll();
    } catch (err) {
      console.error('[webhook] Error:', err.message);
    }
  });
});

// Admin sync
app.post('/admin/sync', (req, res) => {
  const key = req.headers['x-admin-key'] || req.body?.key;
  if (!key || key !== config.webhookSecret) {
    return res.status(401).send('Unauthorized');
  }

  res.status(200).send('Sync started');

  const { syncRepo } = require('./git/sync');
  const { reindexVault } = require('./db/vault-indexer');
  const cache = require('./markdown/cache');

  setImmediate(async () => {
    try {
      if (config.gitRepoUrl) {
        await syncRepo();
      }
      await reindexVault();
      cache.invalidateAll();
    } catch (err) {
      console.error('[admin/sync] Error:', err.message);
    }
  });
});

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 404
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

module.exports = app;
