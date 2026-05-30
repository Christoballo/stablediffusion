// The PLAYBOOK encodes the Instagram 2026 growth mechanics as code so the
// optimizer has a principled prior. Sources (researched May 2026): Buffer,
// Sprout Social, Later, Hootsuite 2026 algorithm guides.
//
// Core truths baked in here:
//  - Reach on the Reels/Explore surface is driven by WATCH TIME (completion
//    rate), SENDS (DM shares) and SAVES — not by likes.
//  - Original content is boosted; reposts / TikTok-watermarked / recycled
//    content is de-ranked. Everything we ship is generated fresh.
//  - Optimal weekly mix for a growth-stage brand: 3-4 reels, 2-3 carousels,
//    1-2 statics. Consistency beats volume.
//  - Getting past the 3s mark is the first threshold; hook the first frame.

import type { ContentAngle, MediaFormat } from "../types.js";

/**
 * Reward weights when scoring a published post. These mirror the ranking
 * signals that actually drive distribution, so the bandit optimizes for reach
 * rather than vanity metrics. Weights are applied to per-reach rates.
 */
export const REWARD_WEIGHTS = {
  sendsPerReach: 0.34, // DM shares — strongest distribution signal in 2026
  savesPerReach: 0.26, // saves — "worth returning to"
  watchCompletion: 0.22, // reels completion rate proxy
  commentsPerReach: 0.1,
  likesPerReach: 0.08,
} as const;

/** Target weekly content mix (per 7 ships) the planner aims to hold. */
export const WEEKLY_MIX: Record<MediaFormat, number> = {
  reel: 4,
  carousel: 2,
  image: 1,
  story: 0, // stories handled separately, not counted in the feed mix
};

/**
 * Candidate posting hours (local time) — bandit arms. Seeded from typical
 * football-audience activity peaks (lunch, commute, pre-/post-match evening).
 */
export const POSTING_HOUR_ARMS = [8, 12, 15, 18, 20, 21, 22];

/** Hook styles — the single biggest lever on 3s retention. Bandit arms. */
export const HOOK_STYLE_ARMS = [
  "bold_claim", // "Das ist das beste Team der WM. Punkt."
  "question", // "Wer gewinnt heute Abend wirklich?"
  "curiosity_gap", // "Niemand redet über DIESE Statistik..."
  "countdown", // "Noch 3 Stunden bis zum Anpfiff"
  "controversy", // "Unpopuläre Meinung:"
  "list_promise", // "3 Gründe, warum..."
];

/**
 * Maps each content angle to the format that historically performs best for
 * it. The planner uses this as a prior; the bandit can still override.
 */
export const ANGLE_DEFAULT_FORMAT: Record<ContentAngle, MediaFormat> = {
  match_preview: "reel",
  match_reaction: "reel",
  player_spotlight: "carousel",
  stat_drop: "carousel",
  tactics_breakdown: "carousel",
  meme: "image",
  poll_question: "story",
  countdown: "reel",
  history_throwback: "reel",
  fan_culture: "reel",
  prediction: "carousel",
};

/** Aspect ratios per format (Instagram-native). */
export const FORMAT_ASPECT: Record<MediaFormat, string> = {
  reel: "9:16",
  story: "9:16",
  carousel: "4:5",
  image: "4:5",
};

/**
 * Engagement bait that is ALLOWED and effective (drives saves/sends/comments
 * authentically) — never fake engagement, only prompts to real users.
 */
export const ENGAGEMENT_PROMPTS = [
  "Speicher dir das für den Anpfiff. 📌",
  "Schick das deinem Kumpel, der das anders sieht. 📲",
  "Wer holt den Titel? Schreib's in die Kommentare. 👇",
  "Tag jemanden, der das sehen muss.",
  "Stimmst du zu? ✅ oder ❌ in die Kommentare.",
];
