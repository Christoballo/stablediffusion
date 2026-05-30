# WM Content Hub ⚽🏆

An **autonomous Instagram content manager for a FIFA World Cup 2026 brand
influencer**. It plans the day, generates original images/videos via Higgsfield,
writes captions + hashtags, publishes through the official Instagram Graph API,
then learns from real reach to optimize itself — day after day.

> Built to ship the optimal content mix every day during the World Cup
> (11 Jun – 19 Jul 2026) and get smarter with every post.

---

## Why this is built the way it is

The reach mechanics are grounded in the **2026 Instagram algorithm** (researched
from Buffer / Sprout Social / Later / Hootsuite guides), not folklore:

- **Distribution is driven by sends (DM shares), saves, and watch-time** — *not*
  likes. The reward function ([`playbook.ts`](src/strategy/playbook.ts)) weights
  them accordingly, so the optimizer chases reach, not vanity metrics.
- **Original content is boosted; reposts/recycled content is de-ranked.** Every
  asset is generated fresh via Higgsfield — nothing is scraped or reposted.
- **Optimal mix:** ~4 reels, 2 carousels, 1 static per week. The planner holds
  this mix and the bandit fine-tunes timing/hooks/hashtags.
- **Consistency beats volume.** A daily cron guarantees a steady cadence.

There is **no fake engagement** (no bot likes/comments/followers). That violates
Meta policy and gets accounts banned. Growth here is earned through format,
timing, hooks, hashtags and trend-timing — all legitimate levers.

---

## How it works (the daily loop)

```
  syncDay ──► pull yesterday's insights ──► reward the bandit (learn)
     │
  planDay ──► phase + fixtures ──► angles/formats/slots ──► bandit picks arms
     │
  runDay  ──► Higgsfield generate ──► caption + hashtags ──► Graph API publish
```

Each post records the **arms** it used (posting hour, hook style, hashtag set).
When insights arrive, the realized reach becomes a 0..1 reward credited to those
arms via **Thompson sampling** — so the hub provably converges toward what works
*for this account*.

---

## Quick start

```bash
cd wm-content-hub
npm install
cp .env.example .env          # fill in credentials (see below)
npm run init                  # scaffolds data/ + sample fixtures.json

# Dry-run (no posting) — plan & prepare today's content:
npm run dev -- run            # or: npm run dev -- run 2026-06-11

npm test                      # 6 unit tests
npm run typecheck
```

In **DRY_RUN** mode (the default) the hub does everything *except* call the
publish endpoint, printing the captions/hashtags it would ship. Flip
`DRY_RUN=false` once credentials are in.

### CLI

| Command | Does |
|---|---|
| `wm-hub init` | Scaffold `data/` + sample `fixtures.json` |
| `wm-hub plan [date]` | Build the editorial plan for a date |
| `wm-hub run [date]` | Generate + caption + publish (or dry-run) |
| `wm-hub sync` | Pull insights for matured posts, reward the optimizer |
| `wm-hub report` | Status + the learned optimum (leaderboard) |
| `wm-hub shows` | List the recurring content franchises (the "shows") |
| `wm-hub daily` | `sync → run` — the autonomous loop the cron calls |

---

## Going live (real Instagram publishing)

1. Convert the Instagram account to a **Professional (Business/Creator)** account
   and connect it to a **Facebook Page**.
2. Create a Meta app at <https://developers.facebook.com>, add **Instagram Graph
   API**, and mint a **long-lived token** with scopes: `instagram_basic`,
   `instagram_content_publish`, `instagram_manage_insights`, `pages_show_list`,
   `pages_read_engagement`, `business_management`.
3. Resolve your IG user id: `GET /me/accounts` → page → `instagram_business_account`.
4. Put `IG_USER_ID`, `IG_ACCESS_TOKEN`, `HIGGSFIELD_API_KEY` (and optionally
   `ANTHROPIC_API_KEY`) into `.env`, set `DRY_RUN=false`.
5. Replace `data/fixtures.json` with the full official 104-match schedule
   (same shape as the sample).

> **Public URLs:** the Graph API fetches media by URL, so generated assets must
> be publicly reachable. Higgsfield CDN URLs satisfy this directly — the
> generator hands them straight to the publisher.

---

## Autonomy (set-and-forget)

Move [`.github-workflow.wm-content-hub.yml`](.github-workflow.wm-content-hub.yml)
to `.github/workflows/wm-content-hub.yml` at the repo root, add the secrets
(`IG_USER_ID`, `IG_ACCESS_TOKEN`, `HIGGSFIELD_API_KEY`, `ANTHROPIC_API_KEY`),
and flip `DRY_RUN` to `"false"` in the workflow env. It runs daily at 06:00 UTC,
persists the optimizer state across runs via `actions/cache`, and ships content
on its own. The hub picks the *actual* posting hour per item from what it has
learned.

(Any scheduler works — cron on a small VM running `npm run dev -- daily`,
a serverless cron, etc.)

---

## Project layout

```
src/
  config.ts            env + config, publish-readiness guard
  pipeline.ts          orchestrator: planDay / runDay / syncDay / buildReport
  cli.ts               command-line entry
  strategy/
    playbook.ts        2026 algorithm constants + reward weights
    franchises.ts      recurring named series ("build a show, not a feed")
    countries.ts       real public-domain flags + national color palettes
    calendar.ts        WM 2026 fixtures + phase sequencing
    hashtags.ts        tiered hashtag engine + reach attribution
    trends.ts          trend ingestion with time-decay
  content/
    ideas.ts           angle → Higgsfield generation prompts
    captions.ts        hook+caption (Claude, with template fallback)
    generator.ts       Higgsfield provider (+ dry-run placeholder)
  instagram/
    graph.ts           Graph API publisher (image/carousel/reels)
    insights.ts        media insights → PostMetrics
  optimize/
    bandit.ts          Thompson sampling over Beta arms
    optimizer.ts       reward computation + arm crediting
test/                  unit tests
```

See [`STRATEGY.md`](STRATEGY.md) for the growth & monetization playbook.

## Limits & honesty

- **24/7 autonomy needs a host** (GitHub Actions/VM) — provided & documented.
- **The Higgsfield HTTP endpoints are centralized in `generator.ts`** — verify
  the exact paths/payload against your account's API docs; they're in one place
  to adapt.
- **No engagement automation / no fake metrics** — by design.
