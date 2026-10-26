import { expect, test } from "@playwright/test";
import { heartsLearningTrick } from "../../src/domain/heartsLearning";
import { heartsGuidedReview } from "../../src/features/hearts/heartsGuidance";
import { heartsLessonTakeaway } from "../../src/lessons/hearts/takeaways";
import { trickWinner } from "../../src/domain/trickTakingRules";
import { heartsPoints } from "../../src/domain/heartsRules";
import type { Card, CompletedHandTrick, Seat } from "../../src/domain/types";

function trick(ids: string[], seats: Seat[] = ["Tutor", "Right", "You", "Left"]): CompletedHandTrick {
  const cards = ids.map((id, i) => ({ seat: seats[i], card: { id, label: id, rank: id.slice(0, -1), suit: id.slice(-1) as Card["suit"] } }));
  const winner = trickWinner(cards)!;
  return { cards, winner: winner.seat, winnerIndex: seats.indexOf(winner.seat),
    penalty: cards.reduce((sum, play) => sum + heartsPoints(play.card), 0), outcome: "stayed_clear" };
}

test("guided review explains the led-suit winner and all penalty cards", () => {
  const completed = trick(["9C", "QS", "AH", "KC"]);
  expect(heartsLearningTrick(completed)).toMatchObject({
    winner: { seat: "Left", card: { id: "KC" } }, points: 14, hearts: 1, queen: true, followedSuit: false
  });
  const review = heartsGuidedReview(completed)!;
  expect(review.winning).toBe("Left wins with K♣, the highest card in clubs.");
  expect(review.scoring).toBe("1 heart + Q♠ (13) = 14 points for Left.");
  expect(review.choice).toContain("A♥ was off-suit, so it could not win");
  expect(review.next).toBe("Left leads next.");
});

test("clean wins and unavoidable penalties are facts, not tactical mistakes", () => {
  const clean = heartsGuidedReview(trick(["2C", "KC", "AC", "4C"]))!;
  expect(clean.scoring).toBe("No hearts or Q♠: nobody takes points.");
  expect(clean.choice).toContain("followed suit and won");
  expect(clean.next).toBe("You lead next.");
  const points = heartsGuidedReview(trick(["3H", "6H", "AH", "KH"]))!;
  expect(points.scoring).toBe("4 hearts = 4 points for You.");
  expect(JSON.stringify(points)).not.toMatch(/mistake|risky|should have|bad/i);
});

test("review handles every winning seat and final-trick wording", () => {
  for (const seats of [["You", "Left", "Tutor", "Right"], ["Left", "Tutor", "Right", "You"],
    ["Tutor", "Right", "You", "Left"], ["Right", "You", "Left", "Tutor"]] as Seat[][]) {
    const completed = trick(["AD", "2D", "4D", "3D"], seats);
    const review = heartsGuidedReview(completed)!;
    expect(review.winning).toContain("A♦");
    expect(review.next).toBe(`${seats[0] === "Tutor" ? "Barbu" : seats[0]} ${seats[0] === "You" ? "lead" : "leads"} next.`);
    if (seats[0] === "You") expect(review.choice).toContain("You led A♦");
    expect(heartsGuidedReview(completed, true)!.next).not.toContain("next");
  }
});

test("every Hearts activity has a distinct takeaway without claiming mastery", () => {
  const actions = ["object", "first", "queen", "avoid", "pass", "break", "moon", "score"];
  expect(new Set(actions.map(action => heartsLessonTakeaway(action, true))).size).toBe(actions.length);
  for (const action of actions) {
    expect(heartsLessonTakeaway(action, true)).not.toMatch(/mastered|expert|independently/i);
    expect(heartsLessonTakeaway(action, false)).toContain("Remember:");
  }
});
