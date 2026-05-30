// Caption generator. Two modes:
//   - LLM mode (if ANTHROPIC_API_KEY set): Claude writes the hook + body in the
//     chosen hook style, grounded in the day's context. Best quality.
//   - Template mode (always available): deterministic, on-brand fallback so the
//     hub never blocks on an external dependency.
// A strong hook is the #1 lever on 3-second retention, so it is generated
// explicitly and placed on the first line.

import { config } from "../config.js";
import { ENGAGEMENT_PROMPTS } from "../strategy/playbook.js";
import { flagEmoji } from "../strategy/countries.js";
import type { Caption, ContentAngle, FixtureRef, FranchiseRef } from "../types.js";

export interface CaptionInput {
  angle: ContentAngle;
  hookStyle: string;
  fixture?: FixtureRef;
  topic?: string;
  /** Real player names — used editorially in copy only, never in imagery. */
  players?: string[];
  /** The recurring series this episode belongs to. */
  franchise?: FranchiseRef;
  language: "de" | "en";
}

/** Real flag emojis for a fixture, e.g. "🇲🇽 vs 🇿🇦". */
function fixtureFlags(f?: FixtureRef): string {
  return f ? `${flagEmoji(f.home)} vs ${flagEmoji(f.away)}` : "";
}

/** A short editorial player mention, legal because it's factual/text-only. */
function playerLine(input: CaptionInput): string {
  const names = input.players ?? input.fixture?.keyPlayers ?? [];
  if (names.length === 0) return "";
  const list = names.slice(0, 3).join(", ");
  return input.language === "en" ? `All eyes on ${list}.` : `Alle Augen auf ${list}.`;
}

export async function generateCaption(input: CaptionInput): Promise<Caption> {
  if (config.anthropic.apiKey) {
    try {
      return await llmCaption(input);
    } catch {
      // fall through to template on any LLM failure — never block a ship
    }
  }
  return templateCaption(input);
}

function subject(input: CaptionInput): string {
  if (input.fixture) return `${input.fixture.home} vs ${input.fixture.away}`;
  if (input.topic) return input.topic;
  return "die WM 2026";
}

const HOOKS_DE: Record<string, (s: string) => string> = {
  bold_claim: (s) => `${s} entscheidet heute alles. Punkt.`,
  question: (s) => `Wer holt sich ${s} wirklich? 👀`,
  curiosity_gap: (s) => `Niemand redet über DIESE Sache bei ${s}…`,
  countdown: (s) => `Es wird ernst: ${s} steht vor der Tür ⏳`,
  controversy: (s) => `Unpopuläre Meinung zu ${s}:`,
  list_promise: (s) => `3 Dinge, die du über ${s} wissen musst 🧵`,
};

const HOOKS_EN: Record<string, (s: string) => string> = {
  bold_claim: (s) => `${s} decides everything today. Period.`,
  question: (s) => `Who really takes ${s}? 👀`,
  curiosity_gap: (s) => `Nobody is talking about THIS in ${s}…`,
  countdown: (s) => `It's getting real: ${s} is almost here ⏳`,
  controversy: (s) => `Unpopular opinion on ${s}:`,
  list_promise: (s) => `3 things you must know about ${s} 🧵`,
};

function templateCaption(input: CaptionInput): Caption {
  const s = subject(input);
  const hooks = input.language === "en" ? HOOKS_EN : HOOKS_DE;
  const rawHook = (hooks[input.hookStyle] ?? hooks.bold_claim!)(s);
  // Lead with the recognizable series header — trains the audience on the show.
  const hook = input.franchise ? `${input.franchise.label}\n${rawHook}` : rawHook;

  const bodies: Record<ContentAngle, string> = {
    match_preview:
      input.language === "en"
        ? `Form, key duels and the X-factor — here's what to watch before kickoff.`
        : `Form, Schlüsselduelle und der X-Faktor — das musst du vor dem Anpfiff sehen.`,
    match_reaction:
      input.language === "en"
        ? `That result changes the whole group. Here's why it matters.`
        : `Dieses Ergebnis dreht die ganze Gruppe. Deshalb ist es so wichtig.`,
    player_spotlight:
      input.language === "en"
        ? `The numbers behind the hype — is he really that good?`
        : `Die Zahlen hinter dem Hype — ist er wirklich so gut?`,
    stat_drop:
      input.language === "en" ? `One stat. Zero arguments.` : `Eine Statistik. Keine Diskussion.`,
    tactics_breakdown:
      input.language === "en"
        ? `The tactical detail everyone missed, broken down frame by frame.`
        : `Das taktische Detail, das alle übersehen haben — Bild für Bild erklärt.`,
    meme: input.language === "en" ? `Tell me I'm wrong. 😂` : `Sag mir, dass ich falsch liege. 😂`,
    poll_question: input.language === "en" ? `Your call 👇` : `Deine Entscheidung 👇`,
    countdown:
      input.language === "en" ? `The wait is almost over.` : `Das Warten hat fast ein Ende.`,
    history_throwback:
      input.language === "en"
        ? `History doesn't repeat — but it rhymes.`
        : `Geschichte wiederholt sich nicht — aber sie reimt sich.`,
    fan_culture:
      input.language === "en"
        ? `This is why we love this game.`
        : `Genau dafür lieben wir diesen Sport.`,
    prediction:
      input.language === "en" ? `Bold call. Screenshot it.` : `Mutige Prognose. Screenshot machen.`,
  };

  const baseBody = bodies[input.angle];
  const flags = fixtureFlags(input.fixture);
  const players = playerLine(input);
  const body = [flags && `${flags}`, baseBody, players].filter(Boolean).join("\n");
  // Franchise CTA is the series' signature interactive mechanic (save/send/comment).
  const cta = input.franchise?.engagement ?? ENGAGEMENT_PROMPTS[Math.floor(Math.random() * ENGAGEMENT_PROMPTS.length)]!;
  const full = `${hook}\n\n${body}\n\n${cta}\n\n${config.brand.handle}`;
  return { hook, body, cta, full };
}

async function llmCaption(input: CaptionInput): Promise<Caption> {
  const s = subject(input);
  const sys =
    `You are the head social copywriter for ${config.brand.name}, a World Cup 2026 ` +
    `football brand on Instagram. Write in ${input.language === "en" ? "English" : "German"}. ` +
    `Voice: punchy, confident, fan-first "locker-room" energy like the biggest football ` +
    `pages (433, B/R Football) — real talk, zero corporate fluff. Optimize the first line ` +
    `as a scroll-stopping hook (3-second retention is everything). Drive saves & DM shares. ` +
    `No fabricated stats. Return STRICT JSON: {"hook","body","cta"}.`;
  const seriesNote = input.franchise
    ? `This is an episode of the recurring series "${input.franchise.name}" — keep its ` +
      `signature tone and make the interactive CTA "${input.franchise.engagement}".\n`
    : "";
  const names = (input.players ?? input.fixture?.keyPlayers ?? []).slice(0, 3).join(", ");
  const user =
    `Topic: ${s}\nAngle: ${input.angle}\nHook style: ${input.hookStyle}\n` +
    seriesNote +
    (names ? `Players to reference by name (text only, factual): ${names}\n` : "") +
    `Constraints: hook <= 90 chars; body 1-2 sentences; cta = one prompt that drives a save, ` +
    `comment or DM share. You may mention real players by name editorially, but make no false ` +
    `claims. Do not include hashtags.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.anthropic.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      max_tokens: 400,
      system: sys,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content: Array<{ text?: string }> };
  const text = data.content.map((c) => c.text ?? "").join("");
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as {
    hook: string;
    body: string;
    cta: string;
  };
  const flags = fixtureFlags(input.fixture);
  const body = flags ? `${flags}\n${json.body}` : json.body;
  const hook = input.franchise ? `${input.franchise.label}\n${json.hook}` : json.hook;
  const cta = json.cta || input.franchise?.engagement || "";
  const full = `${hook}\n\n${body}\n\n${cta}\n\n${config.brand.handle}`;
  return { hook, body, cta, full };
}
