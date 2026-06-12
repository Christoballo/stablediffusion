import { recentReplyTexts } from "../storage/db.js";
import type { CommentCategory } from "./classifyComment.js";
import { replyCandidates } from "./generateReply.js";

const DEDUPE_WINDOW = 20;

/**
 * Rotates reply variants: a sentence used within the last 20 replies is
 * skipped. If every candidate was used recently, the least recently used
 * one is picked so the engine never falls back to spamming one line.
 */
export function pickReply(category: CommentCategory, language: string): string | null {
  const candidates = replyCandidates(category, language);
  if (candidates.length === 0) return null;

  const recent = recentReplyTexts(DEDUPE_WINDOW);
  const fresh = candidates.find((candidate) => !recent.includes(candidate));
  if (fresh) return fresh;

  // All used recently: pick the candidate whose last use is furthest back.
  let leastRecent = candidates[0];
  let bestIndex = -1;
  for (const candidate of candidates) {
    const index = recent.indexOf(candidate); // lower index = more recent
    if (index > bestIndex) {
      bestIndex = index;
      leastRecent = candidate;
    }
  }
  return leastRecent;
}
