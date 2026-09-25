import { expect, test } from "@playwright/test";
import { heartsIntroductionSteps } from "../../src/lessons/hearts/introduction";
import { drillDecision } from "../../src/lessons/drillDecision";
import { generateHeartsPracticeSet } from "../../src/domain/heartsPractice";

test("Hearts introduction always advances from following suit to avoiding points and moving the queen", () => {
  for (const seed of [0, 1, 2, 10, Number.MAX_SAFE_INTEGER]) {
    const steps = heartsIntroductionSteps(seed);
    expect(steps.map(step => step.trick.title)).toEqual(["Follow suit", "Avoid a heart", "Move the queen"]);
    expect(new Set(steps.map(step => step.scenarioId)).size).toBe(3);
    expect(new Set(steps.map(step => step.trick.beforeResult)).size).toBe(3);
    for (const [index, id] of ["3C", "2C", "QS"].entries()) {
      const step = steps[index];
      const card = step.trick.hand.find(card => card.id === id)!;
      expect(drillDecision(step, card).result.outcome).toBe("good");
    }
    expect(heartsIntroductionSteps(seed)).toEqual(steps);
    expect(generateHeartsPracticeSet(seed, "first-trick").scenarios.every(scenario => scenario.title === "First trick")).toBe(true);
  }
});
