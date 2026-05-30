// Domain types for the WM Content Hub.

export type MediaFormat = "reel" | "carousel" | "image" | "story";

/** A content angle = the editorial reason a post exists on a given day. */
export type ContentAngle =
  | "match_preview"
  | "match_reaction"
  | "player_spotlight"
  | "stat_drop"
  | "tactics_breakdown"
  | "meme"
  | "poll_question"
  | "countdown"
  | "history_throwback"
  | "fan_culture"
  | "prediction";

/** One of the levers the optimizer pulls. Each lever is a bandit dimension. */
export interface ContentPlanItem {
  id: string;
  date: string; // ISO yyyy-mm-dd
  format: MediaFormat;
  angle: ContentAngle;
  /** Slot index within the day (0-based), used to space posts across the day. */
  slot: number;
  /** ISO timestamp the optimizer recommends publishing at. */
  scheduledAt: string;
  /** Bandit arms chosen for this item (recorded so we can credit rewards). */
  arms: {
    postingHour: number;
    hookStyle: string;
    hashtagSet: string;
  };
  /** The recurring series this episode belongs to ("build a show, not a feed"). */
  franchise?: FranchiseRef;
  /** The fixture/news that motivated this item, if any. */
  context?: FixtureRef;
}

/** A lightweight reference to a content franchise carried on plans/posts. */
export interface FranchiseRef {
  id: string;
  name: string;
  label: string; // recognizable caption header, e.g. "📊 STAT BOMB"
  cue: string; // recurring visual cue for brand recognition
  engagement: string; // the interactive CTA that drives saves/sends/comments
}

export interface FixtureRef {
  matchId: string;
  home: string;
  away: string;
  stage: string; // "group", "r32", "r16", "qf", "sf", "final"
  kickoffUtc: string;
  venue?: string;
  /** Real player names referenced editorially in captions/stats (NOT imagery). */
  keyPlayers?: string[];
}

export interface GeneratedAsset {
  /** Public URL (Higgsfield CDN) — must be reachable by the Instagram Graph API. */
  url: string;
  kind: "image" | "video";
  prompt: string;
  jobId?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
}

export interface Caption {
  hook: string;
  body: string;
  cta: string;
  full: string; // assembled caption sent to Instagram
}

/** A fully prepared post, ready to publish or already published. */
export interface Post {
  id: string;
  planId: string;
  date: string;
  format: MediaFormat;
  angle: ContentAngle;
  assets: GeneratedAsset[];
  caption: Caption;
  hashtags: string[];
  scheduledAt: string;
  arms: ContentPlanItem["arms"];
  franchise?: FranchiseRef;
  /** Revenue placement attached to this post, if any. */
  monetization?: MonetizationAttachment;
  status: "draft" | "queued" | "published" | "failed" | "dry_run";
  publishedAt?: string;
  igMediaId?: string;
  igPermalink?: string;
  error?: string;
  /** Metrics filled in by the sync step. */
  metrics?: PostMetrics;
}

export interface PostMetrics {
  fetchedAt: string;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  videoViews?: number;
  avgWatchTimeMs?: number;
  /** Normalised 0..1 reward used to update the bandit. */
  reward: number;
}

/** Revenue model for a monetization offer. */
export type PayoutModel = "cpa" | "cpc" | "cpm" | "flat" | "revshare";

/** Something the account can earn money from, attached to posts. */
export interface Offer {
  id: string;
  type: "affiliate" | "merch" | "sponsor" | "own_product" | "lead_magnet";
  name: string;
  url: string;
  ctaDe: string;
  ctaEn: string;
  payoutModel: PayoutModel;
  /** € amount (cpa/cpc/cpm/flat) or fraction 0..1 (revshare). */
  payoutValue: number;
  currency: string;
  /** Content angles this offer fits (empty = any). */
  angles?: ContentAngle[];
  /** Franchise ids this offer fits (empty = any). */
  franchises?: string[];
  /** Higher = preferred when several fit. */
  weight?: number;
  active: boolean;
  startDate?: string;
  endDate?: string;
  /** Assumed click->conversion rate (0..1) for revenue estimation. */
  assumedCvr?: number;
}

/** A monetization placement recorded on a post. */
export interface MonetizationAttachment {
  offerId: string;
  offerName: string;
  type: Offer["type"];
  cta: string;
  trackedUrl: string;
  placedAt: string;
  /** Real numbers, filled by `revenue record`. */
  clicks?: number;
  conversions?: number;
  revenue?: number;
  /** Model-based projection from reach (set at sync time). */
  estimatedRevenue?: number;
}

/** Persisted bandit state: Beta(alpha, beta) per arm, per dimension. */
export interface BanditState {
  [dimension: string]: {
    [arm: string]: { alpha: number; beta: number; pulls: number; reward: number };
  };
}

export interface TrendSignal {
  term: string;
  kind: "hashtag" | "topic" | "audio" | "team" | "player";
  /** 0..1 momentum score; higher = hotter right now. */
  momentum: number;
  source: string;
  capturedAt: string;
}

export interface HubStore {
  plans: ContentPlanItem[];
  posts: Post[];
  bandit: BanditState;
  trends: TrendSignal[];
  hashtagStats: Record<string, { uses: number; reachSum: number; lastUsed?: string }>;
  meta: { createdAt: string; lastSyncAt?: string; lastRunAt?: string };
}
