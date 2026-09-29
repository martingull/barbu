import { expect, test } from "@playwright/test";
import { heartsResultCopy, heartsScorecardStandings, heartsTrickFeedback } from "../../src/features/hearts/heartsPresentation";
import { startBrowserHeartsHand } from "../../src/domain/trickTakingHand";
import { trickTakingSeats } from "../../src/domain/trickTakingScore";
import type { CompletedHandTrick, Seat } from "../../src/domain/types";

test("unfinished matches describe current standings, not a final placing", () => {
  const standings = heartsScorecardStandings({ You: 13, Tutor: 8, Left: 5, Right: 0 });
  const result = heartsResultCopy(false, standings, undefined, undefined, 1, 13);
  expect(result.heading).toBe("Hand 1 complete");
  expect(result.summary).toBe("You scored 13 points this hand. Right leads with 0 points. You are 4th in the match.");
  expect(result.summary).not.toContain("finished");
});

test("ongoing results name every tied leader and use singular points", () => {
  const standings = heartsScorecardStandings({ You: 1, Tutor: 1, Left: 12, Right: 12 });
  const result = heartsResultCopy(false, standings, undefined, undefined, 2, 1);
  expect(result.summary).toBe("You scored 1 point this hand. You and Barbu share the lead with 1 point.");
});

test("moon results explain settled hand points without claiming a match win", () => {
  const standings = heartsScorecardStandings({ You: 0, Tutor: 26, Left: 26, Right: 26 });
  const result = heartsResultCopy(false, standings, undefined, "You", 1, 0);
  expect(result.heading).toBe("You shot the moon");
  expect(result.summary).toContain("This hand scores 0 for you and 26 for everyone else.");
  expect(result.summary).toContain("You lead with 0 points.");
  expect(result.summary).not.toContain("won");
});

test("completed matches retain final placement and tied winner wording", () => {
  const standings = heartsScorecardStandings({ You: 100, Tutor: 10, Left: 10, Right: 50 });
  const result = heartsResultCopy(true, standings, { seat: "You", score: 100 }, undefined, 6, 13);
  expect(result.heading).toBe("You finished 4th");
  expect(result.summary).toContain("Barbu and Left tie with 10");
});

function reviewed(winner: Seat, penalty: number, queen = false) {
  const trick: CompletedHandTrick = {
    winner, winnerIndex: trickTakingSeats.indexOf(winner), penalty,
    outcome: penalty ? winner === "You" ? "captured_penalty" : "avoided_penalty" : "stayed_clear",
    cards: queen ? [{ seat: "Left", card: { id: "QS", rank: "Q", suit: "S", label: "QS" } }] : []
  };
  const hand = { ...startBrowserHeartsHand(8), completedTricks: [trick] };
  return { trick, hand };
}

test("clean trick feedback names Barbu and the next leader", () => {
  const { trick, hand } = reviewed("Tutor", 0);
  expect(heartsTrickFeedback(trick, hand)).toBe("Barbu won the trick. No points. Barbu leads next.");
  const own = reviewed("You", 0);
  expect(heartsTrickFeedback(own.trick, own.hand)).toBe("You won the trick. No points. You lead next.");
});

test("penalty feedback gives exact points without praising a potential opponent moon", () => {
  const early = reviewed("Right", 1);
  expect(heartsTrickFeedback(early.trick, early.hand)).toBe("Right took 1 point. Right leads next.");
  const queen = reviewed("Tutor", 14, true);
  const feedback = heartsTrickFeedback(queen.trick, queen.hand);
  expect(feedback).toContain("Barbu took 14 points, including the queen of spades.");
  expect(feedback).toContain("stop their moon");
  expect(feedback).not.toContain("Good");
});

test("final trick feedback never promises another lead", () => {
  const { trick, hand } = reviewed("You", 2);
  expect(heartsTrickFeedback(trick, { ...hand, status: "complete" })).toBe("You took 2 points.");
});
