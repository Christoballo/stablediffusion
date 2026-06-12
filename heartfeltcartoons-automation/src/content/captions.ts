export type CaptionStyle = "humor" | "emotional";

const CAPTIONS: Record<CaptionStyle, string> = {
  humor: `Everything started peacefully...

Then Lily had her own plans. 😂❤️

Parents... you know exactly how this ends.

Follow for more adventures with Lily, Dad, Mom and Casanova.`,

  emotional: `Sometimes the funniest little moments become the memories we keep forever. ❤️🥹

Lily only wanted to make Dad smile.

Follow HeartfeltCartoons for more emotional family stories.`,
};

export function getCaption(style: CaptionStyle): string {
  return CAPTIONS[style];
}

export function allCaptions(): Record<CaptionStyle, string> {
  return { ...CAPTIONS };
}
