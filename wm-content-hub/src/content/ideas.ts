// Turns a plan item (angle + format + context) into concrete generation prompts
// for Higgsfield.
//
// Authenticity, done legally:
//   - REAL national flags + color palettes are woven in per fixture (flags are
//     public domain). See strategy/countries.ts.
//   - NO federation crests/logos and NO real-player likenesses (those are
//     trademark / publicity-rights protected). Players are referenced by name
//     in captions/stats instead (editorial, legal).
//   - An ORIGINAL brand mascot (owned by you) is used — never FIFA's.

import { config } from "../config.js";
import { FORMAT_ASPECT } from "../strategy/playbook.js";
import { matchupFlagArt } from "../strategy/countries.js";
import type { ContentAngle, ContentPlanItem, FixtureRef, MediaFormat } from "../types.js";

const BRAND_LOOK =
  "bold modern sports-broadcast graphic style, dramatic stadium lighting, deep " +
  "saturated team-color palette, kinetic typography space, premium ESPN/Sky-Sports " +
  "broadcast aesthetic, high contrast, cinematic, no real player faces, generic " +
  "athletic silhouettes, no team crests or federation logos, World Cup 2026 energy. " +
  "STRICTLY NO FIFA logo or wordmark, no official World Cup emblem or tournament " +
  "logo, no official tournament mascot, no replica of the real FIFA World Cup " +
  "trophy, no year emblem — original generic graphics only";

// Original, owned brand mascot — NOT a FIFA mascot. Override via BRAND_MASCOT env.
const BRAND_MASCOT =
  process.env.BRAND_MASCOT ??
  "the WM Zone mascot: an original friendly cartoon golden lion in a plain " +
    "red-and-white football kit (no real club or country branding), energetic and bold";

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

/** Real-flag clause for a fixture (empty when there's no fixture context). */
function flags(f?: FixtureRef): string {
  return f ? `, ${matchupFlagArt(f.home, f.away)}` : "";
}

const ANGLE_VISUAL: Record<ContentAngle, (f?: FixtureRef) => string> = {
  match_preview: (f) =>
    `match preview key art for ${matchLine(f)}${flags(f)}, giant "VS" centerpiece between the two flags`,
  match_reaction: (f) =>
    `full-time reaction graphic for ${matchLine(f)}${flags(f)}, scoreboard motif, roaring crowd`,
  player_spotlight: (f) =>
    `anonymous star-player silhouette in a dramatic spotlight, stat overlay frame${flags(f)}`,
  stat_drop: (f) =>
    `bold single-statistic poster, giant number as hero element, minimal clean layout${flags(f)}`,
  tactics_breakdown: (f) =>
    `tactical pitch diagram, arrows and zones, analyst board for ${matchLine(f)}${flags(f)}`,
  meme: () => `playful football meme template featuring ${BRAND_MASCOT}, exaggerated reaction, punchy caption space`,
  poll_question: (f) => `clean A/B poll graphic, two options side by side, vote prompt${flags(f)}`,
  countdown: (f) =>
    `dramatic countdown key art, glowing number, stadium at dusk, kickoff anticipation${flags(f)}`,
  history_throwback: () => `vintage film-grain football moment recreation, retro broadcast overlay`,
  fan_culture: (f) =>
    `electric fan-zone atmosphere with ${BRAND_MASCOT}, waving national flags, tifo, confetti, crowd energy${flags(f)}`,
  prediction: (f) => `bracket / prediction key art, trophy glowing, bold "OUR CALL" banner${flags(f)}`,
};

export function buildGenSpec(item: ContentPlanItem): GenSpec {
  const aspect = FORMAT_ASPECT[item.format];
  const base = ANGLE_VISUAL[item.angle](item.context);
  // The franchise cue is the recurring visual signature that makes the series
  // instantly recognizable in the feed ("build a show, not a feed").
  const cue = item.franchise ? `, recurring series look: ${item.franchise.cue}` : "";
  const label = item.franchise ? `, on-image series badge reading "${item.franchise.name}"` : "";
  const visual = `${base}${cue}, ${BRAND_LOOK}, ${config.brand.name} branding lower-third${label}`;

  if (item.format === "reel" || item.format === "story") {
    return { kind: "video", prompts: [videoPrompt(item)], aspectRatio: aspect, durationSec: 8 };
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

// Production-hardened video prompt. Lesson from live generation: animating
// human silhouettes via image-to-video reliably trips content-moderation
// false-positives (the classifier misreads moving body forms). For reels we
// therefore go PURE MOTION GRAPHICS — no people/figures/silhouettes — which is
// both filter-safe and a cleaner broadcast look. Flags + franchise cue + brand
// typography carry the identity.
function videoPrompt(item: ContentPlanItem): string {
  const f = item.context;
  const flagClause = f
    ? `national-flag color motifs of ${f.home} and ${f.away}, `
    : "World Cup 2026 color motifs, ";
  const cue = item.franchise ? `recurring series look: ${item.franchise.cue}, ` : "";
  const badge = item.franchise ? `kinetic typography animating the words "${item.franchise.name}", ` : "";
  return (
    `8-second vertical sports-broadcast motion-graphics intro. Absolutely NO people, ` +
    `no human figures, no silhouettes — animated graphic design elements only. ` +
    `${flagClause}${cue}bold geometric shapes, sweeping light streaks, soft floodlight ` +
    `glows, ${badge}clean glowing "${config.brand.name}" lower-third banner, subtle ` +
    `animated scoreboard grid. Polished ESPN-style broadcast title sequence, high ` +
    `contrast, premium, professional and family-friendly. The first second must be ` +
    `visually arresting to win the 3-second retention threshold.`
  );
}

export function formatNeedsVideo(format: MediaFormat): boolean {
  return format === "reel" || format === "story";
}
