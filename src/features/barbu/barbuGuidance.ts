import { barbuTrickPoints, isBarbuTrickContract } from "../../domain/barbuRules";
import { trickWinner } from "../../domain/trickTakingRules";
import type { BarbuLearningPosition, dominoLearningPosition } from "../../domain/barbuLearning";
import type { FullHandContract, Suit } from "../../domain/types";
import { formatCardLabel } from "../../presentation/cardDisplay";
import { scoreSeatLabel } from "../../presentation/scorePresentation";

export const barbuContractGoals: Partial<Record<FullHandContract, string>> = {
  "No Hearts": "Avoid hearts: each costs 2 points, except the ace, which costs 6.",
  "No Queens": "Avoid taking queens. Each queen costs 6 points.",
  "King of Hearts": "Avoid capturing the king of hearts: it costs 20 points.",
  "No Last Two": "Avoid trick 12 (10 points) and trick 13 (20 points). Earlier tricks score nothing.",
  "No Tricks": "Avoid every trick. Each trick you win costs 2 points.",
  "Hearts Trumps": "Win tricks for 5 points each. Hearts are trumps, not penalties.",
  Domino: "Empty your hand by opening suits with sevens and building outwards. Finishing order scores +45, +20, +5, then -5."
};
const suitName = (suit: Suit) => ({ C: "clubs", D: "diamonds", H: "hearts", S: "spades" })[suit];

export function barbuGuidance(position: BarbuLearningPosition) {
  const { contract, currentTrick: trick, playerHand: hand, trickNumber } = position;
  const led = trick[0]?.card.suit;
  const follows = led && hand.some(card => card.suit === led);
  const winner = trickWinner(trick, contract === "Hearts Trumps" ? "H" : null);
  const rule = !led ? "You lead. Choose any card; the winner leads the next trick."
    : follows ? `You must follow ${suitName(led)}.` : `You have no ${suitName(led)}. You may play any card.`;
  const tip = contract === "Hearts Trumps"
    ? follows ? "Try to win within the led suit. You may not trump while you can follow suit."
      : "A heart beats plain suits; if a heart is already winning, you need a higher heart. Save trumps when they cannot win."
    : contract === "No Last Two" && trickNumber < 12
      ? "These early tricks cost nothing. Look for chances to shed high cards and keep low exits for the last two tricks."
      : !led ? "Consider a low lead. High cards risk taking control before other players can discard penalties."
      : follows ? "Consider playing below the current winner. A forced winning card is legal even when it costs points."
      : "You cannot win off suit without trumps. Consider discarding a dangerous card while someone else wins.";
  return { rule: `${barbuContractGoals[contract]} ${rule}`, tip: `${tip}${winner ? ` ${scoreSeatLabel(winner.seat)} currently leads with ${formatCardLabel(winner.card)}${trick.length < 3 ? "; players still to act can change that" : ""}.` : ""}` };
}

export function barbuGuidedReview(position: BarbuLearningPosition, number: number) {
  const trick = position.completedTricks[number - 1];
  if (!trick || !isBarbuTrickContract(position.contract)) return null;
  const winner = trickWinner(trick.cards, position.contract === "Hearts Trumps" ? "H" : null)!;
  const points = barbuTrickPoints(position.contract, trick.cards, number);
  const trumped = position.contract === "Hearts Trumps" && winner.card.suit === "H";
  const player = trick.cards.find(play => play.seat === "You")!.card;
  const led = trick.cards[0];
  return { winning: `${scoreSeatLabel(winner.seat)} ${winner.seat === "You" ? "win" : "wins"} with ${formatCardLabel(winner.card)}, the highest ${trumped ? "trump" : `card of the led suit (${suitName(led.card.suit)})`}.`,
    scoring: `${points} ${position.contract === "Hearts Trumps" ? "reward" : "penalty"} points${points ? ` for ${scoreSeatLabel(winner.seat)}` : " in this trick"}.`,
    choice: `You ${led.seat === "You" ? "led" : player.suit === led.card.suit ? "followed suit with" : "were void and played"} ${formatCardLabel(player)}.`,
    next: number === 13 ? "All 13 tricks are complete." : `${scoreSeatLabel(winner.seat)} ${winner.seat === "You" ? "lead" : "leads"} next.` };
}

export function dominoGuidance(position: ReturnType<typeof dominoLearningPosition>) {
  const { playerHand, legalCardIds, startRank = "7" } = position;
  return { rule: `Open each suit with ${startRank}; extend either end by one rank without leaving gaps. Pass only when no card fits.`,
    tip: !playerHand.length ? "You are out. Pass to let the remaining players finish; your place is already fixed."
      : !legalCardIds.length ? "No card in your hand fits yet. Pass and watch which ends become available."
      : "Consider a placement that opens a route to other cards in your hand. You cannot see what the other players hold." };
}
