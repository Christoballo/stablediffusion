import { test } from "node:test";
import assert from "node:assert/strict";

import { attachMonetization, MONETIZATION_POLICY } from "../src/monetize/engine.ts";
import { estimateRevenue, recordedRevenue } from "../src/monetize/revenue.ts";
import { offerFits, eligibleOffers, DEFAULT_OFFERS } from "../src/monetize/offers.ts";
import { trackedUrl } from "../src/monetize/links.ts";
import type { Offer, Post } from "../src/types.ts";

function post(id: string, angle: Post["angle"] = "fan_culture", franchiseId?: string): Post {
  return {
    id,
    planId: id,
    date: "2026-06-11",
    format: "image",
    angle,
    assets: [],
    caption: { hook: "", body: "", cta: "", full: "" },
    hashtags: [],
    scheduledAt: "2026-06-11T18:00:00Z",
    arms: { postingHour: 18, hookStyle: "bold_claim", hashtagSet: "balanced" },
    status: "draft",
    ...(franchiseId
      ? { franchise: { id: franchiseId, name: "X", label: "X", cue: "", engagement: "" } }
      : {}),
  };
}

test("estimateRevenue matches the payout models", () => {
  const cpm: Offer = { id: "a", type: "affiliate", name: "", url: "", ctaDe: "", ctaEn: "", payoutModel: "cpm", payoutValue: 5, currency: "EUR", active: true };
  assert.equal(estimateRevenue(cpm, 10000), 50); // 10k/1000 * 5

  const cpa: Offer = { ...cpm, payoutModel: "cpa", payoutValue: 8, assumedCvr: 0.03 };
  // 10000 * 0.015 ctr = 150 clicks; * 0.03 = 4.5 conv; * 8 = 36
  assert.equal(estimateRevenue(cpa, 10000), 36);

  const flat: Offer = { ...cpm, payoutModel: "flat", payoutValue: 500 };
  assert.equal(estimateRevenue(flat, 999999), 500); // reach-independent
});

test("recordedRevenue uses real conversions for cpa", () => {
  const cpa: Offer = { id: "m", type: "merch", name: "", url: "", ctaDe: "", ctaEn: "", payoutModel: "cpa", payoutValue: 12, currency: "EUR" };
  assert.equal(recordedRevenue(cpa, 200, 5), 60); // 5 conv * 12
});

test("offerFits respects angle targeting", () => {
  const o: Offer = { id: "j", type: "affiliate", name: "", url: "", ctaDe: "", ctaEn: "", payoutModel: "cpa", payoutValue: 8, currency: "EUR", angles: ["fan_culture"], active: true };
  assert.ok(offerFits(o, "fan_culture"));
  assert.ok(!offerFits(o, "tactics_breakdown"));
});

test("sponsor cap excludes sponsors when recent posts are saturated", () => {
  const offers: Offer[] = [
    { id: "sp", type: "sponsor", name: "S", url: "https://s.example.com", ctaDe: "d", ctaEn: "e", payoutModel: "flat", payoutValue: 500, currency: "EUR", active: true },
    { id: "af", type: "affiliate", name: "A", url: "https://a.example.com", ctaDe: "d", ctaEn: "e", payoutModel: "cpa", payoutValue: 8, currency: "EUR", active: true },
  ];
  // Recent window saturated with sponsors.
  const recent: Post[] = Array.from({ length: MONETIZATION_POLICY.recentWindow }, (_, i) => {
    const p = post("r" + i);
    p.monetization = { offerId: "sp", offerName: "S", type: "sponsor", cta: "", trackedUrl: "", placedAt: "" };
    return p;
  });
  // Try many non-organic posts; none should get the sponsor.
  let sponsorPicks = 0;
  for (let i = 0; i < 50; i++) {
    const m = attachMonetization(post("cap-test-id-" + i), recent, offers, "2026-06-11");
    if (m?.type === "sponsor") sponsorPicks++;
  }
  assert.equal(sponsorPicks, 0);
});

test("~25% of posts stay organic (deterministic)", () => {
  const offers = DEFAULT_OFFERS;
  let organic = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const m = attachMonetization(post("organic-share-" + i), [], offers, "2026-06-11");
    if (!m) organic++;
  }
  const pct = (organic / N) * 100;
  assert.ok(pct > 10 && pct < 45, `organic share ~25% expected, got ${pct.toFixed(0)}%`);
});

test("trackedUrl adds utm attribution", () => {
  const o: Offer = { id: "j", type: "affiliate", name: "", url: "https://shop.example.com/x", ctaDe: "", ctaEn: "", payoutModel: "cpa", payoutValue: 8, currency: "EUR", active: true };
  const u = trackedUrl(o, "abcd1234efgh");
  assert.ok(u.includes("utm_campaign=wmhub_j"));
  assert.ok(u.includes("utm_content=abcd1234"));
});

test("eligibleOffers filters inactive + date windows", () => {
  const offers: Offer[] = [
    { id: "on", type: "affiliate", name: "", url: "", ctaDe: "", ctaEn: "", payoutModel: "cpa", payoutValue: 8, currency: "EUR", active: true },
    { id: "off", type: "affiliate", name: "", url: "", ctaDe: "", ctaEn: "", payoutModel: "cpa", payoutValue: 8, currency: "EUR", active: false },
    { id: "future", type: "affiliate", name: "", url: "", ctaDe: "", ctaEn: "", payoutModel: "cpa", payoutValue: 8, currency: "EUR", active: true, startDate: "2026-07-01" },
  ];
  const got = eligibleOffers(offers, "2026-06-11").map((o) => o.id);
  assert.deepEqual(got, ["on"]);
});
