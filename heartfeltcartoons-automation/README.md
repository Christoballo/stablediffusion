# heartfeltcartoons-automation

Technischer Assistent für den Instagram-Account `@heartfeltcartoons`:
Kommentar-Engine (Human-in-the-loop), Content-Vorbereitung und Prompt-Library
für die emotionale Familienserie rund um Lily, Papa, Mama und Casanova.

Erfolgsformel: **Lily + Papa + Chaos + Herzmoment**

## Grundprinzipien

- **Nur offizielle Meta/Instagram-API** (Graph API für professionelle Konten).
  Keine Browser-Automation, kein Scraping, keine Login-Hacks, kein
  Follow-/Unfollow-Bot, kein Spam.
- **Human-in-the-loop als Standard**: Antworten werden vorgeschlagen, nicht
  gepostet. Automatisches Posten nur bei explizitem `AUTO_REPLY_ENABLED=true`
  und nur für unkritische Kategorien, mit Stundenlimits.
- **Kategorie G** (negativ, aggressiv, politisch, sensibel) wird **nie**
  automatisch beantwortet, sondern nur zur manuellen Prüfung markiert.
- **Tokens nur in `.env`** – niemals im Code.
- Videos (Seedance 2.0) laufen über das Higgsfield MCP **nur auf explizite
  Beauftragung**; Bild-Prompts werden für ChatGPT Image Generation vorbereitet.

## Setup

```bash
npm install
cp .env.example .env   # Meta-App-Credentials eintragen
```

Benötigt: Instagram Professional Account, Meta App, Access Token mit
Berechtigungen für Kommentarzugriff/-verwaltung, optional Webhooks.

## Befehle

```bash
npm run dev -- comments      # Kommentare abrufen, klassifizieren, Vorschläge erstellen
npm run dev -- webhook       # Webhook-Server starten (GET/POST /webhook)
npm run dev -- ideas         # Priorisierte Videoideen
npm run dev -- captions      # Beschreibungsvorlagen
npm run dev -- hashtags      # Hashtag-Sets + YouTube-Tags
npm run dev -- seedance      # Seedance-2.0-Prompt der Referenz-Episode
npm run dev -- image-prompt lily "Episode context"   # ChatGPT-Image-Prompt
```

## Kommentar-Kategorien

| Kat. | Bedeutung | Aktion |
| --- | --- | --- |
| A | Einfach positiv (❤️, "so cute") | Liken, optional kurz antworten |
| B | Eltern erkennen sich wieder | Liken + antworten (hohe Engagement-Chance) |
| C | Andere Personen markiert | Liken + Antwort, die weitere Antworten provoziert |
| D | Emotionale Eltern-Kommentare | Liken + warm/emotional antworten |
| E | Witzige Metaphern (Tornado, Ninja) | Liken + humorvoll antworten |
| F | Unklar, fremdsprachig, sehr kurz | Nur liken oder sehr kurz antworten |
| G | Negativ/sensibel/politisch | `manual_review` – nie automatisch |

Antwort-Deduplikation: Eine Antwort, die in den letzten 20 Antworten benutzt
wurde, wird nicht erneut gewählt.

Hinweis: Die Graph API bietet aktuell keinen Endpoint zum Liken von
Kommentaren. Like-Intents werden lokal protokolliert (Dashboard/manuelle
Abarbeitung); sobald Meta einen offiziellen Endpoint anbietet, ist
`src/instagram/comments.ts` die einzige Stelle zum Anschließen.

## Projektstruktur

```text
src/
  index.ts               CLI-Einstieg + Entscheidungslogik
  config.ts              Zod-validierte .env-Konfiguration
  instagram/             Offizielle Graph-API: client, comments, webhooks
  engine/                classifyComment, generateReply, deduplicateReply, moderation
  content/               videoIdeas, captions, hashtags, seedancePrompts
  storage/               SQLite (better-sqlite3): db, schema
docs/
  brand-guide.md         Tonalität, Titel-Logik, Content-Strategie, harte Regeln
  character-guide.md     Lily, Dad, Mom, Casanova inkl. Konsistenzregeln
  prompt-library.md      Seedance-Basis, Character-Sheet-Template, Captions, Hashtags
```
