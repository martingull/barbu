import type { Card, FullHandContract, FullHandState, Seat, Suit, TableCard } from "../domain/types";
import { trickTakingSeats as seats } from "../domain/trickTakingScore";
import { barbuTrickPoints, isBarbuTrickContract } from "../domain/barbuRules";

export const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
export const natural = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
export const suit = (value: unknown): value is Suit => typeof value === "string" && ["C", "D", "H", "S"].includes(value);
export const seat = (value: unknown): value is Seat => typeof value === "string" && seats.includes(value as Seat);
export const card = (value: unknown): value is Card => record(value) && typeof value.id === "string"
  && /^(?:[2-9]|10|J|Q|K|A)[CDHS]$/.test(value.id)
  && value.id === `${value.rank}${value.suit}` && typeof value.label === "string";
const play = (value: unknown): value is TableCard => record(value) && seat(value.seat) && card(value.card);

// Standard four-seat, 52-card trick hands only; passing requires additional phase validation.
export function isSavedTrickHand(value: unknown, contract: Exclude<FullHandContract, "Domino">, bidding = false): value is FullHandState {
  if (!record(value) || value.contract !== contract || typeof value.id !== "string"
    || !natural(value.currentPlayerIndex) || value.currentPlayerIndex > 3
    || !["in_progress", "complete"].includes(String(value.status))
    || !Array.isArray(value.hands) || value.hands.length !== 4
    || !value.hands.every(hand => Array.isArray(hand) && hand.length <= 13 && hand.every(card))
    || !Array.isArray(value.currentTrick) || value.currentTrick.length > 3 || !value.currentTrick.every(play)
    || !Array.isArray(value.completedTricks) || value.completedTricks.length > 13
    || !value.completedTricks.every((trick, index) => record(trick) && Array.isArray(trick.cards)
      && trick.cards.length === 4 && trick.cards.every(play)
      && new Set(trick.cards.map(item => item.seat)).size === 4
      && natural(trick.winnerIndex) && trick.winnerIndex < 4 && trick.winner === seats[trick.winnerIndex]
      && trick.penalty === (isBarbuTrickContract(contract) ? barbuTrickPoints(contract, trick.cards, index + 1)
        : contract !== "Hearts" ? 1 : trick.cards.reduce((sum, item) =>
        sum + (item.card.suit === "H" ? 1 : item.card.id === "QS" ? 13 : 0), 0)))) return false;
  const played: TableCard[] = [...value.currentTrick, ...value.completedTricks.flatMap(trick => trick.cards)];
  const cards: Card[] = [...value.hands.flat(), ...played.map(item => item.card)];
  if (cards.length !== 52 || new Set(cards.map(item => item.id)).size !== 52) return false;
  if (new Set(value.currentTrick.map(item => item.seat)).size !== value.currentTrick.length) return false;
  if (!value.hands.every((hand, index) => hand.length + played.filter(item => item.seat === seats[index]).length === 13)) return false;
  const controlledSeat = value.currentPlayerIndex === 2 || contract === "Bridge" && value.currentPlayerIndex === 0
    && record(value.bridgeContract) && value.bridgeContract.declarer === "You" && value.bridgeContract.dummy === "Tutor";
  return value.status === "complete"
    ? value.completedTricks.length === 13 && value.currentTrick.length === 0
    : value.completedTricks.length < 13 && (controlledSeat || bidding && value.completedTricks.length === 0 && value.currentTrick.length === 0)
      && value.hands[value.currentPlayerIndex].length > 0;
}

export function normalizedReviewCount(value: unknown, hand: FullHandState) {
  return natural(value) && value === hand.completedTricks.length && hand.status !== "complete" ? value : 0;
}
