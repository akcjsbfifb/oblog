# Oblog — Architecture

> Obsidian Vault as Blog. SSR. Privacy by default. `#public` = visible.

## Concept

```
Privacy by default, public by exception.
```

- Notes with `#public` tag → accessible at `/blog/:slug` without auth
- Notes without `#public` → require JWT login, accessible at `/vault/:slug`
- Assets (images, PDFs) → served only if referenced by a public note, or if authenticated

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| HTTP | Express 4 |
| Auth | JWT (jsonwebtoken) + bcryptjs, httpOnly cookies |
| DB | better-sqlite3 (WAL mode, file: `data/oblog.db`) |
| Markdown | markdown-it + plugins (katex, anchor, footnote, task-lists) |
| Code highlight | highlight.js |
| Frontmatter | gray-matter |
| Git sync | simple-git (optional, requires `GIT_REPO_URL` env var) |
| Cron fallback | node-cron (pulls every 2 min if behind) |
| CSS | Embedded in layout (no build step, no Tailwind CDN dependency) |
| KaTeX | `@traptitech/markdown-it-katex` |
| Package manager | pnpm |
| Tests | Jest + supertest (140 tests, 93% coverage) |

## Directory Structure

```
oblog/
├── src/
│   ├── config/index.js         # Env vars, paths, defaults
│   ├── db/
│   │   ├── index.js            # SQLite init, WAL pragma
│   │   ├── schema.sql          # Tables: notes, links, assets
│   │   └── vault-indexer.js    # Scanner, indexer, tree builder
│   ├── git/sync.js             # clone/pull from GitHub
│   ├── markdown/
│   │   ├── renderer.js         # markdown-it factory + preprocess
│   │   ├── cache.js            # Filesystem cache for rendered HTML
│   │   └── plugins/
│   │       ├── wikilinks.js    # [[Note]] with visibility check
│   │       ├── obsidian-images.js  # ![[img.png|width]]
│   │       └── tags.js         # #tag → styled link, hides #public
│   ├── middleware/
│   │   ├── auth.js             # requireAuth, optionalAuth (JWT)
│   │   ├── cache.js            # Serve from disk cache if available
│   │   └── error.js            # 404/500 handlers (HTML + JSON)
│   ├── routes/
│   │   ├── public.js           # /blog/:slug, /blog/tree (public)
│   │   ├── private.js          # /vault/:slug, /vault/tree (auth)
│   │   ├── auth.js             # /login, /logout
│   │   └── assets.js           # /assets/* (access-controlled)
│   ├── views/
│   │   ├── layout.html         # Main layout + sidebar + CSS + JS
│   │   ├── helpers.js          # applyLayout template engine
│   │   ├── note.html           # (unused, inline now)
│   │   ├── blog-list.html      # (unused, inline now)
│   │   └── login.html          # Login form template
│   ├── app.js                  # Express app, route mounting, webhook
│   └── server.js               # Entry point, init DB, index, listen
├── tests/                      # Jest test suite
├── docker/
│   ├── Dockerfile              # Alpine + Node 20 + git + SSH
│   └── nginx.conf              # Reverse proxy (optional)
├── docker-compose.yml          # Dev/local
├── docker-compose.prod.yml     # Production (volumes, healthcheck, nginx)
├── .env                        # Local environment variables
├── .env.example
├── package.json
├── pnpm-lock.yaml
├── PLAN.md                     # Original plan
├── ARCHITECTURE.md             # This file
└── SETUP.md                    # Setup instructions
```

## Database Schema

```sql
notes (
  id, path UNIQUE, title, slug, is_public, frontmatter JSON,
  tags JSON, content_hash SHA256, last_modified, indexed_at
)

links (
  id, source_path FK→notes.path, target_path, link_type (wikilink|embed)
)

assets (
  id, path UNIQUE, mime_type, referenced_by_public
)
```

Indexes on `notes(is_public)`, `notes(path)`, `notes(slug)`, `links(target_path)`, `assets(path)`.

## Request Flow

```
Browser → Express
  ├── / → app.js inline handler → blog list (public notes only)
  ├── /blog/:slug → public.js → DB check is_public → render markdown → HTML
  ├── /blog/tree → public.js → DB tree → filter public → JSON
  ├── /vault/:slug → private.js → requireAuth → render (all notes) → HTML
  ├── /vault/tree → private.js → requireAuth → full tree → JSON
  ├── /login → auth.js → GET form / POST login → JWT cookie → redirect
  ├── /assets/* → assets.js → optionalAuth → check referenced_by_public
  ├── /webhook/github → app.js → verify HMAC → git pull → reindex
  └── /health → { status: "ok" }
```

## Markdown Pipeline

```
Raw .md content
  → preprocessLatex()           # Fix touching $$ blocks (insert \n\n)
  → markdown-it.render()
    → markdown-it-anchor        # Header IDs
    → markdown-it-footnote      # [^1] footnotes
    → markdown-it-task-lists    # - [ ] checkboxes
    → @traptitech/markdown-it-katex  # $inline$ and $$block$$ math
    → wikilinks (custom)        # [[Note]] → link or plain text
    → obsidian-images (custom)  # ![[img.png|300]] → <img>
    → tags (custom)             # #tag → link, hides #public
    → highlight.js             # ```lang code blocks
    → linkify, typographer      # Built-in markdown-it
  → HTML string
  → layout.html wrapper         # Sidebar, header, CSS
```

## Privacy Model

1. **Default deny**: Every note is private unless it contains the literal string `#public` (case-insensitive, word-delimited)
2. **404 for everything**: If a note is private, `/blog/:slug` returns 404 (same as nonexistent — no info leak)
3. **Wikilinks to private notes**: Rendered as plain text (no `<a>` tag) in public view. In authenticated view, they become links.
4. **Assets**: Only served if `referenced_by_public = 1` OR user is authenticated. Otherwise 404.
5. **No directory listing**: `/vault/` requires auth. `/assets/` has no index.

## Indexing

- Runs on startup, after git pull, and on webhook trigger
- Walks vault directory recursively, skipping `.obsidian/`, `.trash/`, `.git/`, hidden files, `.excalidraw.md`
- For each `.md` file: computes SHA256 hash, skips if unchanged
- Extracts: title (first H1), slug (filename → URL-safe), tags, wikilinks, frontmatter, `#public` check
- Assets: registered by scanning for known extensions, then cross-referenced with `links` table
- Deleted files: removed from DB on next index

## Caching

- Filesystem cache at `data/cache/blog/:slug.html`
- Public notes only (not `/vault/` routes)
- Invalidated when content hash changes during reindex
- TTL not needed — hash-based invalidation
- Middleware intercepts `res.send`, caches response body

## Git & Webhook

- Git sync via simple-git (SSH deploy key or PAT)
- Webhook: `POST /webhook/github` verifies `x-hub-signature-256` HMAC
- Fallback cron: checks `git status` every 2 minutes, pulls if behind
- Entrypoint script (`docker/entrypoint.sh`) handles SSH key setup

## Docker

Two compose files:
- `docker-compose.yml`: dev/local, mounts `./vault` and `./data` as volumes
- `docker-compose.prod.yml`: production, named volumes, optional nginx profile for SSL, healthcheck

## Tests

- Jest + supertest, 140 tests
- Fixture vault created in `/tmp` per test, cleaned up after
- Tests cover: config, DB init, vault indexer, markdown renderer, plugins, middleware, routes, views
- `npm test` or `pnpm test`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3000 | Server port |
| NODE_ENV | No | development | production/development |
| VAULT_PATH | Yes | ./vault | Path to Obsidian vault (local dir or Docker volume) |
| DATA_PATH | Yes | ./data | Path for SQLite + cache |
| JWT_SECRET | Yes | — | Secret for signing JWT tokens (min 32 chars) |
| JWT_EXPIRES_IN | No | 30d | Token expiration |
| ADMIN_USERNAME | No | admin | Login username |
| ADMIN_PASSWORD_HASH | No | — | bcrypt hash. If empty, auto-generates on first login from password "admin" |
| WEBHOOK_SECRET | No | — | GitHub webhook HMAC secret |
| GIT_REPO_URL | No | — | Git remote for auto-sync |
| GIT_BRANCH | No | main | Branch to pull |
| CACHE_ENABLED | No | true | Enable/disable filesystem cache |
| SSH_KEY_PATH | No | ~/.ssh/id_ed25519 | Path to SSH key for Git (Docker only) |
