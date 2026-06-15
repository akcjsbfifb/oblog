const fs = require('fs');
const path = require('path');

test('applyLayout renders authenticated layout', () => {
  jest.resetModules();
  const { applyLayout, applyLayoutSimple } = require('../src/views/helpers');

  const html = applyLayout({ title: 'Test', content: '<p>Hello</p>' }, true);
  expect(html).toContain('<p>Hello</p>');
  expect(html).toContain('Test');
  expect(html).toContain('Vault'); // Nav link for authenticated
  expect(html).toContain('Logout');
  expect(html).not.toContain('Login');
});

test('applyLayout renders unauthenticated layout', () => {
  jest.resetModules();
  const { applyLayout } = require('../src/views/helpers');

  const html = applyLayout({ title: 'Test', content: '<p>Hello</p>' }, false);
  expect(html).toContain('Login');
  expect(html).not.toContain('Logout');
  expect(html).not.toContain('Vault');
});

test('applyLayoutSimple works as shorthand', () => {
  jest.resetModules();
  const { applyLayoutSimple } = require('../src/views/helpers');

  const html = applyLayoutSimple('My Title', '<div>content</div>', false);
  expect(html).toContain('My Title');
  expect(html).toContain('<div>content</div>');
});

test('applyLayout includes head and scripts', () => {
  jest.resetModules();
  const { applyLayout } = require('../src/views/helpers');

  const html = applyLayout({
    title: 'Page',
    content: '<p>body</p>',
    head: '<meta name="test" content="value">',
    scripts: '<script>console.log("test")</script>',
  }, false);

  expect(html).toContain('<meta name="test" content="value">');
  expect(html).toContain('console.log("test")');
});

test('applyLayout with empty/null data fields does not crash', () => {
  jest.resetModules();
  const { applyLayout } = require('../src/views/helpers');

  const html = applyLayout({}, false);
  expect(html).toContain('</html>');
});
