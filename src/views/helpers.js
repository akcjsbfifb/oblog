const fs = require('fs');
const path = require('path');

function applyLayout(data, isAuthenticated) {
  const layoutPath = path.join(__dirname, 'layout.html');
  let html = fs.readFileSync(layoutPath, 'utf-8');

  html = html
    .replace('{{{content}}}', data.content || '')
    .replaceAll('{{title}}', data.title || '')
    .replaceAll('{{head}}', data.head || '')
    .replaceAll('{{scripts}}', data.scripts || '')
    .replaceAll('{{isAuth}}', isAuthenticated ? '1' : '0')
    .replaceAll('{{currentPath}}', data.currentPath || '');

  html = html.replace(/\{\{#isAuthenticated\}\}([\s\S]*?)\{\{\/isAuthenticated\}\}/g,
    isAuthenticated ? '$1' : '');
  html = html.replace(/\{\{\^isAuthenticated\}\}([\s\S]*?)\{\{\/isAuthenticated\}\}/g,
    !isAuthenticated ? '$1' : '');

  return html;
}

function applyLayoutSimple(title, content, isAuthenticated, currentPath) {
  return applyLayout({ title, content, currentPath }, isAuthenticated);
}

function applyCleanLayout(title, content, isAuthenticated) {
  const layoutPath = path.join(__dirname, 'clean.html');
  let html = fs.readFileSync(layoutPath, 'utf-8');

  html = html
    .replace('{{{content}}}', content || '')
    .replaceAll('{{title}}', title || '')
    .replaceAll('{{head}}', '')
    .replaceAll('{{scripts}}', '');

  return html;
}

module.exports = { applyLayout, applyLayoutSimple, applyCleanLayout };
