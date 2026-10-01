import { expect, test } from "@playwright/test";
import { createBarbuPracticeLoader, isBarbuAttempt } from "../../src/features/barbu/barbuLearning";
import { guidedLessons } from "../../src/lessons/catalog";
import { fullHandContracts } from "../../src/domain/contractRegistry";
import type { DrillStep } from "../../src/lessons/drillDecision";
import { legalCards, trickWinner } from "../../src/domain/trickTakingRules";
import { isLegalDominoPlacement } from "../../src/domain/dominoRules";
import { barbuTrickPoints, isBarbuTrickContract } from "../../src/domain/barbuRules";
import { barbuGuidedDecision, barbuGuidedResult } from "../../src/lessons/barbu/guidedFeedback";

test("all seven Barbu topics have three valid positions with fading guidance", () => {
  expect(guidedLessons).toHaveLength(7);
  for (const lesson of guidedLessons) {
    expect(lesson.tricks).toHaveLength(3);
    expect(lesson.tricks[0].emptyExplanation.length).toBeGreaterThan(0);
    expect(lesson.tricks[1].emptyExplanation.length).toBeGreaterThan(0);
    expect(lesson.tricks[2].emptyExplanation).toBe("");
    expect(lesson.tricks[2].legalCardIds.length).toBeGreaterThan(1);
    for (const trick of lesson.tricks) {
      const cards = [...trick.hand, ...trick.tableBeforeChoice.map(play => play.card), ...trick.tableAfterChoice.map(play => play.card)];
      expect(new Set(cards.map(card => card.id)).size).toBe(cards.length);
      const legal = lesson.contract === "Domino" ? trick.hand.filter(card => isLegalDominoPlacement(
        trick.tableBeforeChoice.filter(play => play.card.suit === card.suit).map(play => play.card), card
      )) : legalCards(trick.hand, trick.tableBeforeChoice[0]?.card.suit);
      expect([...trick.legalCardIds].sort()).toEqual(legal.map(card => card.id).sort());
      if (trick.trickNumber) expect(trick.hand).toHaveLength(14 - trick.trickNumber);
      for (const card of legal) {
        expect(trick.playedExplanations[card.id]).toBeTruthy();
        expect(trick.cardOutcomes[card.id]).toBeTruthy();
        const result = barbuGuidedResult(lesson.contract, trick, card);
        if (isBarbuTrickContract(lesson.contract)) {
          const table = [...trick.tableBeforeChoice, { seat: "You" as const, card }, ...trick.tableAfterChoice];
          expect(table.map(play => play.seat)).toEqual(trick.tableBeforeChoice.length === 2
            ? ["Tutor", "Right", "You", "Left"] : ["Left", "Tutor", "Right", "You"]);
          const winner = trickWinner(table, lesson.contract === "Hearts Trumps" ? "H" : null)!;
          const points = barbuTrickPoints(lesson.contract, table, trick.trickNumber ?? 1);
          expect(result).toContain(`with ${winner.card.id}.`);
          expect(result).toContain(points ? `${points} ${lesson.contract === "Hearts Trumps" ? "reward" : "penalty"} points` : "No penalty points");
          expect(trick.cardOutcomes[card.id] === "penalty").toBe(lesson.contract !== "Hearts Trumps" && points > 0 && winner.seat === "You");
        } else expect(result).toContain(`You played ${card.id}`);
      }
    }
  }
});

test("feedback follows alternative cards and does not mark forced penalties as mistakes", () => {
  const domino = guidedLessons.find(lesson => lesson.contract === "Domino")!.tricks[0];
  expect(barbuGuidedResult("Domino", domino, domino.hand.find(card => card.id === "7H")!)).toBe("You played 7H and opened hearts.");
  const trump = guidedLessons.find(lesson => lesson.contract === "Hearts Trumps")!.tricks[0];
  expect(barbuGuidedResult("Hearts Trumps", trump, trump.hand.find(card => card.id === "2D")!)).toBe("Right wins with AC. 5 reward points for Right.");
  const late = guidedLessons.find(lesson => lesson.contract === "No Last Two")!.tricks;
  const high = late[0].hand.find(card => card.id === "QS")!;
  expect(barbuGuidedResult("No Last Two", late[0], high)).toBe("You win with QS. 10 penalty points for you.");
  expect(barbuGuidedDecision("No Last Two", late[0], high).result.clean).toBe(false);
  expect(barbuGuidedDecision("No Last Two", late[1], late[1].hand[0]).result).toMatchObject({ outcome: "penalty", clean: true });
});

test("Barbu preserves authored courses, seeded four-pattern drills and standalone Domino", () => {
  let seed = 40;
  const loader = createBarbuPracticeLoader(() => undefined, () => seed++);
  for (const lesson of guidedLessons) {
    expect(loader.load(lesson.id, true)).toEqual({ seed: 0 });
    expect(seed).toBe(40);
  }
  for (const lesson of guidedLessons.filter(lesson => lesson.contract !== "Domino")) {
    const before = seed;
    const steps = loader.load(lesson.id) as DrillStep[];
    expect(steps).toHaveLength(4);
    expect(new Set(steps.map(step => step.scenarioId)).size).toBe(4);
    expect(steps.every(step => step.contract === lesson.contract)).toBe(true);
    expect(steps).toEqual(createBarbuPracticeLoader(() => undefined, () => before).load(lesson.contract));
  }
  expect(loader.load("domino")).toEqual({ seed: 46 });
  expect(() => loader.load("unknown")).toThrow("Unknown Barbu exercise");
  expect(seed).toBe(47);
});

test("mixed review retains seven contracts and pattern memory even when storage fails", () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const loader = createBarbuPracticeLoader(() => storage, () => 20);
  const first = loader.load("mixed") as DrillStep[];
  expect(first.map(step => step.contract)).toEqual(fullHandContracts);
  expect(JSON.parse(data.get("barbu.drillPatternMemory.v1")!)).toHaveLength(6);
  const restored = createBarbuPracticeLoader(() => storage, () => 20);
  expect(restored.load("mixed")).toEqual(loader.load("mixed"));
  data.set("barbu.drillPatternMemory.v1", JSON.stringify([first[0].scenarioId]));
  const withRecent = createBarbuPracticeLoader(() => storage, () => 20).load("mixed") as DrillStep[];
  expect(withRecent[0].scenarioId).not.toBe(first[0].scenarioId);
  const blocked = createBarbuPracticeLoader(() => { throw Error("blocked"); }, () => 20);
  expect(blocked.load("mixed")).toEqual(first);
  expect(blocked.load("mixed")).toEqual(loader.load("mixed"));
});

test("Barbu history excludes empty and other-game attempts", () => {
  const result = { contract: "No Hearts", cardLabel: "2C", outcome: "good" as const, reason: "followed_suit" as const, clean: true };
  const attempt = { id: "example", completedAt: "2026-09-25", results: [result] };
  expect(isBarbuAttempt(attempt)).toBe(true);
  expect(isBarbuAttempt({ ...attempt, results: [] })).toBe(false);
  expect(isBarbuAttempt({ ...attempt, results: [result, { ...result, contract: "Hearts" }] })).toBe(false);
});
