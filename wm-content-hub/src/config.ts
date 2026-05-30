import "dotenv/config";

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export interface Config {
  ig: { userId: string; accessToken: string; apiVersion: string };
  fb: { pageId: string; pageAccessToken: string; enabled: boolean };
  higgsfield: { apiKey: string; apiUrl: string };
  anthropic: { apiKey: string; model: string };
  dryRun: boolean;
  timezone: string;
  postsPerDay: number;
  brand: { handle: string; name: string };
  language: "de" | "en";
  dataDir: string;
}

export const config: Config = {
  ig: {
    userId: process.env.IG_USER_ID ?? "",
    accessToken: process.env.IG_ACCESS_TOKEN ?? "",
    apiVersion: process.env.GRAPH_API_VERSION ?? "v21.0",
  },
  fb: {
    pageId: process.env.FB_PAGE_ID ?? "",
    pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN ?? "",
    enabled: bool(process.env.ENABLE_FACEBOOK, false),
  },
  higgsfield: {
    apiKey: process.env.HIGGSFIELD_API_KEY ?? "",
    apiUrl: process.env.HIGGSFIELD_API_URL ?? "https://platform.higgsfield.ai/v1",
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  },
  dryRun: bool(process.env.DRY_RUN, true),
  timezone: process.env.TIMEZONE ?? "Europe/Berlin",
  postsPerDay: num(process.env.POSTS_PER_DAY, 3),
  brand: {
    handle: process.env.BRAND_HANDLE ?? "@wm_zone_official",
    name: process.env.BRAND_NAME ?? "WM Zone",
  },
  language: (process.env.CONTENT_LANGUAGE === "en" ? "en" : "de"),
  dataDir: process.env.DATA_DIR ?? "./data",
};

/** Throw if the config required for live publishing is missing. */
export function assertPublishable(cfg: Config = config): void {
  const missing: string[] = [];
  if (!cfg.ig.userId) missing.push("IG_USER_ID");
  if (!cfg.ig.accessToken) missing.push("IG_ACCESS_TOKEN");
  if (missing.length) {
    throw new Error(
      `Cannot publish: missing ${missing.join(", ")}. ` +
        `Set them in .env, or keep DRY_RUN=true to run without publishing.`,
    );
  }
}
