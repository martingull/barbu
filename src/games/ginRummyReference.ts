import type { GameReference } from "./referenceCatalog";

export const ginRummyReference: GameReference = {
  id: "gin-rummy", title: "Gin Rummy", family: "Rummy", baseline: "Classic Gin Rummy: Parlett family framework; Pagat playing rules",
  baselineLabel: "Classic Gin",
  overview: "A two-player draw-and-discard game. Keep your combinations private until you knock or go gin.",
  sections: [
    { id: "object", title: "Object and cards", body: "One 52-card pack, ten cards each. Make sets of three or four equal ranks, or runs of at least three in one suit. Aces are low. Unmatched cards are deadwood: ace 1, pictures 10, other cards their number." },
    { id: "play", title: "Draw and discard", body: "Non-dealer gets first choice of the upcard, then dealer. If both pass, non-dealer draws stock. On later turns draw stock or upcard, then discard. You cannot immediately return a taken upcard." },
    { id: "score", title: "Knock, gin and layoffs", body: "Knock after discarding with at most 10 deadwood. The opponent melds and may extend your melds. Lower deadwood wins the difference; a tie or lower defending count undercuts for 10 extra. Gin has zero deadwood, earns 20 extra, and forbids layoffs." },
    { id: "end", title: "Deal and game end", body: "At two stock cards, a discard without knocking ends the deal without scoring. Same dealer redeals; otherwise the hand winner deals. First to 100 wins. Add 20 per hand won and 100 to the game winner, or 200 if the loser scored nothing." }
  ],
  contracts: [], contractRoadmap: [{ id: "classic", title: "Classic Gin", coreStatus: "Playable", appStatus: "Local opponent",
    note: "Melds and layoffs are arranged automatically to minimize deadwood. The opponent uses its own cards and public pickups, not hidden hands. Manual meld declarations and tournament variants remain future work." }],
  variants: [{ id: "other-tables", title: "Other tables", note: "25-point gin bonuses, Oklahoma Gin, Big Gin and Hollywood scoring are not used here." }]
};
