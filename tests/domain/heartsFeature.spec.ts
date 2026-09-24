import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { createHeartsFeature } from "../../src/features/hearts/heartsFeature";
import { createWhistFeature } from "../../src/features/whist/whistFeature";
import { heartsSaveKey } from "../../src/persistence/heartsSave";
import { generateHeartsPracticeSet } from "../../src/domain/heartsPractice";
import { drillStepFromGeneratedScenario } from "../../src/lessons/generatedDrill";
import { drillDecision } from "../../src/lessons/drillDecision";

function setup() {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); } };
  let seed = 8;
  const options = { storage: () => storage, nextSeed: () => seed++, now: () => 1000 };
  return { data, options, feature: createHeartsFeature(options) };
}

test("Hearts passing and Whist play remain isolated with shared storage", async () => {
  const { feature, options, data } = setup();
  const whist = createWhistFeature(options);
  await feature.start();
  const ids = get(feature).session!.fullHand.playerHand.slice(0, 4).map(card => card.id);
  feature.selectPass(ids[0]);
  feature.openTable("learn");
  const saved = data.get(heartsSaveKey);
  await whist.start();
  whist.play(get(whist).session!.fullHand.legalCardIds[0]);
  expect(data.get(heartsSaveKey)).toBe(saved);
  feature.resume();
  expect(get(feature).session!.selectedPassCardIds).toEqual([ids[0]]);
  feature.selectPass(ids[1]);
  feature.selectPass(ids[2]);
  feature.selectPass(ids[3]);
  expect(get(feature).error).toContain("Remove one card");
  feature.pass();
  expect(get(feature).session!.phase).toBe("playing");
  expect(get(feature).session!.selectedPassCardIds).toEqual([]);
  expect(get(whist).session!.fullHand.completedTricks).toHaveLength(1);
});

test("Hearts double taps deal once, play once and preserve review on resume", async () => {
  const { feature, options } = setup();
  await Promise.all([feature.start(), feature.start()]);
  expect(get(feature).session!.fullHand.id).toContain("8");
  for (const card of get(feature).session!.fullHand.playerHand.slice(0, 3)) feature.selectPass(card.id);
  feature.pass();
  const cardId = get(feature).session!.fullHand.legalCardIds[0];
  feature.select(cardId);
  feature.select(cardId);
  const reviewed = get(feature).session!;
  expect(reviewed.fullHandReviewTrickCount).toBe(1);
  feature.play(reviewed.fullHand.legalCardIds[0]);
  expect(get(feature).session).toEqual(reviewed);
  const restored = createHeartsFeature(options);
  restored.resume();
  expect(get(restored).session).toEqual(reviewed);
  restored.nextTrick();
  expect(get(restored).session!.fullHandReviewTrickCount).toBe(0);
  expect(get(restored).selectedCardId).toBe("");
});

test("Hearts can resume in memory when storage is unavailable", async () => {
  const feature = createHeartsFeature({ storage: () => { throw Error("unavailable"); }, nextSeed: () => 4 });
  await feature.start();
  feature.selectPass(get(feature).session!.fullHand.playerHand[0].id);
  const session = get(feature).session;
  expect(get(feature).error).toContain("could not be saved");
  feature.openTable();
  feature.resume();
  expect(get(feature).session).toEqual(session);
});

test("generated lesson adapter preserves every Hearts decision and explanation", () => {
  for (const scenario of generateHeartsPracticeSet(12).scenarios) {
    const step = drillStepFromGeneratedScenario(scenario);
    expect(step.trick.legalCardIds).toEqual(scenario.legalCardIds);
    for (const outcome of scenario.outcomes) {
      const card = scenario.playerHand.find(card => card.id === outcome.cardId)!;
      const decision = drillDecision(step, card);
      expect(decision.result.outcome).toBe(outcome.outcomeKind);
      expect(decision.result.reason).toBe(outcome.reason);
      expect(decision.feedback).toBe(outcome.explanation);
    }
  }
});
