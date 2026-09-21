import { expect, test } from "@playwright/test";
import { typescriptHandEngine, whistHandEngine } from "../../src/domain/handEngine";
import type { FullHandState } from "../../src/lessonTypes";
import nativeFixture from "../fixtures/whist-native-save.json" with { type: "json" };

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}

function gameplay(state: FullHandState) {
  // Presentation copy/tags differ between engines; compare the actual game state.
  return {
    id: state.id,
    contract: state.contract,
    hands: state.hands.map(hand => hand.map(card => card.id)),
    currentPlayerIndex: state.currentPlayerIndex,
    currentTrick: state.currentTrick,
    completedTricks: state.completedTricks.map(({ cards, winnerIndex, penalty }) => ({ cards, winnerIndex, penalty })),
    legalCardIds: [...state.legalCardIds].sort(),
    playerPenalty: state.playerPenalty,
    totalPenalty: state.totalPenalty,
    cardsRemaining: state.cardsRemaining,
    trickNumber: state.trickNumber,
    status: state.status,
    whistDealer: state.whistDealer,
    whistTurnedTrump: state.whistTurnedTrump
  };
}

test("only Whist opts into the shared engine prototype", () => {
  expect(typescriptHandEngine("Whist")).toBe(whistHandEngine);
  for (const contract of ["Hearts", "Spades", "Bridge", "Domino", "No Hearts"] as const) {
    expect(typescriptHandEngine(contract)).toBeUndefined();
  }
});

test("Whist deals are deterministic and reject invalid dealers", () => {
  expect(whistHandEngine.start({ seed: 8, dealer: 3 })).toEqual(whistHandEngine.start({ seed: 8, dealer: 3 }));
  for (const dealer of [-1, 4, 1.5, NaN]) {
    expect(() => whistHandEngine.start({ seed: 8, dealer })).toThrow("Invalid Whist dealer");
  }
});

test("Whist resumes an actual Rust save with the same next trick", () => {
  const saved = freeze(structuredClone(nativeFixture.savedHand) as FullHandState);
  const next = whistHandEngine.transition(saved, { type: "play-card", cardId: nativeFixture.cardId });
  expect(gameplay(next)).toEqual(gameplay(nativeFixture.nextHand as FullHandState));
  expect(saved).toEqual(nativeFixture.savedHand);
});

test("Whist ignores missing cards and cannot play another game's state", () => {
  const state = freeze(whistHandEngine.start({ seed: 8 }));
  expect(whistHandEngine.transition(state, { type: "play-card", cardId: "missing" })).toBe(state);
  expect(() => whistHandEngine.transition({ ...state, contract: "Hearts" }, { type: "play-card", cardId: state.legalCardIds[0] }))
    .toThrow("Expected a Whist hand");
});

test("Whist replay preserves native deals without depending on the browser shuffle", () => {
  const saved = freeze(structuredClone(nativeFixture.savedHand) as FullHandState);
  const replay = whistHandEngine.transition(saved, { type: "replay" });
  expect(gameplay(replay)).toEqual(gameplay(nativeFixture.initialHand as FullHandState));
  const legacy = { ...saved, whistDealer: undefined, whistTurnedTrump: undefined };
  expect(whistHandEngine.transition(legacy, { type: "replay" }).hands).toEqual(replay.hands);
  expect(() => whistHandEngine.transition({ ...saved, hands: [[], [], [], []] }, { type: "replay" }))
    .toThrow("Cannot replay an incomplete Whist deal");
});

for (const dealer of [0, 1, 2, 3]) {
  test(`Whist immutable transitions conserve all 52 cards through 64 deals, dealer ${dealer}`, () => {
    let offSuitAttempts = 0;
    for (let seed = 0; seed < 64; seed++) {
      let state = whistHandEngine.start({ seed, dealer });
      const turnedTrump = state.whistTurnedTrump;
      for (let turn = 0; turn < 13 && state.status !== "complete"; turn++) {
        freeze(state);
        const led = state.currentTrick[0]?.card.suit;
        const following = state.hands[2].filter(card => card.suit === led);
        expect([...state.legalCardIds].sort()).toEqual((following.length ? following : state.hands[2]).map(card => card.id).sort());
        const illegal = state.hands[2].find(card => !state.legalCardIds.includes(card.id));
        if (illegal) {
          expect(whistHandEngine.transition(state, { type: "play-card", cardId: illegal.id })).toBe(state);
          offSuitAttempts++;
        }
        const cardId = state.legalCardIds[seed % state.legalCardIds.length];
        const next = whistHandEngine.transition(state, { type: "play-card", cardId });
        expect(next).not.toBe(state);
        const cards = [...next.hands.flat(), ...next.currentTrick.map(play => play.card),
          ...next.completedTricks.flatMap(trick => trick.cards.map(play => play.card))];
        expect(cards).toHaveLength(52);
        expect(new Set(cards.map(card => card.id)).size).toBe(52);
        state = next;
      }
      expect(state.status).toBe("complete");
      expect(state.completedTricks).toHaveLength(13);
      expect(state.cardsRemaining).toBe(0);
      expect(state.whistDealer).toBe(dealer);
      expect(state.whistTurnedTrump).toEqual(turnedTrump);
      expect(whistHandEngine.transition(freeze(state), { type: "replay" }))
        .toEqual(whistHandEngine.start({ seed, dealer }));
      expect(whistHandEngine.transition(freeze(state), { type: "play-card", cardId: "2C" })).toBe(state);
    }
    expect(offSuitAttempts).toBeGreaterThan(0);
  });
}
