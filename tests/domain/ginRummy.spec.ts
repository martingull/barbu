import { expect, test } from "@playwright/test";
import { shuffledDeck, standardDeck } from "../../src/domain/deck";
import { bestMeldLayout, deadwoodPoints, rummyMelds } from "../../src/domain/rummyMelds";
import { createGinSession, ginComplete, ginFinalScores, replayGinHand, scoreGinHand, transitionGinSession, type GinSession } from "../../src/domain/ginRummySession";
import { advanceGinOpponent, chooseGinAction, ginObservation } from "../../src/domain/ginRummyPolicy";
import { createGinSaveStore, normalizeGinSave, restoreGinSession, saveGinSession } from "../../src/persistence/ginRummySave";
import { ginCards, ginExercises, ginExerciseAnswer } from "../../src/lessons/gin-rummy/exercises";
import { createGinRummyFeature } from "../../src/features/gin-rummy/ginRummyFeature";
import { get } from "svelte/store";

const attacking = () => ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH 2D");
const gin = () => ginCards("3C 4C 5C 6C 7D 7H 7S 9H 10H JH");
function conserve(session: GinSession) {
  const hand = session.hand;
  const cards = [...hand.hands.flat(), ...hand.stock, ...hand.discards];
  expect(cards.map(card => card.id).sort()).toEqual(standardDeck().map(card => card.id).sort());
  expect(hand.hands[hand.turn].length).toBe(hand.phase === "discard" ? 11 : 10);
}

test("melds use ace-low runs and non-overlapping sets, solving competing combinations", () => {
  expect(bestMeldLayout(ginCards("AC 2C 3C")).points).toBe(0);
  expect(bestMeldLayout(ginCards("QC KC AC")).points).toBe(21);
  expect(bestMeldLayout(ginCards("3C 4C 5C 3D 3H 6C 7C 8C")).points).toBe(0);
  expect(rummyMelds(ginCards("7C 7D 7H 7S"))).toHaveLength(5);
  for (let seed = 0; seed < 35; seed++) {
    const hand = shuffledDeck(seed).slice(0, 11), candidates = rummyMelds(hand);
    const brute = (index: number, used: Set<string>): number => {
      if (index === candidates.length) return deadwoodPoints(hand.filter(card => !used.has(card.id)));
      const meld = candidates[index];
      const skipped = brute(index + 1, used);
      return meld.cards.some(card => used.has(card.id)) ? skipped : Math.min(skipped, brute(index + 1, new Set([...used, ...meld.cards.map(card => card.id)])));
    };
    const layout = bestMeldLayout(hand);
    expect(layout.points).toBe(brute(0, new Set()));
    const melded = layout.melds.flatMap(meld => meld.cards.map(card => card.id));
    expect(new Set(melded).size).toBe(melded.length);
  }
});

test("layoffs extend runs in chains and cannot attach to deadwood", () => {
  const result = scoreGinHand([attacking(), ginCards("AC 2C 6C 8C QC 3D 4D 5D KD QD")], 0);
  expect(result.layouts[1].layoffs.flatMap(l => l.cards.map(card => card.id)).sort()).toEqual(["2C", "6C", "AC"]);
  expect(result.points).toBe(36);
  const tied = scoreGinHand([attacking(), ginCards("AS 2S 3S 4H 5H 6H 8D 9D 10D 2H")], 0);
  expect(tied.kind).toBe("undercut");
  expect(tied.winner).toBe(1);
  expect(tied.points).toBe(10);
  expect(tied.layouts[1].deadwood.map(card => card.id)).toEqual(["2H"]);
});

test("gin prevents layoffs and cannot be undercut", () => {
  const result = scoreGinHand([gin(), ginCards("AC 2C 6D 6H 6S 8D 9D 10D QC KC")], 0);
  expect(result.kind).toBe("gin");
  expect(result.points).toBe(43);
  expect(result.layouts[1].layoffs).toEqual([]);
  expect(scoreGinHand([gin(), ginCards("AS 2S 3S 4S 8C 8D 8H 10C JC QC")], 0).points).toBe(20);
  expect(() => scoreGinHand([ginCards("AC 3C 5C 7C 9C JC 2D 4D 6D 8D"), gin()], 0)).toThrow(/10/);
});

test("opening offers, forced stock and discard legality preserve the deck", () => {
  let session = createGinSession(1);
  expect(session.hand.turn).toBe(0);
  expect(() => transitionGinSession(session, { type: "draw", source: "stock" })).toThrow(/upcard/);
  const before = structuredClone(session);
  session = transitionGinSession(session, { type: "pass" });
  expect(session.hand.turn).toBe(1);
  session = transitionGinSession(session, { type: "pass" });
  expect(session.hand.turn).toBe(0);
  expect(() => transitionGinSession(session, { type: "draw", source: "discard" })).toThrow(/stock/);
  session = transitionGinSession(session, { type: "draw", source: "stock" });
  conserve(session);
  expect(() => transitionGinSession(session, { type: "draw", source: "stock" })).toThrow(/Discard/);
  expect(before).toEqual(createGinSession(1));
  let upcard = createGinSession(2);
  const cardId = upcard.hand.discards[0].id;
  upcard = transitionGinSession(upcard, { type: "draw", source: "discard" });
  expect(() => transitionGinSession(upcard, { type: "discard", cardId })).toThrow(/upcard/);
  expect(() => transitionGinSession(upcard, { type: "discard", cardId: "invalid" })).toThrow();
});

test("stock exhaustion draws without scoring and retains the dealer", () => {
  let session = transitionGinSession(transitionGinSession(createGinSession(4), { type: "pass" }), { type: "pass" });
  while (session.hand.phase !== "complete") {
    session = transitionGinSession(session, { type: "draw", source: "stock" });
    session = transitionGinSession(session, { type: "discard", cardId: session.hand.hands[session.hand.turn][0].id });
    conserve(session);
  }
  expect(session.hand.stock).toHaveLength(2);
  expect(session.hand.result?.kind).toBe("draw");
  expect(session.scores).toEqual([0, 0]);
  expect(transitionGinSession(session, { type: "next", seed: 5 }).hand.dealer).toBe(session.hand.dealer);
});

test("opponent observation excludes hidden cards and stock order", () => {
  const original = createGinSession(8), changed = structuredClone(original);
  const opponent = original.hand.turn === 0 ? 1 : 0;
  [changed.hand.hands[opponent][0], changed.hand.stock[0]] = [changed.hand.stock[0], changed.hand.hands[opponent][0]];
  expect(ginObservation(original)).toEqual(ginObservation(changed));
  expect(chooseGinAction(ginObservation(original))).toEqual(chooseGinAction(ginObservation(changed)));
  expect(Object.keys(ginObservation(original))).not.toContain("stock");
});

test("complete matches settle once, rotate dealer, replay and restore exactly", () => {
  for (const seed of [1, 2, 3]) {
    let session = createGinSession(seed), turns = 0;
    while (!ginComplete(session) && turns++ < 2000) {
      if (session.hand.phase === "complete") {
        expect(() => transitionGinSession(session, { type: "pass" })).toThrow(/complete/);
        const winner = session.hand.result!.winner;
        const before = structuredClone(session.scores);
        session = transitionGinSession(session, { type: "next", seed: seed + turns });
        if (winner !== null) expect(session.hand.dealer).toBe(winner);
        expect(session.scores).toEqual(before);
      } else session = transitionGinSession(session, chooseGinAction(ginObservation(session)));
      conserve(session);
    }
    expect(ginComplete(session)).toBe(true);
    expect(() => transitionGinSession(session, { type: "next", seed: 42 })).toThrow(/game is complete/);
    const totals = ginFinalScores(session);
    expect(totals[0] + totals[1]).toBeGreaterThan(session.scores[0] + session.scores[1]);
    const saved = saveGinSession(session, "2026-09-25T12:00:00Z");
    expect(restoreGinSession(normalizeGinSave(saved)!)).toEqual(session);
    const replayed = replayGinHand(session);
    expect(replayed.hand.phase).toBe("offer");
    expect(replayed.handNumber).toBe(session.handNumber);
    expect(ginComplete(replayed)).toBe(false);
    expect(ginFinalScores(session)).toEqual(totals);
  }
});

test("final bonuses do not count toward the target and shutout doubles only the game bonus", () => {
  const session = createGinSession(1);
  session.scores = [95, 20]; session.wins = [5, 1];
  expect(ginFinalScores(session)).toEqual([95, 20]);
  session.scores = [103, 20];
  expect(ginFinalScores(session)).toEqual([303, 40]);
  session.scores = [103, 0]; session.wins = [5, 0];
  expect(ginFinalScores(session)).toEqual([403, 0]);
});

test("saves reject illegal actions and recompute stale summaries", () => {
  const session = advanceGinOpponent(createGinSession(8)), saved = saveGinSession(session, "now");
  expect(restoreGinSession(normalizeGinSave({ ...saved, scores: [999, 0] })!)).toEqual(session);
  expect(normalizeGinSave({ ...saved, initialSeed: -1 })).toBeNull();
  expect(normalizeGinSave({ ...saved, events: [{ type: "discard", cardId: "AC" }] })).toBeNull();
  expect(normalizeGinSave({ ...saved, events: [{ type: "draw", source: "opponent" }] })).toBeNull();
  const store = createGinSaveStore(() => ({ getItem: () => "{", setItem() {}, removeItem() {} }));
  expect(store.load()).toBeNull();
});

test("feature remains usable without storage and isolates its instances", async () => {
  const options = { nextSeed: () => 1, storage: () => { throw Error("Blocked"); } };
  const first = createGinRummyFeature(options), second = createGinRummyFeature(options);
  await first.start();
  expect(get(first).error).toContain("saved");
  expect(get(second).session).toBeNull();
  first.openTable(); first.resume();
  expect(get(first).view).toBe("hand");
  expect(get(first).session).not.toBeNull();
});

test("each learning topic has three decisions with at least one correct choice", () => {
  expect(ginExerciseAnswer("knock", ginExercises.knock[0], "gin").illegal).toBe(true);
  expect(ginExerciseAnswer("knock", ginExercises.knock[0], "continue").illegal).toBeUndefined();
  expect(ginExerciseAnswer("knock", ginExercises.knock[1], "knock").illegal).toBe(true);
  for (const [topic, steps] of Object.entries(ginExercises)) {
    expect(steps).toHaveLength(3);
    for (const step of steps) {
      const options = topic === "melds" ? step.hand.map(card => card.id) : topic === "draw" ? ["stock", "upcard"] : ["continue", "knock", "gin"];
      expect(options.some(option => ginExerciseAnswer(topic, step, option).good)).toBe(true);
      expect(new Set(step.hand.map(card => card.id)).size).toBe(step.hand.length);
    }
  }
});
