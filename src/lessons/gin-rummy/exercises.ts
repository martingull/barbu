import { standardDeck } from "../../domain/deck";
import { bestMeldLayout } from "../../domain/rummyMelds";
import type { Card } from "../../domain/types";

export const ginCards = (ids: string) => ids.split(" ").map(id => {
  const card = standardDeck().find(card => card.id === id);
  if (!card) throw Error(`Unknown Gin example card: ${id}`);
  return card;
});
export type GinExerciseStep = { title: string; hand: Card[]; upcard?: Card; hint?: string; options?: string[] };
export const ginExercises: Record<string, GinExerciseStep[]> = {
  melds: [
    { title: "Keep your three combinations", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH 2D KS") },
    { title: "An ace starts a run", hand: ginCards("AC 2C 3C 5D 5H 5S 9D 10D JD 4S QH") },
    { title: "Leave one point unmatched", hand: ginCards("8S 9S 10S 4C 4D 4H 6H 7H 8H AD QC") }
  ],
  deadwood: [
    { title: "Count unmatched cards", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH 2D"), options: ["2", "9", "23"],
      hint: "3C-4C-5C, the three sevens and 9H-10H-JH are melds: zero points. Only 2D remains, worth 2." },
    { title: "Count a picture card", hand: ginCards("AC 2C 3C 5D 5H 5S 9D 10D JD QH"), options: ["0", "10", "12"],
      hint: "Set aside each complete meld. A queen counts 10, not 12." },
    { title: "Count this hand", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H 2D KS"), options: ["12", "21", "31"] }
  ],
  draw: [
    { title: "Complete a club run", hand: ginCards("3C 4C 7D 7H 7S 9H 10H JH 2D KS"), upcard: ginCards("5C")[0] },
    { title: "An unhelpful queen", hand: ginCards("AC 2C 3C 5D 5H 5S 9D 10D JD 4S"), upcard: ginCards("QC")[0] },
    { title: "Extend your hearts", hand: ginCards("2S 3S 4S 6C 6D 6H 8H 9H AD QS"), upcard: ginCards("10H")[0] }
  ],
  knock: [
    { title: "Can you end the hand?", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH 2D"),
      hint: "Only 2D is unmatched. Two points is within the knock limit of 10, but is not zero." },
    { title: "Check the limit", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H 2D KS"),
      hint: "Two consecutive hearts are not a run. Count them as well as the other unmatched cards." },
    { title: "Your finishing decision", hand: ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH KD") }
  ],
  gin: [
    { title: "Your final discard", hand: ginCards("3C 4C 5C 6C 7D 7H 7S 9H 10H JH KS"),
      hint: "The four clubs are a run, the sevens are a set, and the three hearts are a run. Discard KS to leave zero unmatched points." },
    { title: "Keep all three melds", hand: ginCards("8S 9S 10S JS 4C 4D 4H 6H 7H 8H AD"),
      hint: "A run can contain four cards. Keep complete combinations together." },
    { title: "Find a gin finish", hand: ginCards("AC 2C 3C 4C 5D 5H 5S 9D 10D JD KH") }
  ]
};
export const ginSelectsDiscard = (action: string) => action === "melds" || action === "gin";
export function ginExerciseChoices(action: string, step: GinExerciseStep) {
  if (ginSelectsDiscard(action)) return step.hand.map(card => ({ id: card.id, label: card.label }));
  if (action === "deadwood") return (step.options ?? []).map(id => ({ id, label: `${id} points` }));
  return action === "draw" ? [{ id: "stock", label: "Draw stock" }, { id: "upcard", label: "Take upcard" }]
    : [{ id: "continue", label: "Keep playing" }, { id: "knock", label: "Knock" }, { id: "gin", label: "Go gin" }];
}
export const ginExercisePrompts: Record<string, string> = {
  melds: "Choose a discard that leaves the fewest deadwood points.",
  deadwood: "These are your ten cards. How many points are outside complete sets and runs?",
  draw: "Would this upcard improve your hand? Choose where to draw.",
  knock: "These ten cards remain after your proposed discard. Which finish is available? Choose Keep playing if neither is allowed.",
  gin: "You have eleven cards. Which discard leaves ten cards in complete melds, allowing you to go gin?"
};
export function ginExerciseAnswer(action: string, step: GinExerciseStep, selected: string): { good: boolean; illegal?: boolean; text: string } {
  const current = bestMeldLayout(step.hand);
  if (action === "deadwood") return { good: selected === String(current.points),
    text: `The unmatched cards total ${current.points} points. Complete sets and runs count zero; aces count 1, number cards their value, and pictures 10.` };
  if (action === "gin") {
    const points = bestMeldLayout(step.hand.filter(card => card.id !== selected)).points;
    return { good: points === 0, text: points === 0
      ? "Every remaining card belongs to a meld: zero deadwood. This discard lets you go gin. Gin adds 20 points to Barbu's deadwood, with no layoffs."
      : `This discard leaves ${points} unmatched points, so it is not gin. Keep the complete melds and discard the card outside them.` };
  }
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
    : current.points <= 10 ? `${current.points} points: you may knock, but not go gin. Continuing is legal too; this question asks which finish is available. A knock is not a guaranteed win.`
      : `${current.points} deadwood points is above the knock limit of 10. Keep playing.` };
}
