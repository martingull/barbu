import { test, expect } from "@playwright/test";
import { get } from "svelte/store";
import { bridgeLearningSteps, bridgeChoiceSteps } from "../../src/lessons/bridge/learning";
import { drillDecision, drillTableCards } from "../../src/lessons/drillDecision";
import { legalCards, trickWinner } from "../../src/domain/trickTakingRules";
import { bridgeHighCardPoints, bridgeIsBalanced, bridgeSuitCount, suggestBridgeCall } from "../../src/domain/bridgeBidding";
import { bridgeLegalCallOptions } from "../../src/domain/bridgeAuction";
import { standardDeck } from "../../src/domain/deck";
import type { BridgeAuctionCall } from "../../src/domain/types";
import { createLearningSession, checkLearningAnswer, advanceLearningSession } from "../../src/domain/learningSession";
import { createBridgeSession, transitionBridgeSession, bridgeSessionSettlement } from "../../src/domain/bridgeSession";
import { bridgeLearningPosition, bridgeLearningCounts, bridgeLearningRecap } from "../../src/domain/bridgeLearning";
import { bridgeGuidance, bridgeGuidedReview } from "../../src/features/bridge/bridgeGuidance";
import { createGuidedHandFeature } from "../../src/features/guidedHandFeature";
import { bridgeActiveHand } from "../../src/features/bridge/bridgePresentation";
import { trickTakingSeats as seats } from "../../src/domain/trickTakingScore";

test("Bridge's seven topics share three fading stages and distinct bounded follow-ups", () => {
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
  for (const topic of ["contracts", "bidding", "responding", "support"] as const) {
    const steps = bridgeChoiceSteps(topic);
    expect(steps.map(step => step.teaching.stage)).toEqual(["worked", "supported", "independent"]);
    expect(steps[2].teaching.guidance).toBeUndefined();
    for (const step of steps) {
      expect(step.followUp!.id).not.toBe(step.id);
      expect(step.followUp!.followUp).toBeUndefined();
      for (const example of [step, step.followUp!]) {
        expect(example.options.map(o => o.id)).toContain(example.correct);
        expect(example.options.every(option => example.explanations[option.id]?.length > 10)).toBe(true);
        if (topic !== "contracts") {
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

test("major support lessons teach legal raises that match the live partnership agreement", () => {
  const steps = bridgeChoiceSteps("support");
  expect(steps.map(step => step.correct)).toEqual(["2H", "3S", "4H"]);
  expect(steps.map(step => bridgeHighCardPoints(step.hand))).toEqual([6, 10, 13]);
  expect(steps.map(step => bridgeHighCardPoints(step.followUp!.hand))).toEqual([9, 12, 14]);
  for (const step of steps.flatMap(step => [step, step.followUp!])) {
    const suit = step.correct.endsWith("H") ? "H" : "S";
    const calls: BridgeAuctionCall[] = [{ seat: "Tutor", call: `1${suit}` }, { seat: "Right", call: "Pass" }];
    const legal = bridgeLegalCallOptions(calls, "You", 0);
    expect(bridgeIsBalanced(step.hand)).toBe(true);
    expect(bridgeSuitCount(step.hand, suit)).toBe(3);
    expect(step.options.every(option => legal.includes(option.id))).toBe(true);
    expect(suggestBridgeCall(step.hand, "You", calls, legal)).toBe(step.correct);
    expect(step.contextDetail).toContain(`${bridgeHighCardPoints(step.hand)} HCP`);
    expect(step.explanations[step.correct]).toContain("at least eight trumps");
    expect(step.explanations[step.correct]).toContain("do not guarantee tricks");
  }
});

test("1NT response lessons match legal auction policy and keep their stated hand assumptions", () => {
  const calls: BridgeAuctionCall[] = [{ seat: "Tutor", call: "1NT" }, { seat: "Right", call: "Pass" }];
  const legal = bridgeLegalCallOptions(calls, "You", 0);
  const steps = bridgeChoiceSteps("responding");
  expect(steps.map(step => step.correct)).toEqual(["Pass", "2NT", "3NT"]);
  expect(steps.map(step => bridgeHighCardPoints(step.hand))).toEqual([7, 9, 10]);
  expect(steps.map(step => bridgeHighCardPoints(step.followUp!.hand))).toEqual([6, 8, 12]);
  for (const step of steps.flatMap(step => [step, step.followUp!])) {
    expect(bridgeIsBalanced(step.hand)).toBe(true);
    expect(bridgeSuitCount(step.hand, "S")).toBeLessThan(4);
    expect(bridgeSuitCount(step.hand, "H")).toBeLessThan(4);
    expect(step.options.every(option => legal.includes(option.id))).toBe(true);
    expect(suggestBridgeCall(step.hand, "You", calls, legal)).toBe(step.correct);
    expect(step.context).toContain("North (partner): 1NT. East: Pass.");
    expect(step.contextDetail).toContain(`You: ${bridgeHighCardPoints(step.hand)} HCP`);
  }
});

test("the taught invitation is non-forcing and Barbu accepts with a maximum", () => {
  const calls: BridgeAuctionCall[] = [
    { seat: "Tutor", call: "1NT" }, { seat: "Right", call: "Pass" },
    { seat: "You", call: "2NT" }, { seat: "Left", call: "Pass" }
  ];
  const legal = bridgeLegalCallOptions(calls, "Tutor", 0);
  for (const [ids, points, response] of [
    ["AS QS 3S KH 8H 2H AD JD 4D JC 9C 6C 2C", 15, "Pass"],
    ["AS QS 3S KH 8H 2H AD JD 4D QC 9C 6C 2C", 16, "Pass"],
    ["AS QS 3S KH 8H 2H AD JD 4D KC 9C 6C 2C", 17, "3NT"]
  ] as const) {
    const hand = ids.split(" ").map(id => standardDeck().find(card => card.id === id)!);
    expect(bridgeHighCardPoints(hand)).toBe(points);
    expect(bridgeIsBalanced(hand)).toBe(true);
    expect(suggestBridgeCall(hand, "Tutor", calls, legal)).toBe(response);
  }
});

test("contract exercises retain trump context even when teaching hints fade", () => {
  const steps = bridgeChoiceSteps("contracts");
  expect(steps.map(step => step.contextDetail)).toEqual(["♥ is trump", "No trump suit", "♠ is trump"]);
  expect(steps.map(step => step.followUp!.contextDetail)).toEqual(["♣ is trump", "No trump suit", "♦ is trump"]);
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
