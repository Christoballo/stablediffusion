// Fetches per-media insights from the Instagram Graph API and maps them onto
// our PostMetrics shape. Metric names follow the Graph API media insights:
// reach, likes, comments, saved, shares, total_interactions, and (for reels)
// ig_reels_avg_watch_time / ig_reels_video_view_total_time / plays.

import { config } from "../config.js";
import { computeReward } from "../optimize/optimizer.js";
import type { MediaFormat, PostMetrics } from "../types.js";

export class InsightsClient {
  private base: string;
  constructor(
    private token = config.ig.accessToken,
    apiVersion = config.ig.apiVersion,
  ) {
    this.base = `https://graph.facebook.com/${apiVersion}`;
  }

  async fetchMetrics(mediaId: string, format: MediaFormat): Promise<PostMetrics> {
    const metrics =
      format === "reel" || format === "story"
        ? "reach,likes,comments,saved,shares,total_interactions,plays,ig_reels_avg_watch_time"
        : "reach,likes,comments,saved,shares,total_interactions";

    const url = `${this.base}/${mediaId}/insights?metric=${metrics}&access_token=${this.token}`;
    const res = await fetch(url);
    const json = (await res.json()) as {
      data?: Array<{ name: string; values: Array<{ value: number }> }>;
      error?: unknown;
    };
    if (!res.ok) throw new Error(`Insights ${res.status}: ${JSON.stringify(json)}`);

    const v = (name: string): number => {
      const row = json.data?.find((d) => d.name === name);
      return row?.values?.[0]?.value ?? 0;
    };

    const base = {
      reach: v("reach"),
      impressions: v("reach"), // impressions metric deprecated for newer media; reuse reach
      likes: v("likes"),
      comments: v("comments"),
      saves: v("saved"),
      shares: v("shares"),
      videoViews: v("plays") || undefined,
      avgWatchTimeMs: v("ig_reels_avg_watch_time") || undefined,
    };

    return {
      ...base,
      fetchedAt: new Date().toISOString(),
      reward: computeReward(base),
    };
  }
}
