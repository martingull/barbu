import { expect, test } from "@playwright/test";
import { createEuchreGuidedSession, transitionEuchreGuidedSession, replayEuchreGuidedSession,
  evaluateEuchreAnswer, euchreGuidance, euchreRecommendedChoice } from "../../src/domain/euchreLearning";
import { createEuchreSession, euchrePosition, transitionEuchreSession } from "../../src/domain/euchreSession";
import { advanceEuchreOpponents, chooseEuchreAction, euchreUnseenCards } from "../../src/domain/euchrePolicy";
import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../src/domain/learningSession";
import { euchreCards, euchreExercises, euchreLearningSteps, euchreExerciseChoices, euchreExerciseFeedback, euchreExerciseGroups } from "../../src/lessons/euchre/exercises";
import { euchreCourses } from "../../src/lessons/euchre/courses";
import { euchreDef } from "../../src/games/euchre";
import { gameAccess } from "../../src/games/accessPolicy";
import { getCatalogCategories, isCatalogGameAvailable } from "../../src/games/tableFactory";
import { createEuchreSaveStore, saveEuchreSession } from "../../src/persistence/euchreSave";
import { continueGames } from "../../src/features/catalog/catalogPresentation";
import { euchreRecap, euchreTrickFeedback } from "../../src/features/euchre/euchrePresentation";

test("six Euchre topics contain 18 staged decisions and 18 distinct bounded companions", () => {
  const expected: Record<string, string[]> = { bowers: ["JH", "JC", "JD"], follow: ["JD", "10D", "9S"],
    order: ["H", "pass", "9D"], second: ["H", "S", "pass"], partner: ["9C", "QS", "9D"], score: ["0:1", "0:4", "0:2"] };
  expect(euchreDef.learnSteps).toHaveLength(6);
  expect(euchreCourses.map(course => course.pathStepId)).toEqual(euchreDef.learnSteps.map(step => step.id));
  const ids = new Set<string>();
  for (const [action, answers] of Object.entries(expected)) {
    const steps = euchreLearningSteps(action);
    expect(steps.map(step => step.teaching?.stage)).toEqual(["worked", "supported", "independent"]);
    expect(steps[0].teaching?.guidance).toBeTruthy();
    expect(steps[2].teaching?.guidance).toBeUndefined();
    expect(steps.map(step => euchreRecommendedChoice(step))).toEqual(answers);
    for (const base of steps) for (const step of [base, base.followUp!]) {
      expect(ids.has(step.id)).toBe(false); ids.add(step.id);
      expect(step.hand.length).toBe(step.kind === "score" ? 0 : step.kind === "discard" ? 6 : 5);
      const cards = [...step.hand, ...(step.upcard ? [step.upcard] : []), ...(step.trick ?? []).map(play => play.card)];
      expect(new Set(cards.map(card => card.id)).size).toBe(cards.length);
      expect(euchreExerciseChoices(step).some(choice => evaluateEuchreAnswer(step, choice.id).good)).toBe(true);
      expect(euchreExerciseFeedback(step, euchreRecommendedChoice(step)).length).toBeGreaterThan(40);
      expect(step.followUp?.followUp).toBeUndefined();
      expect(euchreExerciseGroups(step).flatMap(group => group.cards)).toEqual([
        ...(step.upcard ? [step.upcard] : []), ...(step.trick ?? []).map(play => play.card), ...step.hand]);
    }
  }
  expect(ids.size).toBe(36);
});

test("Euchre advice distinguishes a legal risky call from a forbidden second-round suit", () => {
  const weak = euchreExercises.order[1];
  expect(evaluateEuchreAnswer(weak, weak.upcard!.suit)).toMatchObject({ good: false, illegal: false });
  const second = euchreExercises.second[0];
  expect(evaluateEuchreAnswer(second, second.upcard!.suit)).toMatchObject({ good: false, illegal: true });
  const follows = euchreExercises.follow[0];
  expect(evaluateEuchreAnswer(follows, "JD")).toMatchObject({ good: true, illegal: false });
  expect(evaluateEuchreAnswer(follows, "AD")).toMatchObject({ good: false, illegal: true });
});

test("one wrong decision adds only its different companion and cannot finish early", () => {
  const steps = euchreLearningSteps("bowers");
  let state = createLearningSession<typeof steps[number], { clean: boolean }, object>(steps);
  expect(advanceLearningSession(state)).toBe(state);
  state = checkLearningAnswer(state, { clean: false }, {});
  state = advanceLearningSession(state);
  expect(state.steps).toHaveLength(4);
  expect(state.steps[1].id).toBe(steps[0].followUp!.id);
  state = advanceLearningSession(checkLearningAnswer(state, { clean: false }, {}));
  expect(state.steps).toHaveLength(4);
  expect(state.phase).toBe("answer");
});

test("guided Euchre uses normal opponents, stops after one hand and replays without storage", () => {
  for (let seed = 0; seed < 30; seed++) {
    let state = createEuchreGuidedSession(seed), decisions = 0;
    const initial = structuredClone(state);
    while (!["complete", "passed_out"].includes(state.session.hand.phase)) {
      expect(decisions++).toBeLessThan(40);
      const action = state.session.hand.phase === "review" ? { type: "next-trick" as const }
        : chooseEuchreAction(euchrePosition(state.session.hand, 2));
      if (action.type === "next-hand") throw Error("Guided play must stop after one hand");
      const expected = advanceEuchreOpponents(transitionEuchreSession(state.session, action));
      state = transitionEuchreGuidedSession(state, action);
      expect(state.session).toEqual(expected);
    }
    expect(state.session.handNumber).toBe(1);
    expect(replayEuchreGuidedSession(state)).toEqual(initial);
    expect(transitionEuchreGuidedSession(state, { type: "pass" })).toBe(state);
    for (const moment of euchreRecap(state.session.hand)) {
      expect(moment.cards).toHaveLength(state.session.hand.inactiveSeat === null ? 4 : 3);
      expect(moment.explanation).toContain("wins");
    }
  }
});

test("Euchre coaching and policy are invariant under concealed-card rearrangement", () => {
  let session = createEuchreSession(1);
  const before = structuredClone(session.hand);
  [before.hands[0], before.hands[3]] = [before.hands[3], before.hands[0]];
  before.kitty.reverse(); before.seed = 999;
  expect(euchreGuidance(euchrePosition(before, 2))).toEqual(euchreGuidance(euchrePosition(session.hand, 2)));
  session = advanceEuchreOpponents(transitionEuchreSession(session, { type: "call", trump: session.hand.upcard.suit }));
  const position = euchrePosition(session.hand, 2);
  expect(euchreUnseenCards(position).every(card => !position.hand.some(held => held.id === card.id))).toBe(true);
  expect(euchreGuidance(position).tip).toContain("three");
});

test("Euchre preserves a secure partner winner and values an outside ace before a low trump lead", () => {
  const partner = euchreExercises.partner[0];
  expect(euchreRecommendedChoice(partner)).toBe("9C");
  const session = createEuchreSession(1);
  const position = { ...euchrePosition(session.hand, 2), phase: "playing" as const,
    contract: { maker: 1 as const, trump: "H" as const, alone: false }, hand: euchreCards("9H AC KD QS 10D") };
  const before = JSON.stringify(position);
  expect(chooseEuchreAction(position)).toEqual({ type: "play-card", cardId: "AC" });
  expect(JSON.stringify(position)).toBe(before);
});

test("Euchre uses the existing Premium entitlement and hides saved resume when access expires", () => {
  expect(gameAccess("euchre")).toBe("Premium");
  const now = Date.now(), customer = { verification: "verified" as const, entitlement: "premium" as const,
    active: true, checkedAt: now, expiresAt: now + 60000, willRenew: true };
  const context = { premiumAvailable: true, customer };
  expect(getCatalogCategories(context).flatMap(group => group.entries).find(entry => entry.id === "euchre")?.access).toBe("Premium");
  expect(isCatalogGameAvailable("euchre", context, now)).toBe(true);
  expect(isCatalogGameAvailable("euchre", context, now + 60001)).toBe(false);
  const saved = saveEuchreSession(createEuchreSession(1), new Date(now).toISOString());
  const saves = { barbu: null, hearts: null, whist: null, spades: null, bridge: null, euchre: saved };
  expect(continueGames(saves, context).map(game => game.id)).toContain("euchre");
  expect(continueGames(saves, { premiumAvailable: true, customer: { ...customer, active: false } })).toEqual([]);
  expect(createEuchreSaveStore(() => undefined).load()).toBeNull();
});

test("old preview saves gain validated summary caches without losing their actions", () => {
  const saved = saveEuchreSession(createEuchreSession(1), "2026-11-23T12:00:00Z");
  const legacy = { ...saved } as Partial<typeof saved>;
  delete legacy.scores; delete legacy.handNumber;
  const store = createEuchreSaveStore(() => ({ getItem: () => JSON.stringify(legacy), setItem() {}, removeItem() {} }));
  expect(store.load()).toEqual(saved);
});
