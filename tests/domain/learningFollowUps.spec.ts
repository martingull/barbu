import { expect, test } from "@playwright/test";
import templates from "../../content/hearts-follow-ups.json" with { type: "json" };
import { heartsPracticeTopics, generateHeartsPracticeFollowUp, generateHeartsPassFollowUp, evaluateHeartsPass } from "../../src/domain/heartsPractice";
import { heartsPoints, legalHeartsCards } from "../../src/domain/heartsRules";
import { insertLearningFollowUp } from "../../src/domain/learningSequence";
import { trickWinner } from "../../src/domain/trickTakingRules";
import { heartsPracticeSteps, heartsPassingSteps } from "../../src/lessons/hearts/exercises";
import { drillDecision, drillTableCards } from "../../src/lessons/drillDecision";
import { ginExercises, ginLearningSteps, ginExerciseAnswer, ginExerciseChoices, ginSelectsDiscard } from "../../src/lessons/gin-rummy/exercises";
import { standardDeck } from "../../src/domain/deck";

test("all Hearts practice positions have distinct bounded follow-ups graded by Hearts rules", () => {
  const seen = new Set<string>();
  for (const focus of heartsPracticeTopics) {
    const steps = heartsPracticeSteps(0, focus);
    expect(steps).toHaveLength(3);
    for (const step of steps) {
      const follow = step.followUp!;
      const template = templates.find(item => item.parentId === step.scenarioId)!;
      seen.add(template.parentId);
      expect(follow.followUp).toBeUndefined();
      expect(follow.trick.hand).not.toEqual(step.trick.hand);
      expect(follow.trick.hand.some(card => drillDecision(follow, card).result.clean)).toBe(true);
      const scenario = generateHeartsPracticeFollowUp(step.scenarioId!, focus);
      const cards = [...scenario.playerHand, ...scenario.tableBeforeChoice.map(play => play.card), ...scenario.tableAfterChoice.map(play => play.card)];
      expect(new Set(cards.map(card => card.id)).size).toBe(cards.length);
      for (const card of cards) expect(standardDeck()).toContainEqual(card);
      const legal = focus === "score-hand" ? scenario.playerHand : legalHeartsCards(scenario.playerHand,
        scenario.tableBeforeChoice.length ? scenario.ledSuit : undefined, focus === "first-trick", template.heartsBroken ?? true);
      expect(scenario.legalCardIds).toEqual(legal.map(card => card.id));
      for (const outcome of scenario.outcomes) {
        const card = scenario.playerHand.find(card => card.id === outcome.cardId)!;
        expect(drillDecision(follow, card).result.outcome).toBe(outcome.outcomeKind);
        if (focus === "score-hand") {
          expect(outcome.outcomeKind === "good").toBe(heartsPoints(card) === template.targetPoints);
          expect(drillTableCards(follow, card)).toEqual([]);
        }
        if (outcome.completedTrick) {
          expect(outcome.completedTrick).toHaveLength(4);
          expect(new Set(outcome.completedTrick.map(play => play.seat)).size).toBe(4);
          expect(outcome.winner).toBe(trickWinner(outcome.completedTrick)!.seat);
          expect(outcome.penalty).toBe(outcome.completedTrick.reduce((sum, play) => sum + heartsPoints(play.card), 0));
          if (focus === "stop-moon") expect(outcome.outcomeKind === "good").toBe(outcome.winner === "You" && outcome.penalty! > 0);
        }
      }
      expect(insertLearningFollowUp(steps, 0, true, follow)).toEqual(steps);
    }
    let sequence = steps;
    for (let index = 0; index < sequence.length; index++) {
      sequence = insertLearningFollowUp(sequence, index, false, sequence[index].followUp);
    }
    expect(sequence).toHaveLength(6);
    expect(steps).toHaveLength(3);
  }
  expect(seen.size).toBe(18);
  expect(() => generateHeartsPracticeFollowUp("hearts-queen-duck", "score-hand")).toThrow("Unknown Hearts follow-up");
});

test("Gin companions retain the skill with valid hands, fresh cards and solver-checked answers", () => {
  for (const [action, originals] of Object.entries(ginExercises)) {
    const steps = ginLearningSteps(action);
    expect(steps).toHaveLength(3);
    for (const [index, step] of steps.entries()) {
      const follow = step.followUp!;
      expect(follow.followUp).toBeUndefined();
      expect(follow.hand).not.toEqual(step.hand);
      expect(follow.hand).toHaveLength(ginSelectsDiscard(action) ? 11 : 10);
      const cards = [...follow.hand, ...(follow.upcard ? [follow.upcard] : [])];
      expect(new Set(cards.map(card => card.id)).size).toBe(cards.length);
      const good = ginExerciseChoices(action, follow).filter(choice => ginExerciseAnswer(action, follow, choice.id).good);
      expect(good.length).toBeGreaterThan(0);
      expect(good.length).toBeLessThan(ginExerciseChoices(action, follow).length);
      if (action === "knock") expect(good.map(choice => choice.id)).toEqual([["knock"], ["continue"], ["knock"]][index]);
      if (action === "draw") expect(good.map(choice => choice.id)).toEqual([["upcard"], ["stock"], ["upcard"]][index]);
      if (action === "deadwood") expect(good.map(choice => choice.id)).toEqual([["3"], ["10"], ["16"]][index]);
      expect(originals[index].followUp).toBeUndefined();
    }
    let sequence = steps;
    for (let index = 0; index < sequence.length; index++) sequence = insertLearningFollowUp(sequence, index, false, sequence[index].followUp);
    expect(sequence).toHaveLength(6);
    expect(steps).toHaveLength(3);
  }
  const example = ginLearningSteps("knock")[0].followUp!;
  expect(ginExerciseAnswer("knock", example, "continue")).toMatchObject({ good: false });
  expect(ginExerciseAnswer("knock", example, "continue").illegal).toBeUndefined();
  expect(ginExerciseAnswer("knock", example, "gin")).toMatchObject({ good: false, illegal: true });
});

test("passing companions keep three defensive goals with fresh hands and bounded retries", () => {
  for (const seed of [0, 1, 2, 42, 101]) {
    const steps = heartsPassingSteps(seed);
    expect(steps).toHaveLength(3);
    expect(new Set(steps.map(step => step.title)).size).toBe(3);
    for (const [index, step] of steps.entries()) {
      const follow = step.followUp!;
      expect(follow.title).toBe(step.title);
      expect(follow.followUp).toBeUndefined();
      expect(follow.playerHand).not.toEqual(step.playerHand);
      expect(follow.playerHand).toHaveLength(13);
      expect(new Set(follow.playerHand.map(card => card.id)).size).toBe(13);
      for (const card of follow.playerHand) expect(standardDeck()).toContainEqual(card);
      for (const plan of [follow.recommendedPass.map(card => card.id), ...follow.alternatives.map(plan => plan.cardIds)]) {
        expect(new Set(plan).size).toBe(3);
        expect(plan.every(id => follow.playerHand.some(card => card.id === id))).toBe(true);
        expect(evaluateHeartsPass(follow, plan).outcomeKind).toBe("good");
        expect(insertLearningFollowUp(steps, index, true, follow)).toEqual(steps);
      }
      const expanded = insertLearningFollowUp(steps, index, false, follow);
      expect(expanded[index + 1]).toBe(follow);
      expect(expanded).toHaveLength(4);
      expect(insertLearningFollowUp(expanded, index + 1, false, follow.followUp)).toEqual(expanded);
      const ids = follow.recommendedPass.map(card => card.id);
      for (const invalid of [[], ids.slice(0, 2), [ids[0], ids[0], ids[1]], [...ids, ids[0]], [ids[0], ids[1], "missing"]]) {
        expect(evaluateHeartsPass(follow, invalid)).toMatchObject({ isComplete: false, outcomeKind: "illegal" });
      }
    }
  }
  expect(evaluateHeartsPass(generateHeartsPassFollowUp(0), ["QS", "QH", "AH"]).explanation).toContain("low cover");
  expect(evaluateHeartsPass(generateHeartsPassFollowUp(1), ["QS", "2C", "3C"]).explanation).toContain("low clubs");
  expect(evaluateHeartsPass(generateHeartsPassFollowUp(2), ["QC", "AC", "AH"]).explanation).toContain("Leaving even the low club");
  expect(generateHeartsPassFollowUp(2).recommendedPass.every(card => card.suit === "C")).toBe(true);
  const fresh = generateHeartsPassFollowUp(1);
  fresh.playerHand[0].id = "changed";
  fresh.alternatives[0].cardIds[0] = "changed";
  expect(generateHeartsPassFollowUp(1).playerHand[0].id).not.toBe("changed");
  expect(generateHeartsPassFollowUp(1).alternatives[0].cardIds[0]).not.toBe("changed");
  for (const seed of [-1, NaN, 0.5]) expect(() => generateHeartsPassFollowUp(seed)).toThrow();
});
