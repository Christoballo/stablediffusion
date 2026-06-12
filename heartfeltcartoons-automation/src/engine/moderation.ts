/**
 * Category G gate: anything negative, aggressive, political, medical, legal
 * or otherwise sensitive is never answered automatically. It is flagged for
 * manual review instead.
 */

export interface ModerationResult {
  sensitive: boolean;
  reason: string;
}

const NEGATIVE_PATTERNS: Array<{ reason: string; pattern: RegExp }> = [
  {
    reason: "insult_or_aggression",
    pattern:
      /\b(stupid|dumb|idiot|hate|trash|garbage|cringe|awful|disgusting|ugly|shut up|wtf|stfu|scheisse|scheiße|dumm|hässlich|müll)\b/i,
  },
  {
    reason: "political",
    pattern:
      /\b(politic|election|government|president|trump|biden|left wing|right wing|woke|migration|partei|wahl|regierung)\b/i,
  },
  {
    reason: "medical_or_legal",
    pattern:
      /\b(diagnos|disease|medication|therapy|lawyer|lawsuit|sue|illegal|krank(heit)?|medikament|anwalt|klage)\b/i,
  },
  {
    reason: "ai_debate",
    pattern: /\b(ai slop|ai generated|ai content|soulless|fake|bot account|ki[- ]m(ü|u)ll)\b/i,
  },
  {
    reason: "safety_concern",
    pattern: /\b(kill|die|death|suicide|abuse|violence|gewalt|sterben|umbringen)\b/i,
  },
];

export function moderateComment(text: string): ModerationResult {
  for (const { reason, pattern } of NEGATIVE_PATTERNS) {
    if (pattern.test(text)) {
      return { sensitive: true, reason };
    }
  }
  return { sensitive: false, reason: "" };
}
