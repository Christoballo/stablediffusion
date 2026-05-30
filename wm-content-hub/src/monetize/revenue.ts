// Revenue estimation, recording and reporting.
//
//   - estimateRevenue: model-based projection from a post's REACH (used at sync
//     time so you see expected € before any real click data exists).
//   - recordRevenue: fold REAL click/conversion data into a post.
//   - revenueReport: roll up estimated + recorded revenue by type and post.
//
// Assumptions are explicit and tunable so projections stay honest.

import type { HubStore, Offer, Post } from "../types.js";

/** Fraction of reached users who tap a link-in-bio / link sticker. Tunable. */
export const ASSUMED_LINK_CTR = 0.015;

/** Projected € for an offer given a post's reach. */
export function estimateRevenue(offer: Offer, reach: number): number {
  const clicks = reach * ASSUMED_LINK_CTR;
  const cvr = offer.assumedCvr ?? 0.02;
  let rev = 0;
  switch (offer.payoutModel) {
    case "cpm":
      rev = (reach / 1000) * offer.payoutValue;
      break;
    case "cpc":
      rev = clicks * offer.payoutValue;
      break;
    case "cpa":
      rev = clicks * cvr * offer.payoutValue;
      break;
    case "revshare":
      rev = clicks * cvr * offer.payoutValue;
      break;
    case "flat":
      rev = offer.payoutValue; // fixed booked fee, independent of reach
      break;
  }
  return Math.round(rev * 100) / 100;
}

/** Real revenue from actual clicks/conversions. */
export function recordedRevenue(offer: Offer, clicks: number, conversions?: number): number {
  const conv = conversions ?? clicks * (offer.assumedCvr ?? 0.02);
  let rev = 0;
  switch (offer.payoutModel) {
    case "cpc":
      rev = clicks * offer.payoutValue;
      break;
    case "cpm":
      rev = (clicks / ASSUMED_LINK_CTR / 1000) * offer.payoutValue; // back out reach
      break;
    case "cpa":
    case "revshare":
      rev = conv * offer.payoutValue;
      break;
    case "flat":
      rev = offer.payoutValue;
      break;
  }
  return Math.round(rev * 100) / 100;
}

/** Set a post's projected revenue once its reach is known. */
export function projectPostRevenue(post: Post, offers: Offer[]): void {
  if (!post.monetization || !post.metrics) return;
  const offer = offers.find((o) => o.id === post.monetization!.offerId);
  if (!offer) return;
  post.monetization.estimatedRevenue = estimateRevenue(offer, post.metrics.reach);
}

export interface RevenueSummary {
  recordedTotal: number;
  estimatedTotal: number;
  byType: Record<string, { recorded: number; estimated: number; placements: number }>;
  currency: string;
}

export function summarizeRevenue(store: HubStore): RevenueSummary {
  const byType: RevenueSummary["byType"] = {};
  let recordedTotal = 0;
  let estimatedTotal = 0;
  for (const p of store.posts) {
    const m = p.monetization;
    if (!m) continue;
    const t = (byType[m.type] ??= { recorded: 0, estimated: 0, placements: 0 });
    t.placements += 1;
    t.recorded += m.revenue ?? 0;
    t.estimated += m.estimatedRevenue ?? 0;
    recordedTotal += m.revenue ?? 0;
    estimatedTotal += m.estimatedRevenue ?? 0;
  }
  return {
    recordedTotal: Math.round(recordedTotal * 100) / 100,
    estimatedTotal: Math.round(estimatedTotal * 100) / 100,
    byType,
    currency: "EUR",
  };
}

export function revenueReport(store: HubStore): string {
  const s = summarizeRevenue(store);
  const lines = [
    "=== Revenue report ===",
    `Recorded (real): ${s.recordedTotal.toFixed(2)} ${s.currency}`,
    `Projected (from reach): ${s.estimatedTotal.toFixed(2)} ${s.currency}`,
    "",
    "By revenue stream:",
  ];
  const entries = Object.entries(s.byType);
  if (entries.length === 0) lines.push("  (no monetized posts yet)");
  for (const [type, v] of entries) {
    lines.push(
      `  ${type.padEnd(13)} placements=${v.placements}  recorded=${v.recorded.toFixed(2)}  projected=${v.estimated.toFixed(2)}`,
    );
  }
  const top = [...store.posts]
    .filter((p) => p.monetization)
    .sort(
      (a, b) =>
        (b.monetization!.revenue ?? b.monetization!.estimatedRevenue ?? 0) -
        (a.monetization!.revenue ?? a.monetization!.estimatedRevenue ?? 0),
    )
    .slice(0, 3);
  if (top.length) {
    lines.push("", "Top earning posts:");
    for (const p of top) {
      const m = p.monetization!;
      const v = m.revenue ?? m.estimatedRevenue ?? 0;
      lines.push(`  ${(p.franchise?.name ?? p.angle).padEnd(18)} ${m.offerName} → ${v.toFixed(2)} EUR`);
    }
  }
  return lines.join("\n");
}
