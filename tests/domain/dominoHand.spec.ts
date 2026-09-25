import { expect, test } from "@playwright/test";
import { dominoHandEngine as engine } from "../../src/domain/dominoHand";
import { normalizeDominoHand } from "../../src/persistence/dominoSave";
import { legalDominoCards, chooseDominoCard } from "../../src/domain/dominoPolicy";
import { isLegalDominoPlacement } from "../../src/domain/dominoRules";
import { dominoSuits } from "../../src/domain/dominoDeal";
import { cardRank } from "../../src/domain/trickTakingRules";
import { dominoFixtures as fixtures, inflateDominoHand, compactDominoHand } from "../fixtures/dominoHandFixture";
import type { DominoHandState, Card } from "../../src/domain/types";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
}
async function hash(value: unknown) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}
const play = (state: DominoHandState, cardId: string | null) => engine.transition(freeze(state), cardId ? { type: "play-card", cardId } : { type: "pass" });

for (const startRank of ["7", "9", "A"]) {
  test(`Domino ${startRank}-start deals and every transition match native fixtures`, async () => {
    for (const f of fixtures.native.filter(f => f.startRank === startRank)) {
      let hand = engine.start({ seed: f.seed, startRank });
      expect(compactDominoHand(hand)).toEqual(f.initial);
      const states = [];
      for (const [index, move] of f.moves.entries()) {
        if (index === f.midMove) {
          const legacy = normalizeDominoHand(freeze(inflateDominoHand(f, "mid")))!;
          expect(compactDominoHand(legacy)).toEqual(compactDominoHand(hand));
          hand = legacy;
        }
        hand = play(hand, move);
        expect(normalizeDominoHand(hand)).not.toBeNull();
        states.push(compactDominoHand(hand));
      }
      expect(compactDominoHand(hand)).toEqual(f.final);
      expect(await hash(states)).toBe(f.statesSha256);
      expect(compactDominoHand(engine.transition(freeze(hand), { type: "replay" }))).toEqual(f.initial);
    }
  });
}

test("old browser saves keep their cards and recover the original deal for replay", () => {
  for (const f of fixtures.browser) {
    for (const phase of ["initial", "mid", "final"] as const) {
      const old = inflateDominoHand(f, phase);
      const restored = normalizeDominoHand(freeze(old))!;
      expect(restored).not.toBeNull();
      expect(restored.hands).toEqual(old.hands);
      expect(restored.layout).toEqual(old.layout);
      expect(restored.outOrder).toEqual(old.outOrder);
      const replay = engine.transition(freeze(restored), { type: "replay" });
      expect(replay.hands[2].map(c => c.id)).toEqual(f.initial.hands[2]);
      expect(replay.initialHands).toEqual(restored.initialHands);
      expect(replay.scores).toEqual([0, 0, 0, 0]);
      expect(replay.hands[2]).not.toEqual(engine.start({ seed: f.seed }).hands[2]);
      expect(old.initialHands).toBeUndefined();
    }
  }
});

test("Domino immutable hands conserve 52 cards and finish across seeded deals and start ranks", () => {
  let passes = 0;
  let playerOutBeforeEnd = 0;
  for (const startRank of ["2", "7", "A"]) for (let seed = 0; seed < 32; seed++) {
    const initial = engine.start({ seed, startRank });
    let hand = initial;
    for (let turn = 0; turn < 100 && hand.status !== "complete"; turn++) {
      const cards = [...hand.hands.flat(), ...hand.layout.flat()];
      expect(cards).toHaveLength(52);
      expect(new Set(cards.map(c => c.id)).size).toBe(52);
      expect(hand.legalCardIds).toEqual(legalDominoCards(hand, 2).map(c => c.id));
      if (!hand.legalCardIds.length) passes++;
      if (!hand.hands[2].length) playerOutBeforeEnd++;
      hand = play(hand, hand.legalCardIds.at(seed % Math.max(1, hand.legalCardIds.length)) ?? null);
    }
    expect(hand.status).toBe("complete");
    expect(hand.layout.map(l => l.length)).toEqual([13, 13, 13, 13]);
    expect([...hand.scores].sort((a, b) => a - b)).toEqual([-5, 5, 20, 45]);
    expect(new Set(hand.outOrder).size).toBe(4);
    expect(hand.prompt).toBe(`Domino complete. You scored ${hand.scores[2]} points.`);
    expect(engine.transition(hand, { type: "pass" })).toBe(hand);
    expect(engine.transition(hand, { type: "play-card", cardId: "7C" })).toBe(hand);
    expect(engine.transition(freeze(hand), { type: "replay" })).toEqual(initial);
  }
  expect(passes).toBeGreaterThan(0);
  expect(playerOutBeforeEnd).toBeGreaterThan(0);
});

test("Domino rejects illegal placements, optional passes, wrong turns and invalid starts", () => {
  const hand = freeze(engine.start({ seed: 8 }));
  expect(engine.transition(hand, { type: "play-card", cardId: "missing" })).toBe(hand);
  const illegal = hand.hands[2].find(c => !hand.legalCardIds.includes(c.id))!;
  expect(engine.transition(hand, { type: "play-card", cardId: illegal.id })).toBe(hand);
  const playable = fixtures.native.find(f => f.initial.legalCardIds.length)!;
  const canPlay = freeze(normalizeDominoHand(inflateDominoHand(playable))!);
  expect(engine.transition(canPlay, { type: "pass" })).toBe(canPlay);
  const wrongTurn = freeze({ ...canPlay, currentPlayerIndex: 0 });
  expect(engine.transition(wrongTurn, { type: "play-card", cardId: canPlay.legalCardIds[0] })).toBe(wrongTurn);
  for (const seed of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => engine.start({ seed })).toThrow();
  expect(() => engine.start({ seed: 1, startRank: "1" })).toThrow();
});

test("Domino save boundary validates lanes, ownership and finishing order and rebuilds caches", () => {
  const saved = engine.start({ seed: 8 });
  const normalized = normalizeDominoHand(freeze({ ...saved, legalCardIds: ["bad"], cardsRemaining: 999, scores: [999], prompt: "stale" }))!;
  expect(normalized).toEqual(saved);
  for (const bad of [null, {}, { ...saved, contract: "Hearts" }, { ...saved, hands: [] },
    { ...saved, hands: saved.hands.map(() => saved.hands[2]) }, { ...saved, layout: [] },
    { ...saved, currentPlayerIndex: 9 }, { ...saved, startRank: "1" }, { ...saved, outOrder: ["You"] },
    { ...saved, outOrder: ["Left", "Left"] }, { ...saved, passedPlayers: ["Unknown"] },
    { ...saved, status: "complete" }, { ...saved, initialHands: saved.hands },
    { ...saved, id: "unrecoverable", initialHands: undefined }]) expect(normalizeDominoHand(bad)).toBeNull();
  const gapped = JSON.parse(JSON.stringify(fixtures.native[0])) as typeof fixtures.native[number];
  const hand = inflateDominoHand(gapped, "mid");
  const lane = hand.layout.find(l => l.length > 1)!;
  const swap = hand.hands.flat().find(c => c.suit === lane[0].suit && Math.abs(cardRank(c) - cardRank(lane[0])) > 1)!;
  const owner = hand.hands.find(h => h.some(c => c.id === swap.id))!;
  owner[owner.findIndex(c => c.id === swap.id)] = lane[0];
  lane[0] = swap;
  expect(normalizeDominoHand(hand)).toBeNull();
  const legacy = inflateDominoHand(fixtures.native[0]);
  delete legacy.startRank;
  expect(normalizeDominoHand(legacy)?.startRank).toBe("7");
});

test("Domino placement and policy share adjacency with practice", () => {
  const c = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.at(-1) as Card["suit"] });
  const state = { ...engine.start({ seed: 1 }), currentPlayerIndex: 0, startRank: "7",
    hands: [["7C", "8C", "7D"].map(c), [], [], []], layout: [[], [], [], []] };
  expect(chooseDominoCard(state)?.id).toBe("7C");
  for (const startRank of ["2", "7", "A"]) {
    const hand = engine.start({ seed: 8, startRank });
    for (const card of hand.hands[2]) expect(hand.legalCardIds.includes(card.id))
      .toBe(isLegalDominoPlacement(hand.layout[dominoSuits.indexOf(card.suit)], card, startRank));
  }
});
