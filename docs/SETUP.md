# Oblog — Setup Guide

## Quick Start (Local)

```bash
git clone <repo-url> oblog
cd oblog
pnpm install
cp .env.example .env
# Edit .env → set VAULT_PATH=/home/you/obsidian
pnpm start        # or: node src/server.js
```

Open `http://localhost:3000`:
- `/` — public blog listing
- `/blog/your-note` — any note tagged `#public`
- `/login` — admin login (default: `admin` / `admin`)
- `/vault` — full vault browser (requires login)

## Make a Note Public

Add `#public` anywhere in the markdown body:

```markdown
# My Blog Post

#public

Content goes here...
```

Restart the server or wait for reindex. The note appears on the homepage.

## Docker

### Development

```bash
docker compose up -d
```

### Production

```bash
# Copy and edit env vars
cp .env.example .env
vim .env  # Set JWT_SECRET, ADMIN_PASSWORD_HASH, GIT_REPO_URL, WEBHOOK_SECRET

# Start with optional nginx SSL
docker compose -f docker-compose.prod.yml --profile with-nginx up -d
```

Volume mounts:
- `vault_data` → `/app/vault` (git cloned repo)
- `oblog_data` → `/app/data` (SQLite DB + cache)
- SSH key → `/app/data/ssh/id_ed25519` (read-only, for git pull)

## Git Auto-Sync

1. Create a GitHub deploy key (read-only) for your vault repo
2. Mount the private key at `/app/data/ssh/id_ed25519`
3. Set `GIT_REPO_URL=git@github.com:you/vault.git`
4. Set up a GitHub webhook pointing to `https://your-domain.com/webhook/github`
5. Set `WEBHOOK_SECRET` (same value in GitHub webhook settings)

The server will:
- Clone the repo on first start
- Pull on every webhook push event
- Fallback cron: check every 2 minutes

Without `GIT_REPO_URL`, just point `VAULT_PATH` to a local directory.

## Password Setup

On first login with default password `admin`, the server auto-generates a bcrypt hash and prints it to stdout:

```
[auth] Default password hash generated. Use: ADMIN_PASSWORD_HASH=$2a$10$...
```

Copy this hash to your `.env` or Docker environment variables. Then restart.

To pre-generate a hash:

```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

## KaTeX

Display math with `$$...$$` for block math and `$...$` for inline:

```markdown
$$E = mc^2$$

Inline: $x^2 + y^2 = z^2$
```

**Important**: Separate consecutive `$$` blocks with a blank line, or the preprocessor will fix them automatically.

## Tags

Any `#tag` in your note content becomes a styled link. `#public` is hidden from rendering (it's the visibility flag, not a content tag).

## Features

- **Sidebar**: File tree navigator. Drag handle to resize. Folders collapsed by default, auto-expand to show current note.
- **Wikilinks**: `[[Note Name]]` resolves to links for public/accessible notes, plain text otherwise.
- **Embeds**: `![[image.png|300]]` renders images with optional width.
- **Callouts**: `> [!note]` syntax with color-coded borders.
- **Syntax highlighting**: All highlight.js languages for code blocks.
- **Frontmatter**: YAML frontmatter is parsed but not displayed publicly.

## Tests

```bash
pnpm test
```

140 tests, 93%+ coverage. All tests use temporary vaults in `/tmp`, no external dependencies.
