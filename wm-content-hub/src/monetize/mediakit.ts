// Media kit + rate card generator. This is the single most important sales
// asset for landing brand deals (the highest-margin revenue). It turns the
// hub's REAL performance data into the numbers brands audit — average reach,
// engagement rate, top content — and derives a defensible price per post.

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { config } from "../config.js";
import type { HubStore, MediaFormat, Post } from "../types.js";

/** Base € per 1,000 reach by format (reels command the premium). */
export const RATE_PER_1K: Record<MediaFormat, number> = {
  reel: 22,
  carousel: 16,
  image: 12,
  story: 8,
};

const ENGAGEMENT_BASELINE = 0.02; // ~2% is a solid sports-niche baseline

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

interface KitStats {
  scored: number;
  avgReach: number;
  engagementRate: number;
  totalReach: number;
  engagementMultiplier: number;
  byFormat: Record<string, { count: number; avgReach: number }>;
  top: Post[];
}

function computeStats(store: HubStore): KitStats {
  const scored = store.posts.filter((p) => p.metrics && p.metrics.reach > 0);
  const totalReach = scored.reduce((a, p) => a + p.metrics!.reach, 0);
  const avgReach = scored.length ? totalReach / scored.length : 0;
  const engRate = scored.length
    ? scored.reduce((a, p) => {
        const m = p.metrics!;
        return a + (m.likes + m.comments + m.saves + m.shares) / Math.max(1, m.reach);
      }, 0) / scored.length
    : 0;

  const byFormat: KitStats["byFormat"] = {};
  for (const p of scored) {
    const f = (byFormat[p.format] ??= { count: 0, avgReach: 0 });
    f.count += 1;
    f.avgReach += p.metrics!.reach;
  }
  for (const k of Object.keys(byFormat)) {
    byFormat[k]!.avgReach = Math.round(byFormat[k]!.avgReach / byFormat[k]!.count);
  }

  const top = [...scored].sort((a, b) => b.metrics!.reach - a.metrics!.reach).slice(0, 5);

  return {
    scored: scored.length,
    avgReach: Math.round(avgReach),
    engagementRate: engRate,
    totalReach,
    engagementMultiplier: clamp(engRate / ENGAGEMENT_BASELINE, 0.6, 2.5),
    byFormat,
    top,
  };
}

/** Price per format given measured reach + engagement, rounded to €5. */
export function rateCard(stats: KitStats): Record<MediaFormat, number> {
  const reach = stats.avgReach || 1000; // fall back to a nominal 1k pre-data
  const price = (rate: number) =>
    Math.max(25, Math.round(((reach / 1000) * rate * stats.engagementMultiplier) / 5) * 5);
  return {
    reel: price(RATE_PER_1K.reel),
    carousel: price(RATE_PER_1K.carousel),
    image: price(RATE_PER_1K.image),
    story: price(RATE_PER_1K.story),
  };
}

export async function generateMediaKit(store: HubStore): Promise<{ path: string; summary: string }> {
  const stats = computeStats(store);
  const card = rateCard(stats);
  const followers = process.env.BRAND_FOLLOWERS ? Number(process.env.BRAND_FOLLOWERS) : undefined;
  const bundle = Math.round((card.reel + card.carousel + card.story * 3) * 0.85);

  const md = [
    `# ${config.brand.name} — Media Kit`,
    `**Handle:** ${config.brand.handle}  ·  **Niche:** Football / FIFA World Cup 2026`,
    followers ? `**Followers:** ${followers.toLocaleString()}` : `**Followers:** _add BRAND_FOLLOWERS_`,
    "",
    "## Performance (measured)",
    `- Posts measured: **${stats.scored}**`,
    `- Average reach / post: **${stats.avgReach.toLocaleString()}**`,
    `- Engagement rate: **${(stats.engagementRate * 100).toFixed(1)}%** (sports baseline ~2%)`,
    `- Total tracked reach: **${stats.totalReach.toLocaleString()}**`,
    "",
    "## Audience",
    "_Pull from Instagram Insights → Total followers → demographics (top countries,",
    "age, gender, active hours) and paste here. Brands buy specificity._",
    "",
    "## Reach by format",
    ...(Object.keys(stats.byFormat).length
      ? Object.entries(stats.byFormat).map(
          ([f, v]) => `- **${f}**: ${v.count} posts · avg reach ${v.avgReach.toLocaleString()}`,
        )
      : ["- _no scored posts yet_"]),
    "",
    "## Rate card",
    "| Placement | Price |",
    "|---|---|",
    `| Reel | €${card.reel} |`,
    `| Carousel | €${card.carousel} |`,
    `| Static post | €${card.image} |`,
    `| Story frame | €${card.story} |`,
    `| **Matchday bundle** (1 reel + 1 carousel + 3 stories) | **€${bundle}** |`,
    "",
    "_Prices derived from measured average reach × engagement multiplier_",
    `_(×${stats.engagementMultiplier.toFixed(2)}). They scale automatically as the account grows._`,
    "",
    "## Top performing content",
    ...(stats.top.length
      ? stats.top.map(
          (p, i) =>
            `${i + 1}. ${p.franchise?.name ?? p.angle} (${p.format}) — reach ${p.metrics!.reach.toLocaleString()} ${p.igPermalink ?? ""}`,
        )
      : ["- _no scored posts yet_"]),
    "",
    "## Contact",
    `Partnerships: dorfladenme@gmail.com · ${config.brand.handle}`,
    "",
  ].join("\n");

  const path = resolve(join(config.dataDir, "media-kit.md"));
  await mkdir(resolve(config.dataDir), { recursive: true });
  await writeFile(path, md, "utf8");

  const summary =
    `Media kit written → ${path}\n` +
    `avg reach ${stats.avgReach.toLocaleString()} · eng ${(stats.engagementRate * 100).toFixed(1)}% · ` +
    `reel €${card.reel} / carousel €${card.carousel} / story €${card.story} · bundle €${bundle}`;
  return { path, summary };
}
