// Content FRANCHISES — the single biggest structural lever the top football
// accounts (433, B/R Football) use: recurring, named series with a fixed visual
// cue and a predictable cadence. "Build a show, not a feed" — each post is an
// episode that trains the audience to expect the next one, which compounds
// saves, returns and DM shares.
//
// Each franchise maps to an existing ContentAngle + MediaFormat so the rest of
// the pipeline (visuals, hashtags, optimizer) works unchanged. Selection is
// driven by (1) match-day triggers — speed matters, react fast like 433 — and
// (2) a weekly rhythm so non-match days still feel like appointment viewing.

import type { ContentAngle, FixtureRef, FranchiseRef, MediaFormat } from "../types.js";

interface Franchise extends FranchiseRef {
  angle: ContentAngle;
  format: MediaFormat;
}

// The franchise catalogue. Names/labels are the recognizable "show" branding.
const F: Record<string, Franchise> = {
  matchday_verdict: {
    id: "matchday_verdict",
    name: "Matchday Verdict",
    label: "🎙️ MATCHDAY VERDICT",
    cue: "consistent red verdict-stamp lower-third, scoreboard motif",
    engagement: "Agree with our verdict? ✅ or ❌ in den Kommentaren.",
    angle: "match_reaction",
    format: "reel",
  },
  starting_xi: {
    id: "starting_xi",
    name: "Predicted XI",
    label: "📋 PREDICTED XI",
    cue: "pitch formation board with 11 generic position markers",
    engagement: "Wer fehlt in deiner Aufstellung? 👇 Speicher sie für den Anpfiff. 📌",
    angle: "match_preview",
    format: "carousel",
  },
  stat_bomb: {
    id: "stat_bomb",
    name: "Stat Bomb",
    label: "📊 STAT BOMB",
    cue: "one giant hero number, minimal grid, recurring bomb icon",
    engagement: "Diese Zahl muss dein Kumpel sehen. 📲 Teilen.",
    angle: "stat_drop",
    format: "carousel",
  },
  tactics_lab: {
    id: "tactics_lab",
    name: "Tactics Lab",
    label: "🧪 TACTICS LAB",
    cue: "chalkboard pitch with arrows and zones, analyst frame",
    engagement: "Speicher das Taktik-Board für das nächste Spiel. 📌",
    angle: "tactics_breakdown",
    format: "carousel",
  },
  on_this_day: {
    id: "on_this_day",
    name: "On This Day",
    label: "📅 ON THIS DAY",
    cue: "vintage film-grain frame, retro date stamp",
    engagement: "Erinnerst du dich an diesen Moment? Tag jemanden, der dabei war.",
    angle: "history_throwback",
    format: "reel",
  },
  trivia_kickoff: {
    id: "trivia_kickoff",
    name: "Trivia Kickoff",
    label: "❓ TRIVIA KICKOFF",
    cue: "quiz card with bold question and A/B/C options",
    engagement: "Antwort in die Kommentare — richtig oder blamiert? 👇",
    angle: "poll_question",
    format: "image",
  },
  meme_time: {
    id: "meme_time",
    name: "Meme Time",
    label: "😂 MEME TIME",
    cue: "the WM Zone mascot reacting, meme caption space",
    engagement: "Tag den Kumpel, der genau so reagiert hat. 😂",
    angle: "meme",
    format: "image",
  },
  power_ranking: {
    id: "power_ranking",
    name: "Power Ranking",
    label: "🔥 POWER RANKING",
    cue: "ranked list 1-5 with flag chips and movement arrows",
    engagement: "Falsches Ranking? Korrigier uns in den Kommentaren. 👇 Speicher es. 📌",
    angle: "prediction",
    format: "carousel",
  },
  countdown_show: {
    id: "countdown_show",
    name: "The Countdown",
    label: "⏳ THE COUNTDOWN",
    cue: "glowing day-counter number, stadium at dusk",
    engagement: "Noch dabei? Speicher den Countdown. 📌",
    angle: "countdown",
    format: "reel",
  },
};

function ref(f: Franchise): { angle: ContentAngle; format: MediaFormat; franchise: FranchiseRef } {
  const { angle, format, id, name, label, cue, engagement } = f;
  return { angle, format, franchise: { id, name, label, cue, engagement } };
}

/** Mon=1 .. Sun=0 weekly rhythm of "appointment" franchises for non-match days. */
const WEEKLY: Record<number, string[]> = {
  1: ["power_ranking", "tactics_lab", "stat_bomb"], // Monday
  2: ["trivia_kickoff", "stat_bomb", "meme_time"], // Tuesday
  3: ["tactics_lab", "stat_bomb", "power_ranking"], // Wednesday
  4: ["on_this_day", "stat_bomb", "trivia_kickoff"], // Thursday
  5: ["meme_time", "power_ranking", "on_this_day"], // Friday
  6: ["stat_bomb", "tactics_lab", "meme_time"], // Saturday
  0: ["power_ranking", "on_this_day", "meme_time"], // Sunday
};

/**
 * Choose the franchises (and thus angle+format) for a day's slots.
 *   - Build-up phase: countdown show + power rankings to seed anticipation.
 *   - Match day: react fast — Predicted XI before, Matchday Verdict after, then
 *     a Stat Bomb. This mirrors how 433 owns the conversation around a fixture.
 *   - Otherwise: the weekly appointment rhythm.
 */
export function selectFranchises(
  dateIso: string,
  slots: number,
  phase: string,
  fixtures: FixtureRef[],
): Array<{ angle: ContentAngle; format: MediaFormat; franchise: FranchiseRef }> {
  let order: string[];

  if (phase === "build_up") {
    order = ["countdown_show", "power_ranking", "on_this_day", "trivia_kickoff", "stat_bomb"];
  } else if (fixtures.length > 0) {
    order = ["starting_xi", "matchday_verdict", "stat_bomb", "tactics_lab", "trivia_kickoff"];
  } else if (phase === "final") {
    order = ["countdown_show", "power_ranking", "on_this_day"];
  } else {
    const dow = new Date(dateIso + "T12:00:00Z").getUTCDay();
    order = WEEKLY[dow] ?? ["stat_bomb", "power_ranking", "meme_time"];
  }

  const out: ReturnType<typeof ref>[] = [];
  for (let i = 0; i < slots; i++) {
    const key = order[i % order.length]!;
    out.push(ref(F[key]!));
  }
  return out;
}

export function allFranchises(): FranchiseRef[] {
  return Object.values(F).map((f) => ref(f).franchise);
}
