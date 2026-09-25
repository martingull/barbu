import { expect, test } from "@playwright/test";
import { typescriptHandEngine } from "../../src/domain/handEngine";
import { barbuTrickContracts } from "../../src/domain/barbuRules";
import { chooseBarbuCard } from "../../src/domain/barbuPolicy";
import { normalizeBarbuHand } from "../../src/persistence/barbuHandSave";
import { nativeBarbuHands, nativeBarbuHand, compactBarbuHand } from "../fixtures/barbuHandFixture";
import type { Card, FullHandState } from "../../src/domain/types";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
}
async function hash(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

for (const contract of barbuTrickContracts) {
  test(`${contract} resumes native hands with identical play, scoring and tactical tags`, async () => {
    const engine = typescriptHandEngine(contract)!;
    for (const fixture of nativeBarbuHands.filter(f => f.contract === contract)) {
      let hand = normalizeBarbuHand(nativeBarbuHand(fixture))!;
      expect(hand).not.toBeNull();
      const snapshots = [];
      for (const cardId of fixture.moves) {
        expect(hand.legalCardIds).toContain(cardId);
        hand = engine.transition(freeze(hand), { type: "play-card", cardId });
        expect(normalizeBarbuHand(hand)).not.toBeNull();
        snapshots.push(compactBarbuHand(hand));
      }
      expect(compactBarbuHand(hand), `seed ${fixture.seed}`).toEqual(fixture.final);
      expect(hand.prompt).toBe(`Hand complete. You took ${hand.playerPenalty} points.`);
      expect(await hash(snapshots), `all turns at seed ${fixture.seed}`).toBe(fixture.statesSha256);
      const replay = engine.transition(freeze(hand), { type: "replay" });
      expect(compactBarbuHand(replay)).toEqual(fixture.initial);
      expect(compactBarbuHand(engine.transition(freeze(replay), { type: "replay" }))).toEqual(fixture.initial);
    }
  });
}

test("Barbu engines share deterministic, immutable deal/play/replay and reject illegal actions", () => {
  for (const contract of barbuTrickContracts) {
    const engine = typescriptHandEngine(contract)!;
    const hand = freeze(engine.start({ seed: 42 }));
    expect(engine.start({ seed: 42 })).toEqual(hand);
    expect(engine.transition(hand, { type: "play-card", cardId: "missing" })).toBe(hand);
    const illegal = hand.hands[2].find(c => !hand.legalCardIds.includes(c.id));
    if (illegal) expect(engine.transition(hand, { type: "play-card", cardId: illegal.id })).toBe(hand);
    const played = engine.transition(hand, { type: "play-card", cardId: hand.legalCardIds[0] });
    expect(compactBarbuHand(engine.transition(freeze(played), { type: "replay" }))).toEqual(compactBarbuHand(hand));
    expect(hand.completedTricks).toHaveLength(0);
    expect(() => engine.transition({ ...hand, contract: "Whist" }, { type: "replay" })).toThrow();
    for (const seed of [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) expect(() => engine.start({ seed })).toThrow();
  }
  expect(typescriptHandEngine("Domino")).toBeUndefined();
});

test("Barbu save validation repairs caches and rejects corrupted cards, scores and winners", () => {
  const fixture = nativeBarbuHands[0];
  const original = freeze({ ...nativeBarbuHand(fixture), legalCardIds: ["bad"], cardsRemaining: 999, playerPenalty: 999 });
  const normalized = normalizeBarbuHand(original)!;
  expect(compactBarbuHand(normalized)).toEqual(fixture.initial);
  expect(original.cardsRemaining).toBe(999);
  const finished = nativeBarbuHand(fixture, true);
  expect(normalizeBarbuHand(finished)).not.toBeNull();
  for (const input of [null, {}, { ...original, contract: "Hearts" }, { ...original, hands: [] },
    { ...original, hands: original.hands.map(() => original.hands[2]) }, { ...original, currentPlayerIndex: 9 },
    { ...finished, completedTricks: finished.completedTricks.map(t => ({ ...t, penalty: 999 })) },
    { ...finished, completedTricks: finished.completedTricks.map(t => ({ ...t, winner: "You", winnerIndex: 2 })) }]) {
    expect(normalizeBarbuHand(input)).toBeNull();
  }
  const engine = typescriptHandEngine(finished.contract)!;
  expect(engine.transition(freeze(finished), { type: "play-card", cardId: fixture.moves[0] })).toBe(finished);
});

test("Barbu policy keeps each contract's objective and native tie-breaking", () => {
  const c = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.at(-1) as Card["suit"] });
  const choose = (contract: FullHandState["contract"], cards: string[], led: string[], completed = 0) => chooseBarbuCard(
    contract as typeof barbuTrickContracts[number], cards.map(c), led.map(id => ({ seat: "Tutor", card: c(id) })), "Right", completed)?.id;
  expect(choose("No Hearts", ["AH", "AS"], ["2C"])).toBe("AH");
  expect(choose("King of Hearts", ["KH", "AS"], ["2C"])).toBe("KH");
  expect(choose("No Queens", ["QS", "AS"], ["KS"])).toBe("QS");
  expect(choose("No Queens", ["QS", "KS"], ["JS"])).toBe("QS");
  expect(choose("No Tricks", ["4S", "AS"], ["KS"])).toBe("4S");
  expect(choose("No Last Two", ["4S", "AS"], [], 9)).toBe("AS");
  expect(choose("No Last Two", ["4S", "AS"], [], 10)).toBe("4S");
  expect(choose("Hearts Trumps", ["2H", "KH", "AS"], ["KS"])).toBe("AS");
  expect(choose("Hearts Trumps", ["2H", "KH", "AD"], ["KS", "5H"])).toBe("KH");
  expect(choose("Hearts Trumps", ["2H", "AD"], ["KS", "5H"])).toBe("AD");
  expect(choose("No Tricks", ["AH", "AS"], [])).toBe("AH");
});
