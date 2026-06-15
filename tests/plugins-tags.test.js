const MarkdownIt = require('markdown-it');

test('tags plugin renders #tag as styled link', () => {
  const plugin = require('../src/markdown/plugins/tags');
  const md = new MarkdownIt();

  md.use(plugin, { tagBaseUrl: '/tag', hidePublic: true });

  const html = md.render('Some text #javascript and more');
  expect(html).toContain('href="/tag/javascript"');
  expect(html).toContain('class="tag"');
  expect(html).toContain('#javascript');
});

test('tags plugin hides #public tag', () => {
  const plugin = require('../src/markdown/plugins/tags');
  const md = new MarkdownIt();

  md.use(plugin, { tagBaseUrl: '/tag', hidePublic: true });

  const html = md.render('This is a #public note');
  expect(html).not.toContain('/tag/public');
  expect(html).not.toContain('#public');
});

test('tags plugin respects hidePublic=false', () => {
  const plugin = require('../src/markdown/plugins/tags');
  const md = new MarkdownIt();

  md.use(plugin, { tagBaseUrl: '/tag', hidePublic: false });

  const html = md.render('This is a #public note');
  expect(html).toContain('#public');
});

test('tags plugin handles multiple tags', () => {
  const plugin = require('../src/markdown/plugins/tags');
  const md = new MarkdownIt();

  md.use(plugin, { tagBaseUrl: '/tag', hidePublic: true });

  const html = md.render('#python #javascript #rust');
  expect(html).toContain('#python');
  expect(html).toContain('#javascript');
  expect(html).toContain('#rust');
});

test('tags plugin handles tags with dashes and slashes', () => {
  const plugin = require('../src/markdown/plugins/tags');
  const md = new MarkdownIt();

  md.use(plugin, { tagBaseUrl: '/tag', hidePublic: true });

  const html = md.render('Check #my-tag and #nested/tag');
  expect(html).toContain('#my-tag');
  expect(html).toContain('#nested/tag');
});

test('tags plugin does not match numbers-starting tags', () => {
  const plugin = require('../src/markdown/plugins/tags');
  const md = new MarkdownIt();

  md.use(plugin, { tagBaseUrl: '/tag', hidePublic: true });

  const html = md.render('This is #123abc');
  // Should not be treated as a tag since it starts with a number
  expect(html).not.toContain('href="/tag/');
});

test('tags plugin with custom tag class', () => {
  const plugin = require('../src/markdown/plugins/tags');
  const md = new MarkdownIt();

  md.use(plugin, { tagBaseUrl: '/tag', hidePublic: true, tagClass: 'my-tag' });

  const html = md.render('#custom');
  expect(html).toContain('class="my-tag"');
});
