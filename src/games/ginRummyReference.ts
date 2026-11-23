import type { GameReference } from "./referenceCatalog";

export const ginRummyReference: GameReference = {
  id: "gin-rummy", title: "Gin Rummy", family: "Rummy", baseline: "Classic Gin Rummy: Parlett family framework; Pagat playing rules",
  baselineLabel: "Classic / American scoring",
  overview: "A two-player draw-and-discard game. Keep your combinations private until you knock or go gin.",
  sections: [
    { id: "object", title: "Object and cards", body: "One 52-card pack, ten cards each. Make sets of three or four equal ranks, or runs of at least three in one suit. Aces are low. Unmatched cards are deadwood: ace 1, pictures 10, other cards their number." },
    { id: "play", title: "Draw and discard", body: "Non-dealer gets first choice of the upcard, then dealer. If both pass, non-dealer draws stock. On later turns draw stock or upcard, then discard. You cannot immediately return a taken upcard." },
    { id: "score", title: "Knock, gin and layoffs", body: "Knock after discarding with at most 10 deadwood. The opponent melds and may extend your melds. If the defender has more deadwood, the knocker scores the difference. Equal or lower defending deadwood undercuts: the defender scores the difference plus the undercut bonus. Gin has zero deadwood, earns the gin bonus plus the opponent's deadwood, and forbids layoffs." },
    { id: "profiles", title: "Agree the scoring", body: "Choose before starting: Classic 20/10 adds 20 for gin, 10 for an undercut and 20 per hand won at game end. American 25/25 adds 25 for gin, 25 for an undercut and 25 per hand won at game end. Neither name is a universal club standard; agree the bonuses with your group." },
    { id: "end", title: "Deal and game end", body: "At two stock cards, a discard without knocking ends the deal without scoring. Same dealer redeals; otherwise the hand winner deals. First to 100 hand points wins in both scoring profiles. Box bonuses do not advance that target. After the game, add the selected box bonus per hand won to each player and 100 to the game winner, or 200 if the loser scored nothing. Saved games keep their original scoring profile." },
    { id: "meld-arrangement", title: "Arranging melds", body: "Melds and layoffs are arranged automatically to leave the fewest deadwood points. You choose where to draw, which card to discard, and when to knock or go gin." }
  ],
  contracts: [],
  variants: [{ id: "other-tables", title: "Other tables", note: "Both scoring profiles keep the same ten-point knock limit and draw/discard rules. Oklahoma Gin, Big Gin, partnership Gin and Hollywood scoring are not implemented." }]
};
