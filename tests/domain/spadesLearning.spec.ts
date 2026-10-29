import { test, expect } from "@playwright/test";
import { get } from "svelte/store";
import { createSpadesSession, transitionSpadesSession, spadesSessionSettlement } from "../../src/domain/spadesSession";
import { spadesLearningPosition, spadesLearningScore, spadesLearningRecap } from "../../src/domain/spadesLearning";
import { spadesGuidance, spadesGuidedReview } from "../../src/features/spades/spadesGuidance";
import { spadesLearningSteps } from "../../src/lessons/spades/learning";
import { drillDecision, drillTableCards } from "../../src/lessons/drillDecision";
import { legalCards, trickWinner } from "../../src/domain/trickTakingRules";
import { standardDeck } from "../../src/domain/deck";
import type { Card, CompletedHandTrick, Seat } from "../../src/domain/types";
import { createGuidedHandFeature } from "../../src/features/guidedHandFeature";

const card = (id: string): Card => standardDeck().find(card => card.id === id)!;

test("Spades topics have ordered stages, distinct bounded companions and engine-checked trick facts", () => {
  for (const topic of ["follow", "trump", "bid", "bags"] as const) {
    const steps = spadesLearningSteps(topic);
    expect(steps.map(step => step.teaching?.stage)).toEqual(["worked", "supported", "independent"]);
    expect(steps[0].teaching?.guidance).toContain("Try ");
    expect(steps[2].teaching?.guidance).toBeUndefined();
    for (const step of steps) {
      expect(step.followUp?.teaching?.stage).toBe("reinforcement");
      expect(step.followUp?.followUp).toBeUndefined();
      expect(step.followUp?.trick.hand).not.toEqual(step.trick.hand);
      for (const example of [step, step.followUp!]) {
        const { hand, tableBeforeChoice, legalCardIds } = example.trick;
        const ids = [...hand, ...tableBeforeChoice.map(play => play.card)].map(card => card.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(legalCards(hand, tableBeforeChoice[0]?.card.suit).map(card => card.id).sort()).toEqual([...legalCardIds].sort());
        expect(hand.some(card => drillDecision(example, card).result.clean)).toBe(true);
        for (const choice of hand) {
          const table = drillTableCards(example, choice);
          if (topic === "bid" || !legalCardIds.includes(choice.id)) expect(table).toEqual(tableBeforeChoice);
          else {
            expect(table.map(play => play.seat)).toEqual(["Left", "Tutor", "Right", "You"]);
            const winner = trickWinner(table, "S")!;
            expect(example.breakdownByCard![choice.id].rows[0].value).toContain(winner.seat === "Tutor" ? "Barbu" : winner.seat);
          }
        }
      }
    }
  }
});

test("guided Spades uses normal bidding and play, isolates sessions, stops after one hand and reopens the same deal", () => {
  const initial = createSpadesSession(8);
  const guided = createGuidedHandFeature(8, { create: createSpadesSession, transition: transitionSpadesSession, replay: () => createSpadesSession(8) });
  const other = createGuidedHandFeature(8, { create: createSpadesSession, transition: transitionSpadesSession, replay: () => createSpadesSession(8) });
  guided.dispatch({ type: "set-bid", bid: 0 });
  expect(get(guided).session.bids).toEqual({ ...initial.bids, You: 0 });
  expect(get(guided).session.fullHand.currentTrick).toEqual([]);
  guided.dispatch({ type: "start-play" });
  guided.dispatch({ type: "set-bid", bid: 13 });
  expect(get(guided).session.bids.You).toBe(0);
  for (let i = 0; i < 13; i++) {
    const session = get(guided).session;
    const event = { type: "play-card" as const, cardId: session.fullHand.legalCardIds[0] };
    guided.dispatch(event);
    expect(get(guided).session).toEqual(transitionSpadesSession(session, event));
    const review = get(guided).session;
    expect(spadesGuidedReview(review.fullHand.completedTricks, review.bids)?.winning).toContain("highest");
    guided.dispatch(event);
    expect(get(guided).session).toEqual(review);
    guided.dispatch({ type: "next-trick" });
  }
  const final = get(guided).session;
  expect(final.fullHand.status).toBe("complete");
  expect(final.results).toEqual([]);
  const scored = spadesLearningScore(final.fullHand.completedTricks, final.bids, ["You", "Tutor"]);
  expect(scored.score).toBe(spadesSessionSettlement(final).result!.playerSideScore);
  expect(scored.contractPoints + scored.extra + scored.nilResults.reduce((sum, nil) => sum + nil.score, 0) - scored.bagPenalty).toBe(scored.score);
  const recap = spadesLearningRecap(final.fullHand.completedTricks, final.bids);
  expect(recap.length).toBeGreaterThan(0);
  expect(recap.length).toBeLessThanOrEqual(3);
  expect(new Set(recap.map(moment => moment.number)).size).toBe(recap.length);
  expect(get(other).session).toEqual(initial);
  guided.replay();
  expect(get(guided).session).toEqual(initial);
});

test("Spades coaching sees public facts only and distinguishes nil, breaking and partnership objectives", () => {
  const session = createSpadesSession(8);
  const changed = structuredClone(session);
  changed.fullHand.hands[0].reverse();
  changed.fullHand.hands[1].reverse();
  expect(spadesLearningPosition(changed)).toEqual(spadesLearningPosition(session));
  const position = { ...spadesLearningPosition(session), playStarted: true, bids: { You: 2, Tutor: 2, Left: 4, Right: 4 }, playerHand: [card("2C"), card("AS")] };
  expect(spadesGuidance(position).rule).toContain("not broken");
  expect(spadesGuidance({ ...position, playerHand: [card("AS")] }).rule).toContain("Only spades remain");
  const follow = { ...position, currentTrick: [{ seat: "Left" as const, card: card("KC") }] };
  expect(spadesGuidance(follow).rule).toContain("must follow clubs");
  expect(spadesGuidance({ ...follow, playerHand: [card("2D")] }).rule).toContain("do not have to trump");
  expect(spadesGuidance({ ...position, bids: { ...position.bids, You: 0 } }).tip).toContain("Your nil is intact");
  expect(spadesGuidance({ ...position, bids: { ...position.bids, Tutor: 0 } }).tip).toContain("Barbu's nil is intact");
});

test("scoring recap separates made and missed contracts, nil success/failure and bag rollover", () => {
  const tricks = (winners: Seat[]): CompletedHandTrick[] => winners.map(winner => ({ winner, winnerIndex: ["Tutor", "Right", "You", "Left"].indexOf(winner), cards: [], penalty: 0, outcome: "won_clean_trick" }));
  const bids = { You: 0, Tutor: 3, Left: 4, Right: 4 };
  const success = spadesLearningScore(tricks(["Tutor", "Tutor", "Tutor", "Tutor"]), bids, ["You", "Tutor"], 9);
  expect(success).toMatchObject({ bid: 3, won: 4, extra: 1, contractPoints: 30, bagPenalty: 100, remainingBags: 0, score: 31 });
  expect(success.nilResults[0].score).toBe(100);
  const failure = spadesLearningScore(tricks(["You", "Tutor"]), bids, ["You", "Tutor"], 9);
  expect(failure).toMatchObject({ contractPoints: -30, extra: 0, remainingBags: 9, score: -130 });
  expect(failure.nilResults[0].score).toBe(-100);
});
