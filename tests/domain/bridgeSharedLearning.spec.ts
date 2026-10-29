import { test, expect } from "@playwright/test";
import { get } from "svelte/store";
import { bridgeLearningSteps, bridgeChoiceSteps } from "../../src/lessons/bridge/learning";
import { drillDecision, drillTableCards } from "../../src/lessons/drillDecision";
import { legalCards, trickWinner } from "../../src/domain/trickTakingRules";
import { bridgeHighCardPoints } from "../../src/domain/bridgeBidding";
import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../src/domain/learningSession";
import { createBridgeSession, transitionBridgeSession, bridgeSessionSettlement } from "../../src/domain/bridgeSession";
import { bridgeLearningPosition, bridgeLearningCounts, bridgeLearningRecap } from "../../src/domain/bridgeLearning";
import { bridgeGuidance, bridgeGuidedReview } from "../../src/features/bridge/bridgeGuidance";
import { createGuidedHandFeature } from "../../src/features/guidedHandFeature";
import { bridgeActiveHand } from "../../src/features/bridge/bridgePresentation";
import { trickTakingSeats as seats } from "../../src/domain/trickTakingScore";

test("Bridge's five topics share three fading stages and distinct bounded follow-ups", () => {
  for (const topic of ["dummy", "declarer", "defense"] as const) {
    const steps = bridgeLearningSteps(topic);
    expect(steps.map(step => step.teaching!.stage)).toEqual(["worked", "supported", "independent"]);
    expect(steps[2].teaching!.guidance).toBeUndefined();
    for (const step of steps) {
      expect(step.followUp!.followUp).toBeUndefined();
      expect(step.followUp!.teaching!.stage).toBe("reinforcement");
      expect(step.followUp!.scenarioId).not.toBe(step.scenarioId);
      expect(step.followUp!.trick.hand).not.toEqual(step.trick.hand);
      for (const example of [step, step.followUp!]) {
        const trick = example.trick;
        expect(legalCards(trick.hand, trick.tableBeforeChoice[0]?.card.suit).map(c => c.id).sort()).toEqual([...trick.legalCardIds].sort());
        expect(trick.hand.some(card => drillDecision(example, card).result.clean)).toBe(true);
        expect(trick.hand.every(card => !example.referenceHand?.cards.some(other => other.id === card.id))).toBe(true);
        for (const card of trick.hand) {
          const table = drillTableCards(example, card);
          if (!trick.legalCardIds.includes(card.id)) expect(drillDecision(example, card).result.outcome).toBe("illegal");
          else if (!example.choiceMode) {
            expect(table).toHaveLength(4);
            expect(new Set(table.map(play => play.card.id)).size).toBe(4);
            for (const [i, play] of table.entries()) {
              expect(play.seat).toBe(seats[(seats.indexOf(table[0].seat) + i) % 4]);
              if (play.seat !== (example.playingSeat ?? "You")) expect(trick.hand.some(c => c.id === play.card.id)).toBe(false);
            }
            expect(example.breakdownByCard![card.id].rows.find(row => row.label === "Winner in this line")!.value).toContain(trickWinner(table)!.card.rank);
          } else expect(table).toEqual(trick.tableBeforeChoice);
        }
      }
    }
  }
  for (const topic of ["contracts", "bidding"] as const) {
    const steps = bridgeChoiceSteps(topic);
    expect(steps.map(step => step.teaching.stage)).toEqual(["worked", "supported", "independent"]);
    expect(steps[2].teaching.guidance).toBeUndefined();
    for (const step of steps) {
      expect(step.followUp!.id).not.toBe(step.id);
      expect(step.followUp!.followUp).toBeUndefined();
      for (const example of [step, step.followUp!]) {
        expect(example.options.map(o => o.id)).toContain(example.correct);
        expect(example.options.every(option => example.explanations[option.id]?.length > 10)).toBe(true);
        if (topic === "bidding") {
          expect(example.hand).toHaveLength(13);
          expect(new Set(example.hand.map(card => card.id)).size).toBe(13);
        }
      }
    }
    let session = createLearningSession<typeof steps[number], { clean: boolean }, string>(steps);
    session = checkLearningAnswer(session, { clean: false }, "First error");
    expect(checkLearningAnswer(session, { clean: true }, "Duplicate")).toBe(session);
    session = advanceLearningSession(session);
    expect(session.steps).toHaveLength(4);
    session = advanceLearningSession(checkLearningAnswer(session, { clean: false }, "Companion error"));
    expect(session.steps).toHaveLength(4);
    expect(session.index).toBe(2);
  }
  expect(bridgeChoiceSteps("bidding").map(step => bridgeHighCardPoints(step.followUp!.hand))).toEqual([7, 16, 13]);
});

test("guided Bridge uses normal transitions for all roles, recaps actual tricks and replays the auction", () => {
  for (let declarer = 0; declarer < 4; declarer++) {
    const initial = { ...createBridgeSession(18, declarer + 1), auctionCalls: ["1NT", "Pass", "Pass", "Pass"].map((call, index) => ({ call, seat: seats[(declarer + index) % 4] })) };
    const original = JSON.stringify(initial);
    const feature = createGuidedHandFeature(18, { create: () => initial, transition: transitionBridgeSession, replay: () => initial });
    feature.dispatch({ type: "start-play" });
    let decisions = 0;
    while (get(feature).session.fullHand.status !== "complete" && decisions++ < 60) {
      const session = get(feature).session;
      const hand = session.fullHand;
      if (session.fullHandReviewTrickCount) {
        const review = bridgeGuidedReview(hand.completedTricks, hand.bridgeContract!)!;
        expect(review.winning).toContain("highest");
        feature.dispatch({ type: "next-trick" });
      } else {
        const position = bridgeLearningPosition(hand);
        expect(position).not.toHaveProperty("hands");
        expect(position).not.toHaveProperty("id");
        const changed = { ...hand, hands: [[], [], [], []], id: "hidden" };
        expect(bridgeLearningPosition(changed)).toEqual(position);
        expect(bridgeGuidance(position).rule).toContain("plays.");
        const cardId = bridgeActiveHand(hand).legalCardIds[0];
        expect(cardId).toBeTruthy();
        const expected = transitionBridgeSession(session, { type: "play-card", cardId });
        feature.dispatch({ type: "play-card", cardId });
        expect(get(feature).session).toEqual(expected);
      }
    }
    const session = get(feature).session, hand = session.fullHand;
    expect(hand.status).toBe("complete");
    expect(hand.completedTricks).toHaveLength(13);
    const counts = bridgeLearningCounts(hand.completedTricks, hand.bridgeContract!);
    const score = bridgeSessionSettlement(session).result!;
    expect(counts.declarer).toBe(score.tricks);
    expect(counts.defenders).toBe(score.defenders);
    expect(bridgeLearningRecap(hand.completedTricks, hand.bridgeContract!).at(-1)!.number).toBe(13);
    expect(session.results).toEqual([]);
    expect(JSON.stringify(initial)).toBe(original);
    feature.replay();
    expect(get(feature).session).toEqual(initial);
  }
});
