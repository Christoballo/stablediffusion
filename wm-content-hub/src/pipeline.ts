// The orchestrator. Four operations make the hub autonomous:
//   planDay   - decide WHAT ships today (angles/formats/slots) + pick arms
//   runDay    - generate assets, write captions+hashtags, publish (or dry-run)
//   syncDay   - pull insights for recently published posts, reward the bandit
//   buildReport - human-readable status + learned optimum
//
// A daily cron calls syncDay (learn from yesterday) then planDay + runDay.

import { randomUUID } from "node:crypto";
import { config, assertPublishable } from "./config.js";
import { log } from "./logger.js";
import { loadStore, saveStore } from "./store.js";
import { generateCaption } from "./content/captions.js";
import { buildGenSpec } from "./content/ideas.js";
import { getProvider } from "./content/generator.js";
import { InstagramGraphClient } from "./instagram/graph.js";
import { InsightsClient } from "./instagram/insights.js";
import { creditPost, optimizerReport, recommendArms } from "./optimize/optimizer.js";
import { anglesForDay, fixturesOn, tournamentPhase } from "./strategy/calendar.js";
import { buildHashtagSets, recordHashtagReach, selectHashtagSet } from "./strategy/hashtags.js";
import {
  HOOK_STYLE_ARMS,
  POSTING_HOUR_ARMS,
  ANGLE_DEFAULT_FORMAT,
} from "./strategy/playbook.js";
import { fetchLiveTrends, ingestTrends, scheduleTrends } from "./strategy/trends.js";
import type { ContentPlanItem, HubStore, Post } from "./types.js";

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function scheduledAt(date: string, hour: number): string {
  return new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`).toISOString();
}

/** Build (and persist) the plan for a date. Idempotent per date. */
export async function planDay(date = today()): Promise<ContentPlanItem[]> {
  const store = await loadStore();

  // Refresh trend signals first so the plan is anticipatory.
  ingestTrends(store, [...(await scheduleTrends(date)), ...(await fetchLiveTrends(date))]);

  if (store.plans.some((p) => p.date === date)) {
    log.info(`Plan for ${date} already exists; reusing.`);
    await saveStore(store);
    return store.plans.filter((p) => p.date === date);
  }

  const slots = Math.max(1, config.postsPerDay);
  const angles = await anglesForDay(date, slots);
  const fixtures = await fixturesOn(date);

  const items: ContentPlanItem[] = angles.map((angle, slot) => {
    const format = ANGLE_DEFAULT_FORMAT[angle];
    const hashtagSets = buildHashtagSets(angle, fixtures.flatMap((f) => [f.home, f.away]), store).map(
      (s) => s.setId,
    );
    const arms = recommendArms(store.bandit, {
      postingHours: POSTING_HOUR_ARMS,
      hookStyles: HOOK_STYLE_ARMS,
      hashtagSets,
    });
    // Space posts: nudge each slot to a distinct recommended hour if collision.
    const hour = spreadHour(arms.postingHour, slot);
    return {
      id: randomUUID(),
      date,
      format,
      angle,
      slot,
      scheduledAt: scheduledAt(date, hour),
      arms: { ...arms, postingHour: hour },
      context: fixtures[slot % Math.max(1, fixtures.length)],
    };
  });

  store.plans.push(...items);
  store.meta.lastRunAt = new Date().toISOString();
  await saveStore(store);
  log.info(`Planned ${items.length} item(s) for ${date} (phase=${tournamentPhase(date)}).`);
  return items;
}

function spreadHour(base: number, slot: number): number {
  const idx = (POSTING_HOUR_ARMS.indexOf(base) + slot) % POSTING_HOUR_ARMS.length;
  return POSTING_HOUR_ARMS[idx] ?? base;
}

/** Generate + caption + publish everything planned for a date. */
export async function runDay(date = today()): Promise<Post[]> {
  const plan = await planDay(date);
  const store = await loadStore();
  const provider = getProvider();
  const live = !config.dryRun;
  if (live) assertPublishable();

  const ig = live ? new InstagramGraphClient() : null;
  const produced: Post[] = [];

  for (const item of plan) {
    if (store.posts.some((p) => p.planId === item.id)) continue; // idempotent

    const spec = buildGenSpec(item);
    const fixtures = await fixturesOn(date);
    const sets = buildHashtagSets(item.angle, fixtures.flatMap((f) => [f.home, f.away]), store);
    const hashtags = selectHashtagSet(sets, item.arms.hashtagSet).tags;

    const caption = await generateCaption({
      angle: item.angle,
      hookStyle: item.arms.hookStyle,
      fixture: item.context,
      language: config.language,
    });
    const fullCaption = `${caption.full}\n\n${hashtags.join(" ")}`;

    const post: Post = {
      id: randomUUID(),
      planId: item.id,
      date,
      format: item.format,
      angle: item.angle,
      assets: [],
      caption,
      hashtags,
      scheduledAt: item.scheduledAt,
      arms: item.arms,
      status: "draft",
    };

    try {
      post.assets = await provider.generate(spec);
      log.info(`Generated ${post.assets.length} asset(s) via ${provider.name} for ${item.angle}/${item.format}.`);

      if (live && ig) {
        const result = await ig.publishAssets(post.assets, fullCaption);
        post.status = "published";
        post.publishedAt = new Date().toISOString();
        post.igMediaId = result.mediaId;
        post.igPermalink = result.permalink;
        log.info(`Published ${post.format} -> ${result.permalink ?? result.mediaId}`);
      } else {
        post.status = "dry_run";
        log.info(`[DRY_RUN] Prepared ${post.format} for ${item.angle}. Caption:\n${fullCaption}`);
      }
    } catch (err) {
      post.status = "failed";
      post.error = err instanceof Error ? err.message : String(err);
      log.error(`Failed to ship ${item.angle}/${item.format}: ${post.error}`);
    }

    store.posts.push(post);
    produced.push(post);
    await saveStore(store); // persist after each ship so a crash never loses work
  }

  return produced;
}

/** Pull insights for posts published >= minAgeHours ago and reward the bandit. */
export async function syncDay(minAgeHours = 20): Promise<number> {
  const store = await loadStore();
  if (config.dryRun) {
    log.info("[DRY_RUN] Skipping insights sync (no live media).");
    return 0;
  }
  assertPublishable();
  const insights = new InsightsClient();
  const cutoff = Date.now() - minAgeHours * 3_600_000;
  let updated = 0;

  for (const post of store.posts) {
    if (post.status !== "published" || !post.igMediaId) continue;
    if (post.metrics) continue; // already scored
    if (!post.publishedAt || Date.parse(post.publishedAt) > cutoff) continue;

    try {
      post.metrics = await insights.fetchMetrics(post.igMediaId, post.format);
      creditPost(store.bandit, post);
      recordHashtagReach(store, post.hashtags, post.metrics.reach);
      updated++;
      log.info(
        `Synced ${post.igMediaId}: reach=${post.metrics.reach} reward=${post.metrics.reward.toFixed(3)}`,
      );
    } catch (err) {
      log.warn(`Insights failed for ${post.igMediaId}: ${err instanceof Error ? err.message : err}`);
    }
  }

  store.meta.lastSyncAt = new Date().toISOString();
  await saveStore(store);
  return updated;
}

export async function buildReport(store?: HubStore): Promise<string> {
  const s = store ?? (await loadStore());
  const published = s.posts.filter((p) => p.status === "published");
  const scored = published.filter((p) => p.metrics);
  const totalReach = scored.reduce((a, p) => a + (p.metrics?.reach ?? 0), 0);
  const avgReward = scored.length
    ? scored.reduce((a, p) => a + (p.metrics?.reward ?? 0), 0) / scored.length
    : 0;

  const top = [...scored]
    .sort((a, b) => (b.metrics?.reach ?? 0) - (a.metrics?.reach ?? 0))
    .slice(0, 3);

  const lines = [
    `=== ${config.brand.name} — WM Content Hub report ===`,
    `Mode: ${config.dryRun ? "DRY_RUN" : "LIVE"} | Language: ${config.language}`,
    `Plans: ${s.plans.length} | Posts: ${s.posts.length} (published ${published.length}, scored ${scored.length})`,
    `Total tracked reach: ${totalReach.toLocaleString()} | Avg reward: ${(avgReward * 100).toFixed(1)}%`,
    "",
    "Top posts by reach:",
    ...(top.length
      ? top.map(
          (p, i) =>
            `  ${i + 1}. [${p.format}/${p.angle}] reach=${p.metrics?.reach} reward=${(
              (p.metrics?.reward ?? 0) * 100
            ).toFixed(0)}%  ${p.igPermalink ?? ""}`,
        )
      : ["  (none scored yet)"]),
    "",
    optimizerReport(s.bandit),
  ];
  return lines.join("\n");
}
