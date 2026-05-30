// Trackable link builder. Every monetized link carries UTM parameters plus a
// per-post content tag so revenue can be attributed back to the exact post (and
// thus to the franchise/format/time that earned it). Point your link shortener
// or analytics at these UTMs to close the loop with real click data.

import type { Offer } from "../types.js";

export function trackedUrl(offer: Offer, postId: string): string {
  let u: URL;
  try {
    u = new URL(offer.url);
  } catch {
    return offer.url; // leave malformed/placeholder URLs untouched
  }
  u.searchParams.set("utm_source", "instagram");
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", `wmhub_${offer.id}`);
  u.searchParams.set("utm_content", postId.slice(0, 8));
  return u.toString();
}
