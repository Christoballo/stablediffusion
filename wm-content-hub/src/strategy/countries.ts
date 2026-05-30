// Real-country visual data. National FLAGS are in the public domain, so we can
// depict them freely — this is the legal, ToS-safe way to make content feel
// authentically tied to the real nations without touching FIFA marks, federation
// crests or player likenesses.
//
// Each entry carries an accurate flag description (for image generation), the
// national color palette, and the flag emoji (for captions). Unknown teams fall
// back to a generic descriptor derived from the name, so the hub never breaks on
// a team it hasn't seen.

export interface Country {
  name: string;
  flagEmoji: string;
  colors: string[];
  /** Accurate, generation-ready description of the national flag. */
  flag: string;
}

const TABLE: Record<string, Country> = {
  mexico: { name: "Mexico", flagEmoji: "🇲🇽", colors: ["green", "white", "red"], flag: "the national flag of Mexico: a vertical green-white-red tricolor with the central eagle-and-serpent coat of arms" },
  "south africa": { name: "South Africa", flagEmoji: "🇿🇦", colors: ["green", "gold", "red", "blue", "black", "white"], flag: "the national flag of South Africa: a green horizontal Y-shape splitting red and blue bands, with a black triangle, gold and white fimbriations" },
  usa: { name: "USA", flagEmoji: "🇺🇸", colors: ["red", "white", "blue"], flag: "the national flag of the United States: red and white stripes with a blue canton of white stars" },
  "united states": { name: "USA", flagEmoji: "🇺🇸", colors: ["red", "white", "blue"], flag: "the national flag of the United States: red and white stripes with a blue canton of white stars" },
  canada: { name: "Canada", flagEmoji: "🇨🇦", colors: ["red", "white"], flag: "the national flag of Canada: red-white-red vertical bands with a central red maple leaf" },
  wales: { name: "Wales", flagEmoji: "🏴", colors: ["red", "white", "green"], flag: "the flag of Wales: a red dragon on a white-over-green field" },
  brazil: { name: "Brazil", flagEmoji: "🇧🇷", colors: ["green", "yellow", "blue"], flag: "the national flag of Brazil: a green field with a yellow rhombus and a blue celestial globe banner" },
  argentina: { name: "Argentina", flagEmoji: "🇦🇷", colors: ["light blue", "white", "gold"], flag: "the national flag of Argentina: light-blue and white horizontal bands with a golden Sun of May" },
  france: { name: "France", flagEmoji: "🇫🇷", colors: ["blue", "white", "red"], flag: "the national flag of France: a blue-white-red vertical tricolor" },
  germany: { name: "Germany", flagEmoji: "🇩🇪", colors: ["black", "red", "gold"], flag: "the national flag of Germany: black-red-gold horizontal bands" },
  spain: { name: "Spain", flagEmoji: "🇪🇸", colors: ["red", "yellow"], flag: "the national flag of Spain: red-yellow-red horizontal bands with the wide yellow center" },
  england: { name: "England", flagEmoji: "🏴", colors: ["white", "red"], flag: "the flag of England: a red St George's cross on a white field" },
  portugal: { name: "Portugal", flagEmoji: "🇵🇹", colors: ["green", "red", "gold"], flag: "the national flag of Portugal: green and red fields with the golden armillary sphere and shield" },
  netherlands: { name: "Netherlands", flagEmoji: "🇳🇱", colors: ["red", "white", "blue"], flag: "the national flag of the Netherlands: red-white-blue horizontal bands" },
  italy: { name: "Italy", flagEmoji: "🇮🇹", colors: ["green", "white", "red"], flag: "the national flag of Italy: a green-white-red vertical tricolor" },
  belgium: { name: "Belgium", flagEmoji: "🇧🇪", colors: ["black", "yellow", "red"], flag: "the national flag of Belgium: black-yellow-red vertical bands" },
  croatia: { name: "Croatia", flagEmoji: "🇭🇷", colors: ["red", "white", "blue"], flag: "the national flag of Croatia: red-white-blue horizontal bands with the checkerboard coat of arms" },
  morocco: { name: "Morocco", flagEmoji: "🇲🇦", colors: ["red", "green"], flag: "the national flag of Morocco: a red field with a green pentagram" },
  japan: { name: "Japan", flagEmoji: "🇯🇵", colors: ["white", "red"], flag: "the national flag of Japan: a red disc centered on a white field" },
  "south korea": { name: "South Korea", flagEmoji: "🇰🇷", colors: ["white", "red", "blue", "black"], flag: "the national flag of South Korea: a white field with a red-and-blue taegeuk and four black trigrams" },
  senegal: { name: "Senegal", flagEmoji: "🇸🇳", colors: ["green", "yellow", "red"], flag: "the national flag of Senegal: green-yellow-red vertical bands with a central green star" },
  nigeria: { name: "Nigeria", flagEmoji: "🇳🇬", colors: ["green", "white"], flag: "the national flag of Nigeria: green-white-green vertical bands" },
  ghana: { name: "Ghana", flagEmoji: "🇬🇭", colors: ["red", "gold", "green"], flag: "the national flag of Ghana: red-gold-green horizontal bands with a central black star" },
  uruguay: { name: "Uruguay", flagEmoji: "🇺🇾", colors: ["blue", "white", "gold"], flag: "the national flag of Uruguay: white and blue stripes with the golden Sun of May in the canton" },
  colombia: { name: "Colombia", flagEmoji: "🇨🇴", colors: ["yellow", "blue", "red"], flag: "the national flag of Colombia: a wide yellow band over blue and red bands" },
  switzerland: { name: "Switzerland", flagEmoji: "🇨🇭", colors: ["red", "white"], flag: "the national flag of Switzerland: a white cross on a red square field" },
  denmark: { name: "Denmark", flagEmoji: "🇩🇰", colors: ["red", "white"], flag: "the national flag of Denmark: a white Scandinavian cross on a red field" },
  ecuador: { name: "Ecuador", flagEmoji: "🇪🇨", colors: ["yellow", "blue", "red"], flag: "the national flag of Ecuador: a wide yellow band over blue and red with the central coat of arms" },
};

function fallback(name: string): Country {
  return {
    name,
    flagEmoji: "🏳️",
    colors: ["bold national"],
    flag: `the national flag of ${name}`,
  };
}

export function country(name: string): Country {
  if (!name) return fallback("");
  return TABLE[name.trim().toLowerCase()] ?? fallback(name);
}

/** Flag emoji for a team name (for captions). */
export function flagEmoji(name: string): string {
  return country(name).flagEmoji;
}

/** A generation-ready phrase pairing two nations' real flags + colors. */
export function matchupFlagArt(home: string, away: string): string {
  const h = country(home);
  const a = country(away);
  return (
    `prominently feature ${h.flag} and ${a.flag}, ` +
    `clashing national color palettes (${h.colors.join("/")} vs ${a.colors.join("/")}), ` +
    `flags rendered accurately and respectfully`
  );
}
