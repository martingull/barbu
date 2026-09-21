import type { Card, DominoHandState } from "../lessonTypes";
import { dealDomino, dominoRanks, dominoSuits, compareDominoCards } from "../domain/dominoDeal";
import { hydrateDominoHand } from "../domain/dominoHand";
import { cardRank } from "../domain/trickTakingRules";
import { trickTakingSeats as seats } from "../domain/trickTakingScore";
import { card, natural, record, seat } from "./handSaveValidation";

const fourHands = (value: unknown): value is Card[][] => Array.isArray(value) && value.length === 4
  && value.every(hand => Array.isArray(hand) && hand.length <= 13 && hand.every(card));
const seatList = (value: unknown): value is DominoHandState["outOrder"] => Array.isArray(value) && value.length <= 4
  && value.every(seat) && new Set(value).size === value.length;

// Domino has lanes, not tricks; validate its state without forcing it through trick-hand validation.
export function normalizeDominoHand(value: unknown): DominoHandState | null {
  if (!record(value) || value.contract !== "Domino" || typeof value.id !== "string"
    || !fourHands(value.hands) || !fourHands(value.layout)
    || !natural(value.currentPlayerIndex) || value.currentPlayerIndex > 3
    || !seatList(value.outOrder) || !seatList(value.passedPlayers)
    || !["in_progress", "complete"].includes(String(value.status))) return null;
  const startRank = value.startRank ?? "7";
  if (typeof startRank !== "string" || !dominoRanks.includes(startRank)) return null;
  const allCards = [...value.hands.flat(), ...value.layout.flat()];
  if (allCards.length !== 52 || new Set(allCards.map(c => c.id)).size !== 52) return null;
  if (!value.layout.every((lane, i) => {
    if (!lane.length) return true;
    const ranks = lane.map(cardRank).sort((a, b) => a - b);
    return lane.every(c => c.suit === dominoSuits[i]) && lane.some(c => c.rank === startRank)
      && ranks.every((rank, index) => rank === ranks[0] + index);
  })) return null;
  const outOrder = value.outOrder;
  if (value.hands.some((hand, index) => outOrder.includes(seats[index]) !== (hand.length === 0))) return null;
  if (value.status === "complete" ? value.hands.flat().length !== 0 || value.outOrder.length !== 4
    : value.currentPlayerIndex !== 2 || value.outOrder.length === 4 || value.passedPlayers.length === 4) return null;

  let initialHands = value.initialHands;
  if (initialHands === undefined) {
    // Old layouts did not record card ownership. Their stable IDs identify the original shuffle.
    const match = /^(browser-)?domino-hand-(\d+)$/.exec(value.id);
    if (!match || !natural(Number(match[2]))) return null;
    initialHands = dealDomino(Number(match[2]), Boolean(match[1]));
  }
  if (!fourHands(initialHands) || initialHands.some(hand => hand.length !== 13)
    || new Set(initialHands.flat().map(c => c.id)).size !== 52
    || value.hands.some((hand, index) => hand.some(c => !initialHands[index].some(original => original.id === c.id)))) return null;
  const state = JSON.parse(JSON.stringify({ ...value, initialHands, startRank })) as DominoHandState;
  state.hands.forEach(hand => hand.sort(compareDominoCards));
  state.layout.forEach(lane => lane.sort(compareDominoCards));
  return hydrateDominoHand(state);
}
