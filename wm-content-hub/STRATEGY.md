# Growth & Monetization Playbook — WM Zone

This is the strategy the hub executes in code. It's split into **reach** (how we
grow) and **revenue** (how we turn reach into money). Everything here is
ToS-compliant — no fake engagement, no bought followers, no reposting.

---

## Part 1 — Reach (the 2026 Instagram reality)

### The only three signals that matter for distribution
1. **Sends (DM shares)** — the strongest 2026 signal. Content people forward to
   friends is treated as broadly distributable. → every post ends with a
   *"send this to the friend who disagrees"* style prompt.
2. **Saves** — "worth returning to." Stat drops, tactical breakdowns, bracket
   predictions earn saves. → carousels are built as reference content.
3. **Watch time / completion** — the 3-second threshold decides a reel's fate.
   → the first frame is engineered as a hook; reels are kept short (~8s) and
   punchy.

Likes are near-worthless for reach. The reward function weights them at 8%.

### Content mix (held by the planner)
- **4 reels / week** — discovery engine (Reels feed = recommended, reaches
  non-followers).
- **2 carousels / week** — saves + dwell time + authority.
- **1 static / week** — memes/quotes for fast shareability.
- **Stories** — daily polls/countdowns for the existing audience + sticker
  interactions (not counted in the feed mix).

### The match-day story arc
The calendar sequences a day so the account *owns the conversation* around each
fixture:
- **T-3h: preview reel** (form, key duels, the X-factor) → rides pre-match search.
- **Live: story polls** ("who scores first?") → cheap, high interaction.
- **Full-time: reaction reel** → catches the post-match spike (highest intent).
- **+1 day: stat/tactics carousel** → saves + evergreen reach.

### Trend anticipation
`trends.ts` blends **schedule-derived signals** (today's fixtures, knockout
drama) with an optional live feed. Signals **decay** (36h half-life) so the plan
always leans into what's hot *now*, not yesterday. The big tournament beats
(opening, R16, QF, SF, final) are pre-loaded as guaranteed spikes to front-run.

### Hashtags (discovery, not magic)
Tiered sets (1–2 broad + several niche + angle + team + brand), rotated and
**ranked by the reach each tag actually earned** — the loop closes with real
insights, so the set self-tunes per account.

### The self-optimization loop
Every post is an experiment. Posting hour, hook style and hashtag set are
**bandit arms**; realized reach is the reward. Thompson sampling means the hub
explores early, then exploits the winners — without you ever touching a dial.
Run `wm-hub report` to see the live leaderboard.

---

## Part 2 — Monetization (turning reach into revenue)

Reach is the asset; here's how it's liquidated. Roughly in order of how fast
they pay and how much audience they need:

### 1. Brand deals & sponsored posts (primary, highest-margin)
The World Cup is peak advertiser season. Once the account has consistent reach:
- **Sponsored reels/carousels** for betting-adjacent (where legal), sportswear,
  energy drinks, fan-gear, streaming, fantasy apps.
- Rate of thumb: **€10–25 per 1k reach** for a sponsored reel in sports niches;
  scales with engagement rate (the hub's reward metric is exactly what brands
  audit). The `report` output doubles as a media-kit data source.
- **Action:** keep a `sponsored` flag on posts (extend `Post`) so paid content
  is tracked separately and never over-saturates the feed (>1 in 5 paid kills
  trust + reach).

### 2. Affiliate (passive, always-on)
- Jersey/boot/merch affiliate links (Amazon, sportswear programs) in bio +
  link-stickers on stat/spotlight posts.
- Fantasy/prediction platforms with CPA payouts — natural fit for the
  `prediction` angle.

### 3. Own products (highest lifetime value)
- **Print-on-demand merch** (matchday graphics → shirts/posters) — the hub
  already generates the artwork; pipe winners to a POD store.
- **Digital products:** a paid "WM bracket pack" / daily prediction newsletter.

### 4. Platform monetization
- **Reels Play / bonuses** where available in your region.
- **Subscriptions** (close-friends tier: early predictions, exclusive breakdowns).

### 5. Audience → owned channel (de-risk the algorithm)
Funnel IG reach into an **email/WhatsApp list** (daily WM digest). You own this
audience regardless of algorithm changes — it's the compounding asset.

### Sequencing
1. **Weeks 1–2 (now → kickoff):** pure growth. No ads. Build reach + the
   optimizer's data. Add affiliate links quietly.
2. **Group stage:** introduce 1 brand deal/week max; launch POD merch on the
   first viral graphic.
3. **Knockouts → final:** peak attention = peak rates. Stack brand deals,
   push merch + subscriptions, harvest emails for post-tournament retention.

### What NOT to do (kills the golden goose)
- ❌ Buying followers/likes/comments — instant reach suppression + ban risk.
- ❌ Reposting TikToks with watermarks — de-ranked in 2026.
- ❌ Over-posting paid content — trust collapse.
- ❌ Engagement pods/bots — detectable, against ToS.

Sustainable reach **is** the monetization. The hub optimizes for the former so
the latter compounds.
