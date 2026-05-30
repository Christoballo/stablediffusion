// Multi-armed bandit (Thompson sampling over Beta distributions) used to learn,
// per dimension, which arm earns the most reward. Dimensions are independent
// bandits: postingHour, hookStyle, hashtagSet. Reward is the normalised 0..1
// score derived from real Instagram insights (see optimizer.ts).
//
// Thompson sampling balances exploration/exploitation automatically: each arm
// keeps a Beta(alpha, beta) belief; we sample from each and pick the argmax.
// New/unseen arms start at Beta(1,1) (uniform) and naturally get explored.

import type { BanditState } from "../types.js";

function ensure(state: BanditState, dim: string, arm: string) {
  state[dim] ??= {};
  state[dim]![arm] ??= { alpha: 1, beta: 1, pulls: 0, reward: 0 };
  return state[dim]![arm]!;
}

/** Sample from Beta(alpha, beta) via two Gamma draws. */
function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

/** Marsaglia & Tsang gamma sampler (shape k, scale 1). */
function sampleGamma(k: number): number {
  if (k < 1) {
    const u = Math.random();
    return sampleGamma(1 + k) * Math.pow(u, 1 / k);
  }
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = gaussian();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function gaussian(): number {
  // Box-Muller.
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Choose the best arm for a dimension among the given candidates. */
export function chooseArm(state: BanditState, dim: string, candidates: (string | number)[]): string {
  let best = String(candidates[0]);
  let bestSample = -1;
  for (const c of candidates) {
    const arm = ensure(state, dim, String(c));
    const s = sampleBeta(arm.alpha, arm.beta);
    if (s > bestSample) {
      bestSample = s;
      best = String(c);
    }
  }
  return best;
}

/** Update the chosen arm with an observed reward in [0,1]. */
export function updateArm(state: BanditState, dim: string, arm: string, reward: number): void {
  const a = ensure(state, dim, arm);
  const r = Math.max(0, Math.min(1, reward));
  a.alpha += r;
  a.beta += 1 - r;
  a.pulls += 1;
  a.reward += r;
}

/** Human-readable leaderboard for a dimension (best expected reward first). */
export function leaderboard(state: BanditState, dim: string): Array<{ arm: string; mean: number; pulls: number }> {
  const dimState = state[dim] ?? {};
  return Object.entries(dimState)
    .map(([arm, v]) => ({ arm, mean: v.alpha / (v.alpha + v.beta), pulls: v.pulls }))
    .sort((a, b) => b.mean - a.mean);
}
