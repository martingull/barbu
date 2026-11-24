import { test, expect } from "@playwright/test";
import fixtures from "../fixtures/spades-native-hand.json" with { type: "json" };
import type { FullHandState } from "../../src/domain/types";
import { spadesHandEngine, typescriptHandEngine } from "../../src/domain/handEngine";
import { createSpadesSession, transitionSpadesSession, spadesSessionSettlement, type SpadesSession } from "../../src/domain/spadesSession";
import { suggestedSpadesBidsForHand, originalSpadesCards } from "../../src/domain/spadesBidding";
import { hydrateFullHandState, spadesDealerForHand } from "../../src/domain/trickTakingHand";
import { normalizeSpadesSave, saveSpadesSession, createSpadesSaveStore } from "../../src/persistence/spadesSave";

function finish(session: SpadesSession): SpadesSession {
  session = transitionSpadesSession(session, { type: "start-play" });
  while (session.fullHand.status !== "complete") {
    session = transitionSpadesSession(session, { type: "next-trick" });
    session = transitionSpadesSession(session, { type: "play-card", cardId: session.fullHand.legalCardIds[0] });
  }
  return session;
}
test("Spades preserves native history and deals without retaining the old nil policy", () => {
  expect(typescriptHandEngine("Spades")).toBe(spadesHandEngine);
  for (const fixture of fixtures) {
    let hand = hydrateFullHandState(structuredClone(fixture.initialHand) as FullHandState);
    for (const cardId of fixture.choices) hand = spadesHandEngine.transition(hand, {
      type: "play-card", cardId: hand.legalCardIds.includes(cardId) ? cardId : hand.legalCardIds[0]
    });
    const bids = Object.fromEntries(["Tutor", "Right", "You", "Left"].map((seat, index) =>
      [seat, Number(fixture.initialHand.id.match(/-bids-([\d.]+)-/)![1].split(".")[index])])) as SpadesSession["bids"];
    // Non-nil play retains transcript parity. Nil play may diverge after its first lost book.
    const comparable = Object.values(bids).includes(0) ? 1 : 13;
    expect(hand.completedTricks.slice(0, comparable).map(({ tacticalTags, ...trick }) => trick))
      .toEqual(fixture.completedTricks.slice(0, comparable).map(({ tacticalTags, ...trick }) => trick));
    expect(hand.completedTricks).toHaveLength(13);
    expect(new Set(hand.completedTricks.flatMap(trick => trick.cards.map(play => play.card.id))).size).toBe(52);
    expect(hand.status).toBe("complete");
    const historicalHand = { ...hand, completedTricks: structuredClone(fixture.completedTricks) } as FullHandState;
    const saved = normalizeSpadesSave(saveSpadesSession({ ...createSpadesSession(8),
      bids, playStarted: true, fullHand: historicalHand, fullHandReviewTrickCount: 13 }, "now"))!;
    expect(saved.fullHand.completedTricks).toEqual(fixture.completedTricks);
    const replay = spadesHandEngine.transition(hand, { type: "replay" });
    expect(spadesHandEngine.transition(saved.fullHand, { type: "replay" }).hands).toEqual(replay.hands);
    const legacy = spadesHandEngine.transition({ ...hand, id: hand.id.replace(/-dealer-[0-3]/, "") }, { type: "replay" });
    expect(legacy.hands).toEqual(replay.hands);
    expect(legacy.currentTrick).toEqual(replay.currentTrick);
    for (const seat of ["Tutor", "Right", "You", "Left"] as const) {
      expect(originalSpadesCards(replay, seat).map(card => card.id).sort()).toEqual(
        originalSpadesCards(fixture.initialHand as FullHandState, seat).map(card => card.id).sort());
    }
  }
});

test("dealer rotates independently of lesson seeds, survives saves and replays the actual deal", () => {
  for (let dealer = 0; dealer < 4; dealer++) {
    const complete = finish(createSpadesSession(8, dealer));
    const saved = normalizeSpadesSave(saveSpadesSession(complete, "now"))!;
    expect(spadesDealerForHand(saved.fullHand)).toBe(dealer);
    const legacy = { ...complete, fullHand: { ...complete.fullHand, id: complete.fullHand.id.replace(/-dealer-[0-3]/, "") } };
    expect(spadesDealerForHand(legacy.fullHand)).toBe(dealer);
    for (const seed of [8, 12, 99]) {
      const next = transitionSpadesSession(saved, { type: "next-hand", seed });
      expect(spadesDealerForHand(next.fullHand)).toBe((dealer + 1) % 4);
      expect(next.fullHand.currentPlayerIndex).toBe((dealer + 2) % 4);
      expect(next.scores).toEqual(spadesSessionSettlement(complete).scores);
      expect(transitionSpadesSession(legacy, { type: "next-hand", seed }).fullHand).toEqual(next.fullHand);
      const played = finish(next), replay = transitionSpadesSession(played, { type: "replay" });
      expect(spadesDealerForHand(replay.fullHand)).toBe((dealer + 1) % 4);
      expect(originalSpadesCards(replay.fullHand, "You")).toEqual(originalSpadesCards(next.fullHand, "You"));
    }
  }
  expect(() => createSpadesSession(8, 4)).toThrow(/dealer/);
});
test("bidding shows all thirteen cards and only changes the player's bid before play", () => {
  const initial = createSpadesSession(8);
  expect(initial.fullHand.hands.map(hand => hand.length)).toEqual([13, 13, 13, 13]);
  expect(initial.fullHand.currentTrick).toEqual([]);
  expect(() => spadesHandEngine.begin({ ...initial.fullHand, contract: "Hearts" }, initial.bids)).toThrow("Expected a Spades hand");
  expect(initial.bids).toEqual(suggestedSpadesBidsForHand(initial.fullHand));
  expect(transitionSpadesSession(initial, { type: "play-card", cardId: initial.fullHand.playerHand[0].id })).toBe(initial);
  const bid = transitionSpadesSession(initial, { type: "set-bid", bid: 0 });
  expect(bid.bids).toEqual({ ...initial.bids, You: 0 });
  expect(initial.bids).toEqual(suggestedSpadesBidsForHand(initial.fullHand));
  expect(transitionSpadesSession(bid, { type: "toggle-bids" }).openingPanel).toBe("bid");
  const playing = transitionSpadesSession(bid, { type: "start-play" });
  expect(playing.fullHand.spadesBids).toEqual(bid.bids);
  expect(transitionSpadesSession(playing, { type: "set-bid", bid: 10 })).toBe(playing);
  expect(transitionSpadesSession(playing, { type: "start-play" })).toBe(playing);
});
test("loading and continuing retain historical settled totals rather than rescoring old results", () => {
  const next = transitionSpadesSession(finish(createSpadesSession(8)), { type: "next-hand", seed: 12 });
  const historical = { ...next, scores: { playerSide: 67, opponentSide: -20 },
    results: [{ ...next.results[0], playerSideScore: 67, opponentSideScore: -20 }] };
  const loaded = normalizeSpadesSave(saveSpadesSession(historical, "now"))!;
  expect(loaded.scores).toEqual(historical.scores);
  expect(loaded.results).toEqual(historical.results);
  const completed = finish(loaded), settlement = spadesSessionSettlement(completed);
  const continued = transitionSpadesSession(completed, { type: "next-hand", seed: 99 });
  expect(continued.results[0]).toEqual(historical.results[0]);
  expect(continued.scores).toEqual(settlement.scores);
  expect(continued.results).toHaveLength(2);
});
test("256 deterministic deals conserve all cards and settle exactly once", () => {
  for (let seed = 0; seed < 256; seed++) {
    const initial = createSpadesSession(seed);
    const complete = finish(initial);
    const hand = complete.fullHand;
    const remaining = initial.fullHand.hands.map(cards => [...cards]);
    const seats = ["Tutor", "Right", "You", "Left"];
    let leader = (Number(hand.id.match(/-dealer-([0-3])-/)![1]) + 1) % 4;
    let broken = false;
    for (const trick of hand.completedTricks) {
      for (const [index, play] of trick.cards.entries()) {
        const player = seats.indexOf(play.seat);
        const held = remaining[player];
        const led = trick.cards[0].card.suit;
        if (player !== (leader + index) % 4 || !held.some(c => c.id === play.card.id)
          || held.some(c => c.suit === led) && play.card.suit !== led
          || index === 0 && !broken && play.card.suit === "S" && held.some(c => c.suit !== "S")) {
          throw Error(`Illegal Spades play in seed ${seed}`);
        }
        if (play.card.suit === "S") broken = true;
        remaining[player] = held.filter(c => c.id !== play.card.id);
      }
      const winningSuit = trick.cards.some(p => p.card.suit === "S") ? "S" : trick.cards[0].card.suit;
      const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
      const winner = trick.cards.filter(p => p.card.suit === winningSuit)
        .sort((a, b) => ranks.indexOf(b.card.rank) - ranks.indexOf(a.card.rank))[0];
      if (seats[trick.winnerIndex] !== winner.seat || trick.penalty !== 1) throw Error("Invalid trick settlement");
      leader = trick.winnerIndex;
    }
    expect(hand.completedTricks).toHaveLength(13);
    expect(new Set(hand.completedTricks.flatMap(trick => trick.cards.map(play => play.card.id))).size).toBe(52);
    expect(initial.fullHand.cardsRemaining).toBe(52);
    const next = transitionSpadesSession(complete, { type: "next-hand", seed: seed + 1 });
    expect(next.results).toHaveLength(1);
    expect(next.scores).toEqual(spadesSessionSettlement(complete).scores);
    expect(transitionSpadesSession(next, { type: "next-hand", seed: seed + 2 })).toBe(next);
    const replay = transitionSpadesSession(complete, { type: "replay" });
    expect(replay.results).toHaveLength(0);
    expect(replay.bids).toEqual(complete.bids);
  }
});
test("saves resume bidding, play, review and old native deals; stale caches are rebuilt", () => {
  let session = createSpadesSession(8);
  for (const event of [{ type: "toggle-bids" }, { type: "set-bid", bid: 0 }, { type: "start-play" }] as const) {
    session = transitionSpadesSession(session, event);
    const saved = normalizeSpadesSave(saveSpadesSession(session, "now"))!;
    expect(saved).not.toBeNull();
    expect(saved.bids).toEqual(session.bids);
    expect(saved.playStarted).toBe(session.playStarted);
  }
  session = transitionSpadesSession(session, { type: "play-card", cardId: session.fullHand.legalCardIds[0] });
  expect(normalizeSpadesSave(saveSpadesSession(session, "now"))!.fullHandReviewTrickCount).toBe(1);
  const legacy = { ...saveSpadesSession(session, "now"), fullHand: fixtures[0].initialHand,
    bids: { Tutor: 3, Right: 3, You: 4, Left: 3 }, usingBrowserFullHand: false };
  const saved = normalizeSpadesSave(legacy)!;
  expect(saved.usingBrowserFullHand).toBe(true);
  expect(saved.fullHand.spadesBids).toEqual(legacy.bids);
  expect(saved.fullHand.currentTrick).toEqual(fixtures[0].initialHand.currentTrick);
  const beforeBidding = normalizeSpadesSave({ ...legacy, playStarted: false })!;
  expect(transitionSpadesSession(beforeBidding, { type: "start-play" }).fullHand.currentTrick)
    .toEqual(fixtures[0].initialHand.currentTrick);
  expect(normalizeSpadesSave({ ...legacy, fullHand: { ...legacy.fullHand, hands: [] } })).toBeNull();
  const corrupt = structuredClone(legacy);
  corrupt.fullHand.hands[0][0] = corrupt.fullHand.hands[1][0];
  expect(normalizeSpadesSave(corrupt)).toBeNull();
  const store = createSpadesSaveStore(() => ({ getItem() { throw Error("denied"); }, setItem() { throw Error("full"); }, removeItem() {} }));
  expect(store.load()).toBeNull();
  expect(() => store.write(saved)).toThrow("full");
});

test("terminal sessions clear saves and refuse replay or another settlement", () => {
  const complete = finish(createSpadesSession(8));
  const points = spadesSessionSettlement(complete).scores;
  const terminal = { ...complete, scores: { playerSide: 500 - points.playerSide, opponentSide: 300 - points.opponentSide } };
  expect(spadesSessionSettlement(terminal).scores).toEqual({ playerSide: 500, opponentSide: 300 });
  expect(saveSpadesSession(terminal, "now")).toBeNull();
  expect(transitionSpadesSession(terminal, { type: "next-hand", seed: 9 })).toBe(terminal);
  expect(transitionSpadesSession(terminal, { type: "replay" })).toBe(terminal);
  expect(transitionSpadesSession(terminal, { type: "play-card", cardId: "2C" })).toBe(terminal);
});
