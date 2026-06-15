const MarkdownIt = require('markdown-it');

test('obsidian-images plugin renders image embed', () => {
  const plugin = require('../src/markdown/plugins/obsidian-images');
  const md = new MarkdownIt();

  md.use(plugin, { assetBaseUrl: '/assets' });

  const html = md.render('![[photo.png]]');
  expect(html).toContain('<img');
  expect(html).toContain('src="/assets/photo.png"');
  expect(html).toContain('alt="photo.png"');
  expect(html).toContain('loading="lazy"');
});

test('obsidian-images plugin handles width specifier', () => {
  const plugin = require('../src/markdown/plugins/obsidian-images');
  const md = new MarkdownIt();

  md.use(plugin, { assetBaseUrl: '/assets' });

  const html = md.render('![[photo.png|300]]');
  expect(html).toContain('<img');
  expect(html).toContain('style="width:300px"');
  expect(html).toContain('src="/assets/photo.png"');
});

test('obsidian-images plugin handles spaces in filenames', () => {
  const plugin = require('../src/markdown/plugins/obsidian-images');
  const md = new MarkdownIt();

  md.use(plugin, { assetBaseUrl: '/assets' });

  const html = md.render('![[Pasted image 2024.png]]');
  expect(html).toContain('src="/assets/Pasted%20image%202024.png"');
});

test('obsidian-images plugin ignores non-image files', () => {
  const plugin = require('../src/markdown/plugins/obsidian-images');
  const md = new MarkdownIt();

  md.use(plugin, { assetBaseUrl: '/assets' });

  const html = md.render('![[note.md]]');
  // Should NOT render as image - .md is not an image extension
  expect(html).not.toContain('<img');
});

test('obsidian-images plugin handles webp', () => {
  const plugin = require('../src/markdown/plugins/obsidian-images');
  const md = new MarkdownIt();

  md.use(plugin, { assetBaseUrl: '/assets' });

  const html = md.render('![[illustration.webp]]');
  expect(html).toContain('<img');
});

test('obsidian-images plugin handles svg', () => {
  const plugin = require('../src/markdown/plugins/obsidian-images');
  const md = new MarkdownIt();

  md.use(plugin, { assetBaseUrl: '/assets' });

  const html = md.render('![[diagram.svg]]');
  expect(html).toContain('<img');
});

test('obsidian-images plugin skips regular wikilinks', () => {
  const plugin = require('../src/markdown/plugins/obsidian-images');
  const md = new MarkdownIt();

  md.use(plugin, { assetBaseUrl: '/assets' });

  const html = md.render('[[Some Note]]');
  // Regular wikilinks should be untouched by this plugin
  expect(html).not.toContain('<img');
});

test('obsidian-images plugin with width and spaces', () => {
  const plugin = require('../src/markdown/plugins/obsidian-images');
  const md = new MarkdownIt();

  md.use(plugin, { assetBaseUrl: '/assets' });

  const html = md.render('![[My Photo.jpg|500]]');
  expect(html).toContain('style="width:500px"');
  expect(html).toContain('My%20Photo.jpg');
});
