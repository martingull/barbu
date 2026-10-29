import { expect, test } from "@playwright/test";
import { drillDecisionReview } from "../../src/lessons/decisionReview";
import { drillDecision } from "../../src/lessons/drillDecision";
import { heartsIntroductionSteps } from "../../src/lessons/hearts/introduction";

test("review keeps the original visible position and the exact feedback, including illegal choices", () => {
  const step = heartsIntroductionSteps(1)[0];
  const before = JSON.stringify(step);
  for (const card of step.trick.hand) {
    const review = drillDecisionReview(step, card, { Left: "West", Tutor: "North", Right: "East" });
    expect(review.prompt).toBe(step.trick.beforeResult);
    expect(review.explanation).toBe(drillDecision(step, card).feedback);
    expect(review.selectedCardIds).toEqual([card.id]);
    expect(review.groups[0].cards).toEqual(step.trick.tableBeforeChoice.map(play => play.card));
    expect(review.groups[0].captions).toEqual({ "9C": "West (led)", "4C": "North", "KC": "East" });
    expect(review.groups[1].cards).toEqual(step.trick.hand);
  }
  expect(JSON.stringify(step)).toBe(before);
});

test("winner review displays the four original cards only, not a duplicate answer hand", () => {
  const step = heartsIntroductionSteps(1)[1];
  const review = drillDecisionReview(step, step.trick.hand[0]);
  expect(review.groups).toHaveLength(1);
  expect(review.groups[0].cards).toHaveLength(4);
  expect(review.groups[0].captions!["KC"]).toBe("Barbu");
});

test("review retains exposed reference hands and never includes scripted future plays", () => {
  const step = heartsIntroductionSteps(1)[0];
  step.referenceHand = { label: "Dummy", cards: [step.trick.hand[0], step.trick.tableBeforeChoice[0].card] };
  step.trick.tableAfterChoice = [{ seat: "You", card: step.trick.hand[1] }];
  const review = drillDecisionReview(step, step.trick.hand[0]);
  expect(review.groups).toHaveLength(3);
  expect(review.groups[1]).toEqual({ label: "Dummy", cards: [step.trick.hand[0]] });
  expect(review.groups[0].cards).toHaveLength(3);
  expect(review.groups[0].cards).not.toContainEqual(step.trick.hand[1]);
});

test("Domino reviews describe the layout, not a led suit or player trick", () => {
  const step = { ...heartsIntroductionSteps(1)[0], contract: "Domino" };
  const review = drillDecisionReview(step, step.trick.hand[0]);
  expect(review.groups[0].label).toBe("Layout before your choice");
  expect(review.groups[0].captions).toBeUndefined();
});
