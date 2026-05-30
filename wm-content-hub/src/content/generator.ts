// Content generation provider abstraction.
//
//   - HiggsfieldProvider: calls the Higgsfield HTTP API with your API key,
//     using a submit -> poll -> result-url pattern. Generated assets come back
//     as public CDN URLs, which are exactly what the Instagram Graph API needs
//     as `image_url` / `video_url`. NOTE: verify the endpoint paths/payload
//     against your Higgsfield account's API docs — they are centralised here
//     so there is a single place to adapt.
//   - PlaceholderProvider: used in DRY_RUN or when no API key is present. It
//     returns deterministic placeholder URLs so the entire pipeline (planning,
//     captions, hashtags, scheduling, optimization) runs end-to-end offline.
//
// During interactive sessions, assets can also be produced via the Higgsfield
// MCP tools by the agent and their CDN URLs pasted into the store — the same
// downstream pipeline consumes them.

import { config } from "../config.js";
import { log } from "../logger.js";
import type { GeneratedAsset } from "../types.js";
import type { GenSpec } from "./ideas.js";

export interface GenerationProvider {
  name: string;
  generate(spec: GenSpec): Promise<GeneratedAsset[]>;
}

export function getProvider(): GenerationProvider {
  if (!config.dryRun && config.higgsfield.apiKey) return new HiggsfieldProvider();
  return new PlaceholderProvider();
}

class PlaceholderProvider implements GenerationProvider {
  name = "placeholder";
  async generate(spec: GenSpec): Promise<GeneratedAsset[]> {
    return spec.prompts.map((p, i) => ({
      url: `https://placeholder.invalid/${spec.kind}/${encodeURIComponent(slug(p))}-${i}.${
        spec.kind === "video" ? "mp4" : "jpg"
      }`,
      kind: spec.kind,
      prompt: p,
      aspectRatio: spec.aspectRatio,
    }));
  }
}

class HiggsfieldProvider implements GenerationProvider {
  name = "higgsfield";
  private base = config.higgsfield.apiUrl.replace(/\/$/, "");

  async generate(spec: GenSpec): Promise<GeneratedAsset[]> {
    const out: GeneratedAsset[] = [];
    for (const prompt of spec.prompts) {
      const asset = await this.one(prompt, spec);
      out.push(asset);
    }
    return out;
  }

  private headers() {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${config.higgsfield.apiKey}`,
    };
  }

  private async one(prompt: string, spec: GenSpec): Promise<GeneratedAsset> {
    const endpoint = spec.kind === "video" ? "/generations/video" : "/generations/image";
    const payload: Record<string, unknown> = {
      prompt,
      aspect_ratio: spec.aspectRatio,
    };
    if (spec.kind === "video") payload.duration = spec.durationSec ?? 8;

    const submit = await fetch(`${this.base}${endpoint}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    if (!submit.ok) throw new Error(`Higgsfield submit ${submit.status}: ${await submit.text()}`);
    const job = (await submit.json()) as { id?: string; job_id?: string; status?: string };
    const jobId = job.id ?? job.job_id;
    if (!jobId) throw new Error("Higgsfield: no job id in response");

    const url = await this.poll(jobId);
    return { url, kind: spec.kind, prompt, jobId, aspectRatio: spec.aspectRatio };
  }

  private async poll(jobId: string, timeoutMs = 240_000): Promise<string> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      await sleep(4000);
      const res = await fetch(`${this.base}/generations/${jobId}`, { headers: this.headers() });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        status?: string;
        result_url?: string;
        results?: Array<{ url?: string }>;
      };
      const status = (data.status ?? "").toLowerCase();
      const url = data.result_url ?? data.results?.[0]?.url;
      if ((status === "completed" || status === "succeeded" || status === "finished") && url) return url;
      if (status === "failed" || status === "error") throw new Error(`Higgsfield job ${jobId} failed`);
      log.debug(`Higgsfield job ${jobId} status=${status}`);
    }
    throw new Error(`Higgsfield job ${jobId} timed out`);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40).replace(/^-|-$/g, "");
}
