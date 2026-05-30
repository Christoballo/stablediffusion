#!/usr/bin/env node
// CLI entry point for the WM Content Hub.
//
//   wm-hub init           scaffold data dir + sample fixtures
//   wm-hub plan [date]    build the editorial plan for a date (default: today)
//   wm-hub run  [date]    generate + caption + publish (or dry-run) for a date
//   wm-hub sync           pull insights for matured posts, reward the optimizer
//   wm-hub report         print status + learned optimum
//   wm-hub daily          sync -> plan -> run  (the autonomous loop, for cron)

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "./config.js";
import { log } from "./logger.js";
import { buildReport, planDay, runDay, syncDay, today } from "./pipeline.js";
import { allFranchises } from "./strategy/franchises.js";
import { loadStore, saveStore } from "./store.js";
import { DEFAULT_OFFERS, loadOffers, offersPath } from "./monetize/offers.js";
import { recordedRevenue, revenueReport } from "./monetize/revenue.js";
import { generateMediaKit } from "./monetize/mediakit.js";

const SAMPLE_FIXTURES = [
  {
    matchId: "wc2026-m1",
    home: "Mexico",
    away: "South Africa",
    stage: "group",
    kickoffUtc: "2026-06-11T19:00:00Z",
    venue: "Estadio Azteca, Mexico City",
    keyPlayers: ["Santiago Giménez", "Hirving Lozano", "Lyle Foster"],
  },
  {
    matchId: "wc2026-m2",
    home: "USA",
    away: "Wales",
    stage: "group",
    kickoffUtc: "2026-06-12T23:00:00Z",
    venue: "SoFi Stadium, Los Angeles",
    keyPlayers: ["Christian Pulisic", "Brenden Aaronson"],
  },
  {
    matchId: "wc2026-final",
    home: "TBD",
    away: "TBD",
    stage: "final",
    kickoffUtc: "2026-07-19T19:00:00Z",
    venue: "MetLife Stadium, New Jersey",
  },
];

async function cmdInit(): Promise<void> {
  const dir = resolve(config.dataDir);
  await mkdir(dir, { recursive: true });
  const fixturesPath = join(dir, "fixtures.json");
  if (!existsSync(fixturesPath)) {
    await writeFile(fixturesPath, JSON.stringify(SAMPLE_FIXTURES, null, 2), "utf8");
    log.info(`Wrote sample fixtures -> ${fixturesPath} (replace with the full official schedule).`);
  } else {
    log.info(`Fixtures already present at ${fixturesPath}.`);
  }
  if (!existsSync(offersPath())) {
    await writeFile(offersPath(), JSON.stringify(DEFAULT_OFFERS, null, 2), "utf8");
    log.info(`Wrote starter revenue offers -> ${offersPath()} (replace URLs with your real links).`);
  } else {
    log.info(`Offers already present at ${offersPath()}.`);
  }
  log.info(`Data dir ready at ${dir}. Mode: ${config.dryRun ? "DRY_RUN" : "LIVE"}.`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [cmd, arg] = args;
  switch (cmd) {
    case "init":
      await cmdInit();
      break;
    case "plan":
      console.log(JSON.stringify(await planDay(arg || today()), null, 2));
      break;
    case "run":
      await runDay(arg || today());
      console.log(await buildReport());
      break;
    case "sync": {
      const n = await syncDay();
      log.info(`Synced ${n} post(s).`);
      break;
    }
    case "report":
      console.log(await buildReport());
      break;
    case "shows":
      console.log("=== Content franchises (the recurring shows) ===");
      for (const f of allFranchises()) {
        console.log(`\n${f.label}  (${f.name})`);
        console.log(`  cue: ${f.cue}`);
        console.log(`  cta: ${f.engagement}`);
      }
      break;
    case "offers": {
      const offers = await loadOffers();
      console.log("=== Revenue offers ===");
      for (const o of offers) {
        const flag = o.active ? "✅" : "⏸️ ";
        console.log(
          `${flag} [${o.type}] ${o.name} — ${o.payoutModel} ${o.payoutValue}${o.payoutModel === "revshare" ? "" : " " + o.currency} (w=${o.weight ?? 1})`,
        );
      }
      break;
    }
    case "mediakit": {
      const { summary } = await generateMediaKit(await loadStore());
      console.log(summary);
      break;
    }
    case "revenue": {
      if (arg === "record") {
        const [, , postId, clicksStr, convStr] = args;
        if (!postId || !clicksStr) {
          log.error("Usage: wm-hub revenue record <postId> <clicks> [conversions]");
          break;
        }
        const store = await loadStore();
        const offers = await loadOffers();
        const post = store.posts.find((p) => p.id === postId || p.id.startsWith(postId));
        if (!post || !post.monetization) {
          log.error(`No monetized post found for id ${postId}.`);
          break;
        }
        const offer = offers.find((o) => o.id === post.monetization!.offerId);
        if (!offer) {
          log.error(`Offer ${post.monetization.offerId} not found.`);
          break;
        }
        const clicks = Number(clicksStr);
        const conversions = convStr ? Number(convStr) : undefined;
        post.monetization.clicks = clicks;
        post.monetization.conversions = conversions;
        post.monetization.revenue = recordedRevenue(offer, clicks, conversions);
        await saveStore(store);
        log.info(`Recorded ${post.monetization.revenue.toFixed(2)} EUR on post ${post.id.slice(0, 8)}.`);
      } else {
        console.log(revenueReport(await loadStore()));
      }
      break;
    }
    case "daily":
      await syncDay().catch((e) => log.warn(`sync skipped: ${e}`));
      await runDay(today());
      console.log(await buildReport());
      break;
    default:
      console.log(
        [
          "WM Content Hub",
          "Usage: wm-hub <command>",
          "  init           scaffold data dir + sample fixtures",
          "  plan [date]    build the plan for a date (yyyy-mm-dd, default today)",
          "  run  [date]    generate + caption + publish/dry-run",
          "  sync           pull insights + reward the optimizer",
          "  report         status + learned optimum",
          "  shows          list the recurring content franchises",
          "  offers         list revenue offers (affiliate/merch/sponsor/...)",
          "  revenue        revenue report  ·  revenue record <postId> <clicks> [conv]",
          "  mediakit       generate the brand-deal media kit + rate card",
          "  daily          sync -> run (the autonomous cron loop)",
        ].join("\n"),
      );
  }
}

main().catch((err) => {
  log.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
