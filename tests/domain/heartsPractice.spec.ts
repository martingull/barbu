import { expect, test } from "@playwright/test";
import { nativeHeartsPractice as native } from "../fixtures/heartsPracticeFixture";
import { evaluateHeartsPass, generateHeartsPassPractice, generateHeartsPracticeSet, heartsPassPracticeCount, heartsPracticeTopics, type HeartsPracticeFocus } from "../../src/domain/heartsPractice";
import { legalHeartsCards } from "../../src/domain/heartsRules";
import type { Card } from "../../src/lessonTypes";

test("unchanged Hearts topics retain their native migration coverage", () => {
  native.sets.forEach((expected, seed) => {
    const actual = generateHeartsPracticeSet(seed);
    // Break-hearts and passing lessons were deliberately revised after migration.
    const unchanged = (s: { id: string }) => !s.id.startsWith("hearts-break-hearts-");
    for (const scenario of expected.scenarios.filter(unchanged)) {
      for (const outcome of scenario.outcomes) {
        const replacement = actual.scenarios.find(s => s.id === scenario.id)!.outcomes.find(o => o.cardId === outcome.cardId)!;
        if (scenario.id.startsWith("hearts-first-trick-void-safe-discard") && !outcome.isLegal) {
          expect(replacement.explanation).toBe(`${outcome.cardId} is not legal on the first trick while you have a non-penalty discard.`);
          replacement.explanation = outcome.explanation;
        }
      }
    }
    expect(actual.scenarios.filter(unchanged)).toEqual(expected.scenarios.filter(unchanged));
  });
  // Passing lessons were deliberately revised after migration; keep legacy hands as evidence.
  for (let seed = 0; seed < 2; seed++) {
    expect(generateHeartsPassPractice(seed).playerHand).toEqual(native.passes[seed].playerHand);
  }
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

test("passing offers three distinct plans, valid alternatives and fresh state", () => {
  expect(heartsPassPracticeCount).toBe(3);
  for (const seed of [0, 1, 2, 42, 101]) {
    const scenario = generateHeartsPassPractice(seed);
    const ids = scenario.recommendedPass.map(card => card.id);
    expect(new Set(scenario.playerHand.map(c => c.id)).size).toBe(13);
    for (const plan of [{ cardIds: ids, explanation: scenario.explanation }, ...scenario.alternatives]) {
      expect(evaluateHeartsPass(scenario, [...plan.cardIds].reverse())).toEqual({
        isComplete: true, outcomeKind: "good", explanation: plan.explanation
      });
    }
    for (const invalid of [[], ids.slice(0, 2), [ids[0], ids[0], ids[1]], [...ids, ids[0]], [ids[0], ids[1], "missing"]]) {
      expect(evaluateHeartsPass(scenario, invalid)).toMatchObject({ isComplete: false, outcomeKind: "illegal" });
    }
    scenario.playerHand[0].id = "mutated";
    if (scenario.alternatives[0]) scenario.alternatives[0].cardIds[0] = "mutated";
    expect(generateHeartsPassPractice(seed).playerHand[0].id).not.toBe("mutated");
    expect(generateHeartsPassPractice(seed).alternatives[0]?.cardIds[0]).not.toBe("mutated");
    expect(new Set(Array.from({ length: 3 }, (_, i) => generateHeartsPassPractice(seed + i).title)).size).toBe(3);
  }
});

test("passing feedback explains exposed spades, low exits and an incomplete void", () => {
  const exposed = evaluateHeartsPass(generateHeartsPassPractice(0), ["QS", "AH", "KH"]);
  expect(exposed).toMatchObject({ isComplete: true, outcomeKind: "risky" });
  expect(exposed.explanation).toContain("low cover");
  const exits = evaluateHeartsPass(generateHeartsPassPractice(1), ["QS", "2C", "4C"]);
  expect(exits.explanation).toContain("low clubs");
  const voidPlan = evaluateHeartsPass(generateHeartsPassPractice(2), ["KD", "AD", "AH"]);
  expect(voidPlan.explanation).toContain("must still follow diamonds");
  const alternative = evaluateHeartsPass(generateHeartsPassPractice(1), ["QS", "2D", "4D"]);
  expect(alternative.outcomeKind).toBe("good");
  expect(alternative.explanation).toContain("incoming diamonds");
});

test("practice and play share first-trick and unbroken-hearts exceptions", () => {
  const card = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.slice(-1) as Card["suit"] });
  const onlyPoints = [card("QS"), card("KH")];
  expect(legalHeartsCards(onlyPoints, "C", true, false)).toEqual(onlyPoints);
  expect(legalHeartsCards([card("2C"), card("QS")], undefined, true, false)).toEqual([card("2C")]);
  expect(legalHeartsCards([card("3H"), card("AH")], undefined, false, false)).toEqual([card("3H"), card("AH")]);
  expect(legalHeartsCards([card("3H"), card("AC")], "H", false, false)).toEqual([card("3H")]);
  expect(legalHeartsCards([card("3H"), card("AC")], undefined, false, false)).toEqual([card("AC")]);
});

test("breaking hearts teaches the all-heart exception, following and free leads in order", () => {
  for (const seed of [0, 1, 42, 127]) {
    const [lead, follow, nextLead] = generateHeartsPracticeSet(seed, "break-hearts").scenarios;
    expect(lead.title).toBe("Only hearts remain");
    expect(lead.legalCardIds).toEqual(["2H", "8H", "KH"]);
    for (const outcome of lead.outcomes) {
      expect(outcome.outcomeKind).toBe("good");
      expect(outcome.explanation).toContain("This lead breaks hearts");
    }
    expect(follow.legalCardIds).toEqual(["KH"]);
    expect(follow.outcomes.find(o => o.cardId === "6D")).toMatchObject({ outcomeKind: "illegal", isLegal: false });
    expect(follow.outcomes.find(o => o.cardId === "6D")!.explanation).toContain("hearts were led");
    expect(follow.outcomes.find(o => o.cardId === "KH")).toMatchObject({ outcomeKind: "good", winner: "You", penalty: 2 });
    expect(nextLead.legalCardIds).toEqual(nextLead.playerHand.map(c => c.id));
    for (const outcome of nextLead.outcomes) {
      expect(outcome.outcomeKind).toBe("good");
      expect(outcome.explanation).toContain("Hearts are allowed, not required");
    }
  }
});

test("practice seeds and topics are validated without rounding seed arithmetic", () => {
  for (const seed of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => generateHeartsPracticeSet(seed)).toThrow();
    expect(() => generateHeartsPassPractice(seed)).toThrow();
  }
  expect(() => generateHeartsPracticeSet(0, "unknown" as HeartsPracticeFocus)).toThrow();
  expect(generateHeartsPracticeSet(Number.MAX_SAFE_INTEGER).scenarios).toHaveLength(18);
});
