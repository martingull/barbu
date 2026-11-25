import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { beloteDeck, beloteCardPoints, beloteCardRank, beloteTrickWinner, legalBeloteCards, nextBeloteSeat, scoreBeloteHand, type BeloteSeat } from "../../src/domain/beloteRules";
import { createBeloteSession, transitionBeloteSession, replayBeloteHand, belotePosition, beloteComplete, type BeloteSession } from "../../src/domain/beloteSession";
import { advanceBeloteOpponents, chooseBeloteAction } from "../../src/domain/belotePolicy";
import { createBeloteGuidedSession, transitionBeloteGuidedSession, replayBeloteGuidedSession, beloteGuidance, beloteRecommendedAnswer, evaluateBeloteAnswer } from "../../src/domain/beloteLearning";
import { beloteCards, beloteLearningSteps, beloteAnswerChoices } from "../../src/lessons/belote/exercises";
import { beloteCourses } from "../../src/lessons/belote/courses";
import { beloteDef, beloteTopics } from "../../src/games/belote";
import { gameAccess } from "../../src/games/accessPolicy";
import { getCatalogCategories } from "../../src/games/tableFactory";
import { normalizeBeloteSave, saveBeloteSession, restoreBeloteSession, createBeloteSaveStore } from "../../src/persistence/beloteSave";
import { createBeloteFeature } from "../../src/features/belote/beloteFeature";
import { continueGames } from "../../src/features/catalog/catalogPresentation";
import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../src/domain/learningSession";

const cards = beloteCards;
const trick = (ids: string, seats: BeloteSeat[] = [3]) => cards(ids).map((card, i) => ({ card, seat: seats[i] }));
const legal = (held: string, played: string, seats?: BeloteSeat[]) => legalBeloteCards(cards(held), trick(played, seats), "H", 2).map(c => c.id);
function finishDeal(state: BeloteSession): BeloteSession {
  for (let count = 0; !["complete", "passed_out"].includes(state.hand.phase); count++) {
    expect(count).toBeLessThan(60);
    const before = structuredClone(state);
    const action = state.hand.phase === "review" ? { type: "next-trick" as const } : chooseBeloteAction(belotePosition(state.hand, state.hand.turn));
    state = transitionBeloteSession(state, action);
    const all = [...state.hand.hands.flat(), ...state.hand.stock, ...state.hand.currentTrick.map(p => p.card),
      ...state.hand.completedTricks.flatMap(t => t.cards.map(p => p.card)), ...(state.hand.contract ? [] : [state.hand.upcard])];
    expect(new Set(all.map(c => c.id)).size).toBe(32);
    expect(all).toHaveLength(32);
    expect(before.events).toHaveLength(state.events.length - 1);
  }
  return state;
}

test("Belote uses 32 cards, 152 card points and separate trump ranks without moving a jack", () => {
  expect(beloteDeck()).toHaveLength(32);
  expect(beloteDeck().reduce((n, c) => n + beloteCardPoints(c, "H"), 0)).toBe(152);
  expect(cards("7H 8H QH KH 10H AH 9H JH").map(c => beloteCardRank(c, "H"))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(cards("7C 8C 9C JC QC KC 10C AC").map(c => beloteCardRank(c, "H"))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(cards("JH 9H AH 10H KH QH 8H 7H JD").map(c => beloteCardPoints(c, "H"))).toEqual([20, 14, 11, 10, 4, 3, 0, 0, 2]);
  expect(beloteTrickWinner(trick("JD 7H", [3, 2]), "H")).toBe(2);
});

test("anticlockwise partial deal completes with the upcard in the taker's hand in either round", () => {
  const initial = createBeloteSession(5, 0);
  expect(initial.hand.turn).toBe(3);
  expect(initial.hand.hands.map(h => h.length)).toEqual([5, 5, 5, 5]);
  expect(initial.hand.stock).toHaveLength(11);
  for (const round of [1, 2]) {
    let state = initial;
    if (round === 2) for (let i = 0; i < 4; i++) state = transitionBeloteSession(state, { type: "pass" });
    const taker = state.hand.turn, up = state.hand.upcard;
    state = transitionBeloteSession(state, { type: "take", trump: round === 1 ? up.suit : up.suit === "H" ? "S" : "H" });
    expect(state.hand.hands.map(h => h.length)).toEqual([8, 8, 8, 8]);
    expect(state.hand.hands[taker]).toContainEqual(up);
    expect(state.hand.stock).toEqual([]);
    expect(state.hand.turn).toBe(3);
  }
  let passed = initial;
  for (let i = 0; i < 8; i++) passed = transitionBeloteSession(passed, { type: "pass" });
  expect(passed.hand.phase).toBe("passed_out");
  expect(passed.scores).toEqual([0, 0]);
  expect(transitionBeloteSession(passed, { type: "next-hand", seed: 7 }).hand.dealer).toBe(3);
  expect(initial.hand.hands[3]).toHaveLength(5);
});

test("follow suit, trump, overtrump, undertrump and winning-partner exceptions match the profile", () => {
  expect(legal("7D JH AC", "AD")).toEqual(["7D"]);
  expect(legal("7H JH AC", "9H")).toEqual(["JH"]);
  expect(legal("7H JH AC", "9H", [0])).toEqual(["JH"]);
  expect(legal("7H AC KS", "AD")).toEqual(["7H"]);
  expect(legal("7H JH AC", "AD 9H 7D", [1, 0, 3])).toEqual(["7H", "JH", "AC"]);
  expect(legal("7H JH AC", "AD 7D 9H", [1, 0, 3])).toEqual(["JH"]);
  expect(legal("7H 8H AC", "AD 7D JH", [1, 0, 3])).toEqual(["7H", "8H"]);
  expect(legal("AC KS", "AD")).toEqual(["AC", "KS"]);
});

test("settlement covers protected Belote, both capots, litige and accumulated carry", () => {
  expect(scoreBeloteHand(0, [90, 62], [5, 3], 0, null)).toMatchObject({ kind: "made", awarded: [100, 62] });
  expect(scoreBeloteHand(0, [50, 102], [3, 5], 1, 0)).toMatchObject({ kind: "set", awarded: [20, 162] });
  expect(scoreBeloteHand(0, [152, 0], [8, 0], 0, 1)).toMatchObject({ capot: 0, awarded: [252, 20] });
  expect(scoreBeloteHand(0, [0, 152], [0, 8], 1, 0)).toMatchObject({ capot: 1, awarded: [20, 252] });
  const tied = scoreBeloteHand(0, [71, 81], [4, 4], 0, null);
  expect(tied).toMatchObject({ kind: "litige", awarded: [0, 81], carry: 81 });
  expect(scoreBeloteHand(0, [61, 91], [4, 4], 0, 0, 81)).toMatchObject({ kind: "litige", awarded: [0, 91], carry: 172 });
  expect(scoreBeloteHand(0, [90, 62], [5, 3], 0, null, 172)).toMatchObject({ awarded: [272, 62], carry: 0 });
  expect(() => scoreBeloteHand(0, [150, 0], [8, 0], 0, null)).toThrow();
  expect(() => scoreBeloteHand(0, [152, 0], [8, 0], 1, null)).toThrow();
});

test("seeded deals conserve all cards, announce the actual pair and settle exactly once", () => {
  let announcements = 0, played = 0;
  for (let seed = 0; seed < 80; seed++) {
    const state = finishDeal(createBeloteSession(seed));
    if (state.hand.phase === "passed_out") continue;
    played++;
    expect(state.hand.completedTricks).toHaveLength(8);
    expect(state.hand.completedTricks.reduce((sum, t) => sum + t.points, 0)).toBe(152);
    if (state.hand.beloteOwner !== null) {
      announcements++;
      expect(state.hand.announcements).toEqual([
        { seat: state.hand.beloteOwner, label: "Belote" }, { seat: state.hand.beloteOwner, label: "Rebelote" }]);
    } else expect(state.hand.announcements).toEqual([]);
    expect(state.scores).toEqual(state.hand.result!.awarded);
    expect(() => transitionBeloteSession(state, { type: "play-card", cardId: "7H" })).toThrow();
    expect(replayBeloteHand(state)).toEqual(createBeloteSession(seed));
  }
  expect(played).toBeGreaterThan(40);
  expect(announcements).toBeGreaterThan(5);
});

test("matches stop at 1,000, a tied total continues, and save summaries cannot fabricate scores", () => {
  let state = createBeloteSession(1), deals = 0;
  while (!beloteComplete(state)) {
    expect(deals++).toBeLessThan(60);
    state = finishDeal(state);
    if (!beloteComplete(state)) state = transitionBeloteSession(state, { type: "next-hand", seed: deals + 10 });
  }
  expect(() => transitionBeloteSession(state, { type: "next-hand", seed: 99 })).toThrow();
  expect(beloteComplete({ ...state, scores: [1000, 1000] })).toBe(false);
  const saved = saveBeloteSession(state, "2026-11-25T12:00:00Z");
  expect(restoreBeloteSession(saved)).toEqual(state);
  expect(normalizeBeloteSave({ ...saved, scores: [99999, 99999], handNumber: 0 })).toEqual(saved);
  for (const events of [[{ type: "play-card", cardId: "2C" }], [{ type: "pass", extra: true }], [{ type: "next-hand", seed: 4 }]]) {
    expect(normalizeBeloteSave({ ...saved, events })).toBeNull();
  }
  expect(normalizeBeloteSave({ ...saved, savedAt: "not a date" })).toBeNull();
});

test("opponents and coaching cannot read the seed, concealed cards or unannounced Belote", () => {
  const state = createBeloteSession(1), hidden = structuredClone(state.hand);
  [hidden.hands[0], hidden.hands[3]] = [hidden.hands[3], hidden.hands[0]];
  hidden.stock.reverse(); hidden.seed = 999; hidden.beloteOwner = 1;
  const own = belotePosition(state.hand, 2), other = belotePosition(hidden, 2);
  expect(other).toEqual(own);
  expect(beloteGuidance(other)).toEqual(beloteGuidance(own));
  expect(chooseBeloteAction({ ...other, turn: 2 })).toEqual(chooseBeloteAction({ ...own, turn: 2 }));
  other.hand.length = 0;
  expect(state.hand.hands[2]).toHaveLength(5);
});

test("seven shared free topics contain 21 decisions and 21 distinct bounded follow-ups", () => {
  expect(gameAccess("belote")).toBe("Free");
  expect(getCatalogCategories().flatMap(c => c.entries).find(c => c.id === "belote")?.access).toBe("Free");
  expect(beloteCourses.map(c => c.pathStepId)).toEqual(beloteDef.learnSteps.map(s => s.id));
  for (const topic of beloteTopics) {
    const steps = beloteLearningSteps(topic.action);
    expect(steps.map(s => s.teaching.stage)).toEqual(["worked", "supported", "independent"]);
    expect(steps[2].teaching.guidance).toBeUndefined();
    for (const base of steps) {
      expect(base.followUp!.question).not.toEqual(base.question);
      expect(base.followUp!.followUp).toBeUndefined();
      for (const step of [base, base.followUp!]) {
        const q = step.question, answer = beloteRecommendedAnswer(q);
        expect(beloteAnswerChoices(q).some(c => c.id === answer)).toBe(true);
        expect(evaluateBeloteAnswer(q, answer)).toMatchObject({ good: true, illegal: false });
        const all = [...q.hand, ...(q.kind === "take" ? [q.upcard] : q.kind === "play" ? q.trick.map(p => p.card) : [])];
        expect(new Set(all.map(c => c.id)).size).toBe(all.length);
        if (q.kind === "play") {
          expect(nextBeloteSeat(q.trick.at(-1)!.seat)).toBe(2);
          for (let i = 1; i < q.trick.length; i++) expect(q.trick[i].seat).toBe(nextBeloteSeat(q.trick[i - 1].seat));
        }
      }
    }
  }
  let lesson = createLearningSession<ReturnType<typeof beloteLearningSteps>[number], { clean: boolean }, object>(beloteLearningSteps("values"));
  lesson = advanceLearningSession(checkLearningAnswer(lesson, { clean: false }, {}));
  expect(lesson.steps).toHaveLength(4);
  expect(lesson.steps[1].followUp).toBeUndefined();
  expect(lesson.phase).toBe("answer");
  expect(evaluateBeloteAnswer(beloteLearningSteps("partner")[0].question, "AC").reason).toBe("void_discard");
  expect(evaluateBeloteAnswer(beloteLearningSteps("trumping")[0].question, "7H").reason).toBe("trumped");
});

test("guided deals use the normal engine and stop without modifying saved matches", async () => {
  for (let seed = 0; seed < 20; seed++) {
    let state = createBeloteGuidedSession(seed);
    const initial = structuredClone(state);
    for (let moves = 0; !["complete", "passed_out"].includes(state.hand.phase); moves++) {
      expect(moves).toBeLessThan(30);
      const action = state.hand.phase === "review" ? { type: "next-trick" as const } : chooseBeloteAction(belotePosition(state.hand, 2));
      const expected = advanceBeloteOpponents(transitionBeloteSession(state, action));
      state = transitionBeloteGuidedSession(state, action);
      expect(state).toEqual(expected);
    }
    expect(state.handNumber).toBe(1);
    expect(replayBeloteGuidedSession(state)).toEqual(initial);
    expect(() => transitionBeloteGuidedSession(state, { type: "next-hand", seed: 9 })).toThrow();
  }
  expect(createBeloteSaveStore(() => undefined).load()).toBeNull();
  const feature = createBeloteFeature({ storage: () => undefined, nextSeed: () => 1, now: () => Date.parse("2026-11-25T12:00:00Z") });
  await feature.start();
  expect(get(feature).session).toBeTruthy();
  const saved = saveBeloteSession(get(feature).session!, "2026-11-25T12:00:00Z");
  expect(continueGames({ barbu: null, hearts: null, whist: null, spades: null, bridge: null, belote: saved }).map(g => g.id)).toContain("belote");
});
