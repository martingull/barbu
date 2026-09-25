import { standardDeck } from "../../domain/deck";
import { bestMeldLayout } from "../../domain/rummyMelds";
import type { Card } from "../../domain/types";

export const ginCards = (ids: string) => ids.split(" ").map(id => {
  const card = standardDeck().find(card => card.id === id);
  if (!card) throw Error(`Unknown Gin example card: ${id}`);
  return card;
});
export type GinExerciseStep = { title: string; hand: Card[]; upcard?: Card };
export const ginExercises: Record<string, GinExerciseStep[]> = {
  melds: [
    { title: "Keep your three combinations", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH 2D KS") },
    { title: "An ace starts a run", hand: ginCards("AC 2C 3C 5D 5H 5S 9D 10D JD 4S QH") },
    { title: "Leave one point unmatched", hand: ginCards("8S 9S 10S 4C 4D 4H 6H 7H 8H AD QC") }
  ],
  draw: [
    { title: "Complete a club run", hand: ginCards("3C 4C 7D 7H 7S 9H 10H JH 2D KS"), upcard: ginCards("5C")[0] },
    { title: "An unhelpful queen", hand: ginCards("AC 2C 3C 5D 5H 5S 9D 10D JD 4S"), upcard: ginCards("QC")[0] },
    { title: "Extend your hearts", hand: ginCards("2S 3S 4S 6C 6D 6H 8H 9H AD QS"), upcard: ginCards("10H")[0] }
  ],
  knock: [
    { title: "Two points left", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH 2D") },
    { title: "Still too much deadwood", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H 2D KS") },
    { title: "Every card belongs", hand: ginCards("3C 4C 5C 6C 7D 7H 7S 9H 10H JH") }
  ]
};
export function ginExerciseAnswer(action: string, step: GinExerciseStep, selected: string): { good: boolean; illegal?: boolean; text: string } {
  const current = bestMeldLayout(step.hand);
  if (action === "melds") {
    const minimum = Math.min(...step.hand.map(card => bestMeldLayout(step.hand.filter(c => c.id !== card.id)).points));
    const points = bestMeldLayout(step.hand.filter(card => card.id !== selected)).points;
    return { good: points === minimum, text: `That leaves ${points} deadwood points. The lowest possible total is ${minimum}; each card can belong to only one meld.` };
  }
  if (action === "draw" && step.upcard) {
    const nextHand = [...step.hand, step.upcard];
    const best = Math.min(...step.hand.map(card => bestMeldLayout(nextHand.filter(c => c.id !== card.id)).points));
    const useful = best < current.points;
    return { good: selected === (useful ? "upcard" : "stock"), text: useful
      ? `The upcard completes a combination. After a different discard, deadwood can fall from ${current.points} to ${best}.`
      : "This upcard does not reduce deadwood. An unknown stock card gives you another chance without committing to this card." };
  }
  const answer = current.points === 0 ? "gin" : current.points <= 10 ? "knock" : "continue";
  if (selected === "gin" && current.points > 0) return { good: false, illegal: true,
    text: `Gin needs zero deadwood; you still have ${current.points} points. ${current.points <= 10 ? "You may knock instead, or keep playing." : "Keep playing until you have ten or fewer."}` };
  if (selected === "knock" && current.points > 10) return { good: false, illegal: true,
    text: `${current.points} deadwood points is above the knock limit of 10. Keep playing.` };
  return { good: selected === answer, text: current.points === 0
    ? "No deadwood: go gin for 20 extra points. Barbu cannot lay off cards against a gin hand."
    : current.points <= 10 ? `${current.points} points is within the knock limit. Barbu can lay off cards and might undercut you; continuing is also allowed.`
      : `${current.points} deadwood points is above the knock limit of 10. Keep playing.` };
}
