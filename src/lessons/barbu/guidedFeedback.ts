import { standardDeck } from "../../domain/deck";
import { barbuTrickPoints, isBarbuTrickContract } from "../../domain/barbuRules";
import { isLegalDominoPlacement } from "../../domain/dominoRules";
import { trickWinner } from "../../domain/trickTakingRules";
import type { Card, GuidedTrick } from "../../domain/types";
import { drillDecision } from "../drillDecision";

const deck = standardDeck();
export function lessonCards(...ids: string[]): Card[] {
  return ids.map(id => {
    const card = deck.find(card => card.id === id);
    if (!card) throw Error(`Unknown lesson card: ${id}`);
    return { ...card };
  });
}

export function barbuGuidedResult(contract: string, trick: GuidedTrick, card: Card): string {
  if (!trick.legalCardIds.includes(card.id)) return `${card.id} is not legal in this position.`;
  if (contract === "Domino") {
    const lane = trick.tableBeforeChoice.filter(play => play.card.suit === card.suit).map(play => play.card);
    if (!isLegalDominoPlacement(lane, card)) return `${card.id} does not fit this layout.`;
    const suit = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" }[card.suit];
    return `You played ${card.id} and ${lane.length ? "extended" : "opened"} ${suit}.`;
  }
  if (!isBarbuTrickContract(contract)) throw Error(`Unknown lesson contract: ${contract}`);
  const plays = [...trick.tableBeforeChoice, { seat: "You" as const, card }, ...trick.tableAfterChoice];
  const winner = trickWinner(plays, contract === "Hearts Trumps" ? "H" : null)!;
  const name = { Tutor: "Barbu", Right: "Right", You: "You", Left: "Left" }[winner.seat];
  const points = barbuTrickPoints(contract, plays, trick.trickNumber ?? 1);
  const result = `${name} ${winner.seat === "You" ? "win" : "wins"} with ${winner.card.id}.`;
  return `${result} ${points === 0 ? "No penalty points in this trick." : `${points} ${contract === "Hearts Trumps" ? "reward" : "penalty"} points ${winner.seat === "You" ? "for you" : `for ${name}`}.`}`;
}

export function barbuGuidedDecision(contract: string, trick: GuidedTrick, card: Card) {
  const decision = drillDecision({ contract, title: trick.title, trick }, card);
  // A forced legal penalty is not a learner mistake, even though it still costs points.
  const forced = trick.legalCardIds.length === 1 && trick.legalCardIds[0] === card.id;
  return { ...decision, result: { ...decision.result, clean: decision.result.clean || forced } };
}
