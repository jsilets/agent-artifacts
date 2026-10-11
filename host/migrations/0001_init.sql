-- One row per page. latest is the newest stored version.
CREATE TABLE pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  repo TEXT,
  latest INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- One row per stored version. R2 holds the HTML at pages/<slug>/<version>.html.
CREATE TABLE versions (
  slug TEXT NOT NULL,
  version INTEGER NOT NULL,
  sha TEXT,
  bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (slug, version)
);

-- A share link. version NULL means the latest version.
CREATE TABLE shares (
  token TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  version INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX shares_slug ON shares (slug);
