import { expect, test } from "@playwright/test";
import { createWhistSession, transitionWhistSession, whistSessionComplete, whistSessionSettlement, type WhistSession } from "../../src/domain/whistSession";
import { createWhistSaveStore, normalizeWhistSave, restoreWhistSession, savedWhistRunSummary, saveWhistSession, whistSaveKey } from "../../src/persistence/whistSave";
import native from "../fixtures/whist-native-save.json" with { type: "json" };

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}

function complete(session: WhistSession): WhistSession {
  let current = session;
  for (let i = 0; i < 13 && current.fullHand.status !== "complete"; i++) {
    current = transitionWhistSession(freeze(current), { type: "next-trick" });
    current = transitionWhistSession(freeze(current), { type: "play-card", cardId: current.fullHand.legalCardIds[0] });
  }
  expect(current.fullHand.status).toBe("complete");
  return current;
}

test("session events gate play during review and never mutate the previous session", () => {
  const initial = freeze(createWhistSession(8));
  expect(transitionWhistSession(initial, { type: "next-hand", seed: 100 })).toBe(initial);
  expect(transitionWhistSession(initial, { type: "play-card", cardId: "missing" })).toBe(initial);
  const next = freeze(transitionWhistSession(initial, { type: "play-card", cardId: initial.fullHand.legalCardIds[0] }));
  expect(next.fullHandReviewTrickCount).toBe(1);
  expect(transitionWhistSession(next, { type: "play-card", cardId: next.fullHand.legalCardIds[0] })).toBe(next);
  const reviewed = transitionWhistSession(next, { type: "next-trick" });
  expect(reviewed.fullHandReviewTrickCount).toBe(0);
  expect(reviewed.fullHand).toBe(next.fullHand);
  expect(initial.fullHand.completedTricks).toHaveLength(0);
});

test("next hand settles once and rotates the dealer, including a legacy save", () => {
  const finished = freeze(complete(createWhistSession(8)));
  const result = whistSessionSettlement(finished);
  expect(result.complete).toBe(false);
  const next = freeze(transitionWhistSession(finished, { type: "next-hand", seed: 100 }));
  expect(next.scores).toEqual(result.nextScores);
  expect(next.results).toHaveLength(1);
  expect(next.fullHand.whistDealer).toBe((finished.fullHand.whistDealer! + 1) % 4);
  expect(transitionWhistSession(next, { type: "next-hand", seed: 101 })).toBe(next);
  const legacy = { ...finished, fullHand: { ...finished.fullHand, whistDealer: undefined } };
  expect(transitionWhistSession(legacy, { type: "next-hand", seed: 100 }).fullHand.whistDealer).toBe(next.fullHand.whistDealer);
  expect(finished.results).toEqual([]);
});

test("rubber game reset and terminal match transitions are explicit", () => {
  const finished = freeze({ ...complete(createWhistSession(8, "rubber")), scores: { playerSide: 4, opponentSide: 4 } });
  const result = whistSessionSettlement(finished);
  expect(result.gameComplete).toBe(true);
  expect(result.complete).toBe(false);
  expect(transitionWhistSession(finished, { type: "replay" })).toBe(finished);
  const next = transitionWhistSession(finished, { type: "next-hand", seed: 100 });
  expect(next.scores).toEqual({ playerSide: 0, opponentSide: 0 });
  expect(next.games).toEqual(result.games);
  const rubberEnd = freeze({ ...finished, games: result.games });
  expect(whistSessionComplete(rubberEnd)).toBe(true);
  expect(transitionWhistSession(rubberEnd, { type: "next-hand", seed: 100 })).toBe(rubberEnd);
  const gameEnd = freeze({ ...finished, mode: "game" as const });
  expect(whistSessionComplete(gameEnd)).toBe(true);
  expect(transitionWhistSession(gameEnd, { type: "next-hand", seed: 100 })).toBe(gameEnd);
  expect(saveWhistSession(rubberEnd, "now")).toBeNull();
  expect(saveWhistSession(gameEnd, "now")).toBeNull();
  const newMatch = createWhistSession(101, rubberEnd.mode);
  expect(newMatch.results).toEqual([]);
  expect(newMatch.games).toEqual({ playerSide: 0, opponentSide: 0 });
  expect(newMatch.mode).toBe("rubber");
});

test("replay preserves the deal and does not add its uncommitted score", () => {
  const initial = createWhistSession(8);
  const finished = freeze(complete(initial));
  const replay = transitionWhistSession(finished, { type: "replay" });
  expect(replay.fullHand).toEqual(initial.fullHand);
  expect(replay.scores).toEqual(initial.scores);
  expect(replay.results).toEqual([]);
  expect(replay.fullHandReviewTrickCount).toBe(0);
});

test("legacy native saves default to a single game and recompute derived fields", () => {
  const value = { version: 1, fullHand: { ...native.savedHand, legalCardIds: ["not-a-card"], cardsRemaining: 999 },
    scores: { playerSide: 2, opponentSide: -1 }, fullHandReviewTrickCount: 999, usingBrowserFullHand: false };
  const original = structuredClone(value);
  const saved = normalizeWhistSave(freeze(value))!;
  expect(saved).not.toBeNull();
  expect(saved.mode).toBe("game");
  expect(saved.games).toEqual({ playerSide: 0, opponentSide: 0 });
  expect(saved.scores).toEqual({ playerSide: 2, opponentSide: 0 });
  expect(saved.fullHand.legalCardIds).toEqual(native.savedHand.legalCardIds);
  expect(saved.fullHand.cardsRemaining).toBe(native.savedHand.cardsRemaining);
  expect(saved.fullHandReviewTrickCount).toBe(0);
  expect(saved.usingBrowserFullHand).toBe(true);
  expect(value).toEqual(original);
});

test("review and between-game saves round trip without double settlement", () => {
  const playing = createWhistSession(8, "rubber");
  const review = transitionWhistSession(playing, { type: "play-card", cardId: playing.fullHand.legalCardIds[0] });
  const savedReview = normalizeWhistSave(JSON.parse(JSON.stringify(saveWhistSession(review, "now"))))!;
  expect(savedReview.fullHandReviewTrickCount).toBe(1);
  const finished = { ...complete(playing), scores: { playerSide: 4, opponentSide: 4 } };
  const saved = normalizeWhistSave(JSON.parse(JSON.stringify(saveWhistSession(finished, "now"))))!;
  expect(saved).not.toBeNull();
  expect(savedWhistRunSummary(saved)).toContain("Hand 1 complete");
  const restored = restoreWhistSession(saved);
  expect(whistSessionSettlement(restored)).toEqual(whistSessionSettlement(finished));
  const next = transitionWhistSession(restored, { type: "next-hand", seed: 100 });
  expect(next.games).toEqual(whistSessionSettlement(finished).games);
  expect(next.results).toHaveLength(1);
});

test("save boundary rejects malformed hands and unknown schema versions", () => {
  const saved = saveWhistSession(createWhistSession(8), "now")!;
  for (const input of [null, [], {}, { ...saved, version: 2 }, { ...saved, fullHand: { contract: "Whist" } },
    { ...saved, fullHand: { ...saved.fullHand, hands: [] } },
    { ...saved, fullHand: { ...saved.fullHand, currentPlayerIndex: 9 } },
    { ...saved, fullHand: { ...saved.fullHand, completedTricks: [{}] } }]) {
    expect(normalizeWhistSave(input)).toBeNull();
  }
  const duplicate = structuredClone(saved);
  duplicate.fullHand.hands[0][0] = duplicate.fullHand.hands[0][1];
  expect(normalizeWhistSave(duplicate)).toBeNull();
});

test("storage adapter handles missing or blocked reads and surfaces failed writes", () => {
  const data = new Map<string, string>();
  const store = createWhistSaveStore(() => ({ getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } }));
  expect(store.load()).toBeNull();
  const saved = saveWhistSession(createWhistSession(8), "now")!;
  store.write(saved);
  expect(store.load()?.fullHand.id).toBe(saved.fullHand.id);
  store.write(null);
  expect(data.has(whistSaveKey)).toBe(false);
  data.set(whistSaveKey, "bad json");
  expect(store.load()).toBeNull();
  const blocked = createWhistSaveStore(() => { throw Error("storage blocked"); });
  expect(blocked.load()).toBeNull();
  expect(() => blocked.write(saved)).toThrow("storage blocked");
  expect(createWhistSaveStore(() => undefined).load()).toBeNull();
});
