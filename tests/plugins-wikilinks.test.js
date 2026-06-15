const MarkdownIt = require('markdown-it');

test('wikilinks plugin renders public notes as links', () => {
  const plugin = require('../src/markdown/plugins/wikilinks');
  const md = new MarkdownIt();

  let resolvedPath = null;
  md.use(plugin, {
    vaultPath: '/test',
    resolvePath: (target) => {
      resolvedPath = target;
      return '/test/target.md';
    },
    resolveVisibility: () => true,
    isAuthenticated: false,
  });

  const html = md.render('[[Target Note]]');
  expect(html).toContain('href="/blog/target-note"');
  expect(html).toContain('wikilink');
  expect(html).toContain('Target Note');
});

test('wikilinks plugin renders private notes as text', () => {
  const plugin = require('../src/markdown/plugins/wikilinks');
  const md = new MarkdownIt();

  md.use(plugin, {
    vaultPath: '/test',
    resolvePath: (target) => '/test/secret.md',
    resolveVisibility: () => false,
    isAuthenticated: false,
  });

  const html = md.render('[[Secret Note]]');
  expect(html).not.toContain('href=');
  expect(html).not.toContain('<a ');
  expect(html).toContain('Secret Note');
});

test('wikilinks plugin renders all notes when authenticated', () => {
  const plugin = require('../src/markdown/plugins/wikilinks');
  const md = new MarkdownIt();

  md.use(plugin, {
    vaultPath: '/test',
    resolvePath: (target) => '/test/any.md',
    resolveVisibility: () => false, // Not public
    isAuthenticated: true, // But user is logged in
  });

  const html = md.render('[[Any Note]]');
  expect(html).toContain('href="/vault/');
  expect(html).toContain('Any Note');
});

test('wikilinks plugin handles alias syntax [[Target|Display]]', () => {
  const plugin = require('../src/markdown/plugins/wikilinks');
  const md = new MarkdownIt();

  md.use(plugin, {
    vaultPath: '/test',
    resolvePath: (target) => '/test/target.md',
    resolveVisibility: () => true,
    isAuthenticated: false,
  });

  const html = md.render('[[Target Note|Click here]]');
  expect(html).toContain('href="/blog/target-note"');
  expect(html).toContain('Click here');
  expect(html).not.toContain('Target Note');
});

test('wikilinks plugin handles alias with private note as text', () => {
  const plugin = require('../src/markdown/plugins/wikilinks');
  const md = new MarkdownIt();

  md.use(plugin, {
    vaultPath: '/test',
    resolvePath: (target) => '/test/secret.md',
    resolveVisibility: () => false,
    isAuthenticated: false,
  });

  const html = md.render('[[Secret|Hidden]]');
  expect(html).not.toContain('<a ');
  expect(html).not.toContain('href=');
  expect(html).toContain('Hidden');
  expect(html).not.toContain('Secret');
});

test('wikilinks plugin handles unresolved targets as text', () => {
  const plugin = require('../src/markdown/plugins/wikilinks');
  const md = new MarkdownIt();

  md.use(plugin, {
    vaultPath: '/test',
    resolvePath: () => null, // Not found
    resolveVisibility: () => false,
    isAuthenticated: false,
  });

  const html = md.render('[[Missing Note]]');
  expect(html).not.toContain('<a ');
  expect(html).not.toContain('href=');
  expect(html).toContain('Missing Note');
});

test('wikilinks plugin ignores embeds (![[...]])', () => {
  const plugin = require('../src/markdown/plugins/wikilinks');
  const md = new MarkdownIt();

  let called = false;
  md.use(plugin, {
    resolvePath: () => { called = true; return null; },
    resolveVisibility: () => false,
    isAuthenticated: false,
  });

  const html = md.render('![[image.png]]');
  // The wikilinks plugin should skip ![[ embeds
  // (they are handled by obsidian-images plugin)
  // The output will have raw ![[image.png]] since we didn't register the image plugin
  expect(html).toContain('image.png');
});

test('wikilinks plugin handles notes with special characters in name', () => {
  const plugin = require('../src/markdown/plugins/wikilinks');
  const md = new MarkdownIt();

  md.use(plugin, {
    resolvePath: () => '/test/special.md',
    resolveVisibility: () => true,
    isAuthenticated: false,
  });

  const html = md.render('[[Note with spaces & stuff]]');
  expect(html).toContain('Note with spaces &amp; stuff');
});
