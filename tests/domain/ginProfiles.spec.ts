import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { createGinSession, ginComplete, ginFinalScores, replayGinHand, scoreGinHand, transitionGinSession } from "../../src/domain/ginRummySession";
import { defaultGinSettings, ginRulesFor, isGinSettings, type GinSettings } from "../../src/domain/ginRummyRules";
import { chooseGinAction, ginObservation } from "../../src/domain/ginRummyPolicy";
import { createGinGuidedSession, replayGinGuidedSession } from "../../src/domain/ginRummyLearning";
import { ginSaveKey, normalizeGinSave, restoreGinSession, saveGinSession } from "../../src/persistence/ginRummySave";
import { createGinRummyFeature, ginSettingsKey } from "../../src/features/gin-rummy/ginRummyFeature";
import { ginDefinitionFor, ginTopics } from "../../src/games/ginRummy";
import { ginCoursesFor } from "../../src/lessons/gin-rummy/courses";
import { ginCards, ginExerciseAnswer, ginExerciseChoices, ginFeedbackBreakdown, ginLearningSteps, ginSettlementResult } from "../../src/lessons/gin-rummy/exercises";

const american: GinSettings = { profile: "american" };
const knock = ginCards("3C 4C 5C 7D 7H 7S 9H 10H JH 2D");
const tied = ginCards("AS 2S 3S 4H 5H 6H 8D 9D 10D 2H");

test("Gin scoring profiles change bonuses, not melds, layoffs or deals", () => {
  expect(ginRulesFor()).toMatchObject({ ginBonus: 20, undercutBonus: 10, boxBonus: 20, target: 100 });
  expect(ginRulesFor(american)).toEqual({ ginBonus: 25, undercutBonus: 25, boxBonus: 25, gameBonus: 100, knockLimit: 10, target: 100 });
  const classic = scoreGinHand([knock, tied], 0), changed = scoreGinHand([knock, tied], 0, american);
  expect(changed).toEqual({ ...classic, points: 25 });
  expect(classic.points).toBe(10);
  const gin = ginCards("3C 4C 5C 6C 7D 7H 7S 9H 10H JH"), defender = ginCards("AC 2C 6D 6H 6S 8D 9D 10D QC KC");
  expect(scoreGinHand([gin, defender], 0, american)).toMatchObject({ kind: "gin", winner: 0, points: 48 });
  expect(scoreGinHand([gin, defender], 0, american).layouts[1].layoffs).toEqual([]);
  expect(createGinSession(42, american).hand).toEqual(createGinSession(42).hand);
});

test("both profiles end at 100 and apply boxes and shutout only at the end", () => {
  const session = createGinSession(1, american);
  session.scores = [99, 40]; session.wins = [5, 2];
  expect(ginComplete(session)).toBe(false);
  expect(ginFinalScores(session)).toEqual([99, 40]);
  session.scores = [100, 40];
  expect(ginComplete(session)).toBe(true);
  expect(ginFinalScores(session)).toEqual([325, 90]);
  session.scores = [0, 100]; session.wins = [0, 5];
  expect(ginFinalScores(session)).toEqual([0, 425]);
  session.settings = { profile: "classic" };
  expect(ginComplete(session)).toBe(true);
  expect(ginFinalScores(session)).toEqual([0, 400]);
});

test("American matches retain rules through actual hand scoring, next deal, replay and event-log saves", () => {
  let session = createGinSession(1, american), actions = 0;
  while (!ginComplete(session) && actions++ < 2000) {
    if (session.hand.phase === "complete") {
      const dealer = session.hand.result!.winner ?? session.hand.dealer;
      session = transitionGinSession(session, { type: "next", seed: actions });
      expect(session.hand.dealer).toBe(dealer);
    } else session = transitionGinSession(session, chooseGinAction(ginObservation(session)));
    expect(session.settings).toEqual(american);
  }
  expect(ginComplete(session)).toBe(true);
  const saved = normalizeGinSave(saveGinSession(session, "now"))!;
  expect(restoreGinSession(saved)).toEqual(session);
  const replay = replayGinHand(session);
  expect(replay.settings).toEqual(american);
  expect(replay.handNumber).toBe(session.handNumber);
  expect(replay.hand.phase).toBe("offer");
  expect(() => transitionGinSession(session, { type: "next", seed: 5 })).toThrow(/complete/);
});

test("old saves default to Classic/100 and invalid explicit settings fail closed", () => {
  const { settings: _, ...oldSave } = saveGinSession(createGinSession(1), "now");
  expect(restoreGinSession(normalizeGinSave(oldSave)!).settings).toEqual(defaultGinSettings);
  for (const settings of [null, {}, { profile: "oklahoma" }, { profile: 1 }]) {
    expect(isGinSettings(settings)).toBe(false);
    expect(normalizeGinSave({ ...oldSave, settings })).toBeNull();
    expect(() => ginRulesFor(settings as GinSettings)).toThrow();
  }
});

test("preferences affect new play only, survive reload and never reinterpret an existing save", async () => {
  const records = new Map<string, string>();
  const storage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); }, removeItem: (key: string) => { records.delete(key); } };
  const options = { storage: () => storage, nextSeed: () => 1 };
  const { settings: _, ...legacy } = saveGinSession(createGinSession(1), "now");
  records.set(ginSaveKey, JSON.stringify(legacy));
  const feature = createGinRummyFeature(options);
  feature.selectSettings(american);
  expect(JSON.parse(records.get(ginSettingsKey)!)).toEqual(american);
  feature.resume();
  expect(get(feature).session!.settings).toEqual(defaultGinSettings);
  feature.selectSettings(defaultGinSettings);
  expect(get(feature.settings)).toEqual(american);
  feature.replay();
  expect(get(feature).session!.settings).toEqual(defaultGinSettings);
  feature.openTable(); await feature.start();
  expect(get(feature).session!.settings).toEqual(american);
  const reloaded = createGinRummyFeature(options);
  expect(get(reloaded.settings)).toEqual(american);
  reloaded.resume();
  expect(get(reloaded).session!.settings).toEqual(american);
});

test("profile-aware learning shares non-scoring progress and derives every settlement answer from Play", () => {
  expect(ginDefinitionFor(american).learnSteps.map(step => step.id)).toEqual(ginTopics.map(topic => topic.action === "settlement" ? "gin-american-settlement" : topic.id));
  expect(ginCoursesFor(american).map(course => course.pathStepId)).toEqual(ginDefinitionFor(american).learnSteps.map(step => step.id));
  expect(ginCoursesFor(american).find(course => course.id === "gin-gin")!.concept.points!.at(-1)!.text).toContain("plus 25");
  for (const settings of [defaultGinSettings, american]) for (const topic of ginTopics) {
    for (const base of ginLearningSteps(topic.action, settings)) for (const step of [base, base.followUp!]) {
      expect(step.settings).toEqual(settings);
      if (step.turn) expect(step.turn.session.settings).toEqual(settings);
      const correct = ginExerciseChoices(topic.action, step).filter(choice => ginExerciseAnswer(topic.action, step, choice.id).good);
      expect(correct.length).toBeGreaterThan(0);
      if (!step.settlement) continue;
      const result = scoreGinHand([step.hand, step.settlement.opponentHand], step.settlement.knocker, settings);
      expect(ginSettlementResult(step)).toEqual(result);
      expect(ginFeedbackBreakdown(topic.action, step, correct[0].id).rows).toContainEqual({ label: "Undercut bonus", value: `${ginRulesFor(settings).undercutBonus} points` });
    }
  }
  const guided = createGinGuidedSession(1, american);
  expect(guided.session.settings).toEqual(american);
  expect(replayGinGuidedSession(guided)).toEqual(guided);
});
