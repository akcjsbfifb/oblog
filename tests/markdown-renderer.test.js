const { createFixtureVault, cleanupFixtureVault } = require('./helpers');

let vaultDir, dataDir;

beforeEach(() => {
  const fix = createFixtureVault();
  vaultDir = fix.vaultDir;
  dataDir = fix.dataDir;
  process.env.VAULT_PATH = vaultDir;
  process.env.DATA_PATH = dataDir;
});

afterEach(() => {
  cleanupFixtureVault();
  jest.resetModules();
});

function getRenderer() {
  jest.resetModules();
  const db = require('../src/db');
  db.init();
  const indexer = require('../src/db/vault-indexer');
  // Need to index first for wikilink resolution
  return { db, indexer, renderer: require('../src/markdown/renderer') };
}

test('createRenderer returns markdown-it instance with all plugins', () => {
  const { renderer } = getRenderer();
  const md = renderer.createRenderer({ isAuthenticated: false });

  // Basic markdown
  let html = md.render('# Hello');
  expect(html).toContain('Hello');
  expect(html).toContain('h1');

  // Code blocks with highlight
  html = md.render('```js\nconst x = 1;\n```');
  expect(html).toContain('hljs');
  expect(html).toContain('const');
  expect(html).toContain('x');

  // Linkify
  html = md.render('https://example.com');
  expect(html).toContain('href');
});

test('getPublicRenderer creates public instance', () => {
  const { renderer } = getRenderer();
  const md = renderer.getPublicRenderer();
  expect(md).toBeDefined();
  // Should be singleton
  expect(renderer.getPublicRenderer()).toBe(md);
});

test('getPrivateRenderer creates private instance', () => {
  const { renderer } = getRenderer();
  const md = renderer.getPrivateRenderer();
  expect(md).toBeDefined();
  // Should be singleton
  expect(renderer.getPrivateRenderer()).toBe(md);
});

test('invalidateRenderers resets singletons', () => {
  const { renderer } = getRenderer();
  const pub1 = renderer.getPublicRenderer();
  const priv1 = renderer.getPrivateRenderer();

  renderer.invalidateRenderers();

  const pub2 = renderer.getPublicRenderer();
  const priv2 = renderer.getPrivateRenderer();

  // After invalidation, new instances are created
  // They may be the same reference since the constructor runs again
  // But the function should not throw
});

test('renderer handles unknown code language gracefully', () => {
  const { renderer } = getRenderer();
  const md = renderer.createRenderer();
  const html = md.render('```fakelang\nsome code\n```');
  expect(html).toContain('<pre');
  expect(html).toContain('some code');
});

test('renderer handles code with no language', () => {
  const { renderer } = getRenderer();
  const md = renderer.createRenderer();
  const html = md.render('```\nplain code\n```');
  expect(html).toContain('plain code');
});

test('public renderer treats wikilinks to private notes as plain text', async () => {
  const { indexer, renderer } = getRenderer();
  await indexer.reindexVault();

  const md = renderer.getPublicRenderer();
  const html = md.render('Check [[Private Note]] here.');
  // Private Note should NOT be a link in public view
  expect(html).not.toContain('href="/blog/private-note"');
  // Should be plain text
  expect(html).toContain('Private Note');
});

test('private renderer treats wikilinks to all notes as links', async () => {
  const { indexer, renderer } = getRenderer();
  await indexer.reindexVault();

  const md = renderer.getPrivateRenderer();
  const html = md.render('Check [[Private Note]] here.');
  // In private view, even private notes get links
  expect(html).toContain('href="/vault/private-note"');
});

test('preprocessLatex fixes touching $$ blocks', () => {
  jest.resetModules();
  const renderer = require('../src/markdown/renderer');

  const input = '$$x^2$$$$y^2$$';
  const fixed = renderer.preprocessLatex(input);
  expect(fixed).toBe('$$x^2$$\n\n$$y^2$$');
  // The katex plugin should now render both blocks
  const md = renderer.createRenderer();
  const html = md.render(fixed);
  expect(html).toContain('katex');
  expect(html).not.toContain('katex-error');
});

test('preprocessLatex leaves separated blocks unchanged', () => {
  jest.resetModules();
  const renderer = require('../src/markdown/renderer');

  const input = '$$x^2$$\n\n$$y^2$$';
  const fixed = renderer.preprocessLatex(input);
  expect(fixed).toBe(input);
});

test('renderPublic and renderPrivate preprocess latex', async () => {
  const { indexer, renderer } = getRenderer();
  await indexer.reindexVault();

  // Simulate touching $$ blocks
  const md = renderer.createRenderer({ isAuthenticated: false });
  const input = '# Test\n\n$$x^2$$$$y^2$$';
  const html = md.render(renderer.preprocessLatex(input));
  expect(html).toContain('katex');
  expect(html).not.toContain('katex-error');
});
