import { createCribbageSession, transitionCribbageSession, cribbageScores, type CribbageAction, type CribbageSession } from "../domain/cribbage";
import { createSaveStore, type SaveStorage } from "./saveStore";

export const cribbageSaveKey = "barbu.savedCribbageRun.v1";
export type SavedCribbageRun = { version: 1; seed: number; events: CribbageAction[]; savedAt: string; scores: [number, number]; handNumber: number };
export function saveCribbageSession(session: CribbageSession, savedAt: string): SavedCribbageRun {
  return { version: 1, seed: session.seed, events: structuredClone(session.events), savedAt,
    scores: cribbageScores(session), handNumber: session.game.deal + (session.review ? 0 : 1) };
}
export function restoreCribbageSession(saved: SavedCribbageRun): CribbageSession {
  return saved.events.reduce(transitionCribbageSession, createCribbageSession(saved.seed));
}
function validAction(value: unknown): value is CribbageAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  const card = (id: unknown) => typeof id === "string" && /^(A|[2-9]|10|J|Q|K)[CDHS]$/.test(id);
  if (action.type === "continue") return Object.keys(action).length === 1;
  if (Object.keys(action).length !== 2) return false;
  return action.type === "play" ? card(action.card) : action.type === "discard" && Array.isArray(action.cards)
    && action.cards.length === 2 && action.cards.every(card) && action.cards[0] !== action.cards[1];
}
export function normalizeCribbageSave(value: unknown): SavedCribbageRun | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as SavedCribbageRun;
  if (saved.version !== 1 || typeof saved.savedAt !== "string" || !Number.isFinite(Date.parse(saved.savedAt))
    || !Array.isArray(saved.events) || saved.events.length > 4000 || !saved.events.every(validAction)) return null;
  try { return saveCribbageSession(restoreCribbageSession(saved), saved.savedAt); } catch { return null; }
}
export const createCribbageSaveStore = (storage: () => SaveStorage | undefined) => createSaveStore(cribbageSaveKey, normalizeCribbageSave, storage);
