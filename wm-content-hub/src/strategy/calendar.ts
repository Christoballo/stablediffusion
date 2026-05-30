// WM 2026 editorial calendar. The tournament runs 11 Jun - 19 Jul 2026 across
// the USA, Canada and Mexico (48 teams, 104 matches). Fixtures are loaded from
// data/fixtures.json so you can drop in the official schedule without code
// changes; until then the milestone-aware fallback keeps the hub productive.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { config } from "../config.js";
import type { ContentAngle, FixtureRef } from "../types.js";

/** Key tournament milestones (UTC dates). */
export const WC_MILESTONES = {
  opening: "2026-06-11", // Mexico vs South Africa, Estadio Azteca
  groupStageEnd: "2026-06-27",
  round32: "2026-06-28",
  round16: "2026-07-04",
  quarterFinals: "2026-07-09",
  semiFinals: "2026-07-14",
  thirdPlace: "2026-07-18",
  final: "2026-07-19",
} as const;

export function tournamentPhase(dateIso: string): string {
  const d = dateIso;
  if (d < WC_MILESTONES.opening) return "build_up";
  if (d <= WC_MILESTONES.groupStageEnd) return "group";
  if (d < WC_MILESTONES.round16) return "r32";
  if (d < WC_MILESTONES.quarterFinals) return "r16";
  if (d < WC_MILESTONES.semiFinals) return "qf";
  if (d < WC_MILESTONES.final) return "sf";
  if (d === WC_MILESTONES.final) return "final";
  return "post";
}

export function daysUntilOpening(dateIso: string): number {
  const a = Date.parse(dateIso + "T00:00:00Z");
  const b = Date.parse(WC_MILESTONES.opening + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

let fixtureCache: FixtureRef[] | null = null;

export async function loadFixtures(): Promise<FixtureRef[]> {
  if (fixtureCache) return fixtureCache;
  const path = resolve(join(config.dataDir, "fixtures.json"));
  if (!existsSync(path)) {
    fixtureCache = [];
    return fixtureCache;
  }
  try {
    fixtureCache = JSON.parse(await readFile(path, "utf8")) as FixtureRef[];
  } catch {
    fixtureCache = [];
  }
  return fixtureCache;
}

/** Fixtures kicking off on the given local date. */
export async function fixturesOn(dateIso: string): Promise<FixtureRef[]> {
  const all = await loadFixtures();
  return all.filter((f) => f.kickoffUtc.slice(0, 10) === dateIso);
}

/**
 * Picks the angles for a given day, sequenced so the day's content tells a
 * story: build-up -> preview -> live reaction -> aftermath. Returns an angle
 * per requested slot.
 */
export async function anglesForDay(dateIso: string, slots: number): Promise<ContentAngle[]> {
  const phase = tournamentPhase(dateIso);
  const fixtures = await fixturesOn(dateIso);

  if (phase === "build_up") {
    const dleft = daysUntilOpening(dateIso);
    const buildUp: ContentAngle[] = [
      "countdown",
      "prediction",
      "player_spotlight",
      "history_throwback",
      "stat_drop",
      "fan_culture",
    ];
    // Closer to kickoff -> lean into countdown + predictions.
    const ordered = dleft <= 7 ? ["countdown", "prediction", "player_spotlight"] : buildUp;
    return pick(ordered as ContentAngle[], slots);
  }

  if (fixtures.length > 0) {
    // Match day: preview before, reaction after, plus a stat/meme filler.
    return pick(
      ["match_preview", "match_reaction", "stat_drop", "tactics_breakdown", "meme", "poll_question"],
      slots,
    );
  }

  if (phase === "final") {
    return pick(["match_preview", "prediction", "history_throwback"], slots);
  }

  // Knockout rest-day / no fixtures: keep momentum with analysis + culture.
  return pick(["tactics_breakdown", "player_spotlight", "stat_drop", "meme", "fan_culture"], slots);
}

function pick<T>(pool: T[], n: number): T[] {
  if (pool.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(pool[i % pool.length]!);
  return out;
}
