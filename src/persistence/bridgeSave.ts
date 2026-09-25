import type { BridgeAuctionCall, BridgeContractState, BridgeVulnerability } from "../domain/types";
import { bridgeAuctionStatus, bridgeFinalizeContract, bridgeLegalCallOptions, normalizeBridgeCall } from "../domain/bridgeAuction";
import type { BridgeSession } from "../domain/bridgeSession";
import type { BridgeHandResult } from "../domain/bridgeScoring";
import { hydrateFullHandState } from "../domain/trickTakingHand";
import { trickTakingSeats as seats } from "../domain/trickTakingScore";
import { createSaveStore, type SaveStorage } from "./saveStore";
import { isSavedTrickHand, natural, normalizedReviewCount, record, seat } from "./handSaveValidation";

export const bridgeSaveKey = "barbu.savedBridgeRun.v1";
export type SavedBridgeRun = BridgeSession & { version: 1; usingBrowserFullHand: boolean; savedAt: string };
const vulnerability = (value: unknown): value is BridgeVulnerability => ["None", "NS", "EW", "Both"].includes(String(value));

function isResult(value: unknown): value is BridgeHandResult {
  return record(value) && natural(value.handNumber) && value.handNumber > 0 && typeof value.contract === "string"
    && vulnerability(value.vulnerability) && natural(value.target) && natural(value.tricks) && natural(value.defenders)
    && Number.isSafeInteger(value.score) && typeof value.made === "boolean"
    && (value.passedOut === true
      ? value.declarer === null && value.declarerSide === null && value.score === 0 && value.target === 0 && value.tricks === 0 && value.defenders === 0
      : seat(value.declarer) && ["NS", "EW"].includes(String(value.declarerSide))
        && value.target >= 7 && value.target <= 13 && value.tricks + value.defenders === 13);
}

export function normalizeBridgeSave(value: unknown): SavedBridgeRun | null {
  if (!record(value) || value.version !== 1 || !["bridgeAuction", "fullHand"].includes(String(value.view))
    || !isSavedTrickHand(value.fullHand, "Bridge", value.view === "bridgeAuction")) return null;
  const hand = value.fullHand;
  if (!seat(hand.bridgeDealer) || !vulnerability(hand.bridgeVulnerability) || !Array.isArray(value.auctionCalls)) return null;
  const dealer = seats.indexOf(hand.bridgeDealer);
  const calls: BridgeAuctionCall[] = [];
  for (const entry of value.auctionCalls) {
    if (!record(entry) || !seat(entry.seat)) return null;
    const call = normalizeBridgeCall(entry.call);
    if (!call || !bridgeLegalCallOptions(calls, entry.seat, dealer).includes(call)) return null;
    calls.push({ seat: entry.seat, call: String(entry.call) });
  }
  const status = bridgeAuctionStatus(calls, dealer);
  let contract: BridgeContractState | null = null;
  if (value.view === "bridgeAuction") {
    if (hand.currentTrick.length || hand.completedTricks.length || hand.status !== "in_progress"
      || !status.complete && status.currentSeat !== "You") return null;
  } else {
    contract = bridgeFinalizeContract(calls, hand);
    if (!status.complete || status.passedOut || !contract || !record(hand.bridgeContract)) return null;
    for (const key of ["level", "strain", "target", "declarer", "dummy", "vulnerability"] as const) {
      if (hand.bridgeContract[key] !== contract[key]) return null;
    }
    if (Boolean(hand.bridgeContract.redoubled) !== Boolean(contract.redoubled)
      || !contract.redoubled && Boolean(hand.bridgeContract.doubled) !== Boolean(contract.doubled)) return null;
  }
  if (!Array.isArray(value.results) || !value.results.every(isResult) || !record(value.scores)
    || !Number.isSafeInteger(value.scores.ns) || !Number.isSafeInteger(value.scores.ew)) return null;
  const boardNumber = hand.bridgeBoardNumber ?? value.results.length + 1;
  if (!natural(boardNumber) || boardNumber < 1) return null;
  // Rebuild derived hands and legal choices rather than trusting stored UI caches.
  const fullHand = hydrateFullHandState({ ...JSON.parse(JSON.stringify(hand)), bridgeBoardNumber: boardNumber,
    bridgeContract: contract ?? undefined, bridgeAuction: contract ? calls : undefined,
    trumpSuit: contract ? contract.strain === "NT" ? null : contract.strain : null,
    dummySeat: contract?.dummy });
  const selected = normalizeBridgeCall(value.selectedCall);
  return { version: 1, view: value.view as BridgeSession["view"],
    scores: { ns: Number(value.scores.ns), ew: Number(value.scores.ew) }, results: value.results,
    fullHand, auctionCalls: calls, selectedCall: selected ?? "Pass",
    fullHandReviewTrickCount: value.view === "bridgeAuction" ? 0 : normalizedReviewCount(value.fullHandReviewTrickCount, fullHand),
    usingBrowserFullHand: true, savedAt: typeof value.savedAt === "string" ? value.savedAt : "" };
}

export function saveBridgeSession(session: BridgeSession, savedAt: string): SavedBridgeRun {
  return { ...session, version: 1, usingBrowserFullHand: true, savedAt };
}
export function restoreBridgeSession({ version, usingBrowserFullHand, savedAt, ...session }: SavedBridgeRun): BridgeSession {
  return session;
}
export function createBridgeSaveStore(storage: () => SaveStorage | undefined) {
  return createSaveStore(bridgeSaveKey, normalizeBridgeSave, storage);
}
