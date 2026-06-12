/**
 * Content strategy: the data shows that
 * "Lily + Dad + Chaos + emotional ending" is the strongest format.
 * Solo Mom, solo Casanova, empty rooms and abstract scenes are not prioritized.
 */

export interface VideoIdea {
  priority: number;
  title: string;
  premise: string;
}

export const HIGH_PRIORITY_IDEAS: VideoIdea[] = [
  { priority: 1, title: "The Makeover", premise: "Papa kommt müde heim, Lily schminkt ihn." },
  { priority: 2, title: "The Princess Treatment", premise: "Papa will auf der Couch schlafen, Lily macht ihn zur Prinzessin." },
  { priority: 3, title: "The Meeting Takeover", premise: "Papa telefoniert wichtig, Lily übernimmt das Meeting." },
  { priority: 4, title: "Soap Chaos", premise: "Papa will Motorrad putzen, Lily macht Seifenchaos." },
  { priority: 5, title: "Doctor Lily", premise: "Papa ist krank, Lily spielt Ärztin." },
  { priority: 6, title: "Tiny Trainer", premise: "Papa macht Sport, Lily trainiert mit und übertreibt." },
  { priority: 7, title: "Rainbow Coffee", premise: "Papa will Kaffee trinken, Lily serviert eine bunte Kinder-Version." },
  { priority: 8, title: "The Missing Phone", premise: "Papa sucht sein Handy, Lily hat es als Babyphone benutzt." },
  { priority: 9, title: "Casanova In Trouble", premise: "Casanova bringt Papa in Schwierigkeiten, Lily verteidigt ihn." },
  { priority: 10, title: "The Family Photo", premise: "Mama will Familienfoto, Lily sabotiert es süß." },
];

export const SUCCESS_FORMULA = "Lily + Papa + Chaos + Herzmoment";

/**
 * Title logic: never spoil the punchline.
 * Formula: curiosity + emotional hint + emoji.
 */
export const TITLE_EXAMPLES = [
  "This Escalated Way Too Fast 😂❤️",
  "He Shouldn't Have Closed His Eyes... 😳😂",
  "Everything Was Fine Until Lily Did THIS... 😂❤️",
  "Dad Was NOT Ready For This... 😳❤️",
];

export function formatIdeas(): string {
  const lines = HIGH_PRIORITY_IDEAS.map(
    (idea) => `${String(idea.priority).padStart(2)}. ${idea.title} — ${idea.premise}`,
  );
  return [`Erfolgsformel: ${SUCCESS_FORMULA}`, "", ...lines].join("\n");
}
