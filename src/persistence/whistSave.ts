import type { FullHandState } from "../domain/types";
import { hydrateFullHandState } from "../domain/trickTakingHand";
import { whistSessionComplete, whistSessionSettlement, type WhistHandResult, type WhistSession } from "../domain/whistSession";
import { createSaveStore, type SaveStorage } from "./saveStore";
import { card, isSavedTrickHand, natural, normalizedReviewCount, record, suit } from "./handSaveValidation";

export const whistSaveKey = "barbu.savedWhistRun.v1";
export type SavedWhistRun = WhistSession & { version: 1; usingBrowserFullHand: boolean; savedAt: string };
const score = (value: unknown) => ({
  playerSide: record(value) && natural(value.playerSide) ? value.playerSide : 0,
  opponentSide: record(value) && natural(value.opponentSide) ? value.opponentSide : 0
});
function isWhistHand(value: unknown): value is FullHandState {
  return isSavedTrickHand(value, "Whist")
    && (value.whistDealer === undefined || natural(value.whistDealer) && value.whistDealer < 4)
    && (value.whistTurnedTrump === undefined || card(value.whistTurnedTrump))
    && (value.trumpSuit === undefined || suit(value.trumpSuit));
}

function isResult(value: unknown): value is WhistHandResult {
  return record(value) && natural(value.handNumber) && value.handNumber > 0 && suit(value.trumpSuit)
    && natural(value.playerSideOddTricks) && value.playerSideOddTricks <= 7
    && natural(value.opponentSideOddTricks) && value.opponentSideOddTricks <= 7;
}

export function normalizeWhistSave(value: unknown): SavedWhistRun | null {
  if (!record(value) || value.version !== 1 || !isWhistHand(value.fullHand)) return null;
  // Recompute derived hand fields rather than trusting stale legal-card or count caches.
  const fullHand = hydrateFullHandState(JSON.parse(JSON.stringify(value.fullHand)));
  return { version: 1, mode: value.mode === "rubber" ? "rubber" : "game",
    scores: score(value.scores), games: score(value.games),
    results: Array.isArray(value.results) ? value.results.filter(isResult) : [],
    fullHand, fullHandReviewTrickCount: normalizedReviewCount(value.fullHandReviewTrickCount, fullHand),
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
  return createSaveStore(whistSaveKey, normalizeWhistSave, storage);
}
