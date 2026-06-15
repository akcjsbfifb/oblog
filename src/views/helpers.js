const fs = require('fs');
const path = require('path');

function applyLayout(data, isAuthenticated) {
  const layoutPath = path.join(__dirname, 'layout.html');
  let html = fs.readFileSync(layoutPath, 'utf-8');

  html = html
    .replace('{{{content}}}', data.content || '')
    .replace('{{title}}', data.title || '')
    .replace('{{head}}', data.head || '')
    .replace('{{scripts}}', data.scripts || '')
    .replace('{{isAuth}}', isAuthenticated ? '1' : '0')
    .replace('{{currentPath}}', data.currentPath || '');

  html = html.replace(/\{\{#isAuthenticated\}\}([\s\S]*?)\{\{\/isAuthenticated\}\}/g,
    isAuthenticated ? '$1' : '');
  html = html.replace(/\{\{\^isAuthenticated\}\}([\s\S]*?)\{\{\/isAuthenticated\}\}/g,
    !isAuthenticated ? '$1' : '');

  return html;
}

function applyLayoutSimple(title, content, isAuthenticated, currentPath) {
  return applyLayout({ title, content, currentPath }, isAuthenticated);
}

module.exports = { applyLayout, applyLayoutSimple };
