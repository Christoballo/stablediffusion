import { config, assertInstagramCredentials } from "../config.js";

/**
 * Thin wrapper around the official Meta/Instagram Graph API.
 * Only official endpoints are used — no scraping, no browser automation,
 * no unofficial session handling. Tokens come exclusively from .env.
 */

export class GraphApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "GraphApiError";
  }
}

export async function graphRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; params?: Record<string, string> } = {},
): Promise<T> {
  assertInstagramCredentials();

  const url = new URL(`${config.GRAPH_API_BASE}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", config.META_ACCESS_TOKEN);
  for (const [key, value] of Object.entries(options.params ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { method: options.method ?? "GET" });
  const body = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    throw new GraphApiError(
      `Graph API ${options.method ?? "GET"} ${path} failed with ${response.status}`,
      response.status,
      body,
    );
  }
  return body as T;
}
