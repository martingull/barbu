import { test, expect } from "@playwright/test";
import assert from "node:assert/strict";
import cases from "../fixtures/hearts-policy.json" with { type: "json" };
import passCases from "../fixtures/hearts-pass.json" with { type: "json" };
import { chooseHeartsCard, chooseHeartsPass, heartsPositionFromHand, type HeartsPosition } from "../../src/heartsPolicy";
import { startBrowserHeartsHand, startBrowserHeartsPassingHand, applyBrowserHeartsPass, playBrowserHeartsCard } from "../../src/browserHandFallback";
import type { Card, FullHandState, Suit } from "../../src/lessonTypes";

const card = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.at(-1) as Suit });
const rank = (c: Card) => ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"].indexOf(c.rank);
const points = (c: Card) => c.id === "QS" ? 13 : c.suit === "H" ? 1 : 0;
const plays = (trick: (number | string)[][], rotation: number) => trick.map(p => ({ player: (Number(p[0]) + rotation) % 4, card: card(String(p[1])) }));

test("Hearts public-information policy matches Rust fixtures at every seat", () => {
  for (const fixture of cases) for (let rotation = 0; rotation < 4; rotation++) {
    const hand = fixture.hand.map(card);
    const trick = plays(fixture.trick, rotation);
    const following = hand.filter(c => c.suit === trick[0]?.card.suit);
    const p: HeartsPosition = { hand, legal: fixture.legal?.map(card) ?? (following.length ? following : hand),
      player: (fixture.player + rotation) % 4, trick, history: fixture.history.map(t => {
        const cards = plays(t, rotation);
        return { cards, penalty: cards.reduce((sum, p) => sum + points(p.card), 0),
          winner: [...cards].filter(p => p.card.suit === cards[0].card.suit).sort((a, b) => rank(b.card) - rank(a.card))[0].player };
      }) };
    expect(chooseHeartsCard(p)?.id ?? null, `${fixture.name}, rotation ${rotation}`).toBe(fixture.expected);
    expect(chooseHeartsCard({ ...p, hand: [...hand].reverse(), legal: [...p.legal].reverse() })?.id ?? null, fixture.name).toBe(fixture.expected);
  }
});

test("Hearts passes match native choices and preserve low exits", () => {
  for (const fixture of passCases) {
    const hand = fixture.hand.map(card);
    expect(chooseHeartsPass(hand).map(c => c.id), fixture.name).toEqual(fixture.expected);
    expect(chooseHeartsPass([...hand].reverse()).map(c => c.id), fixture.name).toEqual(fixture.expected);
  }
});

test("Hearts full deals stay legal through all four pass phases without hidden-hand access", () => {
  const seats = ["Tutor", "Right", "You", "Left"];
  for (let seed = 0; seed < 64; seed++) for (let direction = 0; direction < 4; direction++) {
    let state: FullHandState;
    if (direction === 0) state = startBrowserHeartsHand(seed);
    else {
      const initial = startBrowserHeartsPassingHand(seed);
      const selected = chooseHeartsPass(initial.hands[2]);
      state = applyBrowserHeartsPass(initial, selected.map(c => c.id), direction);
      const recipient = (2 + direction) % 4;
      for (const c of selected) assert([...state.hands[recipient], ...state.currentTrick.filter(p => p.seat === seats[recipient]).map(p => p.card)].some(held => held.id === c.id));
    }
    const remaining = state.hands.map(hand => [...hand]);
    for (const play of state.currentTrick) remaining[seats.indexOf(play.seat)].push(play.card);
    assert(remaining.every(hand => hand.length === 13));
    let choices = 0;
    while (state.status !== "complete") {
      const legal = state.hands[2].filter(c => state.legalCardIds.includes(c.id));
      const choice = chooseHeartsCard(heartsPositionFromHand(state, legal))!;
      const concealedChanged = { ...state, hands: state.hands.map((hand, player) => player === 2 ? hand : []) };
      assert.deepEqual(chooseHeartsCard(heartsPositionFromHand(concealedChanged, legal)), choice);
      state = playBrowserHeartsCard(state, choice.id);
      assert(++choices <= 13);
    }
    assert.equal(choices, 13);
    assert.equal(state.completedTricks.length, 13);
    const seen = new Set<string>();
    let broken = false;
    let leader = remaining.findIndex(hand => hand.some(c => c.id === "2C"));
    for (const [trickIndex, trick] of state.completedTricks.entries()) {
      for (const [index, play] of trick.cards.entries()) {
        const player = seats.indexOf(play.seat);
        assert.equal(player, (leader + index) % 4);
        assert(remaining[player].some(c => c.id === play.card.id));
        assert(!seen.has(play.card.id));
        seen.add(play.card.id);
        const following = remaining[player].filter(c => c.suit === trick.cards[0].card.suit);
        if (following.length) assert(following.some(c => c.id === play.card.id));
        if (trickIndex === 0) {
          if (index === 0) assert.equal(play.card.id, "2C");
          else if (remaining[player].some(c => !points(c))) assert.equal(points(play.card), 0);
        }
        if (index === 0 && !broken && play.card.suit === "H") assert(remaining[player].every(c => c.suit === "H"));
        if (play.card.suit === "H") broken = true;
        remaining[player] = remaining[player].filter(c => c.id !== play.card.id);
      }
      const winner = [...trick.cards].filter(p => p.card.suit === trick.cards[0].card.suit).sort((a, b) => rank(b.card) - rank(a.card))[0];
      assert.equal(trick.winnerIndex, seats.indexOf(winner.seat));
      assert.equal(trick.penalty, trick.cards.reduce((sum, p) => sum + points(p.card), 0));
      leader = trick.winnerIndex;
    }
    assert.equal(seen.size, 52);
    assert.equal(state.completedTricks.reduce((sum, t) => sum + t.penalty, 0), 26);
    assert(state.hands.every(hand => !hand.length));
  }
});
