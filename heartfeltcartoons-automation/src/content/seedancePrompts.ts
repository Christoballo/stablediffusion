/**
 * Seedance 2.0 prompt building (executed via the Higgsfield MCP only when
 * the user explicitly orders a generation; otherwise the prompt is printed).
 *
 * Image generation is intentionally NOT handled via Higgsfield — image
 * prompts are prepared for ChatGPT Image Generation instead.
 */

export const VIDEO_FORMAT = `Vertical 9:16
10–15 seconds
Pixar-quality cinematic 3D animation
Family-friendly
Highly expressive faces
Warm emotional storytelling
No text
No subtitles
No logos
No watermark`;

/** Mandatory consistency block for every Seedance prompt. */
export const SEEDANCE_RULES = `Only ONE Dad.
Only ONE Mom.
Only ONE Lily.
Never duplicate characters.
Keep character appearance consistent throughout the entire video.`;

export const CHARACTERS = {
  lily: `Adorable 5-year-old girl, curly dark brown hair, large expressive brown eyes, warm tan skin, cute freckles, yellow flower hair clip. Sweet, curious, mischievous, imaginative, loving, dramatic in a cute way. Premium Pixar-quality 3D animated child character, very expressive face, soft warm lighting. Typical outfits: pastel dresses, cute pajamas, playful childlike clothes.`,
  dad: `Muscular father (38–42), dark brown wavy thick hair, full well-groomed dark beard, warm brown eyes, visible full-arm tattoos on both arms, biker/casual dad style (black shirt, jeans, boots, sometimes pajama pants). Loving, protective, tired from work, funny, patient, strong but soft-hearted. Lily's hero and emotional anchor.`,
  mom: `Kind mother with long wavy brown hair, warm brown eyes, warm smile, elegant family-friendly outfit (soft pink satin pajama set or casual cozy outfit). Caring, warm, emotional, loving, patient, expressive. Emotional balance and warm family presence.`,
  casanova: `Small fluffy Pomeranian with golden-orange fluffy fur. Happy, loyal, funny, proud, slightly dramatic. Sometimes a pink bandana or superhero cape depending on the episode. Comic relief and family pet.`,
} as const;

export interface Scene {
  start: number;
  end: number;
  description: string;
}

export interface Episode {
  title: string;
  characters: Array<keyof typeof CHARACTERS>;
  characterNotes?: Partial<Record<keyof typeof CHARACTERS, string>>;
  scenes: Scene[];
  finalFrame: string;
  emotionalFlow: string;
}

export function buildSeedancePrompt(episode: Episode): string {
  const characterBlocks = episode.characters.map((name) => {
    const note = episode.characterNotes?.[name];
    return `${name.toUpperCase()}:\n${CHARACTERS[name]}${note ? `\nEpisode-specific: ${note}` : ""}`;
  });

  const sceneBlocks = episode.scenes.map(
    (scene, index) => `SCENE ${index + 1} (${scene.start}-${scene.end} sec):\n${scene.description}`,
  );

  return [
    `TITLE:\n${episode.title}`,
    `STYLE:\nPixar-quality cinematic 3D animation, ultra expressive faces, premium family storytelling, vertical 9:16, warm evening atmosphere, soft cinematic lighting, high-quality character consistency, family-friendly, emotional ending.`,
    `IMPORTANT:\n${SEEDANCE_RULES}`,
    `CHARACTERS:\n\n${characterBlocks.join("\n\n")}`,
    sceneBlocks.join("\n\n"),
    `FINAL FRAME:\n${episode.finalFrame}`,
    `EMOTIONAL FLOW:\n${episode.emotionalFlow}`,
    `NO text.\nNO subtitles.\nNO logos.\nNO watermark.`,
  ].join("\n\n");
}

/** Reference episode from the briefing — the currently working prompt base. */
export const EPISODE_MAKEOVER: Episode = {
  title: "He Shouldn't Have Closed His Eyes 😂❤️",
  characters: ["dad", "lily"],
  characterNotes: {
    dad: "Black biker-style t-shirt, dark jeans, boots, tired from work, carrying a brown leather work bag.",
    lily: "Cute pastel yellow summer dress, small toy beauty case, toy makeup kit, toy hair styling set.",
  },
  scenes: [
    { start: 0, end: 2, description: "Dad arrives home after a long day, opens the front door, walks into the living room, drops his keys, looks exhausted, carrying his brown leather work bag." },
    { start: 2, end: 4, description: "Dad sits heavily on the couch, leans back, exhales deeply, closes his eyes, finally relaxing." },
    { start: 4, end: 5, description: "Behind the couch, Lily slowly appears. Only her curious eyes first, then her mischievous smile. She holds a toy beauty case and colorful hair clips. Dad notices nothing." },
    { start: 5, end: 8, description: "Smooth time-lapse begins. Lily quietly works with serious concentration. She adds colorful hair clips, tiny bows, playful toy makeup, glitter-like child-safe decorations. Dad keeps his eyes closed and remains unaware." },
    { start: 8, end: 10, description: "The makeover becomes more creative. Dad's hair is full of colorful clips and bows. His face has funny childlike makeup. Lily steps back proudly and admires her masterpiece." },
    { start: 10, end: 12, description: "Lily stands in front of Dad holding a small hand mirror. Dad slowly opens his eyes, looks into the mirror, and freezes in shock. His eyes go wide." },
    { start: 12, end: 14, description: "Lily's smile fades. She becomes nervous, looking down, hoping Dad likes it. Emotional pause." },
    { start: 14, end: 15, description: "Dad looks at Lily, then back at the mirror. A warm smile appears. He laughs, kneels down, and hugs Lily tightly. Lily smiles with joy. Warm golden evening light. Emotional family ending." },
  ],
  finalFrame: "Dad hugging Lily, colorful clips still visible, Lily proud and happy, cozy living room background.",
  emotionalFlow: "Exhaustion → Curiosity → Comedy → Surprise → Emotional tension → Love.",
};

/** Character sheet prompt for ChatGPT Image Generation (never Higgsfield). */
export function buildCharacterSheetPrompt(
  characterName: string,
  characterDetails: string,
  episodeContext: string,
): string {
  return `Create a professional Pixar-quality 3D animated character sheet for ${characterName}, clean layout, warm beige background, multiple views including front, side, back, facial expressions, outfit details, color palette, props, and small action poses related to the episode.

Style: premium animated feature film character design, highly expressive face, soft cinematic lighting, polished production-ready reference sheet.

Character details:
${characterDetails}

Episode context:
${episodeContext}

Important:
Keep the character consistent.
No extra duplicate characters in the same panel unless clearly separated as reference poses.
Family-friendly.
No text errors where possible.`;
}
