import { test, expect } from "@playwright/test";
import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../src/domain/learningSession";
import { heartsPracticeSteps, heartsPassingSteps, heartsPassBreakdown } from "../../src/lessons/hearts/exercises";
import { ginLearningSteps, ginExercises, ginExerciseChoices, ginExerciseAnswer, ginFeedbackBreakdown } from "../../src/lessons/gin-rummy/exercises";
import { heartsPracticeTopics } from "../../src/domain/heartsPractice";
import { drillDecision } from "../../src/lessons/drillDecision";

type Step = { id: string; followUp?: Step };
type Result = { clean: boolean; choice: string };
type Review = { explanation: string };
const start = () => createLearningSession<Step, Result, Review>([
  { id: "first", followUp: { id: "companion", followUp: { id: "not-allowed" } } }, { id: "second" }
]);

test("lesson controller gates checks and advances, records feedback once and completes once", () => {
  const initial = start();
  expect(advanceLearningSession(initial)).toBe(initial);
  const checked = checkLearningAnswer(initial, { clean: true, choice: "a" }, { explanation: "why" });
  expect(initial.phase).toBe("answer");
  expect(initial.results).toEqual([]);
  expect(checked.phase).toBe("feedback");
  expect(checkLearningAnswer(checked, { clean: false, choice: "b" }, { explanation: "changed" })).toBe(checked);
  const next = advanceLearningSession(checked);
  expect(next).toMatchObject({ phase: "answer", index: 1 });
  expect(advanceLearningSession(next)).toBe(next);
  const last = checkLearningAnswer(next, { clean: true, choice: "c" }, { explanation: "last" });
  expect(last.phase).not.toBe("complete");
  const complete = advanceLearningSession(last);
  expect(complete.phase).toBe("complete");
  expect(complete.results.map(result => result.choice)).toEqual(["a", "c"]);
  expect(complete.reviews.map(review => review.explanation)).toEqual(["why", "last"]);
  expect(advanceLearningSession(complete)).toBe(complete);
  expect(checkLearningAnswer(complete, { clean: true, choice: "d" }, { explanation: "extra" })).toBe(complete);
  expect(start()).toEqual(initial);
  expect(() => createLearningSession([])).toThrow("at least one decision");
});

test("a missed decision inserts one companion, including at the end, without recursive retries", () => {
  let session = start();
  for (let i = 0; i < 3; i++) {
    session = checkLearningAnswer(session, { clean: false, choice: String(i) }, { explanation: String(i) });
    session = advanceLearningSession(session);
  }
  expect(session.phase).toBe("complete");
  expect(session.steps.map(step => step.id)).toEqual(["first", "companion", "second"]);
  expect(session.results).toHaveLength(3);
  let last = createLearningSession<Step, Result, Review>([{ id: "last", followUp: { id: "extra" } }]);
  last = advanceLearningSession(checkLearningAnswer(last, { clean: false, choice: "x" }, { explanation: "try again" }));
  expect(last).toMatchObject({ phase: "answer", index: 1 });
  expect(last.steps).toHaveLength(2);
});

test("Hearts and Gin expose the same ordered teaching stages and one reinforcement per decision", () => {
  for (const seed of [0, 1, 42]) {
    const lessons = [...heartsPracticeTopics.map(focus => heartsPracticeSteps(seed, focus)), heartsPassingSteps(seed),
      ...Object.keys(ginExercises).map(ginLearningSteps)];
    for (const steps of lessons) {
      expect(steps.map(step => step.teaching?.stage)).toEqual(["worked", "supported", "independent"]);
      expect(steps[0].teaching?.guidance).toBeTruthy();
      expect(steps[1].teaching?.guidance).toBeTruthy();
      expect(steps[2].teaching?.guidance).toBeUndefined();
      expect(steps.every(step => step.followUp?.teaching?.stage === "reinforcement")).toBe(true);
    }
    for (const focus of heartsPracticeTopics) {
      expect(heartsPracticeSteps(seed, focus).map(step => step.scenarioId)).toEqual(heartsPracticeSteps(0, focus).map(step => step.scenarioId));
    }
  }
});

test("structured feedback uses real card points and meld solutions, not a generic scoring rule", () => {
  for (const step of heartsPracticeSteps(0, "avoid-hearts")) {
    for (const card of step.trick.hand) {
      const rows = step.breakdownByCard![card.id].rows;
      if (drillDecision(step, card).result.outcome === "illegal") expect(rows.map(row => row.label)).toEqual(["Legal cards"]);
      else {
        expect(rows.map(row => row.label)).toEqual(["Winner", "Hearts", "Q♠", "Trick points"]);
        expect(Number(rows[3].value)).toBe(Number(rows[1].value.split(" = ")[1]) + Number(rows[2].value));
      }
    }
  }
  const pass = heartsPassingSteps(0)[0];
  expect(heartsPassBreakdown(pass, pass.recommendedPass.map(card => card.id)).rows[0].value).toContain("Q♠");
  const gin = ginLearningSteps("gin")[0];
  const good = ginExerciseChoices("gin", gin).find(choice => ginExerciseAnswer("gin", gin, choice.id).good)!;
  expect(ginFeedbackBreakdown("gin", gin, good.id).rows.at(-1)).toEqual({ label: "Deadwood", value: "0 points" });
  expect(ginFeedbackBreakdown("draw", ginLearningSteps("draw")[0], "stock").rows.at(-1)).toEqual({ label: "Stock", value: "Unknown card" });
});
