// Custom tags plugin for markdown-it
// Renders #tag as styled links. Optionally hides #public from rendering.

function tagsPlugin(md, options) {
  const defaults = {
    tagBaseUrl: '/tag',
    hidePublic: true,
    tagClass: 'tag',
  };

  const opts = Object.assign({}, defaults, options);

  md.core.ruler.push('obsidian_tags', function (state) {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type !== 'inline') continue;

      const children = token.children;
      if (!children) continue;

      const newChildren = [];

      for (let j = 0; j < children.length; j++) {
        const child = children[j];

        if (child.type !== 'text') {
          newChildren.push(child);
          continue;
        }

        const text = child.content;
        const regex = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)/g;
        let lastIdx = 0;
        const parts = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
          const tag = match[1].toLowerCase();
          const fullMatch = match[0];
          const startIdx = match.index;
          const leadingChar = fullMatch[0] === '#' ? '' : fullMatch[0]; // space or newline

          // Text before this match
          if (startIdx > lastIdx) {
            const textBefore = text.slice(lastIdx, startIdx);
            if (textBefore) {
              const t = new state.Token('text', '', 0);
              t.content = textBefore;
              parts.push(t);
            }
          }

          if (opts.hidePublic && tag === 'public') {
            // Skip #public, just put the leading space/newline
            // Actually remove it entirely - don't emit any token for the tag
            // But keep the leading whitespace if any
            if (leadingChar) {
              const t = new state.Token('text', '', 0);
              t.content = leadingChar;
              parts.push(t);
            }
          } else {
            // Emit the leading whitespace as text
            if (leadingChar) {
              const t = new state.Token('text', '', 0);
              t.content = leadingChar;
              parts.push(t);
            }

            // Emit the tag as a link
            const href = `${opts.tagBaseUrl}/${tag}`;
            const linkOpen = new state.Token('link_open', 'a', 1);
            linkOpen.attrs = [['href', href], ['class', opts.tagClass]];
            parts.push(linkOpen);

            const textToken = new state.Token('text', '', 0);
            textToken.content = '#' + tag;
            parts.push(textToken);

            const linkClose = new state.Token('link_close', 'a', -1);
            parts.push(linkClose);
          }

          lastIdx = startIdx + fullMatch.length;
        }

        // Remaining text
        if (lastIdx < text.length) {
          const remaining = text.slice(lastIdx);
          if (remaining) {
            const t = new state.Token('text', '', 0);
            t.content = remaining;
            parts.push(t);
          }
        }

        if (parts.length > 0) {
          newChildren.push(...parts);
        } else {
          newChildren.push(child);
        }
      }

      token.children = newChildren;
    }
  });
}

module.exports = tagsPlugin;
