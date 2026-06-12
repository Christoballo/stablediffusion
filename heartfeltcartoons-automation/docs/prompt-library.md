# HeartfeltCartoons – Prompt Library

## Arbeitsteilung

| Aufgabe | Werkzeug |
| --- | --- |
| Video (Seedance 2.0) | Higgsfield MCP – nur bei expliziter Beauftragung ausführen, sonst Prompt ausgeben |
| Bilder (Character Sheets, Storyboards, Thumbnails) | ChatGPT Image Generation – Claude schreibt nur den Prompt |

## Standard-Videoformat

```text
Vertical 9:16
10–15 seconds
Pixar-quality cinematic 3D animation
Family-friendly
Highly expressive faces
Warm emotional storytelling
No text
No subtitles
No logos
No watermark
```

## Seedance-Pflichtblock (immer einfügen)

```text
Only ONE Dad.
Only ONE Mom.
Only ONE Lily.
Never duplicate characters.
Keep character appearance consistent throughout the entire video.
```

```text
Wrong: Dad appears twice in the same frame.
Right: One Dad, one Mom, one Lily per frame.
```

## Character Sheet Prompt Template (ChatGPT Image Generation)

```text
Create a professional Pixar-quality 3D animated character sheet for [CHARACTER NAME], clean layout, warm beige background, multiple views including front, side, back, facial expressions, outfit details, color palette, props, and small action poses related to the episode.

Style: premium animated feature film character design, highly expressive face, soft cinematic lighting, polished production-ready reference sheet.

Character details:
[INSERT CHARACTER DETAILS]

Episode context:
[INSERT EPISODE CONTEXT]

Important:
Keep the character consistent.
No extra duplicate characters in the same panel unless clearly separated as reference poses.
Family-friendly.
No text errors where possible.
```

Generierbar über CLI: `npm run dev -- image-prompt lily "Episode context..."`

## Referenz-Episode (funktionierende Seedance-Prompt-Basis)

Vollständig hinterlegt in `src/content/seedancePrompts.ts` (`EPISODE_MAKEOVER`),
abrufbar über `npm run dev -- seedance`:

```text
TITLE:
He Shouldn't Have Closed His Eyes 😂❤️

STYLE:
Pixar-quality cinematic 3D animation, ultra expressive faces, premium family storytelling, vertical 9:16, warm evening atmosphere, soft cinematic lighting, high-quality character consistency, family-friendly, emotional ending.

IMPORTANT:
Only ONE Dad.
Only ONE Lily.
No character duplication.
Maintain identical appearance throughout the entire video.

SCENES: Dad kommt müde heim (0-2) → Couch, Augen zu (2-4) → Lily taucht hinter der
Couch auf (4-5) → Time-lapse Makeover (5-8) → Makeover eskaliert (8-10) → Spiegel,
Schock (10-12) → Lilys Lächeln verschwindet, emotionale Pause (12-14) → Papa lacht,
Umarmung, warmes Abendlicht (14-15)

EMOTIONAL FLOW:
Exhaustion → Curiosity → Comedy → Surprise → Emotional tension → Love.
```

## Beschreibungsvorlagen

### Humor + Familie

```text
Everything started peacefully...

Then Lily had her own plans. 😂❤️

Parents... you know exactly how this ends.

Follow for more adventures with Lily, Dad, Mom and Casanova.
```

### Emotional

```text
Sometimes the funniest little moments become the memories we keep forever. ❤️🥹

Lily only wanted to make Dad smile.

Follow HeartfeltCartoons for more emotional family stories.
```

## Hashtags & Tags

Hinterlegt in `src/content/hashtags.ts`, abrufbar über `npm run dev -- hashtags`.

## Nächste Videoideen (Priorität)

1. Papa kommt müde heim, Lily schminkt ihn.
2. Papa will auf Couch schlafen, Lily macht ihn zur Prinzessin.
3. Papa telefoniert wichtig, Lily übernimmt das Meeting.
4. Papa will Motorrad putzen, Lily macht Seifenchaos.
5. Papa ist krank, Lily spielt Ärztin.
6. Papa macht Sport, Lily trainiert mit und übertreibt.
7. Papa will Kaffee trinken, Lily serviert eine bunte Kinder-Version.
8. Papa sucht sein Handy, Lily hat es als Babyphone benutzt.
9. Casanova bringt Papa in Schwierigkeiten, Lily verteidigt ihn.
10. Mama will Familienfoto, Lily sabotiert es süß.
