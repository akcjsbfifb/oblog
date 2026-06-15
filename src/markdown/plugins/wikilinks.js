// Custom wikilinks plugin for markdown-it
// Handles [[Note]] and [[Note|Alias]] with visibility checking

function wikilinksPlugin(md, options) {
  const defaults = {
    vaultPath: '.',
    resolveVisibility: null,
    resolvePath: null,
    isAuthenticated: false,
    getPrefixUrl: (isAuth, isPublic) => isAuth ? '/vault' : '/blog',
  };

  const opts = Object.assign({}, defaults, options);

  function slugify(text) {
    return text
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

  md.inline.ruler.before('link', 'wikilink', function (state, silent) {
    const pos = state.pos;
    const src = state.src;

    if (src.charCodeAt(pos) !== 0x5B /* [ */) return false;
    if (src.charCodeAt(pos + 1) !== 0x5B /* [ */) return false;

    // Skip embeds ![[...]] - handled by obsidian-images plugin
    if (pos > 0 && src.charCodeAt(pos - 1) === 0x21 /* ! */) return false;

    const end = src.indexOf(']]', pos + 2);
    if (end === -1) return false;

    const inner = src.slice(pos + 2, end);
    const pipeIdx = inner.indexOf('|');
    const target = (pipeIdx === -1 ? inner : inner.slice(0, pipeIdx)).trim();
    const label = (pipeIdx === -1 ? target : inner.slice(pipeIdx + 1)).trim();

    if (!target) return false;

    if (!silent) {
      let href = null;
      let isPublic = true;

      if (opts.resolvePath && opts.resolveVisibility) {
        const targetPath = opts.resolvePath(target);
        if (targetPath) {
          isPublic = opts.isAuthenticated || opts.resolveVisibility(targetPath);
          if (isPublic) {
            const slug = slugify(target);
            const prefix = opts.getPrefixUrl(opts.isAuthenticated, isPublic);
            href = `${prefix}/${slug}`;
          }
        } else {
          // Note not found in vault - render as plain text
          isPublic = false;
        }
      }

      if (href) {
        const token = state.push('link_open', 'a', 1);
        token.attrs = [['href', href], ['class', 'wikilink']];
        state.push('text', '', 0).content = label;
        state.push('link_close', 'a', -1);
      } else {
        // Plain text for private or missing notes
        const token = state.push('text', '', 0);
        token.content = label;
      }
    }

    state.pos = end + 2;
    return true;
  });
}

module.exports = wikilinksPlugin;
