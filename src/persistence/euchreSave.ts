import { createEuchreSession, transitionEuchreSession, type EuchreAction, type EuchreSession } from "../domain/euchreSession";
import { euchreSuits, type EuchreSeat } from "../domain/euchreRules";
import { createSaveStore, type SaveStorage } from "./saveStore";

export const euchreSaveKey = "barbu.savedEuchreRun.v1";
export type SavedEuchreRun = { version: 1; initialSeed: number; initialDealer: EuchreSeat; events: EuchreAction[]; savedAt: string;
  scores: [number, number]; handNumber: number };
const natural = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
function validAction(value: unknown): value is EuchreAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  if (action.type === "pass" || action.type === "next-trick") return Object.keys(action).length === 1;
  if (action.type === "call") return euchreSuits.some(suit => suit === action.trump)
    && (action.alone === undefined || typeof action.alone === "boolean")
    && Object.keys(action).every(key => ["type", "trump", "alone"].includes(key));
  if (action.type === "discard" || action.type === "play-card") return typeof action.cardId === "string"
    && /^(9|10|J|Q|K|A)[CDHS]$/.test(action.cardId) && Object.keys(action).length === 2;
  return action.type === "next-hand" && natural(action.seed) && Object.keys(action).length === 2;
}
export function saveEuchreSession(session: EuchreSession, savedAt: string): SavedEuchreRun {
  return { version: 1, initialSeed: session.initialSeed, initialDealer: session.initialDealer,
    events: session.events.map(event => ({ ...event })), savedAt, scores: [...session.scores], handNumber: session.handNumber };
}
export function restoreEuchreSession(saved: SavedEuchreRun): EuchreSession {
  return saved.events.reduce(transitionEuchreSession, createEuchreSession(saved.initialSeed, saved.initialDealer));
}
export function normalizeEuchreSave(value: unknown): SavedEuchreRun | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as SavedEuchreRun;
  if (saved.version !== 1 || !natural(saved.initialSeed) || !natural(saved.initialDealer) || saved.initialDealer > 3
    || typeof saved.savedAt !== "string" || !Number.isFinite(Date.parse(saved.savedAt))
    || !Array.isArray(saved.events) || saved.events.length > 20000 || !saved.events.every(validAction)) return null;
  try { return saveEuchreSession(restoreEuchreSession(saved), saved.savedAt); } catch { return null; }
}
export const createEuchreSaveStore = (storage: () => SaveStorage | undefined) => createSaveStore(euchreSaveKey, normalizeEuchreSave, storage);
