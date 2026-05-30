// Trend detection. The hub anticipates trends from two signal sources:
//   1. Deterministic, schedule-derived signals (which teams play today, which
//      stage we're in) — always available, zero dependencies.
//   2. Optional live signals from a pluggable provider (e.g. a Google Trends /
//      news feed) — wire your own fetch into `fetchLiveTrends`.
// Signals decay over time so yesterday's hype doesn't dominate today's plan.

import type { HubStore, TrendSignal } from "../types.js";
import { fixturesOn, tournamentPhase } from "./calendar.js";

const HALF_LIFE_HOURS = 36;

/** Derive trend signals from the fixture schedule for a given date. */
export async function scheduleTrends(dateIso: string): Promise<TrendSignal[]> {
  const now = new Date().toISOString();
  const signals: TrendSignal[] = [];
  const fixtures = await fixturesOn(dateIso);
  for (const f of fixtures) {
    signals.push(
      { term: f.home, kind: "team", momentum: 0.9, source: "schedule", capturedAt: now },
      { term: f.away, kind: "team", momentum: 0.9, source: "schedule", capturedAt: now },
      {
        term: `${f.home} vs ${f.away}`,
        kind: "topic",
        momentum: 0.95,
        source: "schedule",
        capturedAt: now,
      },
    );
  }
  const phase = tournamentPhase(dateIso);
  if (phase === "final" || phase === "sf" || phase === "qf") {
    signals.push({ term: phase, kind: "topic", momentum: 1, source: "schedule", capturedAt: now });
  }
  return signals;
}

/**
 * Hook for live trend data. Returns [] by default. To make the hub truly
 * anticipatory, implement a fetch here (news API, Google Trends, X/Reddit
 * football chatter) and return normalised TrendSignal[]. Kept dependency-free
 * on purpose so the hub runs out of the box.
 */
export async function fetchLiveTrends(_dateIso: string): Promise<TrendSignal[]> {
  return [];
}

/** Decay older signals and merge new ones into the store. */
export function ingestTrends(store: HubStore, incoming: TrendSignal[]): void {
  const now = Date.now();
  // Decay existing.
  for (const t of store.trends) {
    const ageH = (now - Date.parse(t.capturedAt)) / 3_600_000;
    t.momentum *= Math.pow(0.5, ageH / HALF_LIFE_HOURS);
  }
  store.trends.push(...incoming);
  // Collapse duplicates (keep max momentum), drop near-dead signals, cap size.
  const byTerm = new Map<string, TrendSignal>();
  for (const t of store.trends) {
    const key = `${t.kind}:${t.term.toLowerCase()}`;
    const prev = byTerm.get(key);
    if (!prev || t.momentum > prev.momentum) byTerm.set(key, t);
  }
  store.trends = [...byTerm.values()]
    .filter((t) => t.momentum > 0.05)
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 100);
}

export function topTrends(store: HubStore, n = 8): TrendSignal[] {
  return [...store.trends].sort((a, b) => b.momentum - a.momentum).slice(0, n);
}
