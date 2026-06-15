// Custom obsidian images plugin for markdown-it
// Handles ![[image.png]] and ![[image.png|width]]

function obsidianImagesPlugin(md, options) {
  const defaults = {
    assetBaseUrl: '/assets',
    resolveAsset: null,
    isAuthenticated: false,
  };

  const opts = Object.assign({}, defaults, options);

  md.inline.ruler.before('link', 'obsidian_image', function (state, silent) {
    const pos = state.pos;
    const src = state.src;

    // Check for ![[
    if (src.charCodeAt(pos) !== 0x21 /* ! */) return false;
    if (src.charCodeAt(pos + 1) !== 0x5B /* [ */) return false;
    if (src.charCodeAt(pos + 2) !== 0x5B /* [ */) return false;

    const end = src.indexOf(']]', pos + 3);
    if (end === -1) return false;

    const inner = src.slice(pos + 3, end);
    const pipeIdx = inner.indexOf('|');
    const filename = (pipeIdx === -1 ? inner : inner.slice(0, pipeIdx)).trim();
    const width = pipeIdx === -1 ? null : inner.slice(pipeIdx + 1).trim();

    if (!filename) return false;
    if (!/\.(png|jpg|jpeg|gif|svg|webp|bmp|pdf|mp4|webm|mp3|ogg|wav)$/i.test(filename)) return false;

    if (!silent) {
      const encFilename = filename.replace(/ /g, '%20');
      const srcAttr = `${opts.assetBaseUrl}/${encFilename}`;

      const token = state.push('html_inline', '', 0);
      let styleAttr = width ? ` style="width:${width}px"` : '';
      token.content = `<img src="${srcAttr}" alt="${filename}"${styleAttr} loading="lazy" />`;
    }

    state.pos = end + 2;
    return true;
  });
}

module.exports = obsidianImagesPlugin;
