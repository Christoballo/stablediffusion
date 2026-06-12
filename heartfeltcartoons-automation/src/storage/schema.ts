export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS comments (
  id            TEXT PRIMARY KEY,          -- Instagram comment id
  media_id      TEXT NOT NULL,
  username      TEXT NOT NULL DEFAULT '',
  text          TEXT NOT NULL DEFAULT '',
  language      TEXT NOT NULL DEFAULT 'unknown',
  category      TEXT NOT NULL DEFAULT '',  -- A..G, see engine/classifyComment.ts
  action        TEXT NOT NULL DEFAULT '',  -- liked | replied | suggested | manual_review | skipped
  reason        TEXT NOT NULL DEFAULT '',
  comment_ts    TEXT NOT NULL DEFAULT '',
  processed_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS replies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id  TEXT NOT NULL REFERENCES comments(id),
  text        TEXT NOT NULL,
  posted      INTEGER NOT NULL DEFAULT 0,  -- 0 = suggestion only, 1 = posted via API
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS likes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id  TEXT NOT NULL REFERENCES comments(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  payload     TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_replies_created ON replies(created_at);
CREATE INDEX IF NOT EXISTS idx_likes_created ON likes(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_media ON comments(media_id);
`;
