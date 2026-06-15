const fs = require('fs');
const path = require('path');
const os = require('os');

let fixtureDir;

function createFixtureVault() {
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oblog-test-'));
  const vault = path.join(fixtureDir, 'vault');
  const data = path.join(fixtureDir, 'data');
  fs.mkdirSync(vault, { recursive: true });
  fs.mkdirSync(data, { recursive: true });

  // Create test markdown files
  const publicNote = `# Public Note\n\n#public\n\nThis is a public note with a [[Private Note|link]] and ![image](test.png).\n\n\`\`\`js\nconsole.log("hello");\n\`\`\`\n\n- [ ] Task one\n- [x] Task two\n\n#tag1 #tag2\n`;
  const privateNote = `# Private Note\n\n#secret\n\nThis is private.\n\n[[Public Note]]\n\n![[test.png]]\n`;
  const noTagsNote = `# Untagged Note\n\nSome content here. No tags, no public.\n`;
  const anotherPublic = `---\ntitle: Custom Title\ndate: 2024-01-15\n---\n\n#public\n\nAnother public note with #custom tag.\n\n> [!note] A callout\n> Content here\n\n## Section\n\nSome text with $x^2$ inline math.\n`;
  const deepNote = `# Deep Nested Note\n\n#public\n\nNested inside a subfolder.\n`;

  fs.mkdirSync(path.join(vault, 'subfolder'), { recursive: true });
  fs.mkdirSync(path.join(vault, 'img'), { recursive: true });

  fs.writeFileSync(path.join(vault, 'public-note.md'), publicNote);
  fs.writeFileSync(path.join(vault, 'private-note.md'), privateNote);
  fs.writeFileSync(path.join(vault, 'untagged-note.md'), noTagsNote);
  fs.writeFileSync(path.join(vault, 'another-public.md'), anotherPublic);
  fs.writeFileSync(path.join(vault, 'subfolder', 'deep-note.md'), deepNote);

  // Assets
  fs.writeFileSync(path.join(vault, 'img', 'test.png'), Buffer.from('fake-png'));
  fs.writeFileSync(path.join(vault, 'img', 'image.png'), Buffer.from('fake-png-2'));
  fs.writeFileSync(path.join(vault, 'document.pdf'), Buffer.from('fake-pdf'));

  // Create .obsidian and .trash to test ignoring
  fs.mkdirSync(path.join(vault, '.obsidian'), { recursive: true });
  fs.mkdirSync(path.join(vault, '.trash'), { recursive: true });
  fs.writeFileSync(path.join(vault, '.obsidian', 'app.json'), '{}');
  fs.writeFileSync(path.join(vault, '.trash', 'deleted.md'), 'trash');

  return { vaultDir: vault, dataDir: data, fixtureDir };
}

function cleanupFixtureVault() {
  if (fixtureDir) {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
}

// Set env vars for testing
process.env.VAULT_PATH = '';
process.env.DATA_PATH = '';
process.env.JWT_SECRET = 'test-secret-key-1234567890123456';
process.env.NODE_ENV = 'test';
process.env.CACHE_ENABLED = 'false';
process.env.GIT_REPO_URL = '';

module.exports = { createFixtureVault, cleanupFixtureVault };
