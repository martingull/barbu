import { expect, test } from "@playwright/test";
import { heartsHandEngine } from "../../src/domain/handEngine";
import { createHeartsSession, heartsSessionSettlement, transitionHeartsSession, type HeartsSession } from "../../src/domain/heartsSession";
import { seatPenaltiesForTricks } from "../../src/domain/trickTakingScore";
import { createHeartsSaveStore, normalizeHeartsSave, restoreHeartsSession, saveHeartsSession } from "../../src/persistence/heartsSave";
import type { FullHandState } from "../../src/lessonTypes";
import native from "../fixtures/hearts-native-save.json" with { type: "json" };

function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
}

function pass(session: HeartsSession): HeartsSession {
  if (session.phase === "playing") return session;
  for (const card of session.fullHand.hands[2].slice(0, 3)) {
    session = transitionHeartsSession(freeze(session), { type: "select-pass", cardId: card.id });
  }
  return transitionHeartsSession(freeze(session), { type: "pass" });
}

function finish(session: HeartsSession): HeartsSession {
  session = pass(session);
  for (let turn = 0; turn < 13 && session.fullHand.status !== "complete"; turn++) {
    session = transitionHeartsSession(freeze(session), { type: "next-trick" });
    session = transitionHeartsSession(freeze(session), { type: "play-card", cardId: session.fullHand.legalCardIds[0] });
  }
  expect(session.fullHand.status).toBe("complete");
  return session;
}

function gameplay(hand: FullHandState) {
  return { id: hand.id, hands: hand.hands, currentTrick: hand.currentTrick, currentPlayerIndex: hand.currentPlayerIndex,
    completedTricks: hand.completedTricks.map(({ cards, winnerIndex, penalty }) => ({ cards, winnerIndex, penalty })),
    legalCardIds: [...hand.legalCardIds].sort(), status: hand.status, cardsRemaining: hand.cardsRemaining };
}

test("Hearts passing gates play, validates three owned cards, and cannot be repeated", () => {
  const initial = freeze(createHeartsSession(8));
  expect(transitionHeartsSession(initial, { type: "play-card", cardId: "2C" })).toBe(initial);
  expect(transitionHeartsSession(initial, { type: "pass" })).toBe(initial);
  expect(transitionHeartsSession(initial, { type: "select-pass", cardId: "missing" })).toBe(initial);
  let selected = initial;
  for (const card of initial.fullHand.hands[2].slice(0, 3)) selected = transitionHeartsSession(selected, { type: "select-pass", cardId: card.id });
  expect(transitionHeartsSession(freeze(selected), { type: "select-pass", cardId: initial.fullHand.hands[2][3].id })).toBe(selected);
  const deselected = transitionHeartsSession(selected, { type: "select-pass", cardId: selected.selectedPassCardIds[0] });
  expect(deselected.selectedPassCardIds).toHaveLength(2);
  const played = transitionHeartsSession(selected, { type: "pass" });
  expect(played.phase).toBe("playing");
  expect(transitionHeartsSession(played, { type: "pass" })).toBe(played);
  expect(initial.selectedPassCardIds).toEqual([]);
  expect(() => heartsHandEngine.pass({ ...initial.fullHand, contract: "Whist" }, [], 1)).toThrow("Expected a Hearts hand");
  for (const ids of [[], ["2C", "2C", "2C"], ["missing", "2C", "3C"], initial.fullHand.playerHand.slice(0, 4).map(card => card.id)]) {
    expect(heartsHandEngine.pass(initial.fullHand, ids, 1)).toBe(initial.fullHand);
  }
});

for (const fixture of native.cases) {
  test(`Hearts native pass, continuation and replay agree for direction ${fixture.direction}`, () => {
    if (fixture.direction) {
      const hand = heartsHandEngine.pass(freeze(structuredClone(native.passingHand) as FullHandState), native.cardIds, fixture.direction);
      expect(gameplay(hand)).toEqual(gameplay(fixture.initialHand as FullHandState));
    }
    const saved = freeze(structuredClone(fixture.savedHand) as FullHandState);
    expect(gameplay(heartsHandEngine.transition(saved, { type: "play-card", cardId: fixture.cardId })))
      .toEqual(gameplay(fixture.nextHand as FullHandState));
    expect(gameplay(heartsHandEngine.transition(saved, { type: "replay" }))).toEqual(gameplay(fixture.initialHand as FullHandState));
  });
}

test("Hearts pass rotation, settlement and hold advance exactly once", () => {
  let session = createHeartsSession(8);
  for (const [index, direction] of ["left", "right", "across", "hold", "left"].entries()) {
    expect(session.passDirection).toBe(direction);
    expect(session.phase).toBe(direction === "hold" ? "playing" : "passing");
    expect(transitionHeartsSession(freeze(session), { type: "next-hand", seed: 100 })).toBe(session);
    const complete = finish(session);
    const settled = heartsSessionSettlement(complete);
    expect(settled.complete).toBe(false);
    const next = transitionHeartsSession(complete, { type: "next-hand", seed: 9 + index });
    expect(next.scores).toEqual(settled.scores);
    expect(next.results).toHaveLength(index + 1);
    expect(transitionHeartsSession(next, { type: "next-hand", seed: 99 })).toBe(next);
    session = next;
  }
});

test("Hearts review blocks rapid plays; replay preserves post-pass cards and uncommitted score", () => {
  const start = freeze(pass(createHeartsSession(8)));
  const reviewed = freeze(transitionHeartsSession(start, { type: "play-card", cardId: start.fullHand.legalCardIds[0] }));
  expect(reviewed.fullHandReviewTrickCount).toBe(1);
  expect(transitionHeartsSession(reviewed, { type: "play-card", cardId: reviewed.fullHand.legalCardIds[0] })).toBe(reviewed);
  const finished = finish(reviewed);
  const replay = transitionHeartsSession(finished, { type: "replay" });
  expect(gameplay(replay.fullHand)).toEqual(gameplay(start.fullHand));
  expect(replay.scores).toEqual(start.scores);
  expect(replay.results).toEqual([]);
});

test("Hearts settles moon scoring before the 100-point match boundary", () => {
  let moon: HeartsSession | undefined;
  for (let seed = 0; seed < 256 && !moon; seed++) {
    const complete = finish({ ...createHeartsSession(seed), phase: "playing", passDirection: "hold", fullHand: heartsHandEngine.start({ seed }) });
    if (heartsSessionSettlement(complete).result?.moonShooter) moon = complete;
  }
  expect(moon).toBeDefined();
  const scores = { Tutor: 74, Right: 74, You: 74, Left: 74 };
  const complete = freeze({ ...moon!, scores });
  const settlement = heartsSessionSettlement(complete);
  expect(settlement.complete).toBe(true);
  expect(settlement.scores[settlement.result!.moonShooter!]).toBe(74);
  expect(Object.values(settlement.scores).filter(score => score === 100)).toHaveLength(3);
  expect(transitionHeartsSession(complete, { type: "next-hand", seed: 100 })).toBe(complete);
  expect(transitionHeartsSession(complete, { type: "replay" })).toBe(complete);
  expect(saveHeartsSession(complete, "now")).toBeNull();
  const playing = pass({ ...createHeartsSession(8), scores });
  expect(heartsSessionSettlement(playing).complete).toBe(false);
});

test("Hearts saves round trip during passing, review, completion and after advancement", () => {
  let session = createHeartsSession(8);
  session = transitionHeartsSession(session, { type: "select-pass", cardId: session.fullHand.hands[2][0].id });
  const playing = pass({ ...session, selectedPassCardIds: [] });
  const review = transitionHeartsSession(playing, { type: "play-card", cardId: playing.fullHand.legalCardIds[0] });
  const complete = finish(review);
  const advanced = transitionHeartsSession(complete, { type: "next-hand", seed: 9 });
  for (const state of [session, review, complete, advanced]) {
    const saved = saveHeartsSession(state, "now")!;
    const normalized = normalizeHeartsSave(JSON.parse(JSON.stringify(saved)))!;
    expect(normalized).not.toBeNull();
    const restored = restoreHeartsSession(normalized);
    expect(gameplay(restored.fullHand)).toEqual(gameplay(state.fullHand));
    expect(restored.selectedPassCardIds).toEqual(state.selectedPassCardIds);
    expect(restored.fullHandReviewTrickCount).toBe(state.fullHandReviewTrickCount);
    expect(heartsSessionSettlement(restored)).toEqual(heartsSessionSettlement(state));
  }
});

test("Hearts save validation rejects broken deals and repairs stale selection and derived fields", () => {
  const saved = saveHeartsSession(createHeartsSession(8), "now")!;
  const hand = saved.heartsPassingHand!;
  const legacy = { ...saved, usingBrowserFullHand: false, usingBrowserHeartsPass: false,
    heartsPassSelectedCardIds: [hand.hands[2][0].id, hand.hands[2][0].id, "missing"],
    heartsPassingHand: { ...hand, playerHand: [], legalCardIds: ["missing"] } };
  const normalized = normalizeHeartsSave(freeze(legacy))!;
  expect(normalized.heartsPassingHand!.playerHand).toHaveLength(13);
  expect(normalized.heartsPassSelectedCardIds).toEqual([hand.hands[2][0].id]);
  expect(normalized.usingBrowserFullHand).toBe(true);
  for (const value of [null, {}, { ...saved, version: 2 }, { ...saved, passDirection: "hold" },
    { ...saved, heartsPassingHand: { ...hand, hands: [] } }, { ...saved, view: "fullHand" }]) {
    expect(normalizeHeartsSave(value)).toBeNull();
  }
  const storage = createHeartsSaveStore(() => { throw Error("storage blocked"); });
  expect(storage.load()).toBeNull();
  expect(() => storage.write(saved)).toThrow("storage blocked");
});

test("Hearts conserves 52 cards and 26 points through 256 immutable deals", () => {
  for (let seed = 0; seed < 256; seed++) {
    const before = heartsHandEngine.startPassing(seed);
    const direction = seed % 4;
    let hand = direction ? heartsHandEngine.pass(freeze(before), before.playerHand.slice(0, 3).map(card => card.id), direction)
      : heartsHandEngine.start({ seed });
    for (let turn = 0; turn < 13 && hand.status !== "complete"; turn++) {
      freeze(hand);
      const illegal = hand.playerHand.find(card => !hand.legalCardIds.includes(card.id));
      if (illegal) expect(heartsHandEngine.transition(hand, { type: "play-card", cardId: illegal.id })).toBe(hand);
      hand = heartsHandEngine.transition(hand, { type: "play-card", cardId: hand.legalCardIds[0] });
      const cards = [...hand.hands.flat(), ...hand.currentTrick.map(play => play.card), ...hand.completedTricks.flatMap(trick => trick.cards.map(play => play.card))];
      expect(cards).toHaveLength(52);
      expect(new Set(cards.map(card => card.id)).size).toBe(52);
    }
    expect(hand.completedTricks).toHaveLength(13);
    expect(hand.completedTricks[0].cards[0].card.id).toBe("2C");
    expect(Object.values(seatPenaltiesForTricks(hand.completedTricks)).reduce((a, b) => a + b, 0)).toBe(26);
  }
});
