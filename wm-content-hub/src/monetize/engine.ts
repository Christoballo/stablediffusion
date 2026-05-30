// Monetization engine. For each post it decides WHETHER to monetize and WITH
// WHICH offer, protecting reach/trust while maximizing revenue:
//   - Sponsors are hard-capped (<= 1 in 5 recent posts) — oversaturation kills
//     reach and audience trust, which kills future revenue.
//   - ~25% of posts stay purely organic (deterministic, so it's stable).
//   - Among fitting offers, pick by weight but de-prioritize an offer used in
//     the immediately preceding posts (no repetitive spam).
// Soft offers (affiliate/merch/own_product/lead_magnet) carry most of the
// always-on revenue; the rare sponsor slot is the high-margin spike.

import { config } from "../config.js";
import type { MonetizationAttachment, Offer, Post } from "../types.js";
import { eligibleOffers, offerFits } from "./offers.js";
import { trackedUrl } from "./links.js";

export const MONETIZATION_POLICY = {
  maxSponsorRatioRecent: 0.2, // <= 1 in 5 recent posts may be a sponsor
  organicSharePct: 25, // keep ~25% of posts purely organic
  recentWindow: 10,
};

/** Stable 0..99 bucket from a post id (deterministic organic-skip decision). */
function bucket(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 100;
}

function recentSponsorRatio(recent: Post[]): number {
  const window = recent.slice(-MONETIZATION_POLICY.recentWindow);
  if (window.length === 0) return 0;
  const sponsors = window.filter((p) => p.monetization?.type === "sponsor").length;
  return sponsors / window.length;
}

/** offer ids used in the last few posts, to avoid back-to-back repeats. */
function recentlyUsed(recent: Post[], n = 3): Set<string> {
  return new Set(
    recent
      .slice(-n)
      .map((p) => p.monetization?.offerId)
      .filter((x): x is string => !!x),
  );
}

/**
 * Decide and build the monetization placement for a post. Returns undefined
 * when the post should stay organic or nothing fits.
 */
export function attachMonetization(
  post: Post,
  recent: Post[],
  offers: Offer[],
  dateIso: string,
): MonetizationAttachment | undefined {
  // Keep a stable slice of posts organic.
  if (bucket(post.id) < MONETIZATION_POLICY.organicSharePct) return undefined;

  let pool = eligibleOffers(offers, dateIso).filter((o) =>
    offerFits(o, post.angle, post.franchise?.id),
  );
  if (pool.length === 0) return undefined;

  // Enforce the sponsor cap.
  if (recentSponsorRatio(recent) + 1 / MONETIZATION_POLICY.recentWindow > MONETIZATION_POLICY.maxSponsorRatioRecent) {
    pool = pool.filter((o) => o.type !== "sponsor");
  }
  if (pool.length === 0) return undefined;

  const used = recentlyUsed(recent);
  const score = (o: Offer) => (o.weight ?? 1) * (used.has(o.id) ? 0.25 : 1);
  pool.sort((a, b) => score(b) - score(a));
  const offer = pool[0]!;

  const cta = config.language === "en" ? offer.ctaEn : offer.ctaDe;
  return {
    offerId: offer.id,
    offerName: offer.name,
    type: offer.type,
    cta,
    trackedUrl: trackedUrl(offer, post.id),
    placedAt: new Date().toISOString(),
  };
}
