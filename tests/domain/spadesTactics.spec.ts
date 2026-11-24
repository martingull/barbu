import { expect, test } from "@playwright/test";
import { legalSpadesCards, spadesHaveBeenBroken } from "../../src/domain/spadesRules";
import { hydrateFullHandState, startSpadesBiddingHand, chooseBrowserOpponentCardForState } from "../../src/domain/trickTakingHand";
import { standardDeck } from "../../src/domain/deck";
import { trickWinner } from "../../src/domain/trickTakingRules";
import type { CompletedHandTrick, Seat } from "../../src/domain/types";
import { spadesLearningSteps } from "../../src/lessons/spades/learning";
import { drillDecision, drillTableCards } from "../../src/lessons/drillDecision";
import { drillDecisionReview } from "../../src/lessons/decisionReview";
import { spadesChoiceSteps } from "../../src/lessons/spades/choices";

const card = (id: string) => standardDeck().find(card => card.id === id)!;
const history: CompletedHandTrick[] = [{
  cards: ["9C", "2S", "KC", "4C"].map((id, index) => ({ seat: (["Left", "Tutor", "Right", "You"] as Seat[])[index], card: card(id) })),
  winner: "Tutor", winnerIndex: 0, penalty: 1, outcome: "won_clean_trick"
}];

test("Spades has 27 unique base decisions and 27 bounded reinforcements", () => {
  const steps = [...(["object", "bid", "score", "settle"] as const).flatMap(topic => spadesChoiceSteps(topic)),
    ...(["follow", "trump", "bags", "nil", "lead"] as const).flatMap(topic => spadesLearningSteps(topic))];
  expect(steps).toHaveLength(27);
  const ids = steps.flatMap(step => [step, step.followUp!]).map(step => "id" in step ? step.id : step.scenarioId);
  expect(new Set(ids).size).toBe(54);
  expect(steps.every(step => step.followUp && !step.followUp.followUp)).toBe(true);
});

test("Spades lead decisions use live legality without fabricating later plays", () => {
  const steps = spadesLearningSteps("lead");
  expect(steps.map(step => step.teaching?.stage)).toEqual(["worked", "supported", "independent"]);
  for (const [index, base] of steps.entries()) for (const step of [base, base.followUp!]) {
    const broken = index === 1;
    const state = hydrateFullHandState({ ...startSpadesBiddingHand(8), hands: [[], [], step.trick.hand, []],
      currentPlayerIndex: 2, currentTrick: [], completedTricks: broken ? history : [] });
    expect(spadesHaveBeenBroken(state)).toBe(broken);
    expect(step.trick.legalCardIds).toEqual(state.legalCardIds);
    expect(step.trick.legalCardIds).toEqual(legalSpadesCards(step.trick.hand, undefined, broken).map(card => card.id));
    expect(step.choiceMode).toBe("select");
    expect(step.showTable).toBe(false);
    expect(new Set(step.trick.hand.map(card => card.id)).size).toBe(step.trick.hand.length);
    for (const choice of step.trick.hand) {
      const answer = drillDecision(step, choice);
      expect(drillTableCards(step, choice)).toEqual([]);
      expect(drillDecisionReview(step, choice).groups).toEqual([{ label: "Your hand before your choice", cards: step.trick.hand }]);
      if (index === 0 && choice.suit === "S") {
        expect(answer.result).toMatchObject({ clean: false, outcome: "illegal", reason: "illegal_lead" });
        expect(answer.feedback).toMatch(/cannot|not a legal/);
      } else {
        expect(answer.result.outcome).not.toBe("illegal");
        if (index !== 1) expect(answer.result.clean).toBe(true);
      }
    }
    if (index === 2) expect(step.trick.hand.every(card => card.suit === "S")).toBe(true);
  }
  // A spade lead still requires followers who hold spades to follow them.
  expect(legalSpadesCards([card("2S"), card("AC")], "S", true).map(card => card.id)).toEqual(["2S"]);
});

test("nil exercise answers agree with public-information policy and actual trick winners", () => {
  for (const [index, base] of spadesLearningSteps("nil").entries()) for (const step of [base, base.followUp!]) {
    const completedTricks = index === 2 ? ["You", "Tutor", "Tutor", "Tutor"].map(winner => ({
      winner: winner as Seat, winnerIndex: winner === "You" ? 2 : 0, cards: [], penalty: 1, outcome: "won_clean_trick" as const
    })) : [];
    const state = { ...startSpadesBiddingHand(8), hands: [[], [], step.trick.hand, []], currentPlayerIndex: 2,
      spadesBids: { You: 0, Tutor: 4, Left: 3, Right: 3 }, currentTrick: step.trick.tableBeforeChoice, completedTricks };
    const chosen = chooseBrowserOpponentCardForState(state)!;
    expect(drillDecision(step, chosen).result.clean).toBe(true);
    for (const choice of step.trick.hand) {
      const legal = legalSpadesCards(step.trick.hand, step.trick.tableBeforeChoice[0].card.suit, false);
      const answer = drillDecision(step, choice);
      expect(step.trick.legalCardIds).toEqual(legal.map(card => card.id));
      if (!legal.some(card => card.id === choice.id)) { expect(answer.result.outcome).toBe("illegal"); continue; }
      const winner = trickWinner(drillTableCards(step, choice), "S")!;
      if (answer.result.clean) expect(winner.seat).toBe(index === 2 ? "Tutor" : "Right");
      if (answer.result.outcome === "penalty") expect(winner.seat).toBe("You");
    }
  }
});
