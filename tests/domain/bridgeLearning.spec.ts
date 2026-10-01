import { expect, test } from "@playwright/test";
import { bridgeDef } from "../../src/games/bridge";
import { bridgeCourses } from "../../src/lessons/bridge/courses";
import { bridgeContractSteps, bridgeDummyDrillPool, bridgeDeclarerDrillPool } from "../../src/lessons/bridge/exercises";
import { legalCards } from "../../src/domain/trickTakingRules";

test("Bridge starts with contracts and separate hands without reusing declarer questions", () => {
  expect(bridgeDef.learnSteps.map(step => step.id)).toEqual([
    "bridge-contracts", "bridge-dummy", "bridge-bidding", "bridge-declarer", "bridge-defense"
  ]);
  expect(bridgeCourses.map(course => course.pathStepId)).toEqual(bridgeDef.learnSteps.map(step => step.id));
  expect(bridgeCourses.find(course => course.pathStepId === "bridge-dummy")!.practiceTarget).toMatchObject({ action: "dummy" });
  expect(bridgeContractSteps.map(step => step.contract.target)).toEqual([7, 9, 10]);
  expect(bridgeContractSteps.map(step => step.contract.strain)).toEqual(["H", "NT", "S"]);
  expect(bridgeDummyDrillPool).toHaveLength(3);
  expect(bridgeDummyDrillPool.map(step => step.playingSeat)).toEqual(["Tutor", "Tutor", "You"]);
  for (const step of bridgeDummyDrillPool) {
    expect(bridgeDeclarerDrillPool.some(other => other.scenarioId === step.scenarioId)).toBe(false);
    const trick = step.trick;
    expect(legalCards(trick.hand, trick.tableBeforeChoice[0]?.card.suit).map(card => card.id).sort()).toEqual([...trick.legalCardIds].sort());
    const plays = [...trick.tableBeforeChoice, { seat: step.playingSeat, card: trick.hand.find(card => card.id === trick.legalCardIds[0])! }, ...trick.tableAfterChoice];
    expect(new Set(plays.map(play => play.seat)).size).toBe(4);
    expect(new Set(plays.map(play => play.card.id)).size).toBe(4);
    expect(trick.hand.every(card => !step.referenceHand!.cards.some(other => card.id === other.id))).toBe(true);
  }
});

test("declarer exercises expose dummy's relevant cards without duplicating South's hand", () => {
  for (const step of bridgeDeclarerDrillPool) {
    expect(step.handLabel).toBe("South declarer: choose a card");
    const cards = step.referenceHand!.cards;
    expect(cards.length).toBeGreaterThan(0);
    expect(new Set(cards.map(card => card.id)).size).toBe(cards.length);
    expect(cards.every(card => !step.trick.hand.some(other => other.id === card.id))).toBe(true);
    const plays = [...step.trick.tableBeforeChoice, ...step.trick.tableAfterChoice];
    for (const play of plays) {
      expect(cards.some(card => card.id === play.card.id)).toBe(play.seat === "Tutor");
    }
  }
});
