import { createGinSession, transitionGinSession, type GinAction, type GinSession } from "../domain/ginRummySession";
import { createSaveStore, type SaveStorage } from "./saveStore";

export const ginSaveKey = "barbu.savedGinRummyRun.v1";
export type SavedGinRun = { version: 1; initialSeed: number; events: GinAction[]; savedAt: string; scores: [number, number]; handNumber: number };
const natural = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
function action(value: unknown): value is GinAction {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return event.type === "pass" || event.type === "draw" && (event.source === "stock" || event.source === "discard")
    || event.type === "discard" && typeof event.cardId === "string" && /^(A|[2-9]|10|J|Q|K)[CDHS]$/.test(event.cardId)
      && (event.knock === undefined || typeof event.knock === "boolean")
    || event.type === "next" && natural(event.seed);
}
export function restoreGinSession(saved: SavedGinRun): GinSession {
  return saved.events.reduce(transitionGinSession, createGinSession(saved.initialSeed));
}
export function normalizeGinSave(value: unknown): SavedGinRun | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as SavedGinRun;
  if (saved.version !== 1 || !natural(saved.initialSeed) || !Array.isArray(saved.events) || saved.events.length > 20000
    || !saved.events.every(action) || typeof saved.savedAt !== "string") return null;
  try { return saveGinSession(restoreGinSession(saved), saved.savedAt); } catch { return null; }
}
export function saveGinSession(session: GinSession, savedAt: string): SavedGinRun {
  return { version: 1, initialSeed: session.initialSeed, events: session.events, savedAt, scores: session.scores, handNumber: session.handNumber };
}
export function createGinSaveStore(storage: () => SaveStorage | undefined) { return createSaveStore(ginSaveKey, normalizeGinSave, storage); }
