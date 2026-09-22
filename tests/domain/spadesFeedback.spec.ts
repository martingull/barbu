import { expect, test } from "@playwright/test";
import type { CompletedHandTrick, Seat } from "../../src/lessonTypes";
import { spadesTrickFeedback } from "../../src/spadesFeedback";

const bids = { You: 2, Tutor: 1, Left: 4, Right: 3 };
const trick = (winner: Seat): CompletedHandTrick => ({
  winner, winnerIndex: ["Tutor", "Right", "You", "Left"].indexOf(winner),
  cards: [], penalty: 0, outcome: "won_clean_trick"
});

test("Spades feedback uses the winning side's bid, not Whist odd tricks", () => {
  expect(spadesTrickFeedback([trick("You")], bids)).toBe("You won the trick. You + Barbu: 1 of 3 bid tricks; 2 still needed.");
  expect(spadesTrickFeedback([trick("You"), trick("Right")], bids)).toContain("Left + Right: 1 of 7 bid tricks; 6 still needed.");
  expect(spadesTrickFeedback([], bids)).toBe("");
});

test("Spades reports a made bid and bags instead of praising every win", () => {
  const tricks = [trick("You"), trick("Tutor"), trick("You")];
  expect(spadesTrickFeedback(tricks, bids)).toContain("bid 3 reached. Further tricks add bags.");
  expect(spadesTrickFeedback([...tricks, trick("Tutor")], bids)).toContain("bid 3 covered, with 1 bag so far.");
  expect(spadesTrickFeedback([...tricks, trick("Tutor"), trick("You")], bids)).toContain("2 bags so far");
});

test("nil feedback distinguishes intact nil, first failure and later wins", () => {
  const nilBids = { ...bids, You: 0 };
  expect(spadesTrickFeedback([trick("Tutor")], nilBids)).toContain("Nil is still intact");
  expect(spadesTrickFeedback([trick("You")], nilBids)).toContain("You break nil; the nil scores -100.");
  expect(spadesTrickFeedback([trick("You"), trick("You")], nilBids)).toContain("You have already broken nil");
  expect(spadesTrickFeedback([trick("Right")], { ...bids, Right: 0 })).toContain("Right breaks nil");
  expect(spadesTrickFeedback([trick("You")], { ...bids, You: 0, Tutor: 0 })).toContain("bid 0 covered, with 1 bag");
});
