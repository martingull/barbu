import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { createGuidedHandFeature } from "../../src/features/guidedHandFeature";
import { createCanastaGuidedSession, transitionCanastaGuidedSession, replayCanastaGuidedSession, canastaGuidance, canastaGuidedRecap } from "../../src/domain/canastaLearning";
import { canastaObservation, chooseCanastaAction } from "../../src/domain/canastaPolicy";
import { canastaLearningSteps, canastaExerciseChoices, answerCanastaExercise, canastaFeedbackBreakdown, canastaCards } from "../../src/lessons/canasta/exercises";
import { canastaTopics } from "../../src/games/canasta";
import { canastaDef } from "../../src/games/canasta";
import { canastaCourses } from "../../src/lessons/canasta/courses";
import { canastaValue, canastaDeck } from "../../src/domain/canastaRules";
import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../src/domain/learningSession";
import { canastaGuidedReview } from "../../src/features/canasta/canastaGuidance";
import { canastaMeldDecision } from "../../src/domain/canastaMeldPreview";
import { canastaMeldChangeText } from "../../src/features/canasta/canastaScorePresentation";

test("meld-risk lessons compare two legal moves against an explicit public goal", () => {
  const steps = canastaLearningSteps("risk");
  expect(steps.map(step => step.teaching?.stage)).toEqual(["worked", "supported", "independent"]);
  expect(steps[2].teaching?.guidance).toBeUndefined();
  for (const [index, step] of steps.entries()) for (const [companion, position] of [step, step.followUp!].entries()) {
    const before = structuredClone(position.session), strategy = position.strategy!;
    const choices = canastaExerciseChoices("risk", position);
    expect(choices).toHaveLength(2);
    const answers = choices.map(choice => answerCanastaExercise("risk", position, choice.id));
    expect(answers.map(answer => answer.illegal)).toEqual([false, false]);
    expect(answers.map(answer => answer.good)).toEqual(index === 1 ? [false, true] : [true, false]);
    const decisions = strategy.choices.map(choice => canastaMeldDecision(canastaObservation(position.session), choice.action, strategy.goal));
    expect(decisions.every(decision => decision.legal)).toBe(true);
    expect(decisions.map(decision => decision.penaltyAfter)).toEqual(index === 1 ? [5000, 0]
      : [0, index === 0 && companion ? 2500 : 2000]);
    const visible = [...position.session.hand.hands[0], ...position.session.hand.discards,
      ...position.session.hand.sides[0].melds.flatMap(meld => meld.cards)];
    expect(new Set(visible.map(card => card.id)).size).toBe(visible.length);
    expect(canastaFeedbackBreakdown("risk", position).rows.every(row => row.value.startsWith("Legal;"))).toBe(true);
    expect(position.session).toEqual(before);
    expect(answerCanastaExercise("risk", position, "unknown").illegal).toBe(true);
  }
});

test("meld-risk decisions ignore concealed cards and preserve legality independently of their goal", () => {
  const step = canastaLearningSteps("risk")[1], changed = structuredClone(step.session);
  changed.hand.hands[1] = canastaCards("1-KC 1-KH"); changed.hand.stock.reverse();
  changed.hand.talons[2] = canastaCards("1-JR 1-JB"); changed.initialSeed = 999;
  for (const choice of step.strategy!.choices) {
    expect(canastaMeldDecision(canastaObservation(changed), choice.action, step.strategy!.goal))
      .toEqual(canastaMeldDecision(canastaObservation(step.session), choice.action, step.strategy!.goal));
  }
  const illegal = canastaMeldDecision(canastaObservation(step.session), { type: "meld", groups: [{ rank: "7", cardIds: ["missing"] }] }, "remove_penalty");
  expect(illegal.legal).toBe(false); expect(illegal.correct).toBe(false);
});

test("guided meld explanations use the player's actual public change before anyone else acts", () => {
  for (const [index, step] of canastaLearningSteps("risk").entries()) {
    for (const choice of step.strategy!.choices) {
      const state = { session: step.session, review: null, moments: [] };
      const next = transitionCanastaGuidedSession(state, choice.action);
      const assessment = canastaMeldDecision(canastaObservation(step.session), choice.action, step.strategy!.goal);
      expect(next.review?.meldChanges).toEqual(assessment.changes);
      const explanation = canastaGuidedReview(next.moments[0]).explanation;
      if (choice.label.startsWith("Start")) expect(explanation).toContain("penalty applies if this meld is unfinished");
      else if (index === 1) {
        expect(explanation).toContain("removes the possible 2500-point");
        expect(explanation).toContain("2500-point end-of-hand bonus");
      } else if (index === 2) expect(explanation).toContain("300-point end-of-hand bonus");
      else expect(explanation).toContain("No unfinished-meld penalty");
      expect(explanation).not.toContain("optimal");
      expect(next.session.hand.turn).toBe(0);
      expect(next.session.handNumber).toBe(1);
    }
  }
  const step = canastaLearningSteps("risk")[2];
  const guidance = canastaGuidance(canastaObservation(step.session));
  expect(guidance.meldChanges?.some(change => change.completed && change.bonus === 300)).toBe(true);
  expect(canastaMeldChangeText(guidance.meldChanges!)).toContain("Jacks reached 7/7");
});

test("Canasta coaching describes the current step, opening points and selected discards", () => {
  const draw = createCanastaGuidedSession(3).session;
  expect(canastaGuidance(canastaObservation(draw)).rule).toContain("Choose Draw stock");
  expect(canastaGuidance(canastaObservation(draw)).tip).toContain("discard pile is empty");
  const opening = canastaLearningSteps("opening")[0].session;
  const guide = canastaGuidance(canastaObservation(opening));
  expect(guide.tip).toContain("150 card points (minimum 125)");
  expect(guide.rule).toContain("Meld cards");
  expect(guide.tip).toContain("Suggest groups");
  const splash = structuredClone(opening);
  splash.hand.hands[0] = canastaCards("0-8C 0-8D 0-8H 0-8S 1-8C 1-8D 1-8H 0-4C");
  expect(canastaGuidance(canastaObservation(splash)).tip).toContain("waives the 125-point minimum");
  const discard = canastaLearningSteps("discard")[0].session;
  expect(canastaGuidance(canastaObservation(discard), "0-4C").rule).toContain("Discard 4C");
  expect(canastaGuidance(canastaObservation(discard), "0-4C").tip).toContain("5 card points");
  expect(canastaGuidance(canastaObservation(discard), "0-2C").rule).toContain("Keep this wild card");
  expect(canastaGuidance(canastaObservation(discard), "0-AC").rule).toContain("cannot start the empty pile");
  const last = canastaLearningSteps("finish")[1].session;
  expect(canastaGuidance(canastaObservation(last), "0-KC").rule).toContain("cannot discard your last card");
  last.hand.openedThisTurn = true;
  expect(canastaGuidance(canastaObservation(last), "0-KC").rule).not.toContain("go out");
  const ready = canastaLearningSteps("finish")[0].session;
  expect(canastaGuidance(canastaObservation(ready)).rule).toBe("Select your last card, then choose Go out.");
  expect(canastaGuidance(canastaObservation(ready), "0-KC").rule).toContain("Choose Go out");
  expect(canastaGuidance(canastaObservation(ready)).tip).toContain("minimum, not a guarantee of profit");
});

test("Canasta coaching distinguishes empty stock, pile pickup and special hands", () => {
  const empty = createCanastaGuidedSession(3).session;
  empty.hand.stock = [];
  expect(canastaGuidance(canastaObservation(empty)).rule).toContain("End hand");
  const pile = canastaLearningSteps("pile")[0].session;
  expect(canastaGuidance(canastaObservation(pile)).rule).toContain("Take pile");
  pile.hand.stock = [];
  expect(canastaGuidance(canastaObservation(pile)).rule).toContain("Take pile can continue");
  const straight = createCanastaGuidedSession(3).session;
  straight.hand.hands[0] = canastaCards("0-AC 0-2C 0-3C 0-4C 0-5C 0-6C 0-7C 0-8C 0-9C 0-10C 0-JC 0-QC 0-KC 0-JR");
  straight.hand.phase = "play"; straight.hand.drewStock = true;
  expect(canastaGuidance(canastaObservation(straight)).rule).toContain("Declare Straight ends the hand for 3000 points");
});

test("guided reviews distinguish replacement cards, regular draws and terminal moves", () => {
  const initial = createCanastaGuidedSession(3);
  const three = initial.session.hand.hands[0].find(card => card.rank === "3")!;
  expect(three).toBeDefined();
  initial.session.hand.stock.sort((a, b) => Number(a.rank === "3") - Number(b.rank === "3"));
  const exposed = transitionCanastaGuidedSession(initial, { type: "expose", cardId: three.id });
  expect(exposed.review?.exposedThree).toBe(true);
  expect(canastaGuidedReview(exposed.review!).next).toContain("then draw");
  const drawing = transitionCanastaGuidedSession(exposed, { type: "continue" });
  const drawn = transitionCanastaGuidedSession(drawing, { type: "draw" });
  expect(canastaGuidedReview(drawn.review!).explanation).toContain("Drawing does not end your turn");
  expect(canastaGuidedReview(drawn.review!).next).toContain("then meld or choose a discard");
  const noReplacement = structuredClone(initial);
  noReplacement.session.hand.stock = [];
  const ended = transitionCanastaGuidedSession(noReplacement, { type: "expose", cardId: three.id });
  const replacementReview = canastaGuidedReview(ended.moments[0]);
  expect(ended.review).toBeNull();
  expect(replacementReview.title).toBe("No replacement card remained.");
  expect(replacementReview.explanation).toContain("three stayed in your hand");
  expect(replacementReview.next).toContain("hand is over");
  const lastThree = structuredClone(initial);
  lastThree.session.hand.stock = [initial.session.hand.stock.find(card => card.rank === "3")!];
  expect(lastThree.session.hand.stock[0]).toBeDefined();
  const terminalDraw = transitionCanastaGuidedSession(lastThree, { type: "draw" });
  expect(canastaGuidedReview(terminalDraw.moments[0]).explanation).toContain("last stock card was a three");
  const anotherThree = structuredClone(initial);
  const drawnThree = initial.session.hand.stock.find(card => card.rank === "3")!;
  anotherThree.session.hand.stock = [drawnThree, ...initial.session.hand.stock.filter(card => card.id !== drawnThree.id)];
  const threeReview = transitionCanastaGuidedSession(anotherThree, { type: "draw" });
  expect(canastaGuidedReview(threeReview.review!).explanation).toContain("Expose three replaces it");
  expect(canastaGuidedReview(threeReview.review!).next).toContain("Expose three before another move");
  const finalDiscard = transitionCanastaGuidedSession({ session: canastaLearningSteps("finish")[0].session, review: null, moments: [] }, { type: "discard", cardId: "0-KC" });
  const outReview = canastaGuidedReview(finalDiscard.moments[0]);
  expect(outReview.explanation).toContain("final discard went out");
  expect(outReview.explanation).not.toContain("other players have now played");
  expect(outReview.next).not.toContain("Continue");
});

test("Canasta topics have staged decisions and bounded, different companions", () => {
  expect(canastaTopics).toHaveLength(8);
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
  expect(canastaTopics.map(topic => topic.id)).toEqual(["canasta-values", "canasta-melds", "canasta-opening", "canasta-risk", "canasta-pile", "canasta-discard", "canasta-finish", "canasta-score"]);
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
