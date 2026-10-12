-- Decks: a page whose HTML has <main class="k-deck">. The viewer shows deck controls for them.
ALTER TABLE pages ADD COLUMN kind TEXT NOT NULL DEFAULT 'page';
