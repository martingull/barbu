import type { FullHandState } from "../lessonTypes";
import { isBarbuTrickContract } from "../domain/barbuRules";
import { hydrateFullHandState } from "../domain/trickTakingHand";
import { trickWinner } from "../domain/trickTakingRules";
import { isSavedTrickHand, record } from "./handSaveValidation";

// The seven-contract run still includes native Domino; this boundary migrates its trick hands only.
export function normalizeBarbuHand(value: unknown): FullHandState | null {
  if (!record(value) || !isBarbuTrickContract(value.contract) || !isSavedTrickHand(value, value.contract)) return null;
  const trump = value.contract === "Hearts Trumps" ? "H" : undefined;
  if (value.completedTricks.some(trick => trickWinner(trick.cards, trump)?.seat !== trick.winner)) return null;
  return hydrateFullHandState(JSON.parse(JSON.stringify(value)));
}
