import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { createWhistFeature } from "../../src/features/whist/whistFeature";
import { whistSaveKey } from "../../src/persistence/whistSave";
import { drillDecision } from "../../src/lessons/drillDecision";
import { whistFollowSuitDrillPool } from "../../src/lessons/whist/exercises";

function setup() {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); } };
  let seed = 8;
  const options = { storage: () => storage, nextSeed: () => seed++, now: () => 1000 };
  return { data, options, feature: createWhistFeature(options) };
}

test("feature instances isolate hands, selections and mode", async () => {
  const first = setup().feature;
  const second = setup().feature;
  first.setMode("rubber");
  await first.start();
  expect(get(second).session).toBeNull();
  expect(get(second).mode).toBe("game");
  const hand = get(first).session!.fullHand;
  first.select(hand.legalCardIds[0]);
  expect(get(first).selectedCardId).toBe(hand.legalCardIds[0]);
  expect(get(second).selectedCardId).toBe("");
  first.openTable("learn");
  expect(get(first).selectedCardId).toBe("");
  first.resume();
  expect(get(first).session!.fullHand).toEqual(hand);
  expect(get(first).mode).toBe("rubber");
});

test("double taps deal once and play once before review", async () => {
  const { feature } = setup();
  await Promise.all([feature.start(), feature.start()]);
  expect(get(feature).session!.fullHand.id).toContain("8-");
  const cardId = get(feature).session!.fullHand.legalCardIds[0];
  feature.select(cardId);
  feature.select(cardId);
  expect(get(feature).session!.fullHand.completedTricks).toHaveLength(1);
  feature.play();
  feature.select(get(feature).session!.fullHand.legalCardIds[0]);
  expect(get(feature).session!.fullHand.completedTricks).toHaveLength(1);
  expect(get(feature).selectedCardId).toBe("");
  feature.nextTrick();
  expect(get(feature).session!.fullHandReviewTrickCount).toBe(0);
});

test("feature restores the existing save and remains resumable after a storage error", async () => {
  const { feature, options, data } = setup();
  data.set("another-game", "unchanged");
  await feature.start();
  feature.play(get(feature).session!.fullHand.legalCardIds[0]);
  const restored = createWhistFeature(options);
  restored.resume();
  expect(get(restored).session).toEqual(get(feature).session);
  expect(data.get("another-game")).toBe("unchanged");
  expect(data.has(whistSaveKey)).toBe(true);
  const blocked = createWhistFeature({ ...options, storage: () => { throw Error("unavailable"); } });
  await blocked.start();
  expect(get(blocked).error).toContain("could not be saved");
  const hand = get(blocked).session!.fullHand;
  blocked.openTable();
  blocked.resume();
  expect(get(blocked).session!.fullHand).toEqual(hand);
});

test("shared lesson decisions preserve authored legality, reasons and feedback", () => {
  for (const step of whistFollowSuitDrillPool) {
    for (const card of step.trick.hand) {
      const decision = drillDecision(step, card);
      const legal = step.trick.legalCardIds.includes(card.id);
      expect(decision.result.outcome).toBe(legal ? step.trick.cardOutcomes?.[card.id] ?? "good" : "illegal");
      if (!legal) expect(decision.result.reason).toBe("off_suit");
      if (step.trick.playedExplanations[card.id]) expect(decision.feedback).toBe(step.trick.playedExplanations[card.id]);
    }
  }
});
