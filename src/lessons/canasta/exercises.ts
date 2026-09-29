import { canastaDeck } from "../../domain/canastaRules";
import { createCanastaSession, transitionCanastaSession, type CanastaAction, type CanastaSession } from "../../domain/canastaSession";

export function canastaCards(ids: string) {
  const deck = canastaDeck(0);
  return ids.split(" ").map(id => {
    const card = deck.find(card => card.id === id);
    if (!card) throw Error(`Unknown Canasta card: ${id}`);
    return card;
  });
}
export type CanastaExercise = { title: string; prompt: string; session: CanastaSession; action?: CanastaAction; explanation: string };
function position(ids: string, opened = true, phase: "draw" | "play" = "play") {
  const session = createCanastaSession(3);
  session.hand.hands[0] = canastaCards(ids); session.hand.sides[0].opened = opened; session.hand.phase = phase;
  session.hand.discards = canastaCards("1-KD");
  return session;
}
function meld(title: string, ids: string, rank: string, selected: string, explanation: string): CanastaExercise {
  return { title, session: position(ids), prompt: `Your team has opened. Can you meld the ${rank === "7" ? "sevens and wild" : rank + " group"}?`,
    action: { type: "meld", groups: [{ rank, cardIds: selected.split(" ") }] }, explanation };
}
function pile(title: string, ids: string, pair: string, opened: boolean, explanation: string): CanastaExercise {
  const session = position(ids, opened, "draw"); session.hand.discards = canastaCards("1-5C 1-QH");
  return { title, session, prompt: "A queen tops the discard pile. Can you take the pile with this hand?",
    action: { type: "pickup", pair: pair.split(" "), groups: [] }, explanation };
}
function finish(title: string, count: number, ids: string, explanation: string): CanastaExercise {
  const session = position(ids);
  session.hand.sides[0].melds = ["8", "9"].slice(0, count).map(rank => ({ rank, cards: canastaDeck(0).filter(card => card.rank === rank).slice(0, 7) }));
  return { title, session, prompt: `Your partnership has ${count} completed canasta${count === 1 ? "" : "s"}. Can discarding the king end the hand?`,
    action: { type: "discard", cardId: "0-KC" }, explanation };
}
export const canastaExercises: Record<string, CanastaExercise[]> = {
  melds: [
    meld("Match the rank", "0-QC 0-QD 0-QH 0-4C 0-5C", "Q", "0-QC 0-QD 0-QH", "Three natural queens make a legal meld. Two cards remain, so you can discard and continue."),
    meld("Keep sevens natural", "0-7C 0-7D 0-2C 0-4C 0-5C", "7", "0-7C 0-7D 0-2C", "Sevens cannot use wild cards. Keep this pair until another natural seven arrives."),
    meld("The rule of five", "0-QC 0-QD 0-2C 0-4C 0-5C", "Q", "0-QC 0-QD 0-2C", "After your partnership opens, you need five natural cards before adding wilds to this rank.")
  ],
  pile: [
    pile("A natural pair", "0-QC 0-QD 0-4C 0-6C", "0-QC 0-QD", true, "Two natural queens let you meld the top queen and take the rest of the pile."),
    pile("A wild is not a pair", "0-QC 0-2C 0-4C 0-6C", "0-QC 0-2C", true, "The pickup pair must be natural. A two cannot stand in for the second queen."),
    pile("Open from your hand", "0-QC 0-QD 0-4C 0-6C", "0-QC 0-QD", false, "Your team has not opened. The matching pair alone does not meet the 125-point opening requirement.")
  ],
  discard: [
    { title: "An empty pile", session: { ...position("0-AC 0-7C 0-4C 0-2C"), hand: { ...position("0-AC 0-7C 0-4C 0-2C").hand, discards: [] } }, prompt: "The pile is empty. Choose a legal discard.", explanation: "Discard the four. Aces and sevens cannot start an empty pile while an ordinary card is available; the two is wild." },
    { title: "Keep the wild", session: position("0-JR 0-2C 0-KC"), prompt: "You are not going out. Choose a legal discard.", explanation: "The king is the only natural card. You cannot throw a wild merely to keep the king." },
    { title: "No ordinary card", session: { ...position("0-AC 0-7C 0-2C"), hand: { ...position("0-AC 0-7C 0-2C").hand, discards: [] } }, prompt: "The pile is empty, but you have only aces, sevens, and a wild. Choose a legal discard.", explanation: "Either the ace or seven is allowed when no ordinary natural discard remains. The two stays in hand." }
  ],
  finish: [
    finish("Two canastas", 2, "0-KC", "With two completed canastas and one card left, discarding goes out for a 100-point bonus."),
    finish("One is not enough", 1, "0-KC", "One canasta is not enough to go out. Keep a card to continue until your partnership completes a second."),
    finish("Cards still in hand", 2, "0-KC 0-4C", "Two canastas permit going out, but discarding the king still leaves a four. The hand continues.")
  ]
};

export function answerCanastaExercise(topic: string, step: CanastaExercise, answer: string) {
  let legal = false, ends = false;
  try {
    const next = transitionCanastaSession(step.session, topic === "discard" ? { type: "discard", cardId: answer } : step.action!);
    legal = true; ends = next.hand.phase === "complete";
  } catch { /* The lesson asks whether this exact action is permitted. */ }
  const expected = topic === "finish" ? legal && ends : legal;
  return { good: topic === "discard" ? legal : (answer === "yes") === expected,
    illegal: topic === "discard" ? !legal : answer === "yes" && !legal,
    text: step.explanation };
}
