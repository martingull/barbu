import { test, expect } from "@playwright/test";
import cases from "../fixtures/hearts-policy.json" with { type: "json" };
import passCases from "../fixtures/hearts-pass.json" with { type: "json" };
import { chooseHeartsCard, chooseHeartsPass, heartsPositionFromHand, type HeartsPosition } from "../../src/heartsPolicy";
import { startBrowserHeartsHand, startBrowserHeartsPassingHand, applyBrowserHeartsPass, playBrowserHeartsCard, hydrateFullHandState } from "../../src/domain/trickTakingHand";
import type { Card, FullHandState, Seat, Suit } from "../../src/lessonTypes";

const card = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.at(-1) as Suit });
const rank = (c: Card) => ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"].indexOf(c.rank);
const points = (c: Card) => c.id === "QS" ? 13 : c.suit === "H" ? 1 : 0;
const plays = (trick: (number | string)[][], rotation: number) => trick.map(p => ({ player: (Number(p[0]) + rotation) % 4, card: card(String(p[1])) }));

// Keep the exhaustive deal audit synchronous and inexpensive per played card.
function check(condition: boolean): asserts condition {
  if (!condition) throw new Error("Hearts deal invariant failed");
}

test("Hearts public-information policy matches golden fixtures at every seat", () => {
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

test("Hearts passes match golden choices and preserve low exits", () => {
  for (const fixture of passCases) {
    const hand = fixture.hand.map(card);
    expect(chooseHeartsPass(hand).map(c => c.id), fixture.name).toEqual(fixture.expected);
    expect(chooseHeartsPass([...hand].reverse()).map(c => c.id), fixture.name).toEqual(fixture.expected);
  }
});

test("Hearts legality keeps the opening, penalty exceptions and breaking rules", () => {
  const seats: Seat[] = ["Tutor", "Right", "You", "Left"];
  const clean = ["2C", "3C", "4C", "5C"];
  const cases = [
    { name: "2C must open", hand: ["2C", "AC", "AH", "QS"], led: false, history: [], legal: ["2C"] },
    { name: "follow clubs first", hand: ["3C", "AH", "QS", "2D"], led: true, history: [], legal: ["3C"] },
    { name: "avoid first trick penalties", hand: ["AH", "QS", "2D"], led: true, history: [], legal: ["2D"] },
    { name: "forced first trick penalties", hand: ["AH", "QS"], led: true, history: [], legal: ["AH", "QS"] },
    { name: "unbroken hearts cannot lead", hand: ["AH", "2D"], led: false, history: clean, legal: ["2D"] },
    { name: "only hearts may lead", hand: ["AH", "2H"], led: false, history: clean, legal: ["AH", "2H"] },
    { name: "queen does not break hearts", hand: ["AH", "2D"], led: false, history: ["2C", "QS", "4C", "5C"], legal: ["2D"] },
    { name: "heart discard breaks hearts", hand: ["AH", "2D"], led: false, history: ["2C", "2H", "4C", "5C"], legal: ["AH", "2D"] },
    { name: "penalties allowed after first trick", hand: ["AH", "QS", "2D"], led: true, history: clean, legal: ["AH", "QS", "2D"] }
  ];
  for (const fixture of cases) {
    const state = hydrateFullHandState({
      ...startBrowserHeartsPassingHand(8), hands: [[], [], fixture.hand.map(card), []],
      currentPlayerIndex: 2,
      currentTrick: fixture.led ? [{ seat: "Tutor", card: card("6C") }, { seat: "Right", card: card("7C") }] : [],
      completedTricks: fixture.history.length ? [{
        cards: fixture.history.map((id, seat) => ({ seat: seats[seat], card: card(id) })),
        winner: "Left", winnerIndex: 3, penalty: fixture.history.map(card).reduce((sum, c) => sum + points(c), 0), outcome: "stayed_clear"
      }] : []
    });
    expect(state.legalCardIds, fixture.name).toEqual(fixture.legal);
    for (const illegal of fixture.hand.filter(id => !fixture.legal.includes(id))) {
      expect(playBrowserHeartsCard(state, illegal), fixture.name).toBe(state);
    }
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
      for (const c of selected) check([...state.hands[recipient], ...state.currentTrick.filter(p => p.seat === seats[recipient]).map(p => p.card)].some(held => held.id === c.id));
    }
    const remaining = state.hands.map(hand => [...hand]);
    for (const play of state.currentTrick) remaining[seats.indexOf(play.seat)].push(play.card);
    check(remaining.every(hand => hand.length === 13));
    let choices = 0;
    while (state.status !== "complete") {
      const legal = state.hands[2].filter(c => state.legalCardIds.includes(c.id));
      const choice = chooseHeartsCard(heartsPositionFromHand(state, legal))!;
      const concealedChanged = { ...state, hands: state.hands.map((hand, player) => player === 2 ? hand : []) };
      check(chooseHeartsCard(heartsPositionFromHand(concealedChanged, legal))?.id === choice.id);
      state = playBrowserHeartsCard(state, choice.id);
      check(++choices <= 13);
    }
    check(choices === 13);
    check(state.completedTricks.length === 13);
    const seen = new Set<string>();
    let broken = false;
    let leader = remaining.findIndex(hand => hand.some(c => c.id === "2C"));
    for (const [trickIndex, trick] of state.completedTricks.entries()) {
      for (const [index, play] of trick.cards.entries()) {
        const player = seats.indexOf(play.seat);
        check(player === (leader + index) % 4);
        check(remaining[player].some(c => c.id === play.card.id));
        check(!seen.has(play.card.id));
        seen.add(play.card.id);
        const following = remaining[player].filter(c => c.suit === trick.cards[0].card.suit);
        if (following.length) check(following.some(c => c.id === play.card.id));
        if (trickIndex === 0) {
          if (index === 0) check(play.card.id === "2C");
          else if (remaining[player].some(c => !points(c))) check(points(play.card) === 0);
        }
        if (index === 0 && !broken && play.card.suit === "H") check(remaining[player].every(c => c.suit === "H"));
        if (play.card.suit === "H") broken = true;
        remaining[player] = remaining[player].filter(c => c.id !== play.card.id);
      }
      const winner = [...trick.cards].filter(p => p.card.suit === trick.cards[0].card.suit).sort((a, b) => rank(b.card) - rank(a.card))[0];
      check(trick.winnerIndex === seats.indexOf(winner.seat));
      check(trick.penalty === trick.cards.reduce((sum, p) => sum + points(p.card), 0));
      leader = trick.winnerIndex;
    }
    check(seen.size === 52);
    check(state.completedTricks.reduce((sum, t) => sum + t.penalty, 0) === 26);
    check(state.hands.every(hand => !hand.length));
  }
});
