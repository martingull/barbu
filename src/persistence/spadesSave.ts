import { hydrateFullHandState } from "../domain/trickTakingHand";
import { defaultSpadesBidState, spadesClampBid, type SpadesBidState } from "../domain/spadesBidding";
import { spadesSessionComplete, type SpadesSession } from "../domain/spadesSession";
import type { SpadesHandResult } from "../spadesScoring";
import { createSaveStore, type SaveStorage } from "./saveStore";
import { isSavedTrickHand, natural, normalizedReviewCount, record, seat } from "./handSaveValidation";

export const spadesSaveKey = "barbu.savedSpadesRun.v1";
export type SavedSpadesRun = SpadesSession & { version: 1; usingBrowserFullHand: boolean; savedAt: string };
const score = (value: unknown) => ({
  playerSide: record(value) && Number.isSafeInteger(value.playerSide) ? Number(value.playerSide) : 0,
  opponentSide: record(value) && Number.isSafeInteger(value.opponentSide) ? Number(value.opponentSide) : 0
});
function isResult(value: unknown): value is SpadesHandResult {
  return record(value) && natural(value.handNumber) && value.handNumber > 0
    && ["playerSideBid", "opponentSideBid", "playerSideTricks", "opponentSideTricks",
      "playerSideBagPenalty", "opponentSideBagPenalty"].every(key => natural(value[key]))
    && ["playerSideScore", "opponentSideScore", "playerSideBags", "opponentSideBags"].every(key => Number.isSafeInteger(value[key]))
    && Array.isArray(value.nilResults) && value.nilResults.every(result => record(result)
      && seat(result.seat) && result.bid === 0 && natural(result.tricks) && result.tricks <= 13
      && result.score === (result.tricks === 0 ? 100 : -100));
}
export function normalizeSpadesSave(value: unknown): SavedSpadesRun | null {
  if (!record(value) || value.version !== 1 || !isSavedTrickHand(value.fullHand, "Spades", !value.playStarted)) return null;
  const playStarted = Boolean(value.playStarted) || value.fullHand.completedTricks.length > 0 || value.fullHand.status === "complete";
  const bids = Object.fromEntries(Object.entries(defaultSpadesBidState).map(([seat, fallback]) =>
    [seat, spadesClampBid(record(value.bids) && typeof value.bids[seat] === "number" ? value.bids[seat] : fallback)])) as SpadesBidState;
  // Older native saves encoded the locked bids in the hand ID. The session bids are authoritative.
  const fullHand = hydrateFullHandState({ ...JSON.parse(JSON.stringify(value.fullHand)), spadesBids: playStarted ? { ...bids } : undefined });
  const bags = score(value.bags);
  if (Object.values(bags).some(value => value < 0 || value >= 10)) return null;
  return { version: 1, scores: score(value.scores), bags, bids,
    results: Array.isArray(value.results) ? value.results.filter(isResult) : [],
    fullHand, fullHandReviewTrickCount: normalizedReviewCount(value.fullHandReviewTrickCount, fullHand),
    playStarted, openingPanel: !playStarted && value.openingPanel === "bid" ? "bid" : "table",
    usingBrowserFullHand: true, savedAt: typeof value.savedAt === "string" ? value.savedAt : "" };
}
export function saveSpadesSession(session: SpadesSession, savedAt: string): SavedSpadesRun | null {
  return spadesSessionComplete(session) ? null : { ...session, version: 1, usingBrowserFullHand: true, savedAt };
}
export function restoreSpadesSession({ version, usingBrowserFullHand, savedAt, ...session }: SavedSpadesRun): SpadesSession {
  return session;
}
export function createSpadesSaveStore(storage: () => SaveStorage | undefined) {
  return createSaveStore(spadesSaveKey, normalizeSpadesSave, storage);
}
