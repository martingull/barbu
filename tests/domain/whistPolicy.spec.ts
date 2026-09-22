import { test, expect } from "@playwright/test";
import policyCases from "../fixtures/whist-policy.json" with { type: "json" };
import sessionCases from "../fixtures/whist-session.json" with { type: "json" };
import { chooseWhistCard, whistPositionFromHand, type WhistPosition } from "../../src/whistPolicy";
import { settleWhistHand, type WhistSessionMode } from "../../src/whistScoring";
import { startBrowserWhistHand, playBrowserWhistCard } from "../../src/domain/trickTakingHand";
import type { Card, Suit } from "../../src/lessonTypes";
import * as lessons from "../../src/whistLessons";
import { courseCatalog } from "../../src/courseContent";

const card = (id: string): Card => ({ id, label: id, rank: id.slice(0, -1), suit: id.at(-1) as Suit });
const plays = (trick: (number | string)[][]) => trick.map(play => ({ player: Number(play[0]), card: card(String(play[1])) }));
const pair = (scores: number[]) => ({ playerSide: scores[0], opponentSide: scores[1] });

test("Whist authored drills follow clockwise play, legality and the gameplay policy", () => {
  const seats = ["Tutor", "Right", "You", "Left"];
  const settings: Record<string, { trump: Suit[]; partnerSuit?: Suit[] }> = {
    whistFollowSuitDrillPool: { trump: ["S", "H", "H"] },
    whistTrumpOrDiscardDrillPool: { trump: ["S", "C", "H"] },
    whistThirdHandHighDrillPool: { trump: ["S", "H", "C"] },
    whistReturnPartnerSuitDrillPool: { trump: ["H", "S", "H"], partnerSuit: ["S", "C", "D"] },
    whistOpeningLeadLessonPool: { trump: ["H", "D", "S"] },
    whistOddTrickDrillPool: { trump: ["S", "C", "C"] }
  };
  for (const [name, pool] of Object.entries(lessons)) {
    expect(pool, name).toHaveLength(3);
    for (const [index, step] of pool.entries()) {
      const trick = step.trick;
      const sequence = [...trick.tableBeforeChoice.map(play => play.seat), "You", ...trick.tableAfterChoice.map(play => play.seat)];
      expect(sequence, step.scenarioId).toHaveLength(4);
      sequence.slice(1).forEach((seat, i) => expect(seats.indexOf(seat), step.scenarioId)
        .toBe((seats.indexOf(sequence[i]) + 1) % 4));
      const cards = [...trick.hand, ...trick.tableBeforeChoice.map(play => play.card), ...trick.tableAfterChoice.map(play => play.card)];
      expect(new Set(cards.map(card => card.id)).size, step.scenarioId).toBe(cards.length);
      const following = trick.hand.filter(card => card.suit === trick.tableBeforeChoice[0]?.card.suit);
      expect([...trick.legalCardIds].sort(), step.scenarioId).toEqual((following.length ? following : trick.hand).map(card => card.id).sort());
      const invited = settings[name].partnerSuit?.[index];
      const choice = chooseWhistCard({ hand: trick.hand, player: 2, trump: settings[name].trump[index],
        trick: trick.tableBeforeChoice.map(play => ({ player: seats.indexOf(play.seat), card: play.card })),
        history: invited ? [plays([[0, `10${invited}`], [1, `2${invited}`], [2, `6${invited}`], [3, `5${invited}`]])] : [] });
      expect(trick.cardOutcomes[choice!.id], `${step.scenarioId}: policy chose ${choice?.id}`).toBe("good");
    }
  }
});

test("Whist Learn examples use the same clockwise seats as Play", () => {
  const seats = ["Tutor", "Right", "You", "Left"];
  for (const course of courseCatalog.filter(course => course.game === "whist")) {
    const cards = course.example.tableCards;
    cards.slice(1).forEach((play, i) => expect(seats.indexOf(play.seat), course.id)
      .toBe((seats.indexOf(cards[i].seat) + 1) % 4));
    expect(Object.keys(course.example.pendingBySeat ?? {}), course.id)
      .toContain(seats[(seats.indexOf(cards.at(-1)!.seat) + 1) % 4]);
  }
  const scoring = courseCatalog.find(course => course.id === "whist-odd-tricks")!;
  expect(scoring.concept.body).toContain("five or more");
  expect(scoring.concept.body).toContain("Honours are not scored");
  expect(scoring.concept.points[2].text).toContain("points reset between games");
});

test("Whist policy agrees with golden fixtures at every seat", () => {
  for (const fixture of policyCases) for (let rotation = 0; rotation < 4; rotation++) {
    const rotatedPlays = (trick: (number | string)[][]) => plays(trick).map(play => ({ ...play, player: (play.player + rotation) % 4 }));
    const position: WhistPosition = {
      hand: fixture.hand.map(card), player: (fixture.player + rotation) % 4, trump: fixture.trump as Suit,
      trick: rotatedPlays(fixture.trick), history: fixture.history.map(rotatedPlays),
      turnedTrump: fixture.turnedTrump ? { player: (Number(fixture.turnedTrump[0]) + rotation) % 4, card: card(String(fixture.turnedTrump[1])) } : undefined
    };
    expect(chooseWhistCard(position)?.id, fixture.name).toBe(fixture.expected);
  }
});

test("Whist session scoring agrees with golden fixtures", () => {
  for (const fixture of sessionCases) {
    const result = settleWhistHand(pair(fixture.scores), pair(fixture.games), pair(fixture.odd), fixture.mode as WhistSessionMode);
    expect(result, fixture.name).toEqual({ points: pair(fixture.points), games: pair(fixture.gamesWon),
      gameComplete: fixture.gameComplete, complete: fixture.complete, nextScores: pair(fixture.nextScores) });
  }
});

function completeHand(seed: number, dealer: number) {
  let state = startBrowserWhistHand(seed, dealer);
  for (let i = 0; i < 13 && state.status !== "complete"; i++) state = playBrowserWhistCard(state, state.legalCardIds[0]);
  return state;
}

test("Whist browser deals finish and opponent choices ignore hidden hands", () => {
  for (let seed = 0; seed < 64; seed++) {
    const dealer = Math.floor(seed / 4) % 4;
    const initial = startBrowserWhistHand(seed, dealer);
    expect(initial.whistDealer).toBe(dealer);
    const original = chooseWhistCard(whistPositionFromHand(initial));
    const hiddenChanged = { ...initial, hands: initial.hands.map((hand, seat) => seat === initial.currentPlayerIndex ? hand : []) };
    expect(chooseWhistCard(whistPositionFromHand(hiddenChanged))).toEqual(original);
    const final = completeHand(seed, dealer);
    expect(final.status).toBe("complete");
    expect(final.completedTricks).toHaveLength(13);
    expect(new Set(final.completedTricks.flatMap(trick => trick.cards.map(play => play.card.id))).size).toBe(52);
    expect(final.hands.every(hand => hand.length === 0)).toBe(true);
    expect(final.whistTurnedTrump).toEqual(initial.whistTurnedTrump);
    const seats = ["Tutor", "Right", "You", "Left"];
    const remaining = initial.hands.map(hand => [...hand]);
    for (const play of initial.currentTrick) remaining[seats.indexOf(play.seat)].push(play.card);
    expect(remaining[dealer].some(c => c.id === initial.whistTurnedTrump?.id)).toBe(true);
    let leader = (dealer + 1) % 4;
    const rank = (c: Card) => ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"].indexOf(c.rank);
    for (const trick of final.completedTricks) {
      for (const [index, play] of trick.cards.entries()) {
        const player = seats.indexOf(play.seat);
        const following = remaining[player].filter(c => c.suit === trick.cards[0].card.suit);
        const legal = following.length ? following : remaining[player];
        if (player !== (leader + index) % 4 || !legal.some(c => c.id === play.card.id)) {
          throw new Error(`Whist turn or follow-suit violation at seed ${seed}`);
        }
        remaining[player] = remaining[player].filter(c => c.id !== play.card.id);
      }
      const trumps = trick.cards.filter(p => p.card.suit === initial.whistTurnedTrump?.suit);
      const candidates = trumps.length ? trumps : trick.cards.filter(p => p.card.suit === trick.cards[0].card.suit);
      const winner = [...candidates].sort((a, b) => rank(b.card) - rank(a.card))[0];
      expect(trick.winnerIndex).toBe(seats.indexOf(winner.seat));
      expect(trick.penalty).toBe(1);
      leader = trick.winnerIndex;
    }
    expect(remaining.every(hand => hand.length === 0)).toBe(true);
  }
  expect(() => startBrowserWhistHand(8, 4)).toThrow("Invalid Whist dealer");
});
