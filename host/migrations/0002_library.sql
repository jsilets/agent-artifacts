-- The library: pins, thumbnails and full-text search.

-- When the page was pinned. NULL means not pinned.
ALTER TABLE pages ADD COLUMN pinned_at TEXT;
-- The newest version that has thumbnails in R2. NULL means none yet.
ALTER TABLE pages ADD COLUMN thumb INTEGER;

-- The latest version of each page, one row per claim. title and heading weigh more than body.
CREATE VIRTUAL TABLE page_text USING fts5(
  slug UNINDEXED,
  anchor UNINDEXED,
  title,
  heading,
  body,
  tokenize = 'porter unicode61 remove_diacritics 2'
);
