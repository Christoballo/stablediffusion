import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "../config.js";
import { SCHEMA_SQL } from "./schema.js";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    mkdirSync(dirname(config.DB_PATH), { recursive: true });
    db = new Database(config.DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(SCHEMA_SQL);
  }
  return db;
}

export interface StoredComment {
  id: string;
  media_id: string;
  username: string;
  text: string;
  language: string;
  category: string;
  action: string;
  reason: string;
  comment_ts: string;
}

export function saveComment(comment: StoredComment): void {
  getDb()
    .prepare(
      `INSERT INTO comments (id, media_id, username, text, language, category, action, reason, comment_ts)
       VALUES (@id, @media_id, @username, @text, @language, @category, @action, @reason, @comment_ts)
       ON CONFLICT(id) DO UPDATE SET
         category = excluded.category,
         action = excluded.action,
         reason = excluded.reason,
         processed_at = datetime('now')`,
    )
    .run(comment);
}

export function isCommentProcessed(commentId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM comments WHERE id = ? AND action != ''")
    .get(commentId);
  return row !== undefined;
}

export function saveReply(commentId: string, text: string, posted: boolean): void {
  getDb()
    .prepare("INSERT INTO replies (comment_id, text, posted) VALUES (?, ?, ?)")
    .run(commentId, text, posted ? 1 : 0);
}

export function recentReplyTexts(limit = 20): string[] {
  const rows = getDb()
    .prepare("SELECT text FROM replies ORDER BY id DESC LIMIT ?")
    .all(limit) as Array<{ text: string }>;
  return rows.map((row) => row.text);
}

export function postedRepliesInLastHour(): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM replies WHERE posted = 1 AND created_at >= datetime('now', '-1 hour')",
    )
    .get() as { n: number };
  return row.n;
}

export function saveLike(commentId: string): void {
  getDb().prepare("INSERT INTO likes (comment_id) VALUES (?)").run(commentId);
}

export function likesInLastHour(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM likes WHERE created_at >= datetime('now', '-1 hour')")
    .get() as { n: number };
  return row.n;
}

export function saveWebhookEvent(payload: unknown): void {
  getDb()
    .prepare("INSERT INTO webhook_events (payload) VALUES (?)")
    .run(JSON.stringify(payload));
}
