import { config } from "./config.js";
import { getRecentComments, postReply, type IgComment } from "./instagram/comments.js";
import { startWebhookServer } from "./instagram/webhooks.js";
import { classifyComment, AUTO_REPLY_CATEGORIES } from "./engine/classifyComment.js";
import { pickReply } from "./engine/deduplicateReply.js";
import {
  isCommentProcessed,
  likesInLastHour,
  postedRepliesInLastHour,
  saveComment,
  saveLike,
  saveReply,
} from "./storage/db.js";
import { formatIdeas } from "./content/videoIdeas.js";
import { allCaptions } from "./content/captions.js";
import { getHashtags, YOUTUBE_TAGS } from "./content/hashtags.js";
import {
  buildCharacterSheetPrompt,
  buildSeedancePrompt,
  CHARACTERS,
  EPISODE_MAKEOVER,
} from "./content/seedancePrompts.js";

interface ProcessedRow {
  comment: IgComment;
  category: string;
  language: string;
  action: string;
  reply: string;
}

/**
 * "Kommentare beantworten" flow:
 * 1. fetch new comments  2. classify  3. generate reply suggestions
 * 4. post automatically only when AUTO_REPLY_ENABLED=true
 * 5. otherwise print a suggestion table (human-in-the-loop)
 */
async function runCommentsFlow(): Promise<void> {
  const comments = await getRecentComments();
  const rows: ProcessedRow[] = [];

  for (const comment of comments) {
    if (isCommentProcessed(comment.id)) continue;

    const classified = classifyComment(comment.text);
    let action = "suggested";
    let reply = "";

    if (classified.category === "G") {
      action = "manual_review";
    } else {
      if (config.AUTO_LIKE_ENABLED && likesInLastHour() < config.MAX_AUTO_LIKES_PER_HOUR) {
        saveLike(comment.id); // like intent recorded; see instagram/comments.ts
      }

      const suggestion = pickReply(classified.category, classified.language);
      if (suggestion) {
        reply = suggestion;
        const mayAutoReply =
          config.AUTO_REPLY_ENABLED &&
          AUTO_REPLY_CATEGORIES.includes(classified.category) &&
          postedRepliesInLastHour() < config.MAX_AUTO_REPLIES_PER_HOUR;

        if (mayAutoReply) {
          await postReply(comment.id, suggestion);
          saveReply(comment.id, suggestion, true);
          action = "replied";
        } else {
          saveReply(comment.id, suggestion, false);
        }
      }
    }

    saveComment({
      id: comment.id,
      media_id: comment.media_id,
      username: comment.username,
      text: comment.text,
      language: classified.language,
      category: classified.category,
      action,
      reason: classified.reason,
      comment_ts: comment.timestamp,
    });
    rows.push({ comment, category: classified.category, language: classified.language, action, reply });
  }

  printCommentTable(rows);
}

function printCommentTable(rows: ProcessedRow[]): void {
  if (rows.length === 0) {
    console.log("Keine neuen Kommentare.");
    return;
  }
  console.log(
    `Modus: ${config.AUTO_REPLY_ENABLED ? "AUTO-REPLY AKTIV" : "Human-in-the-loop (nur Vorschläge)"}\n`,
  );
  for (const row of rows) {
    console.log(
      [
        `[${row.category}] @${row.comment.username}: ${row.comment.text}`,
        `    Sprache: ${row.language} | Aktion: ${row.action}`,
        row.reply ? `    Antwort${row.action === "replied" ? " (gepostet)" : "svorschlag"}: ${row.reply}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

function printHelp(): void {
  console.log(`heartfeltcartoons-automation

Befehle:
  comments            Neue Kommentare abrufen, klassifizieren, Vorschläge erstellen
                      (postet nur automatisch, wenn AUTO_REPLY_ENABLED=true)
  webhook             Webhook-Server für neue Kommentare starten
  ideas               Priorisierte Videoideen anzeigen
  captions            Beschreibungsvorlagen anzeigen
  hashtags            Hashtag-Sets und YouTube-Tags anzeigen
  seedance            Seedance-2.0-Prompt der aktuellen Episode ausgeben
                      (Generierung über Higgsfield MCP nur auf explizite Beauftragung)
  image-prompt <name> Character-Sheet-Prompt für ChatGPT Image Generation
                      (name: lily | dad | mom | casanova)
  help                Diese Hilfe`);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "comments":
      await runCommentsFlow();
      break;
    case "webhook":
      startWebhookServer();
      break;
    case "ideas":
      console.log(formatIdeas());
      break;
    case "captions": {
      const captions = allCaptions();
      console.log(`--- Humor + Familie ---\n${captions.humor}\n\n--- Emotional ---\n${captions.emotional}`);
      break;
    }
    case "hashtags":
      console.log(`Instagram/TikTok:\n${getHashtags("instagram")}\n`);
      console.log(`YouTube Shorts:\n${getHashtags("youtube")}\n`);
      console.log(`YouTube Tags:\n${YOUTUBE_TAGS.join(", ")}`);
      break;
    case "seedance":
      console.log(buildSeedancePrompt(EPISODE_MAKEOVER));
      break;
    case "image-prompt": {
      const name = (args[0] ?? "lily").toLowerCase() as keyof typeof CHARACTERS;
      if (!(name in CHARACTERS)) {
        console.error(`Unbekannte Figur: ${args[0]}. Verfügbar: ${Object.keys(CHARACTERS).join(", ")}`);
        process.exitCode = 1;
        break;
      }
      const context = args.slice(1).join(" ") || EPISODE_MAKEOVER.title;
      console.log(buildCharacterSheetPrompt(name, CHARACTERS[name], context));
      break;
    }
    default:
      printHelp();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
