import barbuLogo from "../../src-tauri/icons/128x128@2x.png";

export const learningCharacters = {
  barbu: { name: "Barbu", role: "King of Hearts", portrait: barbuLogo, accent: "#e7c766" },
  queen: { name: "Queen of Spades", role: "Your Hearts guide", portrait: "/characters/queen-of-spades.png", accent: "#e6a4ae" },
  jack: { name: "Jack of Clubs", role: "Your card-skills guide", portrait: "/characters/jack-of-clubs.png", accent: "#8ccfca" },
} as const;

export type LearningCharacterId = keyof typeof learningCharacters;

export function learningGuide(game: string): LearningCharacterId {
  return game === "hearts" ? "queen" : game === "card-counting" ? "jack" : "barbu";
}
