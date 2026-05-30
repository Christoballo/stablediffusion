// Offer catalogue — the things the account earns money from. Loaded from
// data/offers.json so you can edit revenue sources without touching code. The
// DEFAULT_OFFERS below are WM-relevant starters across the revenue stack:
// affiliate (always-on), own merch (highest LTV), lead magnet (owned audience),
// and a sponsor slot (highest-margin, rate-capped). Replace the URLs with your
// real affiliate/merch/sponsor links.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { config } from "../config.js";
import type { ContentAngle, Offer } from "../types.js";

export const DEFAULT_OFFERS: Offer[] = [
  {
    id: "aff-jersey",
    type: "affiliate",
    name: "WM Trikots & Fan-Gear",
    url: "https://example-affiliate.com/wm-jerseys",
    ctaDe: "🛒 Hol dir das Trikot deines Teams — Link in Bio.",
    ctaEn: "🛒 Grab your team's jersey — link in bio.",
    payoutModel: "cpa",
    payoutValue: 8,
    currency: "EUR",
    angles: ["player_spotlight", "fan_culture", "match_preview", "prediction"],
    weight: 3,
    active: true,
    assumedCvr: 0.03,
  },
  {
    id: "merch-poster",
    type: "merch",
    name: "WM Zone Matchday Poster (POD)",
    url: "https://shop.example.com/wm-zone/posters",
    ctaDe: "🖼️ Dieses Artwork gibt's als Poster im Shop — Link in Bio.",
    ctaEn: "🖼️ This artwork is a poster in our shop — link in bio.",
    payoutModel: "cpa",
    payoutValue: 12,
    currency: "EUR",
    angles: ["stat_drop", "history_throwback", "match_reaction", "meme"],
    weight: 2,
    active: true,
    assumedCvr: 0.015,
  },
  {
    id: "lead-newsletter",
    type: "lead_magnet",
    name: "Tägliche WM-Prognose (Newsletter)",
    url: "https://example.com/wm-daily",
    ctaDe: "📩 Tägliche WM-Prognose gratis ins Postfach — Link in Bio.",
    ctaEn: "📩 Free daily World Cup predictions in your inbox — link in bio.",
    payoutModel: "cpa",
    payoutValue: 1.5,
    currency: "EUR",
    angles: ["prediction", "tactics_breakdown", "stat_drop", "countdown"],
    weight: 2,
    active: true,
    assumedCvr: 0.06,
  },
  {
    id: "sponsor-slot",
    type: "sponsor",
    name: "Sponsored slot (open)",
    url: "https://sponsor.example.com/campaign",
    ctaDe: "Präsentiert von unserem Partner. Mehr — Link in Bio.",
    ctaEn: "Presented by our partner. More — link in bio.",
    payoutModel: "flat",
    payoutValue: 500,
    currency: "EUR",
    weight: 5,
    active: false, // flip on only when a real deal is booked
    assumedCvr: 0.02,
  },
];

let cache: Offer[] | null = null;

export function offersPath(): string {
  return resolve(join(config.dataDir, "offers.json"));
}

export async function loadOffers(): Promise<Offer[]> {
  if (cache) return cache;
  const path = offersPath();
  if (!existsSync(path)) {
    cache = DEFAULT_OFFERS;
    return cache;
  }
  try {
    cache = JSON.parse(await readFile(path, "utf8")) as Offer[];
  } catch {
    cache = DEFAULT_OFFERS;
  }
  return cache;
}

/** Offers that are active and within their date window for the given date. */
export function eligibleOffers(offers: Offer[], dateIso: string): Offer[] {
  return offers.filter((o) => {
    if (!o.active) return false;
    if (o.startDate && dateIso < o.startDate) return false;
    if (o.endDate && dateIso > o.endDate) return false;
    return true;
  });
}

/** Does an offer fit a given content angle / franchise? */
export function offerFits(o: Offer, angle: ContentAngle, franchiseId?: string): boolean {
  const angleOk = !o.angles || o.angles.length === 0 || o.angles.includes(angle);
  const franchiseOk = !o.franchises || o.franchises.length === 0 || (!!franchiseId && o.franchises.includes(franchiseId));
  return angleOk && franchiseOk;
}
