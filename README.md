# Oblog

**Obsidian Vault as Blog** — SSR with privacy by default.

Turn your [Obsidian](https://obsidian.md) vault into a blog. Notes tagged `#public` are visible to everyone. Everything else stays private behind a login.

## How It Works

```
Your Obsidian vault (markdown files)
        │
        ▼
    Oblog server (Express + SQLite)
        │
        ├── /blog/*    ← public notes (#public)
        └── /vault/*   ← all notes (login required)
```

Add `#public` anywhere in a note → it appears on your blog. No build step, no static generation. Every page is rendered on demand.

## Features

- **Privacy by default** — only `#public` notes are exposed
- **Zero build** — SSR renders markdown on the fly, works with vaults of any size
- **Obsidian syntax** — wikilinks `[[Note]]`, embeds `![[img.png]]`, callouts, tags, LaTeX (KaTeX)
- **Dark theme** — Catppuccin Mocha palette
- **JWT auth** — secure login with httpOnly cookies
- **Git auto-sync** — webhook or cron pulls from your vault repo
- **Docker** — single container, Coolify-ready

## Quick Start

```bash
git clone https://github.com/you/oblog
cd oblog
pnpm install
cp .env.example .env
# Edit .env: set VAULT_PATH=/path/to/your/obsidian/vault
pnpm start
```

Open `http://localhost:3000`. Login at `/login` (default: `admin` / `admin`).

## Docker

```bash
docker compose up -d
```

For production with persistent volumes and optional nginx:

```bash
docker compose -f docker-compose.prod.yml --profile with-nginx up -d
```

## Make a Note Public

```markdown
# My First Post

#public

Write anything here. Math too: $$E = mc^2$$
```

That's it. Restart the server (or wait for auto-sync) and it shows up on the homepage.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — full technical overview
- [Setup Guide](docs/SETUP.md) — detailed installation and configuration
- [Original Plan](docs/PLAN.md) — design decisions and roadmap

## License

MIT
