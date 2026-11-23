import { expect, test } from "@playwright/test";
import { createGinLearningTurn } from "../../src/domain/ginRummyLearning";
import { ginDiscardLayout, transitionGinSession } from "../../src/domain/ginRummySession";
import { bestMeldLayout } from "../../src/domain/rummyMelds";
import { createLearningSession, checkLearningAnswer } from "../../src/domain/learningSession";
import { ginCards, ginLearningSteps, ginExerciseChoices, ginExerciseAnswer, ginExercisePrompt,
  ginExerciseGroups, ginFeedbackBreakdown, advanceGinLearningSession, type GinExerciseStep } from "../../src/lessons/gin-rummy/exercises";

const start = () => createLearningSession<GinExerciseStep, { clean: boolean }, { prompt: string }>(ginLearningSteps("turn"));
function answer(state: ReturnType<typeof start>, selected: string) {
  const step = state.steps[state.index], result = ginExerciseAnswer("turn", step, selected);
  return advanceGinLearningSession(checkLearningAnswer(state, { clean: result.good }, { prompt: ginExercisePrompt("turn", step) }), selected);
}

test("Gin turn positions conserve a full pack and use normal draw and discard legality", () => {
  const first = ginLearningSteps("turn")[0], session = first.turn!.session;
  const cards = [...session.hand.hands.flat(), ...session.hand.stock, ...session.hand.discards];
  expect(cards).toHaveLength(52);
  expect(new Set(cards.map(card => card.id)).size).toBe(52);
  expect(session.hand).toMatchObject({ phase: "draw", turn: 0, forcedStock: false });
  for (const source of ["stock", "discard"] as const) {
    const drawn = transitionGinSession(session, { type: "draw", source });
    expect(drawn.hand.hands[0]).toHaveLength(11);
    expect(ginDiscardLayout(drawn.hand, drawn.hand.hands[0].at(-1)!.id) === null).toBe(source === "discard");
    expect(session.hand.hands[0]).toHaveLength(10);
  }
  expect(() => createGinLearningTurn(first.hand.slice(1), first.upcard!, session.hand.stock[0])).toThrow();
  expect(() => createGinLearningTurn(first.hand, first.hand[0], session.hand.stock[0])).toThrow();
});

test("Gin's linked turn carries the taken card and chosen discard into counting without mutating content", () => {
  let state = start();
  const original = structuredClone(state);
  expect(advanceGinLearningSession(state, "upcard")).toBe(state);
  state = answer(state, "upcard");
  let step = state.steps[state.index];
  expect(step.turn?.question).toBe("discard");
  expect(step.hand).toContainEqual(ginCards("5C")[0]);
  expect(step.hand).toHaveLength(11);
  expect(ginExerciseChoices("turn", step).some(choice => choice.id === "5C")).toBe(false);
  expect(ginExerciseAnswer("turn", step, "5C")).toMatchObject({ good: false, illegal: true });
  const expected = transitionGinSession(step.turn!.session, { type: "discard", cardId: "KS" });
  state = answer(state, "KS");
  step = state.steps[state.index];
  expect(step.turn?.question).toBe("count");
  expect(step.hand).toEqual(expected.hand.hands[0]);
  expect(step.hand).not.toContainEqual(ginCards("KS")[0]);
  expect(ginExerciseGroups(step)[0]).toEqual({ label: "Your discard", cards: ginCards("KS") });
  expect(ginExercisePrompt("turn", step)).toContain("K♠");
  expect(ginFeedbackBreakdown("turn", step, "2").rows.at(-1)?.value).toBe("2 points");
  state = answer(state, "2");
  expect(state.phase).toBe("complete");
  expect(state.results).toEqual([{ clean: true }, { clean: true }, { clean: true }]);
  expect(start()).toEqual(original);
});

test("Gin stock stays unknown before drawing and a missed draw's companion supplies the actual next hand", () => {
  let state = start();
  const first = state.steps[0], changed = structuredClone(first);
  [changed.turn!.session.hand.stock[0], changed.turn!.session.hand.stock[1]] =
    [changed.turn!.session.hand.stock[1], changed.turn!.session.hand.stock[0]];
  expect(ginExercisePrompt("turn", changed)).toEqual(ginExercisePrompt("turn", first));
  expect(ginExerciseGroups(changed)).toEqual(ginExerciseGroups(first));
  for (const choice of ginExerciseChoices("turn", first)) {
    expect(ginExerciseAnswer("turn", changed, choice.id)).toEqual(ginExerciseAnswer("turn", first, choice.id));
    expect(ginFeedbackBreakdown("turn", changed, choice.id)).toEqual(ginFeedbackBreakdown("turn", first, choice.id));
  }
  state = answer(state, "stock");
  expect(state.steps[state.index].teaching?.stage).toBe("reinforcement");
  const companion = state.steps[state.index];
  const expected = transitionGinSession(companion.turn!.session, { type: "draw", source: "stock" });
  state = answer(state, "stock");
  const discard = state.steps[state.index];
  expect(discard.turn?.question).toBe("discard");
  expect(discard.hand).toEqual(expected.hand.hands[0]);
  expect(discard.turn?.source).toBe("stock");
  expect(discard.turn?.drawn?.id).toBe("KD");
  expect(ginExercisePrompt("turn", discard)).toContain("K♦");
  expect(ginExerciseChoices("turn", discard).some(choice => choice.id === "KD")).toBe(true);
  state = answer(state, "KD");
  const count = state.steps[state.index];
  expect(count.hand).toEqual(companion.hand);
  expect(count.turn?.discarded?.id).toBe("KD");
  state = answer(state, String(bestMeldLayout(count.hand).points));
  expect(state.phase).toBe("complete");
  expect(state.results).toHaveLength(4);
});

test("Gin turn reinforcement is bounded and counting follows a legal but suboptimal discard", () => {
  let state = answer(start(), "upcard");
  state = answer(state, "3C");
  expect(state.steps[state.index].teaching?.stage).toBe("reinforcement");
  const companion = state.steps[state.index];
  expect(companion.turn?.question).toBe("discard");
  const expected = transitionGinSession(companion.turn!.session, { type: "discard", cardId: "4D" });
  state = answer(state, "4D");
  const count = state.steps[state.index];
  expect(count.turn?.question).toBe("count");
  expect(count.hand).toEqual(expected.hand.hands[0]);
  expect(ginExercisePrompt("turn", count)).toContain("4♦");
  state = answer(state, ginExerciseChoices("turn", count).find(choice => !ginExerciseAnswer("turn", count, choice.id).good)!.id);
  expect(state.steps[state.index].teaching?.stage).toBe("reinforcement");
  const extra = state.steps[state.index];
  state = answer(state, ginExerciseChoices("turn", extra).find(choice => !ginExerciseAnswer("turn", extra, choice.id).good)!.id);
  expect(state.phase).toBe("complete");
  expect(state.results).toHaveLength(5);
  let allMissed = start();
  for (let count = 0; allMissed.phase !== "complete" && count < 7; count++) {
    const step = allMissed.steps[allMissed.index];
    const wrong = ginExerciseChoices("turn", step).find(choice => !ginExerciseAnswer("turn", step, choice.id).good)!;
    allMissed = answer(allMissed, wrong.id);
  }
  expect(allMissed.phase).toBe("complete");
  expect(allMissed.results).toHaveLength(6);
});
