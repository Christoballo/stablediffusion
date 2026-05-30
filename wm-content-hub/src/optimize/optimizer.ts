// Closes the optimization loop: turns raw Instagram insights into a normalised
// reward, credits that reward to the bandit arms a post used, and exposes the
// learned best arms back to the planner.

import { REWARD_WEIGHTS } from "../strategy/playbook.js";
import type { BanditState, Post, PostMetrics } from "../types.js";
import { chooseArm, leaderboard, updateArm } from "./bandit.js";

/**
 * Compute a 0..1 reward from per-reach engagement rates. We squash each rate
 * through a saturating curve so a single viral outlier can't dominate, then
 * combine with the playbook weights that mirror real ranking signals.
 */
export function computeReward(m: Omit<PostMetrics, "reward" | "fetchedAt">): number {
  const reach = Math.max(1, m.reach);
  const sat = (x: number, scale: number) => 1 - Math.exp(-x / scale);

  const sends = sat(m.shares / reach, 0.02); // ~2% send rate ≈ strong
  const saves = sat(m.saves / reach, 0.03);
  const comments = sat(m.comments / reach, 0.015);
  const likes = sat(m.likes / reach, 0.06);
  const watch =
    m.avgWatchTimeMs && m.videoViews
      ? Math.min(1, m.avgWatchTimeMs / 15_000) // proxy: 15s avg watch ≈ excellent
      : saves; // for non-video, reuse saves as the "depth" proxy

  const r =
    REWARD_WEIGHTS.sendsPerReach * sends +
    REWARD_WEIGHTS.savesPerReach * saves +
    REWARD_WEIGHTS.watchCompletion * watch +
    REWARD_WEIGHTS.commentsPerReach * comments +
    REWARD_WEIGHTS.likesPerReach * likes;

  return Math.max(0, Math.min(1, r));
}

/** Credit a post's realized reward to every arm it pulled. */
export function creditPost(state: BanditState, post: Post): void {
  if (!post.metrics) return;
  const reward = post.metrics.reward;
  updateArm(state, "postingHour", String(post.arms.postingHour), reward);
  updateArm(state, "hookStyle", post.arms.hookStyle, reward);
  updateArm(state, "hashtagSet", post.arms.hashtagSet, reward);
}

/** Ask the bandit for the arms to use on the next post. */
export function recommendArms(
  state: BanditState,
  candidates: { postingHours: number[]; hookStyles: string[]; hashtagSets: string[] },
): { postingHour: number; hookStyle: string; hashtagSet: string } {
  return {
    postingHour: Number(chooseArm(state, "postingHour", candidates.postingHours)),
    hookStyle: chooseArm(state, "hookStyle", candidates.hookStyles),
    hashtagSet: chooseArm(state, "hashtagSet", candidates.hashtagSets),
  };
}

export function optimizerReport(state: BanditState): string {
  const dims = ["postingHour", "hookStyle", "hashtagSet"];
  const lines: string[] = ["=== Optimizer leaderboard (expected reward) ==="];
  for (const dim of dims) {
    lines.push(`\n[${dim}]`);
    for (const e of leaderboard(state, dim).slice(0, 5)) {
      lines.push(`  ${e.arm.padEnd(14)} reward≈${(e.mean * 100).toFixed(1)}%  (n=${e.pulls})`);
    }
  }
  return lines.join("\n");
}
