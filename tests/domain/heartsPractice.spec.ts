import { expect, test } from "@playwright/test";
import { nativeHeartsPractice as native } from "../fixtures/heartsPracticeFixture";
import { evaluateHeartsPass, generateHeartsPassPractice, generateHeartsPracticeSet, heartsPracticeTopics, type HeartsPracticeFocus } from "../../src/domain/heartsPractice";
import { legalHeartsCards } from "../../src/domain/heartsRules";
import type { Card } from "../../src/lessonTypes";

test("all native Hearts practice cards, ordering and outcomes survive migration", () => {
  native.sets.forEach((expected, seed) => {
    const actual = generateHeartsPracticeSet(seed);
    // Correct two misleading native illegal-play explanations; all other fields remain exact.
    for (const scenario of expected.scenarios) {
      for (const outcome of scenario.outcomes) {
        const replacement = actual.scenarios.find(s => s.id === scenario.id)!.outcomes.find(o => o.cardId === outcome.cardId)!;
        if (scenario.id.startsWith("hearts-break-hearts-blocked") && !outcome.isLegal) {
          expect(replacement.explanation).toBe(`${outcome.cardId} is not legal yet. Hearts have not been broken and you still have another suit.`);
          replacement.explanation = outcome.explanation;
        }
        if (scenario.id.startsWith("hearts-first-trick-void-safe-discard") && !outcome.isLegal) {
          expect(replacement.explanation).toBe(`${outcome.cardId} is not legal on the first trick while you have a non-penalty discard.`);
          replacement.explanation = outcome.explanation;
        }
      }
    }
    expect(actual).toEqual(expected);
  });
  native.passes.forEach((expected, seed) => expect(generateHeartsPassPractice(seed)).toEqual(expected));
});

test("every topic supplies three distinct decisions for every seed, with fresh state", () => {
  for (let seed = 0; seed < 128; seed++) {
    const mixed = generateHeartsPracticeSet(seed);
    expect(mixed.scenarios).toHaveLength(18);
    heartsPracticeTopics.forEach((topic, index) => {
      const focused = generateHeartsPracticeSet(seed, topic);
      expect(focused.scenarios).toEqual(mixed.scenarios.filter((_, i) => i % 6 === index));
      expect(new Set(focused.scenarios.map(s => s.id.replace(/-\d+$/, ""))).size).toBe(3);
      for (const s of focused.scenarios) {
        const allIds = [...s.playerHand.map(c => c.id), ...s.tableBeforeChoice.map(p => p.card.id), ...s.tableAfterChoice.map(p => p.card.id)];
        expect(new Set(allIds).size).toBe(allIds.length);
        expect(s.outcomes.some(o => o.outcomeKind === "good")).toBe(true);
        expect(s.outcomes.filter(o => o.isLegal).map(o => o.cardId)).toEqual(s.legalCardIds);
      }
    });
    mixed.scenarios[0].playerHand[0].id = "mutated";
    expect(generateHeartsPracticeSet(seed).scenarios[0].playerHand[0].id).not.toBe("mutated");
  }
});

test("passing grades three owned unique cards and preserves the long suit", () => {
  for (const seed of [0, 1, 42, 101]) {
    const scenario = generateHeartsPassPractice(seed);
    const ids = scenario.recommendedPass.map(card => card.id);
    expect(ids).toEqual(["QS", "AH", "KH"]);
    expect(new Set(scenario.playerHand.map(c => c.id)).size).toBe(13);
    expect(evaluateHeartsPass(scenario, ids).isExact).toBe(true);
    expect(evaluateHeartsPass(scenario, ["QS", "2C", "4C"])).toEqual({ matchedCards: ["QS"], isComplete: true, isExact: false });
    for (const invalid of [[], ["QS"], ["QS", "QS", "AH"], ["QS", "AH", "KH", "2C"], ["QS", "AH", "JH"]]) {
      expect(evaluateHeartsPass(scenario, invalid).isComplete).toBe(false);
    }
    if (seed % 2) expect(scenario.playerHand.filter(c => c.suit === "C").map(c => c.id)).toEqual(["2C", "3C", "4C", "5C", "6C", "7C", "8C"]);
    scenario.playerHand[0].id = "mutated";
    expect(generateHeartsPassPractice(seed).playerHand[0].id).not.toBe("mutated");
  }
});

test("practice and play share first-trick and unbroken-hearts exceptions", () => {
  const card = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.slice(-1) as Card["suit"] });
  const onlyPoints = [card("QS"), card("KH")];
  expect(legalHeartsCards(onlyPoints, "C", true, false)).toEqual(onlyPoints);
  expect(legalHeartsCards([card("2C"), card("QS")], undefined, true, false)).toEqual([card("2C")]);
  expect(legalHeartsCards([card("3H"), card("AH")], undefined, false, false)).toEqual([card("3H"), card("AH")]);
  expect(legalHeartsCards([card("3H"), card("AC")], "H", false, false)).toEqual([card("3H")]);
});

test("practice seeds and topics are validated without rounding seed arithmetic", () => {
  for (const seed of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => generateHeartsPracticeSet(seed)).toThrow();
    expect(() => generateHeartsPassPractice(seed)).toThrow();
  }
  expect(() => generateHeartsPracticeSet(0, "unknown" as HeartsPracticeFocus)).toThrow();
  expect(generateHeartsPracticeSet(Number.MAX_SAFE_INTEGER).scenarios).toHaveLength(18);
});
