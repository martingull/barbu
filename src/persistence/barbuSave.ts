import { fullHandContracts } from "../contractRegistry";
import { barbuSessionComplete, settleBarbuSession, type BarbuHandResult, type BarbuSession } from "../domain/barbuSession";
import { trickTakingSeats } from "../domain/trickTakingScore";
import { normalizeBarbuHand } from "./barbuHandSave";
import { normalizeDominoHand } from "./dominoSave";
import { natural, normalizedReviewCount, record } from "./handSaveValidation";
import { createSaveStore, type SaveStorage } from "./saveStore";

export const barbuSaveKey = "barbu.savedPlayRun.v1";
export type SavedPlayBarbuRun = BarbuSession & { version: 1; usingBrowserFullHand: boolean; usingBrowserDomino: boolean; savedAt: string };
function isResult(value: unknown): value is BarbuHandResult {
  if (!record(value) || !record(value.seatPenalties)) return false;
  const scores = value.seatPenalties;
  return fullHandContracts.includes(value.contract as BarbuHandResult["contract"])
    && trickTakingSeats.every(seat => Number.isSafeInteger(scores[seat]))
    && value.playerPenalty === scores.You
    && value.totalPenalty === trickTakingSeats.reduce((sum, seat) => sum + Number(scores[seat]), 0);
}

export function normalizeBarbuSave(value: unknown): SavedPlayBarbuRun | null {
  if (!record(value) || value.version !== 1 || !fullHandContracts.includes(value.pendingContract as BarbuSession["pendingContract"])
    || !Array.isArray(value.results) || !value.results.every(isResult)
    || new Set(value.results.map(result => result.contract)).size !== value.results.length) return null;
  const view = value.view === "fullHand" || value.view === "dominoHand" ? value.view : "runContractIntro";
  const fullHand = view === "fullHand" ? normalizeBarbuHand(value.fullHand) : null;
  const dominoHand = view === "dominoHand" ? normalizeDominoHand(value.dominoHand) : null;
  if (view === "fullHand" && (!fullHand || fullHand.contract !== value.pendingContract)
    || view === "dominoHand" && (!dominoHand || value.pendingContract !== "Domino")) return null;
  const activeHand = fullHand ?? dominoHand;
  if (value.results.some(result => result.contract === value.pendingContract) && activeHand?.status !== "complete") return null;
  const session = settleBarbuSession({ seed: natural(value.seed) && value.seed > 0 ? value.seed : 1, view,
    pendingContract: value.pendingContract as BarbuSession["pendingContract"],
    results: JSON.parse(JSON.stringify(value.results)), fullHand, dominoHand,
    fullHandReviewTrickCount: fullHand ? normalizedReviewCount(value.fullHandReviewTrickCount, fullHand) : 0 });
  return { ...session, version: 1, usingBrowserFullHand: true, usingBrowserDomino: true,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : "" };
}

export function saveBarbuSession(session: BarbuSession, savedAt: string): SavedPlayBarbuRun | null {
  return barbuSessionComplete(session) ? null : { ...session, version: 1, usingBrowserFullHand: true, usingBrowserDomino: true, savedAt };
}
export function restoreBarbuSession({ version, usingBrowserFullHand, usingBrowserDomino, savedAt, ...session }: SavedPlayBarbuRun): BarbuSession {
  return session;
}
export function savedPlayBarbuRunSummary(saved: SavedPlayBarbuRun) {
  if (saved.fullHand) return `${saved.fullHand.contract}, trick ${saved.fullHand.trickNumber}`;
  if (saved.dominoHand) return `Domino, ${saved.dominoHand.cardsRemaining} cards left`;
  return `${saved.pendingContract}, ${saved.results.length} played`;
}
export function createBarbuSaveStore(storage: () => SaveStorage | undefined) {
  return createSaveStore(barbuSaveKey, normalizeBarbuSave, storage);
}
