import { expect, test } from "@playwright/test";
import { heartsIntroductionSteps } from "../../src/lessons/hearts/introduction";
import { drillDecision, drillTableCards } from "../../src/lessons/drillDecision";
import { generateHeartsPracticeSet } from "../../src/domain/heartsPractice";
import { insertLearningFollowUp } from "../../src/domain/learningSequence";
import { trickWinner } from "../../src/domain/trickTakingRules";
import { heartsGuidance } from "../../src/features/hearts/heartsGuidance";
import { heartsHandEngine } from "../../src/domain/handEngine";
import { heartsHaveBeenBroken } from "../../src/domain/heartsRules";

test("Hearts foundations teach suit, winner, points and avoidance in order", () => {
  for (const seed of [0, 1, 2, 10, Number.MAX_SAFE_INTEGER]) {
    const steps = heartsIntroductionSteps(seed);
    expect(steps.map(step => step.trick.title)).toEqual(["Follow suit", "Who wins the trick?", "Who takes the point?", "Avoid a heart", "Avoid the queen"]);
    expect(new Set(steps.map(step => step.scenarioId)).size).toBe(5);
    expect(new Set(steps.map(step => step.trick.beforeResult)).size).toBe(5);
    for (const [index, id] of ["3C", "KC", "JD", "3C", "2D"].entries()) {
      const step = steps[index];
      const card = step.trick.hand.find(card => card.id === id)!;
      expect(drillDecision(step, card).result.outcome).toBe("good");
    }
    expect(heartsIntroductionSteps(seed)).toEqual(steps);
    expect(new Set(generateHeartsPracticeSet(seed, "first-trick").scenarios.map(scenario => scenario.title)).size).toBe(3);
  }
});

test("identification never plays a fifth card or highlights the answer", () => {
  for (const step of heartsIntroductionSteps(0).flatMap(step => [step, step.followUp!])) {
    const table = step.trick.tableBeforeChoice;
    expect(new Set(table.map(play => play.seat)).size).toBe(table.length);
    if (step.choiceMode === "identify") {
      expect(step.trick.legalCardIds).toEqual(step.trick.hand.map(card => card.id));
      for (const card of step.trick.hand) {
        expect(drillTableCards(step, card)).toEqual(table);
        expect(drillDecision(step, card).result.clean).toBe(card.id === trickWinner(table)!.card.id);
      }
    } else {
      expect(table.some(play => step.trick.hand.some(card => card.id === play.card.id))).toBe(false);
      expect([...table.map(play => play.card.id), ...step.trick.hand.map(card => card.id)]).not.toContain("2C");
    }
  }
});

test("a missed concept gets one different follow-up without mutating the course", () => {
  const steps = heartsIntroductionSteps(0);
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    const retry = step.followUp!;
    expect(retry.followUp).toBeUndefined();
    expect(retry.trick.tableBeforeChoice).not.toEqual(step.trick.tableBeforeChoice);
    expect(retry.trick.hand.some(card => drillDecision(retry, card).result.clean)).toBe(true);
    expect(insertLearningFollowUp(steps, index, true, retry)).toEqual(steps);
    const expanded = insertLearningFollowUp(steps, index, false, retry);
    expect(expanded[index + 1]).toBe(retry);
    expect(expanded).toHaveLength(6);
    expect(insertLearningFollowUp(expanded, index + 1, false, retry.followUp)).toEqual(expanded);
  }
  expect(steps).toHaveLength(5);
});

test("guided hand copy distinguishes following, discarding and the all-hearts exception", () => {
  const hand = heartsHandEngine.start({ seed: 42 });
  const steps = heartsIntroductionSteps(0);
  const heart = steps[0].trick.hand.find(card => card.suit === "H")!;
  const club = steps[0].trick.hand.find(card => card.suit === "C")!;
  expect(heartsGuidance({ ...hand, trickNumber: 1, currentTrick: [{ seat: "Left", card: club }], playerHand: [heart] }).rule).toContain("discard without points if you can");
  expect(heartsGuidance({ ...hand, trickNumber: 1, currentTrick: [] }).rule).toContain("must lead it");
  const later = { ...hand, trickNumber: 5, currentTrick: [], completedTricks: [], playerHand: [heart] };
  expect(heartsGuidance(later).rule).toContain("Only hearts remain");
  expect(heartsHaveBeenBroken(later)).toBe(false);
  expect(heartsHaveBeenBroken({ ...later, currentTrick: [{ seat: "You", card: heart }] })).toBe(true);
  const following = { ...later, currentTrick: [{ seat: "Left" as const, card: club }], playerHand: [club] };
  expect(heartsGuidance(following).rule).toContain("must follow clubs");
  expect(heartsGuidance({ ...following, playerHand: [heart] }).rule).toContain("any card is legal");
  expect(heartsGuidance({ ...following, hands: [[], [], [], []] })).toEqual(heartsGuidance(following));
});
