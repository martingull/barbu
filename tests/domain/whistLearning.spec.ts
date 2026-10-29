import { test, expect } from "@playwright/test";
import { get } from "svelte/store";
import { createWhistSession, transitionWhistSession, whistSessionSettlement } from "../../src/domain/whistSession";
import { whistLearningPosition, whistLearningScore, whistLearningRecap, whistLearningTrick } from "../../src/domain/whistLearning";
import { whistGuidance, whistGuidedReview } from "../../src/features/whist/whistGuidance";
import { whistLearningSteps } from "../../src/lessons/whist/learning";
import { drillDecision, drillTableCards } from "../../src/lessons/drillDecision";
import { legalCards, trickWinner } from "../../src/domain/trickTakingRules";
import { standardDeck } from "../../src/domain/deck";
import type { Card, CompletedHandTrick, Suit } from "../../src/domain/types";
import { createGuidedHandFeature } from "../../src/features/guidedHandFeature";

const card = (id: string): Card => standardDeck().find(card => card.id === id)!;
const seats = ["Tutor", "Right", "You", "Left"];

test("Whist has six staged topics with distinct bounded companions, legal play and factual breakdowns", () => {
  const ids: string[] = [];
  for (const topic of ["lead", "follow", "trump", "third", "return", "odd"] as const) {
    const steps = whistLearningSteps(topic);
    expect(steps.map(step => step.teaching?.stage)).toEqual(["worked", "supported", "independent"]);
    expect(steps[0].teaching?.guidance).toContain("Try ");
    expect(steps[2].teaching?.guidance).toBeUndefined();
    for (const step of steps) {
      expect(step.followUp?.teaching?.stage).toBe("reinforcement");
      expect(step.followUp?.followUp).toBeUndefined();
      expect(step.followUp?.trick.hand).not.toEqual(step.trick.hand);
      for (const example of [step, step.followUp!]) {
        ids.push(example.scenarioId!);
        const { hand, tableBeforeChoice, tableAfterChoice, legalCardIds } = example.trick;
        const cards = [...hand, ...tableBeforeChoice.map(play => play.card), ...tableAfterChoice.map(play => play.card)];
        expect(new Set(cards.map(card => card.id)).size).toBe(cards.length);
        expect(legalCards(hand, tableBeforeChoice[0]?.card.suit).map(card => card.id).sort()).toEqual([...legalCardIds].sort());
        expect(hand.some(card => drillDecision(example, card).result.clean)).toBe(true);
        const trump = (example as typeof example & { trump: Suit }).trump;
        expect(example.trick.beforeResult).toContain("trumps");
        for (const choice of hand) {
          const table = drillTableCards(example, choice);
          const rows = example.breakdownByCard![choice.id].rows;
          if (topic === "lead" || topic === "return" || !legalCardIds.includes(choice.id)) {
            expect(table).toEqual(tableBeforeChoice);
            expect(rows.some(row => row.label === "Winner")).toBe(false);
          } else {
            expect(table).toHaveLength(4);
            table.slice(1).forEach((play, i) => expect(seats.indexOf(play.seat)).toBe((seats.indexOf(table[i].seat) + 1) % 4));
            const winner = trickWinner(table, trump)!;
            expect(rows.find(row => row.label === "Winner")!.value).toContain(winner.seat === "Tutor" ? "Barbu" : winner.seat);
            if (topic === "odd") expect(rows.at(-1)!.value).toContain("points above six");
          }
        }
      }
    }
  }
  expect(ids).toHaveLength(36);
  expect(new Set(ids).size).toBe(36);
});

test("guided Whist plays normal hands, reviews actual results and replays even after a game-winning hand", () => {
  let sawGameWin = false;
  const trumps = new Set<Suit>();
  for (let seed = 0; seed < 32; seed++) {
    const initial = createWhistSession(seed);
    const guided = createGuidedHandFeature(seed, { create: createWhistSession, transition: transitionWhistSession, replay: () => createWhistSession(seed) });
    const other = createGuidedHandFeature(seed, { create: createWhistSession, transition: transitionWhistSession, replay: () => createWhistSession(seed) });
    const trump = whistLearningPosition(initial.fullHand).trump;
    trumps.add(trump);
    expect(trump).toBe(initial.fullHand.whistTurnedTrump!.suit);
    for (let i = 0; i < 13; i++) {
      const session = get(guided).session;
      const event = { type: "play-card" as const, cardId: session.fullHand.legalCardIds[0] };
      guided.dispatch(event);
      expect(get(guided).session).toEqual(transitionWhistSession(session, event));
      const reviewed = get(guided).session;
      const facts = whistLearningTrick(reviewed.fullHand.completedTricks.at(-1)!, trump)!;
      expect(facts.winner.seat).toBe(reviewed.fullHand.completedTricks.at(-1)!.winner);
      expect(whistGuidedReview(reviewed.fullHand.completedTricks, trump)?.winning).toContain("highest");
      guided.dispatch(event);
      expect(get(guided).session).toEqual(reviewed);
      guided.dispatch({ type: "next-trick" });
    }
    const final = get(guided).session;
    expect(final.fullHand.status).toBe("complete");
    expect(final.results).toEqual([]);
    const score = whistLearningScore(final.fullHand.completedTricks);
    expect(score.points).toEqual(whistSessionSettlement(final).points);
    sawGameWin ||= whistSessionSettlement(final).gameComplete;
    const recap = whistLearningRecap(final.fullHand.completedTricks, trump);
    expect(recap.length).toBeLessThanOrEqual(3);
    expect(new Set(recap.map(moment => moment.number)).size).toBe(recap.length);
    expect(recap.some(moment => moment.kind === "first-point")).toBe(true);
    expect(recap.at(-1)!.number).toBe(13);
    expect(get(other).session).toEqual(initial);
    guided.replay();
    expect(get(guided).session).toEqual(initial);
  }
  expect(trumps.size).toBe(4);
  expect(sawGameWin).toBe(true);
});

test("Whist coaching only sees public cards and distinguishes legality from partnership advice", () => {
  const hand = createWhistSession(8).fullHand;
  const changed = { ...hand, hands: [[], [], [], []], id: "hidden-deal-seed" };
  expect(whistLearningPosition(changed)).toEqual(whistLearningPosition(hand));
  const position = { ...whistLearningPosition(hand), playerHand: [card("2C"), card("AS")], currentTrick: [], completedTricks: [] };
  expect(whistGuidance(position).rule).toContain("dealer's last card");
  expect(whistGuidance(position).rule).toContain("including trump");
  const follow = { ...position, currentTrick: [{ seat: "Left" as const, card: card("KC") }] };
  expect(whistGuidance(follow).rule).toContain("must follow clubs");
  expect(whistGuidance({ ...follow, playerHand: [card("2D")] }).rule).toContain("need not trump or overtrump");
  const partner = { ...position, currentTrick: [{ seat: "Tutor" as const, card: card("AC") }, { seat: "Right" as const, card: card("4C") }] };
  expect(whistGuidance(partner).tip).toContain("Barbu is currently winning");
  expect(whistGuidance({ ...partner, currentTrick: [{ seat: "Tutor", card: card("3C") }, { seat: "Right", card: card("QC") }] }).tip).toContain("Left still has to play");
});

test("Whist learning points match the six-trick baseline and use trump rather than rank alone", () => {
  const tricks = (count: number): CompletedHandTrick[] => Array.from({ length: 13 }, (_, i) => ({ winner: i < count ? "You" : "Left",
    winnerIndex: i < count ? 2 : 3, cards: [], penalty: 1, outcome: "won_clean_trick" }));
  expect(whistLearningScore(tricks(6)).points).toEqual({ playerSide: 0, opponentSide: 1 });
  expect(whistLearningScore(tricks(7)).points).toEqual({ playerSide: 1, opponentSide: 0 });
  expect(whistLearningScore(tricks(13)).points).toEqual({ playerSide: 7, opponentSide: 0 });
  const trick: CompletedHandTrick = { winner: "You", winnerIndex: 2, penalty: 1, outcome: "won_clean_trick", cards: [
    { seat: "Left", card: card("AH") }, { seat: "Tutor", card: card("4H") }, { seat: "Right", card: card("KH") }, { seat: "You", card: card("2D") }
  ] };
  expect(whistLearningTrick(trick, "D")?.winner.seat).toBe("You");
  expect(whistLearningTrick(trick, "S")?.winner.seat).toBe("Left");
});
