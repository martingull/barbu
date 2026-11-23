import { euchreEffectiveSuit, euchreSide, isLeftBower, legalEuchreCards, type EuchreSeat } from "../../domain/euchreRules";
import type { EuchreHand } from "../../domain/euchreSession";
import { formatCardLabel, suitSymbol } from "../../presentation/cardDisplay";
import { euchreSeatNames, euchreSuitNames } from "../../presentation/euchreDisplay";
import { trickTakingSeats } from "../../domain/trickTakingScore";
export { compareEuchreCards, euchreSeatNames, euchreSuitNames } from "../../presentation/euchreDisplay";
export function euchreRole(hand: EuchreHand, seat: EuchreSeat): string {
  if (hand.inactiveSeat === seat) return "Sits out";
  if (!hand.contract) return seat === hand.dealer ? "Dealer" : seat % 2 === 0 ? "Your side" : "Opponents";
  return hand.contract.maker === seat ? hand.contract.alone ? "Caller, alone" : "Caller"
    : euchreSide(hand.contract.maker) === euchreSide(seat) ? "Makers" : "Defenders";
}

export function euchreTrickFeedback(hand: EuchreHand): string {
  const trick = hand.completedTricks.at(-1);
  if (!trick || !hand.contract) return "";
  const trump = hand.contract.trump;
  const winner = trick.cards.find(play => play.seat === trick.winner)!;
  const led = euchreEffectiveSuit(trick.cards[0].card, trump);
  const cut = euchreEffectiveSuit(winner.card, trump) === trump && led !== trump;
  const makerTricks = hand.completedTricks.filter(trick => euchreSide(trick.winner) === euchreSide(hand.contract!.maker)).length;
  return `${euchreSeatNames[trick.winner]} wins with ${formatCardLabel(winner.card)}${isLeftBower(winner.card, trump) ? " (left bower)" : ""}: ${cut ? "trump beats the led suit" : `highest ${euchreSuitNames[led].toLowerCase()} in this trick`}. Makers have ${makerTricks} of their 3 required tricks.`;
}
export function euchreRecap(hand: EuchreHand) {
  const firstTrump = hand.completedTricks.findIndex(trick => trick.cards.some(play => euchreEffectiveSuit(play.card, hand.contract!.trump) === hand.contract!.trump));
  const indexes = new Set([0, firstTrump, hand.completedTricks.length - 1]);
  return hand.completedTricks.flatMap((trick, index) => indexes.has(index) ? [{ number: index + 1,
    title: index === 0 ? "Opening trick" : index === hand.completedTricks.length - 1 ? "Final trick" : "Trump in play",
    summary: `${euchreSeatNames[trick.winner]} took the trick.`, explanation: euchreTrickFeedback({ ...hand, completedTricks: hand.completedTricks.slice(0, index + 1) }),
    cards: trick.cards.map(play => ({ seat: trickTakingSeats[play.seat], card: play.card })) }] : []);
}
export function euchreTurnPrompt(hand: EuchreHand): string {
  if (hand.phase === "calling") return hand.round === 1
    ? `Order up ${formatCardLabel(hand.upcard)} to make ${euchreSuitNames[hand.upcard.suit].toLowerCase()} trump, or pass. Your side must win three tricks if you call.`
    : `${euchreSuitNames[hand.upcard.suit]} were turned down. Choose another trump suit or pass.`;
  if (hand.phase === "discard") return `You picked up ${formatCardLabel(hand.upcard)}. Choose one card to discard face down.`;
  if (hand.phase === "review") {
    const winner = hand.completedTricks.at(-1)!.winner;
    return `${euchreSeatNames[winner]} won trick ${hand.completedTricks.length} and leads next.`;
  }
  if (hand.phase === "passed_out") return "Everyone passed twice. No score; the next player deals.";
  if (hand.phase === "complete") return "All five tricks are complete.";
  if (!hand.contract) return "";
  const trump = hand.contract.trump;
  const led = hand.currentTrick[0] && euchreEffectiveSuit(hand.currentTrick[0].card, trump);
  const follows = led && legalEuchreCards(hand.hands[2], hand.currentTrick, trump).some(card => euchreEffectiveSuit(card, trump) === led);
  const bower = hand.hands[2].find(card => isLeftBower(card, trump));
  return `${led ? follows ? `Follow ${euchreSuitNames[led].toLowerCase()}.` : `You have no ${euchreSuitNames[led].toLowerCase()}; play any card.` : "Choose your opening lead."}${bower ? ` ${formatCardLabel(bower)} belongs to ${suitSymbol(trump)} as the left bower.` : ""}`;
}
