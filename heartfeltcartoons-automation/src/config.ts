import "dotenv/config";
import { z } from "zod";

const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? defaultValue : String(value).toLowerCase() === "true"),
    z.boolean(),
  );

const envSchema = z.object({
  IG_ACCOUNT_ID: z.string().default(""),
  META_APP_ID: z.string().default(""),
  META_APP_SECRET: z.string().default(""),
  META_ACCESS_TOKEN: z.string().default(""),
  WEBHOOK_VERIFY_TOKEN: z.string().default(""),

  // Working mode: human-in-the-loop by default. Auto posting only happens
  // when AUTO_REPLY_ENABLED is explicitly set to true in .env.
  AUTO_REPLY_ENABLED: booleanFromEnv(false),
  AUTO_LIKE_ENABLED: booleanFromEnv(true),
  MAX_AUTO_REPLIES_PER_HOUR: z.coerce.number().int().positive().default(25),
  MAX_AUTO_LIKES_PER_HOUR: z.coerce.number().int().positive().default(100),

  HIGGSFIELD_MCP_ENABLED: booleanFromEnv(true),

  GRAPH_API_BASE: z.string().url().default("https://graph.facebook.com/v21.0"),
  WEBHOOK_PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z.string().default("./data/heartfeltcartoons.db"),
});

export type Config = z.infer<typeof envSchema>;

export const config: Config = envSchema.parse(process.env);

export function assertInstagramCredentials(): void {
  const missing = [
    ["IG_ACCOUNT_ID", config.IG_ACCOUNT_ID],
    ["META_ACCESS_TOKEN", config.META_ACCESS_TOKEN],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing Instagram credentials in .env: ${missing.join(", ")}. ` +
        "Copy .env.example to .env and fill in your Meta app credentials.",
    );
  }
}
