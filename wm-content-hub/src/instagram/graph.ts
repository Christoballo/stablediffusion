// Instagram Graph API publishing client. Implements the official 2-step
// content-publishing flow:
//   1. POST /{ig-user-id}/media           -> creation_id (a "container")
//   2. POST /{ig-user-id}/media_publish   -> media_id
// Supports single image, REELS video, and CAROUSEL (children containers).
// Video/reel containers must reach status_code=FINISHED before publishing, so
// we poll. Docs: developers.facebook.com/docs/instagram-api/guides/content-publishing
//
// All media URLs must be PUBLICLY reachable by Meta's servers. Higgsfield CDN
// URLs satisfy this directly.

import { config } from "../config.js";
import { log } from "../logger.js";
import type { GeneratedAsset } from "../types.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface PublishResult {
  mediaId: string;
  permalink?: string;
}

export class InstagramGraphClient {
  private base: string;
  constructor(
    private userId = config.ig.userId,
    private token = config.ig.accessToken,
    apiVersion = config.ig.apiVersion,
  ) {
    this.base = `https://graph.facebook.com/${apiVersion}`;
  }

  private async post(path: string, params: Record<string, string>): Promise<any> {
    const body = new URLSearchParams({ ...params, access_token: this.token });
    const res = await fetch(`${this.base}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Graph POST ${path} ${res.status}: ${JSON.stringify(json)}`);
    return json;
  }

  private async get(path: string, fields: string): Promise<any> {
    const url = `${this.base}/${path}?fields=${encodeURIComponent(fields)}&access_token=${this.token}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(`Graph GET ${path} ${res.status}: ${JSON.stringify(json)}`);
    return json;
  }

  /** Publish a single image post. */
  async publishImage(imageUrl: string, caption: string): Promise<PublishResult> {
    const container = await this.post(`${this.userId}/media`, { image_url: imageUrl, caption });
    return this.publishContainer(container.id);
  }

  /** Publish a Reel from a public video URL. */
  async publishReel(videoUrl: string, caption: string, coverUrl?: string): Promise<PublishResult> {
    const params: Record<string, string> = {
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      share_to_feed: "true",
    };
    if (coverUrl) params.cover_url = coverUrl;
    const container = await this.post(`${this.userId}/media`, params);
    await this.waitForContainer(container.id);
    return this.publishContainer(container.id);
  }

  /** Publish a carousel (2-10 images). */
  async publishCarousel(imageUrls: string[], caption: string): Promise<PublishResult> {
    if (imageUrls.length < 2) throw new Error("Carousel needs at least 2 items");
    const childIds: string[] = [];
    for (const url of imageUrls.slice(0, 10)) {
      const child = await this.post(`${this.userId}/media`, {
        image_url: url,
        is_carousel_item: "true",
      });
      childIds.push(child.id);
    }
    const parent = await this.post(`${this.userId}/media`, {
      media_type: "CAROUSEL",
      caption,
      children: childIds.join(","),
    });
    return this.publishContainer(parent.id);
  }

  /** Route a set of generated assets to the right publish method. */
  async publishAssets(assets: GeneratedAsset[], caption: string): Promise<PublishResult> {
    if (assets.length === 0) throw new Error("No assets to publish");
    const first = assets[0]!;
    if (first.kind === "video") return this.publishReel(first.url, caption);
    if (assets.length >= 2) return this.publishCarousel(assets.map((a) => a.url), caption);
    return this.publishImage(first.url, caption);
  }

  private async publishContainer(creationId: string): Promise<PublishResult> {
    const published = await this.post(`${this.userId}/media_publish`, { creation_id: creationId });
    let permalink: string | undefined;
    try {
      const info = await this.get(published.id, "permalink");
      permalink = info.permalink;
    } catch {
      /* permalink is best-effort */
    }
    return { mediaId: published.id, permalink };
  }

  /** Poll a video/reel container until it is FINISHED (or throw on ERROR). */
  private async waitForContainer(containerId: string, timeoutMs = 300_000): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const info = await this.get(containerId, "status_code,status");
      const code = info.status_code as string;
      if (code === "FINISHED") return;
      if (code === "ERROR" || code === "EXPIRED") {
        throw new Error(`Container ${containerId} ${code}: ${info.status ?? ""}`);
      }
      log.debug(`Container ${containerId} status=${code}`);
      await sleep(5000);
    }
    throw new Error(`Container ${containerId} not ready before timeout`);
  }
}
