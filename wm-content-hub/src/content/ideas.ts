// Turns a plan item (angle + format + context) into concrete generation prompts
// for Higgsfield. Brand-driven (no real player likenesses required): the visual
// language is bold sports-broadcast graphics, stadium atmosphere, kinetic type.

import { config } from "../config.js";
import { FORMAT_ASPECT } from "../strategy/playbook.js";
import type { ContentAngle, ContentPlanItem, FixtureRef, MediaFormat } from "../types.js";

const BRAND_LOOK =
  "bold modern sports-broadcast graphic style, dramatic stadium lighting, deep " +
  "saturated team-color palette, kinetic typography space, premium ESPN/Sky-Sports " +
  "broadcast aesthetic, high contrast, cinematic, no real player faces, generic " +
  "athletic silhouettes, World Cup 2026 energy";

export interface GenSpec {
  kind: "image" | "video";
  /** For carousels we produce several frames. */
  prompts: string[];
  aspectRatio: string;
  durationSec?: number;
}

function matchLine(f?: FixtureRef): string {
  if (!f) return "World Cup 2026 showdown";
  return `${f.home} vs ${f.away}, ${f.stage} stage`;
}

const ANGLE_VISUAL: Record<ContentAngle, (f?: FixtureRef) => string> = {
  match_preview: (f) => `match preview key art for ${matchLine(f)}, two team crests clashing, "VS" centerpiece`,
  match_reaction: (f) => `full-time reaction graphic for ${matchLine(f)}, scoreboard motif, roaring crowd`,
  player_spotlight: () => `anonymous star striker silhouette in spotlight, stat overlay frame`,
  stat_drop: () => `bold single-statistic poster, giant number as hero element, minimal clean layout`,
  tactics_breakdown: (f) => `tactical pitch diagram, arrows and zones, analyst board for ${matchLine(f)}`,
  meme: () => `playful football meme template, exaggerated reaction, punchy caption space`,
  poll_question: () => `clean A/B poll graphic, two options side by side, vote prompt`,
  countdown: () => `dramatic countdown key art, glowing number, stadium at dusk, kickoff anticipation`,
  history_throwback: () => `vintage film-grain football moment recreation, retro broadcast overlay`,
  fan_culture: () => `electric fan-zone atmosphere, flags, tifo, confetti, crowd energy`,
  prediction: () => `bracket / prediction key art, trophy glowing, bold "OUR CALL" banner`,
};

export function buildGenSpec(item: ContentPlanItem): GenSpec {
  const aspect = FORMAT_ASPECT[item.format];
  const base = ANGLE_VISUAL[item.angle](item.context);
  const visual = `${base}, ${BRAND_LOOK}, ${config.brand.name} branding lower-third`;

  if (item.format === "reel" || item.format === "story") {
    return { kind: "video", prompts: [videoPrompt(item.angle, base)], aspectRatio: aspect, durationSec: 8 };
  }
  if (item.format === "carousel") {
    // 5-slide carousel: cover + 3 content slides + CTA slide.
    return {
      kind: "image",
      prompts: [
        `${visual}, COVER slide, big headline space`,
        `${visual}, slide 2, supporting detail`,
        `${visual}, slide 3, supporting detail`,
        `${visual}, slide 4, key takeaway`,
        `${visual}, final CTA slide, "Follow ${config.brand.handle}" prompt`,
      ],
      aspectRatio: aspect,
    };
  }
  return { kind: "image", prompts: [visual], aspectRatio: aspect };
}

function videoPrompt(angle: ContentAngle, base: string): string {
  return (
    `8-second vertical hype reel: ${base}. Fast cuts, kinetic typography animating in, ` +
    `light flares, crowd roar energy, strong first-frame hook, ${BRAND_LOOK}. ` +
    `First 1s must be visually arresting to win the 3-second retention threshold.`
  );
}

export function formatNeedsVideo(format: MediaFormat): boolean {
  return format === "reel" || format === "story";
}
