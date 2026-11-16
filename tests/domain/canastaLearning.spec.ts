import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { createGuidedHandFeature } from "../../src/features/guidedHandFeature";
import { createCanastaGuidedSession, transitionCanastaGuidedSession, replayCanastaGuidedSession, canastaGuidance, canastaGuidedRecap } from "../../src/domain/canastaLearning";
import { canastaObservation, chooseCanastaAction } from "../../src/domain/canastaPolicy";
import { canastaLearningSteps, canastaExerciseChoices, answerCanastaExercise, canastaFeedbackBreakdown } from "../../src/lessons/canasta/exercises";
import { canastaTopics } from "../../src/games/canasta";
import { canastaDef } from "../../src/games/canasta";
import { canastaCourses } from "../../src/lessons/canasta/courses";
import { canastaValue, canastaDeck } from "../../src/domain/canastaRules";
import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../src/domain/learningSession";

test("Canasta topics have staged decisions and bounded, different companions", () => {
  expect(canastaTopics).toHaveLength(7);
  for (const { action } of canastaTopics) {
    const steps = canastaLearningSteps(action);
    expect(steps.map(step => step.teaching?.stage)).toEqual(["worked", "supported", "independent"]);
    expect(steps[2].teaching?.guidance).toBeUndefined();
    for (const step of steps) {
      expect(step.followUp).toBeDefined();
      expect(step.followUp!.followUp).toBeUndefined();
      expect(step.followUp!.session.hand.hands[0]).not.toEqual(step.session.hand.hands[0]);
      for (const position of [step, step.followUp!]) {
        const answers = canastaExerciseChoices(action, position).map(choice => answerCanastaExercise(action, position, choice.id));
        expect(answers.some(answer => answer.good), `${action}: ${position.title}`).toBe(true);
        expect(canastaFeedbackBreakdown(action, position).rows.length).toBeGreaterThan(1);
        expect(answerCanastaExercise(action, position, "unknown").good).toBe(false);
      }
    }
    let lesson = createLearningSession<typeof steps[number], { clean: boolean }, string>(steps);
    lesson = checkLearningAnswer(lesson, { clean: false }, "original answer");
    expect(checkLearningAnswer(lesson, { clean: true }, "second click")).toBe(lesson);
    lesson = advanceLearningSession(lesson);
    expect(lesson.steps).toHaveLength(4);
    expect(lesson.steps[1].teaching?.stage).toBe("reinforcement");
    lesson = advanceLearningSession(checkLearningAnswer(lesson, { clean: false }, "companion"));
    expect(lesson.steps).toHaveLength(4);
  }
});

test("Canasta introduces card values before melds and preserves existing progress ids", () => {
  expect(canastaTopics.map(topic => topic.id)).toEqual(["canasta-values", "canasta-melds", "canasta-opening", "canasta-pile", "canasta-discard", "canasta-finish", "canasta-score"]);
  expect(canastaDef.learnSteps[0].decisionFirst).toBe(false);
  expect(canastaCourses.map(course => course.pathStepId)).toEqual(canastaTopics.map(topic => topic.id));
  expect(canastaCourses[0].practiceTarget).toEqual({ kind: "practice", game: "canasta", action: "values" });
  const expected: Record<string, number> = { "3": 5, "4": 5, "5": 5, "6": 5, "7": 5, "8": 10, "9": 10, "10": 10, J: 10, Q: 10, K: 10, A: 20, "2": 20, Joker: 50 };
  for (const card of canastaDeck(0)) expect(canastaValue(card)).toBe(expected[card.rank]);
  for (const step of canastaLearningSteps("values").flatMap(step => [step, step.followUp!])) {
    const before = structuredClone(step.session);
    const total = step.session.hand.hands[0].reduce((sum, card) => sum + canastaValue(card), 0);
    const choices = canastaExerciseChoices("values", step);
    expect(new Set(choices.map(choice => choice.id)).size).toBe(3);
    expect(choices.filter(choice => answerCanastaExercise("values", step, choice.id).good).map(choice => choice.id)).toEqual([String(total)]);
    expect(canastaFeedbackBreakdown("values", step).rows.at(-1)).toEqual({ label: "Total", value: `${total} points` });
    expect(step.session).toEqual(before);
  }
  expect(answerCanastaExercise("values", canastaLearningSteps("values")[2], "150").good).toBe(true);
});

test("guided Canasta pauses after moves, completes one hand and replays the deal", () => {
  test.setTimeout(120000);
  for (const seed of [1, 3, 11]) {
    let state = createCanastaGuidedSession(seed), count = 0;
    const initial = structuredClone(state);
    while (state.session.hand.phase !== "complete" && count++ < 1000) {
      const action = chooseCanastaAction(canastaObservation(state.session));
      if (action.type === "next") throw Error("A guided hand must not advance the match");
      const before = structuredClone(state);
      state = transitionCanastaGuidedSession(state, action);
      expect(state.moments).toHaveLength(before.moments.length + 1);
      if (state.review) {
        expect(transitionCanastaGuidedSession(state, { type: "draw" })).toBe(state);
        state = transitionCanastaGuidedSession(state, { type: "continue" });
      }
    }
    expect(state.session.hand.phase).toBe("complete");
    expect(state.session.handNumber).toBe(1);
    expect(transitionCanastaGuidedSession(state, { type: "draw" })).toBe(state);
    expect(canastaGuidedRecap(state.moments).at(-1)?.moment).toEqual(state.moments.at(-1));
    expect(canastaGuidedRecap(state.moments).length).toBeLessThanOrEqual(3);
    expect(replayCanastaGuidedSession(state)).toEqual(initial);
  }
});

test("guided Canasta guidance is independent of hidden cards and bonus contents", () => {
  const original = createCanastaGuidedSession(3).session, changed = structuredClone(original);
  changed.hand.hands[1].reverse(); changed.hand.stock.reverse();
  changed.hand.talons[2] = changed.hand.stock.slice(0, 3);
  changed.initialSeed = 999;
  expect(canastaObservation(changed)).toEqual(canastaObservation(original));
  expect(canastaGuidance(canastaObservation(changed))).toEqual(canastaGuidance(canastaObservation(original)));
});

test("guided controller keeps invalid actions in place and has isolated instances", () => {
  const adapter = { create: createCanastaGuidedSession, transition: transitionCanastaGuidedSession, replay: replayCanastaGuidedSession };
  const one = createGuidedHandFeature(3, adapter), two = createGuidedHandFeature(3, adapter);
  const initial = get(one).session;
  one.dispatch({ type: "discard", cardId: "missing" });
  expect(get(one).error).not.toBe("");
  expect(get(one).session).toBe(initial);
  const action = chooseCanastaAction(canastaObservation(initial.session));
  if (action.type === "next") throw Error("Unexpected next");
  one.dispatch(action);
  expect(get(one).error).toBe("");
  expect(get(two).session).toEqual(initial);
});
