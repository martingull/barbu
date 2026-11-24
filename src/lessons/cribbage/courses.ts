import { cribbageTopics } from "../../games/cribbage";
import { cribbageLearningSteps, cribbageExplanation } from "./exercises";
import { cribbageCards } from "../../domain/cribbage";
import type { CourseContent } from "../courseTypes";

export const cribbageCourses: CourseContent[] = cribbageTopics.map(topic => {
  const question = cribbageLearningSteps(topic.action)[0].question;
  const ids = question.kind === "peg" ? [...question.run, question.card] : question.kind === "count" ? [...question.hand, question.starter] : question.hand;
  return {
  id: `${topic.id}-course`, game: "cribbage", pathStepId: topic.id, practiceTarget: { kind: "practice", game: "cribbage", action: topic.action },
  contract: "Cribbage", title: topic.title,
  concept: topic.action === "pegging" ? {
    heading: "The count is not your score",
    body: "Pegging means earning points as you play cards. Keep two numbers separate: the running count and your score.",
    points: [
      { marker: "Values", text: "Ace adds 1; 2 to 10 add their number; jack, queen and king add 10. Suits do not affect this addition." },
      { marker: "Count", text: "A ten followed by a five gives 10 + 5 = 15. This is the running count, not 15 points earned. Never let the count exceed 31." },
      { marker: "Score", text: "Making exactly 15 or 31 earns 2 points. A pair earns 2; a run of at least three consecutive ranks earns 1 per card. Keep the count and your score separate." }
    ]
  } : { heading: topic.title, body: topic.summary, points: [
    { marker: "121", text: "First to 121 wins immediately, even before the other hand is counted." },
    { marker: "4 + 1", text: "Keep four cards. Count them again with the starter after pegging; played cards are not lost from your hand score." }
  ] },
  example: { heading: "At the table", body: `${cribbageExplanation(question)}${question.kind === "count" ? ` The last card shown is the starter: ${question.starter}.` : ""}`, sequence: topic.action === "pegging" ? [
    { label: "Add", text: "The ten is already down: the count is 10. You play a five, so 10 + 5 = 15." },
    { label: "Check", text: "Your play reached exactly fifteen. That scoring combination earns 2 points." },
    { label: "Peg", text: "Add 2 to your score, not 15. The running count stays at 15 for the next card; it does not restart when you score." }
  ] : [
    { label: "Crib", text: "Each player lays away two. The dealer owns all four crib cards." },
    { label: "Pegging", text: "Non-dealer leads. Add values to at most 31 and score combinations as they appear." },
    { label: "Counting", text: "Count non-dealer, dealer, then dealer's crib. Reuse the same starter." }
  ], ariaLabel: "Cribbage worked example", tableCards: cribbageCards(ids).map(card => ({ seat: "You", card })), pendingBySeat: {} },
  review: { heading: topic.title, body: topic.summary, points: [
    { marker: "15", text: "Every combination adding to fifteen scores two. A pegging 31 also scores two." },
    { marker: "A", text: "Ace is low in a run. Court cards count ten but pair only with the same rank." }
  ] }
  };
});
