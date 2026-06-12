import type { CommentCategory } from "./classifyComment.js";

/**
 * Reply templates from the briefing. Tone: warm, short, international,
 * "funny + emotional + parent relatable". English is the default language.
 */
const TEMPLATES: Record<CommentCategory, string[]> = {
  A: [
    "Lily sends a big hug ❤️🥹",
    "Glad Lily made you smile 😂❤️",
    "Thank you for watching ❤️✨",
  ],
  B: [
    "Looks like Lily has another twin 😂❤️",
    "Every family has one little bed ninja 😂❤️",
    "Then you already know who really owns the bed 😂❤️",
    "Your little one and Lily must have the same strategy 😂❤️",
    "Every parent knows this feeling 😂❤️",
  ],
  C: [
    "Uh oh... someone just got exposed 😂❤️",
    "Looks familiar, doesn't it? 😂❤️",
    "Another family caught in 4K 😂❤️",
    "Someone is definitely getting tagged for a reason 😂❤️",
    "Looks like someone recognized their little bed thief 😂❤️",
  ],
  D: [
    "The sleepless nights fade away, but those memories stay forever ❤️🥹",
    "One day the bed will be bigger... and the house will feel quieter ❤️🥹",
    "The chaos becomes a memory ❤️🥹",
    "Those are the moments you'll remember forever ❤️🥹",
    "Exhaustion and love at the same time ❤️🥹",
  ],
  E: [
    "Category 5 bedtime tornado 😂🌪️❤️",
    "A tiny hurricane with endless energy 😂🌪️❤️",
    "Every family has one professional bedtime acrobat 😂❤️",
    "Dad never stood a chance 😂❤️",
    "Lily: 1️⃣ Bed. Dad: 0️⃣ 😂❤️",
  ],
  F: ["❤️😊", "😂❤️", "Lily sends love ❤️🥹"],
  G: [], // never answered automatically
};

/**
 * Exception per briefing: clearly emotional comments in Spanish or Portuguese
 * may get a short reply in the same language — only when we are confident.
 */
const EMOTIONAL_BY_LANGUAGE: Record<string, string[]> = {
  es: ["Qué hermoso recuerdo ❤️🥹"],
  pt: ["Que memória linda ❤️🥹"],
};

export function replyCandidates(category: CommentCategory, language: string): string[] {
  if (category === "D" && EMOTIONAL_BY_LANGUAGE[language]) {
    return [...EMOTIONAL_BY_LANGUAGE[language], ...TEMPLATES.D];
  }
  return TEMPLATES[category] ?? [];
}
