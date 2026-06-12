export type Platform = "instagram" | "tiktok" | "youtube";

const INSTAGRAM_TIKTOK =
  "#heartfeltcartoons #family #dadlife #girldad #parenting #funnyfamily #familylove #daughterlove #wholesome #emotional #cute #animation #3danimation #storytelling #viralreels #fyp";

const YOUTUBE_SHORTS =
  "#shorts #heartfeltcartoons #family #dadlife #girldad #parenting #funnyfamily #familylove #3danimation #viralshorts";

export const YOUTUBE_TAGS = [
  "heartfelt cartoons", "heartfeltcartoons", "lily and dad", "dad and daughter", "girl dad",
  "family animation", "family shorts", "funny family", "parenting", "parent life",
  "funny parenting", "family comedy", "relatable parents", "cute daughter", "father daughter",
  "family moments", "wholesome content", "emotional animation", "pixar style", "3d animation",
  "viral shorts", "youtube shorts", "family friendly", "dad life", "parenting humor", "shorts",
];

export function getHashtags(platform: Platform): string {
  return platform === "youtube" ? YOUTUBE_SHORTS : INSTAGRAM_TIKTOK;
}
