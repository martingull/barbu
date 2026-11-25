import { createBeloteSession, transitionBeloteSession, type BeloteSession, type BeloteAction } from "../domain/beloteSession";
import { beloteSuits, type BeloteSeat } from "../domain/beloteRules";
import { createSaveStore, type SaveStorage } from "./saveStore";

export const beloteSaveKey = "barbu.savedBeloteRun.v1";
export type SavedBeloteRun = { version: 1; initialSeed: number; initialDealer: BeloteSeat; events: BeloteAction[];
  savedAt: string; scores: [number, number]; handNumber: number };
const natural = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0;
function validAction(value: unknown): value is BeloteAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  if (action.type === "pass" || action.type === "next-trick") return Object.keys(action).length === 1;
  if (Object.keys(action).length !== 2) return false;
  if (action.type === "take") return beloteSuits.some(suit => suit === action.trump);
  if (action.type === "next-hand") return natural(action.seed);
  return action.type === "play-card" && typeof action.cardId === "string" && /^(7|8|9|10|J|Q|K|A)[CDHS]$/.test(action.cardId);
}
export function saveBeloteSession(session: BeloteSession, savedAt: string): SavedBeloteRun {
  return { version: 1, initialSeed: session.initialSeed, initialDealer: session.initialDealer,
    events: session.events.map(event => ({ ...event })), savedAt, scores: [...session.scores], handNumber: session.handNumber };
}
export function restoreBeloteSession(saved: SavedBeloteRun): BeloteSession {
  return saved.events.reduce(transitionBeloteSession, createBeloteSession(saved.initialSeed, saved.initialDealer));
}
export function normalizeBeloteSave(value: unknown): SavedBeloteRun | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as SavedBeloteRun;
  if (saved.version !== 1 || !natural(saved.initialSeed) || !natural(saved.initialDealer) || saved.initialDealer > 3
    || typeof saved.savedAt !== "string" || !Number.isFinite(Date.parse(saved.savedAt))
    || !Array.isArray(saved.events) || saved.events.length > 20000 || !saved.events.every(validAction)) return null;
  try { return saveBeloteSession(restoreBeloteSession(saved), saved.savedAt); } catch { return null; }
}
export const createBeloteSaveStore = (storage: () => SaveStorage | undefined) => createSaveStore(beloteSaveKey, normalizeBeloteSave, storage);
