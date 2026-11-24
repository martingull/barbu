import { expect, test } from "@playwright/test";
import { spadesChoiceSteps, spadesChoiceDecision } from "../../src/lessons/spades/choices";
import { suggestedSpadesBidForCards } from "../../src/domain/spadesBidding";
import { spadesPlayerSideSeats, spadesScoreForSide } from "../../src/domain/spadesScoring";
import { trickWinner } from "../../src/domain/trickTakingRules";
import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../src/domain/learningSession";
import { spadesCourses } from "../../src/lessons/spades/courses";
import { spadesDef } from "../../src/games/spades";
import type { DrillResult } from "../../src/lessons/drillDecision";
import type { DecisionReview } from "../../src/lessons/decisionReview";

test("Spades has nine distinct learning topics and preserves the existing progress keys", () => {
  expect(spadesDef.learnSteps.map(step => step.id)).toEqual(["spades-object", "spades-follow-suit", "spades-trump", "spades-leading", "spades-books", "spades-nil", "spades-bags", "spades-scoring", "spades-settlement"]);
  expect(new Set(spadesCourses.map(course => course.practiceTarget.kind === "practice" && course.practiceTarget.action)).size).toBe(9);
  expect(spadesCourses.map(course => course.pathStepId)).toEqual(spadesDef.learnSteps.map(step => step.id));
});

test("foundation, full-hand bidding and scoring questions use the live engines with three bounded companions", () => {
  for (const topic of ["object", "bid", "score", "settle"] as const) {
    const steps = spadesChoiceSteps(topic);
    expect(steps.map(step => step.teaching?.stage)).toEqual(["worked", "supported", "independent"]);
    expect(steps[0].teaching?.guidance).toBeTruthy();
    expect(steps[2].teaching?.guidance).toBeUndefined();
    const ids = new Set<string>();
    for (const base of steps) for (const step of [base, base.followUp!]) {
      expect(ids.has(step.id)).toBe(false); ids.add(step.id);
      expect(step.options).toHaveLength(3);
      expect(new Set(step.options.map(option => option.id)).size).toBe(3);
      expect(step.options.filter(option => spadesChoiceDecision(step, option.id).result.clean)).toHaveLength(1);
      if (step !== base) { expect(step.teaching?.stage).toBe("reinforcement"); expect(step.followUp).toBeUndefined(); }
      if (topic === "bid") {
        expect(step.hand).toHaveLength(13);
        expect(new Set(step.hand.map(card => card.id)).size).toBe(13);
        expect(step.correct).toBe(String(suggestedSpadesBidForCards(step.hand)));
      } else if (topic === "object") {
        expect(step.table).toHaveLength(4); expect(step.hand).toEqual([]);
        expect(new Set(step.table.map(play => play.card.id)).size).toBe(4);
        const winner = trickWinner(step.table, "S")!;
        expect(step.correct).toBe(step.id.includes("side")
          ? spadesPlayerSideSeats.includes(winner.seat) ? "You + Barbu" : "Left + Right" : winner.seat);
        expect(spadesChoiceDecision(step, step.correct).review.groups[0].cards).toHaveLength(4);
      } else {
        const position = step.score!;
        expect(Object.values(position.tricks).reduce((sum, value) => sum + value, 0)).toBe(13);
        expect(step.correct).toBe(String(spadesScoreForSide(position.tricks, position.bids, spadesPlayerSideSeats, position.carriedBags).score));
        expect(spadesChoiceDecision(step, step.correct).review.context).toContain("Bags carried in");
      }
      expect(() => spadesChoiceDecision(step, "missing")).toThrow(/Choose/);
    }
  }
  expect(spadesChoiceSteps("bid").map(step => step.correct)).toEqual(["4", "0", "6"]);
  expect(spadesChoiceSteps("score").map(step => step.correct)).toEqual(["51", "-139", "-58"]);
  expect(spadesChoiceSteps("settle").map(step => step.correct)).toEqual(["-50", "140", "60"]);
  expect(spadesChoiceSteps("settle").map(step => step.followUp!.correct)).toEqual(["-60", "131", "70"]);
});

test("a missed numeric answer is locked, inserts one fresh example and keeps original choices in review", () => {
  const steps = spadesChoiceSteps("bid"), first = steps[0];
  const selected = first.options.find(option => option.id !== first.correct)!.id;
  const answer = spadesChoiceDecision(first, selected);
  const checked = checkLearningAnswer(createLearningSession<typeof first, DrillResult, DecisionReview>(steps), answer.result, answer.review);
  expect(checkLearningAnswer(checked, spadesChoiceDecision(first, first.correct).result, answer.review)).toBe(checked);
  const next = advanceLearningSession(checked);
  expect(next.steps[1].id).toBe(first.followUp!.id);
  expect(next.reviews[0]).toEqual(answer.review);
  expect(next.reviews[0].groups[0].cards).toEqual(first.hand);
});
