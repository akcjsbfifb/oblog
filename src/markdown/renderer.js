const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');
const path = require('path');
const config = require('../config');
const wikilinksPlugin = require('./plugins/wikilinks');
const obsidianImagesPlugin = require('./plugins/obsidian-images');
const tagsPlugin = require('./plugins/tags');
const { resolveWikilink, isPublicNote } = require('../db/vault-indexer');

// Fix touching $$ blocks: $$...$$$$...$$ → $$...$$\n\n$$...$$
// markdown-it-katex needs blank lines between display math blocks
function preprocessLatex(content) {
  return content.replace(/\$\$([^$]*(?:\$[^$]+)*)\$\$(\$\$)/g, (match, inner, next) => {
    return '$$' + inner + '$$\n\n' + next;
  });
}

function createRenderer({ isAuthenticated = false } = {}) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return '<pre class="hljs"><code>' +
            hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
            '</code></pre>';
        } catch (_) {}
      }
      return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    },
  });

  // Built-in plugins
  try { md.use(require('markdown-it-anchor')); } catch (_) {}
  try { md.use(require('markdown-it-footnote')); } catch (_) {}
  try { md.use(require('markdown-it-task-lists'), { enabled: true }); } catch (_) {}
  try {
    md.use(require('@traptitech/markdown-it-katex'), { throwOnError: false, errorColor: '#cc0000' });
  } catch (_) {}

  // Custom plugins
  md.use(wikilinksPlugin, {
    vaultPath: config.vaultPath,
    resolvePath: (target) => resolveWikilink(target),
    resolveVisibility: (targetPath) => isPublicNote(targetPath),
    isAuthenticated,
  });

  md.use(obsidianImagesPlugin, {
    assetBaseUrl: '/assets',
    isAuthenticated,
  });

  md.use(tagsPlugin, {
    hidePublic: true,
  });

  return md;
}

// Singleton instances
let publicRenderer = null;
let privateRenderer = null;

function getPublicRenderer() {
  if (!publicRenderer) publicRenderer = createRenderer({ isAuthenticated: false });
  return publicRenderer;
}

function getPrivateRenderer() {
  if (!privateRenderer) privateRenderer = createRenderer({ isAuthenticated: true });
  return privateRenderer;
}

function invalidateRenderers() {
  publicRenderer = null;
  privateRenderer = null;
}

function renderPublic(content) {
  return getPublicRenderer().render(preprocessLatex(content));
}

function renderPrivate(content) {
  return getPrivateRenderer().render(preprocessLatex(content));
}

module.exports = {
  createRenderer,
  getPublicRenderer,
  getPrivateRenderer,
  invalidateRenderers,
  preprocessLatex,
  renderPublic,
  renderPrivate,
};
