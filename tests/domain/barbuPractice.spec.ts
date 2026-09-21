import { expect, test } from "@playwright/test";
import native from "../fixtures/barbu-native-practice.json" with { type: "json" };
import { barbuPracticeTopics, generateBarbuPracticeSet, generateNoHeartsFollowSuit, type BarbuPracticeTopic } from "../../src/domain/barbuPractice";
import { barbuTrickPoints } from "../../src/domain/barbuRules";
import { typescriptHandEngine } from "../../src/domain/handEngine";
import { dominoHandEngine } from "../../src/domain/dominoHand";
import { isLegalDominoPlacement } from "../../src/domain/dominoRules";
import { legalCards, trickWinner } from "../../src/domain/trickTakingRules";
import type { Card, FullHandContract, GeneratedPracticeScenario, TableCard } from "../../src/lessonTypes";

// Native hashes cover the entire DTO except two deliberately corrected classes of feedback copy.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== "explanation").sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, field]) => [key, canonical(field)]));
  return value;
}
async function hash(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical(value))));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
const table = (plays: TableCard[] | null) => plays?.map(({ seat, card }) => [seat, card.id]) ?? null;
const compact = (s: GeneratedPracticeScenario) => ({ ...s, playerHand: s.playerHand.map(c => c.id),
  tableBeforeChoice: table(s.tableBeforeChoice), tableAfterChoice: table(s.tableAfterChoice),
  outcomes: s.outcomes.map(o => ({ ...o, completedTrick: table(o.completedTrick) })) });

test("Barbu preserves all 28 native practice patterns and feedback, with explicit copy corrections", () => {
  const actual = generateBarbuPracticeSet(0).scenarios;
  actual.forEach((s, index) => {
    for (const outcome of s.outcomes) {
      const card = s.playerHand.find(c => c.id === outcome.cardId)!;
      const previous = native.scenarios[index].outcomes.find(o => o.cardId === outcome.cardId)!;
      if (s.contract === "Hearts Trumps" && outcome.isLegal && outcome.winner !== "You" && card.suit === s.ledSuit) {
        expect(outcome.explanation).toContain("follows");
        expect(outcome.explanation).not.toContain("void");
        outcome.explanation = previous.explanation;
      } else if (s.contract !== "Domino" && s.contract !== "Hearts Trumps" && outcome.isLegal && card.suit !== s.ledSuit) {
        expect(outcome.explanation).toContain("legal discard because you are void");
        outcome.explanation = previous.explanation;
      }
    }
    expect(compact(s), s.id).toEqual(native.scenarios[index]);
  });
});

test("Barbu native seeded cards and decisions match including large integer seeds", async () => {
  for (const { seed, sha256 } of native.sets) expect(await hash(generateBarbuPracticeSet(seed)), `mixed seed ${seed}`).toBe(sha256);
  for (const { seed, sha256 } of native.follow) expect(await hash(generateNoHeartsFollowSuit(seed)), `follow seed ${seed}`).toBe(sha256);
});

test("Barbu pools retain four distinct patterns per contract and varied deals", () => {
  const hands = new Map<string, Set<string>>();
  for (let seed = 0; seed < 32; seed++) {
    const set = generateBarbuPracticeSet(seed);
    expect(set.scenarios).toHaveLength(28);
    for (const [index, topic] of barbuPracticeTopics.entries()) {
      const focused = generateBarbuPracticeSet(seed, topic).scenarios;
      expect(focused).toEqual(set.scenarios.filter((_, i) => i % 7 === index));
      expect(new Set(focused.map(s => s.id.replace(/-\d+$/, ""))).size).toBe(4);
    }
    for (const s of set.scenarios) {
      const pattern = s.id.replace(/-\d+$/, "");
      const variations = hands.get(pattern) ?? new Set<string>();
      variations.add(JSON.stringify([s.playerHand, s.tableBeforeChoice, s.tableAfterChoice]));
      hands.set(pattern, variations);
      expect(s.legalCardIds.length).toBeGreaterThan(0);
      expect(s.outcomes.filter(o => o.isLegal).map(o => o.cardId)).toEqual(s.legalCardIds);
      const cards = [...s.playerHand, ...s.tableBeforeChoice.map(p => p.card), ...s.tableAfterChoice.map(p => p.card)];
      expect(new Set(cards.map(c => c.id)).size, s.id).toBe(cards.length);
      for (const outcome of s.outcomes) {
        if (!outcome.isLegal || s.contract === "Domino") {
          expect(outcome.completedTrick).toBeNull();
          expect(outcome.winner).toBeNull();
        } else {
          expect(outcome.completedTrick).toHaveLength(4);
          expect(trickWinner(outcome.completedTrick!, s.contract === "Hearts Trumps" ? "H" : undefined)!.seat).toBe(outcome.winner);
        }
      }
      if (s.contract !== "Domino") expect(s.legalCardIds).toEqual(legalCards(s.playerHand, s.ledSuit).map(c => c.id));
    }
  }
  expect(hands.size).toBe(28);
  // Native seed-residue selection fixes the lane shape of two Domino patterns.
  for (const [pattern, variations] of hands) if (!pattern.startsWith("domino-")) expect(variations.size, pattern).toBeGreaterThan(1);
  const set = generateBarbuPracticeSet(42);
  set.scenarios[0].playerHand[0].id = "mutated";
  expect(generateBarbuPracticeSet(42).scenarios[0].playerHand[0].id).not.toBe("mutated");
});

test("Barbu practice and hand play use the same contract points and Domino adjacency", () => {
  const card = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.slice(-1) as Card["suit"] });
  const trick: TableCard[] = ["AH", "KH", "QH", "QS"].map(id => ({ seat: "You", card: card(id) }));
  expect(barbuTrickPoints("No Hearts", trick, 1)).toBe(10);
  expect(barbuTrickPoints("No Queens", trick, 1)).toBe(12);
  expect(barbuTrickPoints("King of Hearts", trick, 1)).toBe(20);
  expect(barbuTrickPoints("No Tricks", trick, 1)).toBe(2);
  expect(barbuTrickPoints("Hearts Trumps", trick, 1)).toBe(5);
  expect([10, 11, 12, 13].map(n => barbuTrickPoints("No Last Two", trick, n))).toEqual([0, 0, 10, 20]);
  const lane = [card("6S"), card("7S"), card("8S")];
  for (const id of ["5S", "9S"]) expect(isLegalDominoPlacement(lane, card(id))).toBe(true);
  for (const id of ["4S", "7S", "10S"]) expect(isLegalDominoPlacement(lane, card(id))).toBe(false);
  expect(isLegalDominoPlacement([], card("7H"))).toBe(true);
  expect(isLegalDominoPlacement([], card("6H"))).toBe(false);
  expect(isLegalDominoPlacement([], card("9H"), "9")).toBe(true);
});

test("Barbu practice rejects invalid seeds and unknown focus contracts", () => {
  for (const seed of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => generateBarbuPracticeSet(seed)).toThrow();
    expect(() => generateNoHeartsFollowSuit(seed)).toThrow();
  }
  expect(() => generateBarbuPracticeSet(0, "unknown" as BarbuPracticeTopic)).toThrow();
});

test("shared practice rules preserve totals and completion in the hand engines", () => {
  for (const [contract, total] of Object.entries({ "No Hearts": 30, "No Queens": 24, "King of Hearts": 20, "No Last Two": 30, "No Tricks": 26, "Hearts Trumps": 65 })) {
    for (let seed = 0; seed < 16; seed++) {
      const engine = typescriptHandEngine(contract as FullHandContract)!;
      let hand = engine.start({ seed });
      for (let trick = 0; trick < 13; trick++) hand = engine.transition(hand, { type: "play-card", cardId: hand.legalCardIds[0] });
      expect(hand.status, contract).toBe("complete");
      expect(hand.completedTricks).toHaveLength(13);
      expect(hand.totalPenalty, contract).toBe(total);
    }
  }
  for (let seed = 0; seed < 4; seed++) {
    let hand = dominoHandEngine.start({ seed });
    for (let turn = 0; turn < 100 && hand.status !== "complete"; turn++) {
      hand = dominoHandEngine.transition(hand, hand.legalCardIds.length ? { type: "play-card", cardId: hand.legalCardIds[0] } : { type: "pass" });
    }
    expect(hand.status).toBe("complete");
    expect(hand.layout.map(lane => lane.length)).toEqual([13, 13, 13, 13]);
    expect([...hand.scores].sort((a, b) => a - b)).toEqual([-5, 5, 20, 45]);
  }
});
