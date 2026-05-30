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

const SAMPLE_FIXTURES = [
  {
    matchId: "wc2026-m1",
    home: "Mexico",
    away: "South Africa",
    stage: "group",
    kickoffUtc: "2026-06-11T19:00:00Z",
    venue: "Estadio Azteca, Mexico City",
  },
  {
    matchId: "wc2026-m2",
    home: "USA",
    away: "Wales",
    stage: "group",
    kickoffUtc: "2026-06-12T23:00:00Z",
    venue: "SoFi Stadium, Los Angeles",
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
  log.info(`Data dir ready at ${dir}. Mode: ${config.dryRun ? "DRY_RUN" : "LIVE"}.`);
}

async function main(): Promise<void> {
  const [cmd, arg] = process.argv.slice(2);
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
          "  daily          sync -> run (the autonomous cron loop)",
        ].join("\n"),
      );
  }
}

main().catch((err) => {
  log.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
