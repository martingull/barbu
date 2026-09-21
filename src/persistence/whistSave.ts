import type { Card, FullHandState, TableCard } from "../lessonTypes";
import { hydrateFullHandState } from "../domain/trickTakingHand";
import { whistSessionComplete, whistSessionSettlement, type WhistHandResult, type WhistSession } from "../domain/whistSession";

export const whistSaveKey = "barbu.savedWhistRun.v1";
export type SavedWhistRun = WhistSession & { version: 1; usingBrowserFullHand: boolean; savedAt: string };
type SaveStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const seats = ["Tutor", "Right", "You", "Left"];
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const natural = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const suit = (value: unknown) => ["C", "D", "H", "S"].includes(String(value));
const score = (value: unknown) => ({
  playerSide: record(value) && natural(value.playerSide) ? value.playerSide : 0,
  opponentSide: record(value) && natural(value.opponentSide) ? value.opponentSide : 0
});
const card = (value: unknown): value is Card => record(value) && typeof value.id === "string"
  && /^(?:[2-9]|10|J|Q|K|A)[CDHS]$/.test(value.id)
  && value.id === `${value.rank}${value.suit}` && typeof value.label === "string";
const play = (value: unknown): value is TableCard => record(value) && seats.includes(String(value.seat)) && card(value.card);

function isWhistHand(value: unknown): value is FullHandState {
  if (!record(value) || value.contract !== "Whist" || typeof value.id !== "string"
    || !natural(value.currentPlayerIndex) || value.currentPlayerIndex > 3
    || !["in_progress", "complete"].includes(String(value.status))
    || !Array.isArray(value.hands) || value.hands.length !== 4
    || !value.hands.every(hand => Array.isArray(hand) && hand.length <= 13 && hand.every(card))
    || !Array.isArray(value.currentTrick) || value.currentTrick.length > 3 || !value.currentTrick.every(play)
    || !Array.isArray(value.completedTricks) || value.completedTricks.length > 13
    || !value.completedTricks.every(trick => record(trick) && Array.isArray(trick.cards)
      && trick.cards.length === 4 && trick.cards.every(play) && natural(trick.winnerIndex) && trick.winnerIndex < 4
      && trick.winner === seats[trick.winnerIndex] && trick.penalty === 1)
    || (value.whistDealer !== undefined && (!natural(value.whistDealer) || value.whistDealer > 3))
    || (value.whistTurnedTrump !== undefined && !card(value.whistTurnedTrump))
    || (value.trumpSuit !== undefined && !suit(value.trumpSuit))) return false;
  const played: TableCard[] = [...value.currentTrick, ...value.completedTricks.flatMap(trick => trick.cards)];
  const cards: Card[] = [...value.hands.flat(), ...played.map(item => item.card)];
  if (cards.length !== 52 || new Set(cards.map(item => item.id)).size !== 52) return false;
  if (!value.hands.every((hand, index) => hand.length + played.filter(item => item.seat === seats[index]).length === 13)) return false;
  return value.status === "complete"
    ? value.completedTricks.length === 13 && value.currentTrick.length === 0
    : value.completedTricks.length < 13 && value.currentPlayerIndex === 2 && value.hands[2].length > 0;
}

function isResult(value: unknown): value is WhistHandResult {
  return record(value) && natural(value.handNumber) && value.handNumber > 0 && suit(value.trumpSuit)
    && natural(value.playerSideOddTricks) && value.playerSideOddTricks <= 7
    && natural(value.opponentSideOddTricks) && value.opponentSideOddTricks <= 7;
}

export function normalizeWhistSave(value: unknown): SavedWhistRun | null {
  if (!record(value) || value.version !== 1 || !isWhistHand(value.fullHand)) return null;
  // Recompute derived hand fields rather than trusting stale legal-card or count caches.
  const fullHand = hydrateFullHandState(structuredClone(value.fullHand));
  const review = value.fullHandReviewTrickCount;
  return { version: 1, mode: value.mode === "rubber" ? "rubber" : "game",
    scores: score(value.scores), games: score(value.games),
    results: Array.isArray(value.results) ? value.results.filter(isResult) : [],
    fullHand, fullHandReviewTrickCount: natural(review) && review === fullHand.completedTricks.length ? review : 0,
    usingBrowserFullHand: true, savedAt: typeof value.savedAt === "string" ? value.savedAt : "" };
}

export function saveWhistSession(session: WhistSession, savedAt: string): SavedWhistRun | null {
  return whistSessionComplete(session) ? null : { ...session, version: 1, usingBrowserFullHand: true, savedAt };
}

export function restoreWhistSession({ version, usingBrowserFullHand, savedAt, ...session }: SavedWhistRun): WhistSession {
  return session;
}

export function savedWhistRunSummary(saved: SavedWhistRun) {
  const points = whistSessionSettlement(saved).points;
  const format = saved.mode === "rubber" ? `Rubber, games ${saved.games.playerSide}-${saved.games.opponentSide}. ` : "";
  const hand = saved.results.length + 1;
  const progress = saved.fullHand.status === "complete" ? `Hand ${hand} complete` : `Hand ${hand}, trick ${saved.fullHand.trickNumber}`;
  return `${format}${progress}, game ${points.playerSide} - ${points.opponentSide}`;
}

export function createWhistSaveStore(storage: () => SaveStorage | undefined) {
  return {
    load(): SavedWhistRun | null {
      try { return normalizeWhistSave(JSON.parse(storage()?.getItem(whistSaveKey) ?? "null")); }
      catch { return null; }
    },
    write(saved: SavedWhistRun | null) {
      const target = storage();
      if (saved) target?.setItem(whistSaveKey, JSON.stringify(saved));
      else target?.removeItem(whistSaveKey);
    }
  };
}
