CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    title TEXT,
    slug TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    frontmatter TEXT,
    tags TEXT,
    content_hash TEXT,
    last_modified TEXT,
    indexed_at TEXT
);

CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_path TEXT NOT NULL,
    target_path TEXT NOT NULL,
    link_type TEXT NOT NULL,
    FOREIGN KEY (source_path) REFERENCES notes(path)
);

CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    mime_type TEXT,
    referenced_by_public INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_notes_public ON notes(is_public);
CREATE INDEX IF NOT EXISTS idx_notes_path ON notes(path);
CREATE INDEX IF NOT EXISTS idx_notes_slug ON notes(slug);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_path);
CREATE INDEX IF NOT EXISTS idx_assets_path ON assets(path);
