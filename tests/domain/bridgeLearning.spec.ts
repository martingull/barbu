import { expect, test } from "@playwright/test";
import { bridgeDef } from "../../src/games/bridge";
import { bridgeCourses } from "../../src/lessons/bridge/courses";
import { bridgeContractSteps, bridgeDummyDrillPool, bridgeDeclarerDrillPool, bridgeDefenseDrillPool, bridgeBiddingPracticeSteps } from "../../src/lessons/bridge/exercises";
import { legalCards, trickWinner } from "../../src/domain/trickTakingRules";
import { drillDecision, drillTableCards } from "../../src/lessons/drillDecision";
import { standardDeck } from "../../src/domain/deck";
import type { Seat, TableCard } from "../../src/domain/types";

test("Bridge starts with contracts and separate hands without reusing declarer questions", () => {
  expect(bridgeDef.learnSteps.map(step => step.id)).toEqual([
    "bridge-contracts", "bridge-dummy", "bridge-bidding", "bridge-declarer", "bridge-defense"
  ]);
  expect(bridgeCourses.map(course => course.pathStepId)).toEqual(bridgeDef.learnSteps.map(step => step.id));
  expect(bridgeCourses.find(course => course.pathStepId === "bridge-dummy")!.practiceTarget).toMatchObject({ action: "dummy" });
  expect(bridgeContractSteps.map(step => step.contract.target)).toEqual([7, 9, 10]);
  expect(bridgeContractSteps.map(step => step.contract.strain)).toEqual(["H", "NT", "S"]);
  expect(bridgeDummyDrillPool).toHaveLength(3);
  expect(bridgeDummyDrillPool.map(step => step.playingSeat)).toEqual(["Tutor", "Tutor", "You"]);
  for (const step of bridgeDummyDrillPool) {
    expect(bridgeDeclarerDrillPool.some(other => other.scenarioId === step.scenarioId)).toBe(false);
    const trick = step.trick;
    expect(legalCards(trick.hand, trick.tableBeforeChoice[0]?.card.suit).map(card => card.id).sort()).toEqual([...trick.legalCardIds].sort());
    const plays = [...trick.tableBeforeChoice, { seat: step.playingSeat, card: trick.hand.find(card => card.id === trick.legalCardIds[0])! }, ...trick.tableAfterChoice];
    expect(new Set(plays.map(play => play.seat)).size).toBe(4);
    expect(new Set(plays.map(play => play.card.id)).size).toBe(4);
    expect(trick.hand.every(card => !step.referenceHand!.cards.some(other => card.id === other.id))).toBe(true);
  }
});

test("Bridge scripts resolve every choice without duplicate cards or impossible visible-hand discards", () => {
  const seats: Seat[] = ["Tutor", "Right", "You", "Left"];
  for (const step of [...bridgeDummyDrillPool, ...bridgeDeclarerDrillPool, ...bridgeDefenseDrillPool]) {
    expect(drillTableCards(step)).toEqual(step.trick.tableBeforeChoice);
    for (const card of step.trick.hand) {
      const table = drillTableCards(step, card);
      const legal = step.trick.legalCardIds.includes(card.id);
      const decision = drillDecision(step, card);
      expect(decision.feedback.length).toBeGreaterThan(20);
      if (!legal) {
        expect(table).toEqual(step.trick.tableBeforeChoice);
        expect(decision.result.outcome).toBe("illegal");
        continue;
      }
      expect(table).toHaveLength(4);
      expect(new Set(table.map(play => play.card.id)).size).toBe(4);
      table.forEach((play, i) => {
        expect(play.seat).toBe(seats[(seats.indexOf(table[0].seat) + i) % 4]);
        if (play.seat !== (step.playingSeat ?? "You")) expect(step.trick.hand.some(held => held.id === play.card.id)).toBe(false);
      });
      // Visible dummy cards constrain the script even when its hand is only an excerpt.
      const referenceSeat = step.referenceHand?.label.startsWith("East") ? "Right"
        : step.referenceHand?.label.startsWith("South") ? "You" : "Tutor";
      const referencePlay = table.find(play => play.seat === referenceSeat)!;
      if (step.referenceHand?.cards.some(held => held.suit === table[0].card.suit)) {
        expect(referencePlay.card.suit).toBe(table[0].card.suit);
      }
    }
  }
});

test("alternative leads and third-hand mistakes change the scripted response", () => {
  for (const [step, choices] of [
    [bridgeDeclarerDrillPool[0], { QC: "QC", AC: "AC", "7C": "JC" }],
    [bridgeDeclarerDrillPool[1], { KD: "AD", "4S": "AS" }],
    [bridgeDefenseDrillPool[0], { "4S": "AS", QD: "AD" }],
    [bridgeDefenseDrillPool[1], { KS: "AS", JS: "QS", "3S": "8S" }]
  ] as const) {
    for (const [id, winningCard] of Object.entries(choices)) {
      const table = drillTableCards(step, step.trick.hand.find(card => card.id === id)!);
      expect(trickWinner(table)?.card.id).toBe(winningCard);
    }
  }
});

test("the final declarer decision makes three tricks only when South unblocks", () => {
  const step = bridgeDeclarerDrillPool[2];
  const deck = standardDeck();
  const card = (id: string) => deck.find(card => card.id === id)!;
  for (const choice of ["KH", "2H"]) {
    const hands: Record<Seat, string[]> = { Tutor: ["AH", "QH", "3H"], Right: ["4H", "AS", "KS"], You: ["KH", "2H", "4D"], Left: ["5H", "AD", "KD"] };
    const line: TableCard[][] = [
      drillTableCards(step, card(choice)),
      [{ seat: "Tutor", card: card("QH") }, { seat: "Right", card: card("AS") }, { seat: "You", card: card(choice === "KH" ? "2H" : "KH") }, { seat: "Left", card: card("AD") }],
      choice === "KH"
        ? [{ seat: "Tutor", card: card("3H") }, { seat: "Right", card: card("KS") }, { seat: "You", card: card("4D") }, { seat: "Left", card: card("KD") }]
        : [{ seat: "You", card: card("4D") }, { seat: "Left", card: card("KD") }, { seat: "Tutor", card: card("3H") }, { seat: "Right", card: card("KS") }]
    ];
    let leader: Seat = "Tutor";
    let tricks = 0;
    for (const table of line) {
      expect(table[0].seat).toBe(leader);
      for (const play of table) {
        expect(legalCards(hands[play.seat].map(card), table[0].card.suit).map(card => card.id)).toContain(play.card.id);
        hands[play.seat] = hands[play.seat].filter(id => id !== play.card.id);
      }
      leader = trickWinner(table)!.seat;
      if (leader === "Tutor" || leader === "You") tricks++;
    }
    expect(Object.values(hands).flat()).toHaveLength(0);
    expect(tricks).toBe(choice === "KH" ? 3 : 2);
    expect(drillDecision(step, card(choice)).result.clean).toBe(tricks === 3);
  }
});

test("Bridge topics fade hints before the independent decision", () => {
  for (const pool of [bridgeDummyDrillPool, bridgeDeclarerDrillPool, bridgeDefenseDrillPool]) {
    expect(pool[0].trick.emptyExplanation).not.toBe("");
    expect(pool[1].trick.emptyExplanation).not.toBe("");
    expect(pool[2].trick.emptyExplanation).toBe("");
  }
  expect(bridgeBiddingPracticeSteps.map(step => !!step.hint)).toEqual([true, true, false]);
});

test("declarer exercises expose dummy's relevant cards without duplicating South's hand", () => {
  for (const step of bridgeDeclarerDrillPool) {
    expect(step.handLabel).toBe("South declarer: choose a card");
    const cards = step.referenceHand!.cards;
    expect(cards.length).toBeGreaterThan(0);
    expect(new Set(cards.map(card => card.id)).size).toBe(cards.length);
    expect(cards.every(card => !step.trick.hand.some(other => other.id === card.id))).toBe(true);
    const plays = [...step.trick.tableBeforeChoice, ...step.trick.tableAfterChoice];
    for (const play of plays) {
      expect(cards.some(card => card.id === play.card.id)).toBe(play.seat === "Tutor");
    }
  }
});
