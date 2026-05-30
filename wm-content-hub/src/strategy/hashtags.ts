// Hashtag engine. Strategy (2026): hashtags are a discovery/topic signal, not a
// reach cheat code. What works is a tight, relevant set (~8-15) blending one
// big-reach tag, several mid-tier niche tags, and 1-2 branded/community tags,
// rotated to avoid "stale set" suppression and ranked by the reach each set
// actually earned (closing the loop with real insights).

import type { ContentAngle, HubStore } from "../types.js";

/** Big-reach, always-relevant during the tournament. Use sparingly (1-2). */
const TIER_BROAD = [
  "#worldcup2026",
  "#fifaworldcup",
  "#worldcup",
  "#wm2026",
  "#football",
  "#soccer",
];

/** Mid-tier niche tags — the workhorses for reaching an interested audience. */
const TIER_NICHE = [
  "#worldcup26",
  "#roadtoworldcup",
  "#footballtiktok",
  "#footballreels",
  "#matchday",
  "#footballfans",
  "#soccergram",
  "#footballculture",
  "#tacticaltalk",
  "#footballhighlights",
  "#fussball",
  "#fußball",
  "#wmstimmung",
];

/** Angle-specific tags injected based on what the post is about. */
const ANGLE_TAGS: Record<ContentAngle, string[]> = {
  match_preview: ["#matchpreview", "#lineups", "#predictions"],
  match_reaction: ["#fulltime", "#matchreaction", "#postmatch"],
  player_spotlight: ["#goat", "#baller", "#playeredit"],
  stat_drop: ["#footballstats", "#statattack", "#numbersgame"],
  tactics_breakdown: ["#tactics", "#footballanalysis", "#xg"],
  meme: ["#footballmemes", "#soccermemes", "#footballhumour"],
  poll_question: ["#yourcall", "#debate"],
  countdown: ["#countdown", "#kickoff", "#almostthere"],
  history_throwback: ["#footballhistory", "#throwback", "#classic"],
  fan_culture: ["#fanculture", "#tifo", "#ultras", "#matchdayexperience"],
  prediction: ["#predictions", "#whowillwin", "#bracket"],
};

export interface HashtagSet {
  /** Stable id of the recipe used (a bandit arm). */
  setId: string;
  tags: string[];
}

/**
 * Builds candidate hashtag sets for an angle. Each "recipe" is a bandit arm so
 * the optimizer learns which composition earns the most reach for this brand.
 */
export function buildHashtagSets(
  angle: ContentAngle,
  teams: string[] = [],
  store?: HubStore,
): HashtagSet[] {
  const teamTags = teams.map((t) => "#" + t.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const angleTags = ANGLE_TAGS[angle] ?? [];

  const recipes: Array<{ setId: string; broad: number; niche: number }> = [
    { setId: "tight_niche", broad: 1, niche: 6 }, // 8-9 total
    { setId: "balanced", broad: 2, niche: 8 }, // 12-13 total
    { setId: "wide_reach", broad: 2, niche: 11 }, // ~15 total
  ];

  return recipes.map((r) => {
    const broad = rankByPerformance(TIER_BROAD, store).slice(0, r.broad);
    const niche = rankByPerformance(TIER_NICHE, store).slice(0, r.niche);
    const tags = dedupe([...broad, ...niche, ...angleTags, ...teamTags, "#" + brandTag()]).slice(0, 18);
    return { setId: r.setId, tags };
  });
}

/** Pick the set chosen by the bandit arm id, falling back to balanced. */
export function selectHashtagSet(sets: HashtagSet[], armId: string): HashtagSet {
  return sets.find((s) => s.setId === armId) ?? sets.find((s) => s.setId === "balanced") ?? sets[0]!;
}

function brandTag(): string {
  return "wmzone";
}

/** Order tags by the average reach they earned historically (best first). */
function rankByPerformance(tags: string[], store?: HubStore): string[] {
  if (!store) return tags;
  return [...tags].sort((a, b) => avgReach(b, store) - avgReach(a, store));
}

function avgReach(tag: string, store: HubStore): number {
  const s = store.hashtagStats[tag];
  if (!s || s.uses === 0) return 0.0001; // unseen tags get a tiny exploration nudge below known winners
  return s.reachSum / s.uses;
}

/** Record reach attribution across all tags used on a post. */
export function recordHashtagReach(store: HubStore, tags: string[], reach: number): void {
  const now = new Date().toISOString();
  for (const tag of tags) {
    const s = store.hashtagStats[tag] ?? { uses: 0, reachSum: 0 };
    s.uses += 1;
    s.reachSum += reach;
    s.lastUsed = now;
    store.hashtagStats[tag] = s;
  }
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}
