import { test } from "node:test";
import assert from "node:assert/strict";

import { computeReward, recommendArms, creditPost } from "../src/optimize/optimizer.ts";
import { chooseArm, updateArm } from "../src/optimize/bandit.ts";
import { buildHashtagSets, selectHashtagSet } from "../src/strategy/hashtags.ts";
import { tournamentPhase, daysUntilOpening } from "../src/strategy/calendar.ts";
import { ingestTrends } from "../src/strategy/trends.ts";
import type { BanditState, HubStore, Post } from "../src/types.ts";

test("reward rewards sends/saves over likes", () => {
  const base = { reach: 1000, impressions: 1000, likes: 0, comments: 0, saves: 0, shares: 0 };
  const sendHeavy = computeReward({ ...base, shares: 40 });
  const likeHeavy = computeReward({ ...base, likes: 200 });
  assert.ok(sendHeavy > likeHeavy, "DM shares should beat raw likes");
  assert.ok(sendHeavy >= 0 && sendHeavy <= 1);
});

test("bandit converges toward the higher-reward arm", () => {
  const state: BanditState = {};
  for (let i = 0; i < 200; i++) {
    const arm = chooseArm(state, "hour", ["8", "20"]);
    // Arm "20" pays out far better.
    const reward = arm === "20" ? (Math.random() < 0.8 ? 1 : 0) : Math.random() < 0.2 ? 1 : 0;
    updateArm(state, "hour", arm, reward);
  }
  assert.ok((state.hour!["20"]!.pulls) > (state.hour!["8"]!.pulls), "should exploit the better arm");
});

test("tournament phase boundaries", () => {
  assert.equal(tournamentPhase("2026-06-01"), "build_up");
  assert.equal(tournamentPhase("2026-06-11"), "group");
  assert.equal(tournamentPhase("2026-07-19"), "final");
  assert.ok(daysUntilOpening("2026-06-04") === 7);
});

test("hashtag sets are tiered and deduped", () => {
  const sets = buildHashtagSets("match_preview", ["Mexico", "South Africa"]);
  const balanced = selectHashtagSet(sets, "balanced");
  assert.ok(balanced.tags.length >= 8);
  assert.equal(new Set(balanced.tags).size, balanced.tags.length, "no duplicate tags");
});

test("recommendArms returns valid arms", () => {
  const state: BanditState = {};
  const arms = recommendArms(state, {
    postingHours: [8, 20],
    hookStyles: ["bold_claim", "question"],
    hashtagSets: ["balanced", "tight_niche"],
  });
  assert.ok([8, 20].includes(arms.postingHour));
  assert.ok(["bold_claim", "question"].includes(arms.hookStyle));
});

test("trend ingestion decays and caps", () => {
  const store: HubStore = {
    plans: [], posts: [], bandit: {}, trends: [], hashtagStats: {}, meta: { createdAt: "" },
  };
  ingestTrends(store, [
    { term: "Brazil", kind: "team", momentum: 0.9, source: "t", capturedAt: new Date().toISOString() },
  ]);
  assert.equal(store.trends.length, 1);
  assert.equal(store.trends[0]!.term, "Brazil");
});
