import type { FullHandState } from "../lessonTypes";
import { heartsSessionSettlement, type HeartsHandResult, type HeartsPassDirection, type HeartsSession } from "../domain/heartsSession";
import { emptySeatPenalties, trickTakingSeats, type SeatScores } from "../domain/trickTakingScore";
import { hydrateFullHandState } from "../domain/trickTakingHand";
import { isSavedTrickHand, natural, normalizedReviewCount, record, seat } from "./handSaveValidation";
import { createSaveStore, type SaveStorage } from "./saveStore";

export const heartsSaveKey = "barbu.savedHeartsRun.v1";
export type SavedHeartsRun = {
  version: 1;
  view: "heartsPass" | "fullHand";
  passDirection: HeartsPassDirection;
  scores: SeatScores;
  results: HeartsHandResult[];
  heartsPassingHand: FullHandState | null;
  fullHand: FullHandState | null;
  heartsPassSelectedCardIds: string[];
  fullHandReviewTrickCount: number;
  usingBrowserHeartsPass: boolean;
  usingBrowserFullHand: boolean;
  savedAt: string;
};

function scores(value: unknown): SeatScores {
  const result = emptySeatPenalties();
  for (const seat of trickTakingSeats) result[seat] = record(value) && natural(value[seat]) ? value[seat] : 0;
  return result;
}

export function normalizeHeartsSave(value: unknown): SavedHeartsRun | null {
  if (!record(value) || value.version !== 1 || !["heartsPass", "fullHand"].includes(String(value.view))) return null;
  const passing = value.view === "heartsPass";
  const hand = passing ? value.heartsPassingHand : value.fullHand;
  if (!isSavedTrickHand(hand, "Hearts")) return null;
  const passDirection = value.passDirection === "right" || value.passDirection === "across" || value.passDirection === "hold"
    ? value.passDirection : "left";
  if (passing && (passDirection === "hold" || hand.status !== "in_progress" || hand.completedTricks.length || hand.currentTrick.length)) return null;
  const fullHand = hydrateFullHandState(JSON.parse(JSON.stringify(hand)));
  const selected = Array.isArray(value.heartsPassSelectedCardIds)
    ? [...new Set(value.heartsPassSelectedCardIds.filter((id): id is string => typeof id === "string"
      && fullHand.hands[2].some(card => card.id === id)))].slice(0, 3) : [];
  const results = Array.isArray(value.results) ? value.results.filter(item => record(item) && natural(item.handNumber)
    && item.handNumber > 0 && record(item.seatPenalties)).map(item => ({ handNumber: item.handNumber as number,
    seatPenalties: scores(item.seatPenalties), moonShooter: seat(item.moonShooter) ? item.moonShooter : undefined })) : [];
  return { version: 1, view: passing ? "heartsPass" : "fullHand", passDirection,
    scores: scores(value.scores), results, heartsPassingHand: passing ? fullHand : null, fullHand: passing ? null : fullHand,
    heartsPassSelectedCardIds: passing ? selected : [],
    fullHandReviewTrickCount: passing ? 0 : normalizedReviewCount(value.fullHandReviewTrickCount, fullHand),
    usingBrowserHeartsPass: true, usingBrowserFullHand: true, savedAt: typeof value.savedAt === "string" ? value.savedAt : "" };
}

export function saveHeartsSession(session: HeartsSession, savedAt: string): SavedHeartsRun | null {
  if (heartsSessionSettlement(session).complete) return null;
  const passing = session.phase === "passing";
  return { version: 1, view: passing ? "heartsPass" : "fullHand", passDirection: session.passDirection,
    scores: session.scores, results: session.results, heartsPassingHand: passing ? session.fullHand : null,
    fullHand: passing ? null : session.fullHand, heartsPassSelectedCardIds: session.selectedPassCardIds,
    fullHandReviewTrickCount: session.fullHandReviewTrickCount, usingBrowserHeartsPass: true, usingBrowserFullHand: true, savedAt };
}

export function restoreHeartsSession(saved: SavedHeartsRun): HeartsSession {
  const fullHand = saved.view === "heartsPass" ? saved.heartsPassingHand : saved.fullHand;
  if (!fullHand) throw new Error("Missing Hearts hand");
  return { phase: saved.view === "heartsPass" ? "passing" : "playing", fullHand, passDirection: saved.passDirection,
    scores: saved.scores, results: saved.results, selectedPassCardIds: saved.heartsPassSelectedCardIds,
    fullHandReviewTrickCount: saved.fullHandReviewTrickCount };
}

export function savedHeartsRunSummary(saved: SavedHeartsRun) {
  const hand = saved.results.length + 1;
  if (saved.fullHand) return saved.fullHand.status === "complete" ? `Hand ${hand} complete` : `Hand ${hand}, trick ${saved.fullHand.trickNumber}`;
  return `Hand ${hand}, pass ${saved.passDirection}, ${saved.heartsPassSelectedCardIds.length} of 3 selected`;
}

export function createHeartsSaveStore(storage: () => SaveStorage | undefined) {
  return createSaveStore(heartsSaveKey, normalizeHeartsSave, storage);
}
