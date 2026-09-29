import { expect, test } from "@playwright/test";
import { canastaDeck, canastaSpecial, initialCanastaMinimum, validateCanastaMeld, planCanastaMelds, scoreCanastaSide,
  canastaDiscards, type CanastaSide } from "../../src/domain/canastaRules";
import { createCanastaSession, transitionCanastaSession, replayCanastaHand, canastaComplete, type CanastaSession } from "../../src/domain/canastaSession";
import { canastaObservation, chooseCanastaAction, advanceCanastaOpponents } from "../../src/domain/canastaPolicy";
import { normalizeCanastaSave, restoreCanastaSession, saveCanastaSession } from "../../src/persistence/canastaSave";
import { canastaExercises, answerCanastaExercise } from "../../src/lessons/canasta/exercises";
import { createCanastaFeature } from "../../src/features/canasta/canastaFeature";
import { get } from "svelte/store";

const cards = (text: string) => {
  const deck = canastaDeck(0);
  return text.split(" ").map(id => { const card = deck.find(card => card.id === id); if (!card) throw Error(id); return card; });
};
const ranks = (rank: string, count: number) => canastaDeck(0).filter(card => card.rank === rank).slice(0, count);
const side = (opened = false): CanastaSide => ({ opened, melds: [], threes: [] });
function position(text: string, phase: "draw" | "play" = "play") {
  const session = createCanastaSession(3);
  session.hand.hands[0] = cards(text); session.hand.phase = phase; session.hand.drewStock = phase === "play";
  return session;
}
function conserve(session: CanastaSession) {
  const hand = session.hand;
  const all = [...hand.hands.flat(), ...hand.stock, ...hand.discards, ...hand.talons.flat(), ...hand.sides.flatMap(s => [...s.threes, ...s.melds.flatMap(m => m.cards)])];
  expect(all.map(card => card.id).sort()).toEqual(canastaDeck(0).map(card => card.id).sort());
}

test("Canasta deals two distinct packs and jokers without changing standard cards", () => {
  const deck = canastaDeck(8);
  expect(deck).toHaveLength(108); expect(new Set(deck.map(card => card.id)).size).toBe(108);
  expect(deck.filter(card => card.rank === "Joker")).toHaveLength(4);
  const session = createCanastaSession(3);
  expect(session.hand.hands.map(hand => hand.length)).toEqual([13, 13, 13, 13]);
  expect(session.hand.discards).toEqual([]); expect(session.hand.turn).toBe(0);
  conserve(session);
});
test("opening thresholds, splash and atomic multi-meld validation", () => {
  expect([0, -20, 2995, 3000, 4995, 5000].map(initialCanastaMinimum)).toEqual([125, 125, 125, 155, 155, 180]);
  const hand = cards("0-QC 0-QD 0-QH 0-KC 0-KD 0-JR 0-JB 0-4C");
  const groups = [{ rank: "Q", cardIds: hand.slice(0, 3).map(card => card.id) }, { rank: "K", cardIds: hand.slice(3, 7).map(card => card.id) }];
  expect(planCanastaMelds(hand, [side(), side()], 0, groups, 0).melds).toHaveLength(2);
  expect(() => planCanastaMelds(hand, [side(), side()], 0, groups, 3000)).toThrow(/155/);
  const splash = ranks("4", 7);
  expect(planCanastaMelds(splash, [side(), side()], 0, [{ rank: "4", cardIds: splash.map(card => card.id) }], 8000).melds).toHaveLength(1);
  expect(() => planCanastaMelds(hand, [side(), side()], 0, [{ rank: "K", cardIds: [hand[0].id, hand[0].id] }], 0)).toThrow(/once/);
});
test("wild cards obey natural aces, sevens, rule of five and closed ranks", () => {
  expect(() => validateCanastaMeld("7", cards("0-7C 0-7D 0-2C"), undefined, true)).toThrow(/Sevens/);
  const aces = { rank: "A", cards: ranks("A", 5) };
  expect(() => validateCanastaMeld("A", cards("0-2C"), aces, false)).toThrow(/aces/);
  const queens = { rank: "Q", cards: ranks("Q", 3) };
  expect(() => validateCanastaMeld("Q", cards("0-2C"), queens, false)).toThrow(/five/);
  expect(() => validateCanastaMeld("Q", cards("0-2C"), { rank: "Q", cards: ranks("Q", 5) }, false)).not.toThrow();
  const closed = side(true); closed.melds = [{ rank: "Q", cards: ranks("Q", 7) }];
  expect(() => planCanastaMelds(ranks("Q", 3), [side(true), closed], 0, [{ rank: "Q", cardIds: ranks("Q", 3).map(card => card.id) }], 0)).toThrow(/closed/);
});
test("pile pickup requires a natural pair and opening from hand, not the discard", () => {
  const session = position("0-QC 0-QD 0-QH 0-KC 0-KD 0-JR 0-JB 0-4C", "draw");
  session.hand.discards = cards("1-5C 1-QC");
  const groups = [{ rank: "Q", cardIds: ["0-QC", "0-QD", "0-QH"] }, { rank: "K", cardIds: ["0-KC", "0-KD", "0-JR", "0-JB"] }];
  const next = transitionCanastaSession(session, { type: "pickup", pair: ["0-QC", "0-QD"], groups });
  expect(next.hand.sides[0].melds[0].cards).toHaveLength(4);
  expect(next.hand.hands[0].map(card => card.id)).toEqual(["0-4C", "1-5C"]);
  expect(next.hand.discards).toEqual([]);
  expect(session.hand.sides[0].opened).toBe(false);
  expect(() => transitionCanastaSession(session, { type: "pickup", pair: ["0-QC", "0-JR"], groups })).toThrow(/natural/);
  expect(() => transitionCanastaSession(session, { type: "pickup", pair: ["0-QC", "0-QD"], groups: [groups[0]] })).toThrow(/125/);
});
test("discard restrictions avoid wild dumps and empty-pile safe cards", () => {
  const sides = [side(true), side(true)];
  const hand = cards("0-AC 0-7C 0-4C 0-2C 0-3C");
  expect(canastaDiscards(hand, sides, 0, true, false).map(card => card.rank)).toEqual(["4"]);
  expect(canastaDiscards(hand.slice(0, 2), sides, 0, true, false)).toHaveLength(2);
  expect(canastaDiscards(cards("0-2C 0-JR"), sides, 0, false, false)).toEqual([]);
  expect(canastaDiscards(cards("0-2C 0-JR"), sides, 0, false, true)).toHaveLength(2);
});
test("accepted meld and pickup logs do not retain mutable caller arrays", () => {
  for (const type of ["meld", "pickup"] as const) {
    const session = position("0-QC 0-QD 0-QH 0-KC 0-KD 0-JR 0-JB 0-4C", type === "meld" ? "play" : "draw");
    session.hand.discards = cards("1-5C 1-QC");
    const groups = [{ rank: "Q", cardIds: ["0-QC", "0-QD", "0-QH"] }, { rank: "K", cardIds: ["0-KC", "0-KD", "0-JR", "0-JB"] }];
    const pair = ["0-QC", "0-QD"];
    const next = transitionCanastaSession(session, type === "meld" ? { type, groups } : { type, groups, pair });
    const expected = structuredClone(next.events);
    groups[0].cardIds.length = 0; groups.length = 0; pair.length = 0;
    expect(next.events).toEqual(expected);
  }
});
test("threes replace, may be retained for a straight, and the final three ends play", () => {
  const session = position("0-3C 0-3H 0-4C", "draw");
  expect(() => transitionCanastaSession(session, { type: "draw" })).toThrow(/threes/);
  session.hand.stock = cards("1-5C 1-6C");
  const next = transitionCanastaSession(session, { type: "expose", cardId: "0-3C" });
  expect(next.hand.sides[0].threes).toHaveLength(1);
  expect(next.hand.phase).toBe("draw");
  expect(() => transitionCanastaSession(next, { type: "draw" })).not.toThrow();
  next.hand.stock = cards("1-3D");
  const ended = transitionCanastaSession(next, { type: "draw" });
  expect(ended.hand.phase).toBe("complete");
  expect(ended.hand.hands[0].at(-1)?.id).toBe("1-3D");
});
test("opening bonus is reserved until next turn and unavailable in bottom eight", () => {
  const session = position("0-QC 0-QD 0-QH 0-KC 0-KD 0-JR 0-JB 0-4C");
  const groups = [{ rank: "Q", cardIds: ["0-QC", "0-QD", "0-QH"] }, { rank: "K", cardIds: ["0-KC", "0-KD", "0-JR", "0-JB"] }];
  const opened = transitionCanastaSession(session, { type: "meld", groups });
  expect(opened.hand.hands[0]).toHaveLength(1);
  const next = transitionCanastaSession(opened, { type: "discard", cardId: "0-4C" });
  expect(next.hand.talons[0]).toHaveLength(4); expect(next.hand.hands[0]).toHaveLength(0);
  session.hand.stock = session.hand.stock.slice(0, 8);
  expect(() => transitionCanastaSession(session, { type: "meld", groups })).toThrow(/discard/);
});
test("special hands have exact shapes and scores", () => {
  expect(canastaSpecial(cards("0-AC 0-2C 0-3C 0-4C 0-5C 0-6C 0-7C 0-8C 0-9C 0-10C 0-JC 0-QC 0-KC 0-JR"))?.points).toBe(3000);
  expect(canastaSpecial(cards("0-4C 0-4D 0-5C 0-5D 0-6C 0-6D 0-7C 0-7D 0-8C 0-8D 0-9C 0-9D 0-AC 0-AD"))?.points).toBe(2500);
  expect(canastaSpecial(cards("0-2C 0-2D 0-5C 0-5D 0-6C 0-6D 0-7C 0-7D 0-8C 0-8D 0-9C 0-9D 0-AC 0-AD"))?.points).toBe(2000);
  expect(canastaSpecial(cards("0-2C 0-2D 0-5C 0-5D 0-6C 0-6D 0-KC 0-KD 0-8C 0-8D 0-9C 0-9D 0-AC 0-AD"))).toBeNull();
  expect(canastaSpecial([...ranks("4", 4), ...ranks("5", 4), ...ranks("6", 3), ...ranks("A", 3)])?.name).toBe("Garbage");
});
test("scoring includes incomplete penalties even with one canasta and per-player danger", () => {
  const s = side(true); s.melds = [{ rank: "4", cards: ranks("4", 7) }, { rank: "7", cards: ranks("7", 3) }];
  s.threes = cards("0-3C 1-3C 0-3D");
  const score = scoreCanastaSide(s, [ranks("A", 3), ranks("A", 3)], false);
  expect(score.bonuses).toBe(500); expect(score.threes).toBe(0); expect(score.penalties).toBe(5500);
  expect(score.melds).toBe(50); expect(score.inHand).toBe(120); expect(score.total).toBe(-5070);
  s.melds.push({ rank: "5", cards: ranks("5", 7) });
  expect(scoreCanastaSide(s, [], true).threes).toBe(400);
});
test("opponents cannot see hidden cards, stock order, bonus packets or the shuffle seed", () => {
  const original = createCanastaSession(3), changed = structuredClone(original);
  [changed.hand.hands[1][0], changed.hand.stock[0]] = [changed.hand.stock[0], changed.hand.hands[1][0]];
  changed.initialSeed = 99;
  expect(canastaObservation(original)).toEqual(canastaObservation(changed));
  expect(chooseCanastaAction(canastaObservation(original))).toEqual(chooseCanastaAction(canastaObservation(changed)));
});
test("seeded hands finish, conserve 108 cards, settle once and restore exactly", () => {
  test.setTimeout(120000);
  for (const seed of [1, 2, 3, 11, 21]) {
    let session = createCanastaSession(seed), actions = 0;
    while (session.hand.phase !== "complete" && actions++ < 1200) {
      session = transitionCanastaSession(session, chooseCanastaAction(canastaObservation(session)));
      conserve(session);
    }
    expect(session.hand.phase, `seed ${seed}`).toBe("complete");
    expect(() => transitionCanastaSession(session, { type: "draw" })).toThrow(/complete/);
    const saved = saveCanastaSession(session, "2026-09-29T12:00:00Z");
    expect(restoreCanastaSession(normalizeCanastaSave(saved)!)).toEqual(session);
    expect(replayCanastaHand(session)).toEqual(createCanastaSession(seed));
    if (!canastaComplete(session)) {
      const next = transitionCanastaSession(session, { type: "next", seed: 9 });
      expect(next.scores).toEqual(session.scores); expect(next.hand.dealer).toBe((session.hand.dealer + 1) % 4);
    }
  }
});
test("computer turns stop at the human and malformed saves are rejected", () => {
  const session = advanceCanastaOpponents(createCanastaSession(0));
  expect(session.hand.turn).toBe(0);
  const saved = saveCanastaSession(session, "2026-09-29T12:00:00Z");
  expect(normalizeCanastaSave({ ...saved, scores: [99999, 0] })?.scores).toEqual(session.scores);
  expect(normalizeCanastaSave({ ...saved, events: [{ type: "discard", cardId: "0-AC" }] })).toBeNull();
  expect(normalizeCanastaSave({ ...saved, events: [{ type: "meld", groups: null }] })).toBeNull();
  expect(normalizeCanastaSave({ ...saved, savedAt: "bad" })).toBeNull();
});

test("Canasta computer partnerships complete a full match", () => {
  test.setTimeout(120000);
  let session = createCanastaSession(9), count = 0;
  while (!canastaComplete(session) && count++ < 12000) {
    session = transitionCanastaSession(session, session.hand.phase === "complete" ? { type: "next", seed: count + 9 }
      : chooseCanastaAction(canastaObservation(session)));
  }
  expect(canastaComplete(session), `after ${session.handNumber} hands: ${session.scores}`).toBe(true);
  expect(() => transitionCanastaSession(session, { type: "next", seed: 2 })).toThrow(/match is complete/);
  expect(restoreCanastaSession(normalizeCanastaSave(saveCanastaSession(session, "2026-09-29T12:00:00Z"))!)).toEqual(session);
});

test("going out settles both teams and applies the 8500 target after scoring", () => {
  const session = position("0-KC");
  session.hand.sides[0].opened = true;
  session.hand.sides[0].melds = ["4", "5"].map(rank => ({ rank, cards: ranks(rank, 7) }));
  session.scores = [8400, 1000];
  const next = transitionCanastaSession(session, { type: "discard", cardId: "0-KC" });
  expect(next.hand.phase).toBe("complete"); expect(canastaComplete(next)).toBe(true);
  expect(next.hand.result?.scores[0].bonuses).toBe(1100);
  expect(() => transitionCanastaSession(next, { type: "discard", cardId: "0-KC" })).toThrow(/complete/);
  expect(session.scores).toEqual([8400, 1000]);
});

test("special declarations require a stock draw and an unopened team, and replace ordinary scoring", () => {
  const session = position("0-4C 0-4D 0-5C 0-5D 0-6C 0-6D 0-8C 0-8D 0-9C 0-9D 0-QC 0-QD 0-KC 0-KD");
  session.scores = [7000, 1000];
  const next = transitionCanastaSession(session, { type: "special" });
  expect(next.hand.phase).toBe("complete");
  expect(next.hand.result?.special?.name).toBe("Pairs");
  expect(next.hand.result?.scores[0].total).toBe(2500);
  expect(next.scores[0]).toBe(9500);
  expect(canastaComplete(next)).toBe(true);
  session.hand.drewStock = false;
  expect(() => transitionCanastaSession(session, { type: "special" })).toThrow(/stock draw/);
  session.hand.drewStock = true; session.hand.sides[0].opened = true;
  expect(() => transitionCanastaSession(session, { type: "special" })).toThrow(/unopened/);
});

test("each Canasta topic has three engine-checked decisions", () => {
  for (const [topic, steps] of Object.entries(canastaExercises)) {
    expect(steps).toHaveLength(3);
    for (const step of steps) {
      const options = topic === "discard" ? step.session.hand.hands[0].map(card => card.id) : ["yes", "no"];
      expect(options.some(answer => answerCanastaExercise(topic, step, answer).good)).toBe(true);
    }
  }
});

test("Canasta features isolate games and remain usable when storage is blocked", async () => {
  const options = { nextSeed: () => 3, storage: () => { throw Error("Blocked"); } };
  const first = createCanastaFeature(options), second = createCanastaFeature(options);
  await first.start(); expect(get(first).session).not.toBeNull(); expect(get(first).error).toContain("saved");
  first.openTable(); first.resume(); expect(get(first).view).toBe("hand");
  expect(get(second).session).toBeNull();
});
