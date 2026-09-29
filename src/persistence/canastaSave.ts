import { createCanastaSession, transitionCanastaSession, type CanastaAction, type CanastaSession } from "../domain/canastaSession";
import { canastaRanks } from "../domain/canastaRules";
import { createSaveStore, type SaveStorage } from "./saveStore";

export const canastaSaveKey = "barbu.savedCanastaRun.v1";
export type SavedCanastaRun = { version: 1; initialSeed: number; events: CanastaAction[]; savedAt: string; scores: [number, number]; handNumber: number };
const seed = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const cardId = (value: unknown): value is string => typeof value === "string" && /^[01]-((A|[2-9]|10|J|Q|K)[CDHS]|J[RB])$/.test(value);
function groups(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 12 && value.every(group => group && canastaRanks.includes(group.rank)
    && Array.isArray(group.cardIds) && group.cardIds.length <= 7 && group.cardIds.every(cardId));
}
function action(value: unknown): value is CanastaAction {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return event.type === "draw" || event.type === "special"
    || (event.type === "discard" || event.type === "expose") && cardId(event.cardId)
    || event.type === "meld" && groups(event.groups)
    || event.type === "pickup" && groups(event.groups) && Array.isArray(event.pair) && event.pair.length === 2 && event.pair.every(cardId)
    || event.type === "next" && seed(event.seed);
}
export function restoreCanastaSession(saved: SavedCanastaRun) {
  return saved.events.reduce(transitionCanastaSession, createCanastaSession(saved.initialSeed));
}
export function saveCanastaSession(session: CanastaSession, savedAt: string): SavedCanastaRun {
  return { version: 1, initialSeed: session.initialSeed, events: session.events, savedAt, scores: session.scores, handNumber: session.handNumber };
}
export function normalizeCanastaSave(value: unknown): SavedCanastaRun | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as SavedCanastaRun;
  if (saved.version !== 1 || !seed(saved.initialSeed) || !Array.isArray(saved.events) || saved.events.length > 20000
    || !saved.events.every(action) || typeof saved.savedAt !== "string" || !Number.isFinite(Date.parse(saved.savedAt))) return null;
  try { return saveCanastaSession(restoreCanastaSession(saved), saved.savedAt); } catch { return null; }
}
export function createCanastaSaveStore(storage: () => SaveStorage | undefined) {
  return createSaveStore(canastaSaveKey, normalizeCanastaSave, storage);
}
