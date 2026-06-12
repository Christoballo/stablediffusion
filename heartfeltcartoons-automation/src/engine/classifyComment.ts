import { moderateComment } from "./moderation.js";

/**
 * Comment categories from the HeartfeltCartoons briefing:
 *
 *  A – simple positive comment (emoji, "so cute", ...)
 *  B – parents recognizing their own child ("this is my daughter")
 *  C – users tagging other people (@name ...)
 *  D – emotional parent comments ("one day I will miss this")
 *  E – funny metaphors (tornado, ninja, ...)
 *  F – unclear, foreign, very short
 *  G – negative / aggressive / political / sensitive -> manual review only
 */
export type CommentCategory = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface ClassifiedComment {
  category: CommentCategory;
  language: string;
  reason: string;
}

const EMOJI_ONLY = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s️‍!.?]+$/u;

const SIMPLE_POSITIVE =
  /\b(so cute|cute|beautiful|adorable|sweet|lovely|amazing|love (it|this)|precious|wholesome|süß|niedlich|schön)\b/i;

const PARENT_RELATABLE =
  /\b(my (daughter|son|kid|girl|boy|little one)|meine tochter|mein sohn|minha filha|meu filho|mi hija|mi hijo|our (daughter|son|house|home)|every night|same here|exactly like this|genauso)\b/i;

const EMOTIONAL =
  /\b(miss this|grow(s|ing)? up|too fast|memories|memory|this is love|cherish|one day|sleepless nights|forever|tears|crying|herzerwärmend)\b/i;

const FUNNY_METAPHOR = /\b(tornado|hurricane|ninja|acrobat|wrestl(er|ing)|tsunami|earthquake|wirbelwind)\b/i;

const LANGUAGE_HINTS: Array<{ lang: string; pattern: RegExp }> = [
  { lang: "de", pattern: /\b(meine?|nicht|auch|genauso|jede[rn]?|nacht|tochter|sohn|schön|süß)\b/i },
  { lang: "es", pattern: /\b(mi hij[ao]|qué|hermos[ao]|igual|cada noche|así es|niñ[ao])\b/i },
  { lang: "pt", pattern: /\b(minha filha|meu filho|que lind[ao]|isso é|toda noite|memória)\b/i },
  { lang: "fr", pattern: /\b(ma fille|mon fils|trop mignon|chaque nuit|c'est)\b/i },
];

export function detectLanguage(text: string): string {
  for (const { lang, pattern } of LANGUAGE_HINTS) {
    if (pattern.test(text)) return lang;
  }
  if (/[a-z]/i.test(text)) return "en";
  return "unknown";
}

export function classifyComment(rawText: string): ClassifiedComment {
  const text = rawText.trim();
  const language = detectLanguage(text);

  const moderation = moderateComment(text);
  if (moderation.sensitive) {
    return { category: "G", language, reason: moderation.reason };
  }

  if (/@\w/.test(text)) {
    return { category: "C", language, reason: "tagged_friend" };
  }
  if (PARENT_RELATABLE.test(text)) {
    return { category: "B", language, reason: "parent_relatable" };
  }
  if (EMOTIONAL.test(text)) {
    return { category: "D", language, reason: "emotional" };
  }
  if (FUNNY_METAPHOR.test(text)) {
    return { category: "E", language, reason: "funny_metaphor" };
  }
  if (EMOJI_ONLY.test(text) || SIMPLE_POSITIVE.test(text)) {
    return { category: "A", language, reason: "simple_positive" };
  }
  return { category: "F", language, reason: "unclear_or_short" };
}

/** Categories where an automatic reply is allowed when AUTO_REPLY_ENABLED=true. */
export const AUTO_REPLY_CATEGORIES: CommentCategory[] = ["A", "B", "C", "D", "E"];
