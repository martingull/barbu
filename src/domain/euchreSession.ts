import { shuffledCards } from "./deck";
import { euchreDeck, euchrePartner, euchreSide, euchreSuits, euchreRules, nextEuchreSeat,
  legalEuchreCards, euchreTrickWinner, scoreEuchreHand,
  type EuchreContract, type EuchrePlay, type EuchreResult, type EuchreSeat } from "./euchreRules";
import type { Card, Suit } from "./types";

export type EuchreAction = { type: "pass" } | { type: "call"; trump: Suit; alone?: boolean }
  | { type: "discard"; cardId: string } | { type: "play-card"; cardId: string }
  | { type: "next-trick" } | { type: "next-hand"; seed: number };
export type EuchreCall = { seat: EuchreSeat; round: 1 | 2; trump: Suit | null; alone: boolean };
export type EuchreTrick = { cards: EuchrePlay[]; winner: EuchreSeat };
export type EuchreHand = {
  seed: number; dealer: EuchreSeat; turn: EuchreSeat;
  phase: "calling" | "discard" | "playing" | "review" | "complete" | "passed_out";
  round: 1 | 2; passes: number; hands: Card[][]; upcard: Card; kitty: Card[];
  contract: EuchreContract | null; inactiveSeat: EuchreSeat | null;
  calls: EuchreCall[]; currentTrick: EuchrePlay[]; completedTricks: EuchreTrick[]; result: EuchreResult | null;
};
export type EuchreSession = {
  initialSeed: number; initialDealer: EuchreSeat; events: EuchreAction[];
  hand: EuchreHand; scores: [number, number]; handNumber: number;
};
export const euchreComplete = (session: EuchreSession) => session.scores.some(score => score >= euchreRules.target);
const validSeed = (seed: number) => Number.isSafeInteger(seed) && seed >= 0;

function deal(seed: number, dealer: EuchreSeat): EuchreHand {
  if (!validSeed(seed) || !Number.isInteger(dealer) || dealer < 0 || dealer > 3) throw Error("Invalid Euchre deal.");
  const deck = shuffledCards(euchreDeck(), seed), hands: Card[][] = [[], [], [], []];
  let cursor = 0;
  for (const packet of [3, 2]) {
    let seat = nextEuchreSeat(dealer);
    for (let count = 0; count < 4; count++, seat = nextEuchreSeat(seat)) {
      hands[seat].push(...deck.slice(cursor, cursor + packet));
      cursor += packet;
    }
  }
  return { seed, dealer, turn: nextEuchreSeat(dealer), phase: "calling", round: 1, passes: 0,
    hands, upcard: deck[20], kitty: deck.slice(21), contract: null, inactiveSeat: null,
    calls: [], currentTrick: [], completedTricks: [], result: null };
}
export function createEuchreSession(seed: number, dealer: EuchreSeat = (seed % 4) as EuchreSeat): EuchreSession {
  return { initialSeed: seed, initialDealer: dealer, events: [], hand: deal(seed, dealer), scores: [0, 0], handNumber: 1 };
}
export function nextActiveEuchreSeat(seat: EuchreSeat, inactive: EuchreSeat | null): EuchreSeat {
  const next = nextEuchreSeat(seat);
  return next === inactive ? nextEuchreSeat(next) : next;
}
function beginPlay(hand: EuchreHand) {
  hand.phase = "playing";
  hand.turn = nextActiveEuchreSeat(hand.dealer, hand.inactiveSeat);
}
function cloneHand(hand: EuchreHand): EuchreHand {
  return { ...hand, hands: hand.hands.map(cards => [...cards]), kitty: [...hand.kitty],
    calls: [...hand.calls], currentTrick: [...hand.currentTrick], completedTricks: [...hand.completedTricks] };
}
export function transitionEuchreSession(session: EuchreSession, action: EuchreAction): EuchreSession {
  if (euchreComplete(session)) throw Error("This Euchre game is complete.");
  if (action.type === "next-hand") {
    if (!["complete", "passed_out"].includes(session.hand.phase)) throw Error("Finish this hand first.");
    const hand = deal(action.seed, nextEuchreSeat(session.hand.dealer));
    return { ...session, hand, events: [...session.events, { ...action }], handNumber: session.handNumber + 1 };
  }
  const hand = cloneHand(session.hand), seat = hand.turn;
  if (action.type === "pass" || action.type === "call") {
    if (hand.phase !== "calling") throw Error("Trump has already been decided.");
    if (action.type === "pass") {
      hand.calls.push({ seat, round: hand.round, trump: null, alone: false });
      hand.passes++;
      hand.turn = nextEuchreSeat(seat);
      if (hand.passes === 4) {
        if (hand.round === 2) hand.phase = "passed_out";
        else { hand.round = 2; hand.passes = 0; }
      }
    } else {
      if (!euchreSuits.includes(action.trump)
        || (hand.round === 1) !== (action.trump === hand.upcard.suit)
        || action.alone !== undefined && typeof action.alone !== "boolean") throw Error("Choose an available trump suit.");
      hand.contract = { maker: seat, trump: action.trump, alone: action.alone ?? false };
      hand.inactiveSeat = action.alone ? euchrePartner(seat) : null;
      hand.calls.push({ seat, round: hand.round, trump: action.trump, alone: action.alone ?? false });
      if (hand.round === 1) {
        hand.hands[hand.dealer].push(hand.upcard);
        hand.turn = hand.dealer;
        hand.phase = "discard";
      } else {
        hand.kitty.push(hand.upcard);
        beginPlay(hand);
      }
    }
  } else if (action.type === "discard") {
    if (hand.phase !== "discard") throw Error("Only the dealer discards after an order-up.");
    const card = hand.hands[seat].find(card => card.id === action.cardId);
    if (!card) throw Error("Choose a card from the dealer's hand.");
    hand.hands[seat] = hand.hands[seat].filter(candidate => candidate.id !== card.id);
    hand.kitty.push(card);
    beginPlay(hand);
  } else if (action.type === "play-card") {
    if (hand.phase !== "playing" || !hand.contract) throw Error("Wait for card play.");
    const card = legalEuchreCards(hand.hands[seat], hand.currentTrick, hand.contract.trump).find(card => card.id === action.cardId);
    if (!card) throw Error("Follow the effective suit if you can; the left bower belongs to trump.");
    hand.hands[seat] = hand.hands[seat].filter(candidate => candidate.id !== card.id);
    hand.currentTrick.push({ seat, card });
    if (hand.currentTrick.length === (hand.inactiveSeat === null ? 4 : 3)) {
      const winner = euchreTrickWinner(hand.currentTrick, hand.contract.trump)!;
      hand.completedTricks.push({ cards: hand.currentTrick, winner });
      hand.currentTrick = [];
      hand.turn = winner;
      if (hand.completedTricks.length === euchreRules.trickCount) {
        hand.result = scoreEuchreHand(hand.contract, hand.completedTricks.filter(trick => euchreSide(trick.winner) === euchreSide(hand.contract!.maker)).length);
        hand.phase = "complete";
      } else hand.phase = "review";
    } else hand.turn = nextActiveEuchreSeat(seat, hand.inactiveSeat);
  } else if (action.type === "next-trick") {
    if (hand.phase !== "review") throw Error("There is no completed trick to review.");
    hand.phase = "playing";
  } else throw Error("Unknown Euchre action.");
  const scores: [number, number] = [...session.scores];
  if (hand.result) scores[hand.result.winner] += hand.result.points;
  return { ...session, hand, scores, events: [...session.events, { ...action }] };
}
export function replayEuchreHand(session: EuchreSession): EuchreSession {
  if (euchreComplete(session)) throw Error("This Euchre game is complete.");
  let boundary = -1;
  session.events.forEach((event, index) => { if (event.type === "next-hand") boundary = index; });
  return session.events.slice(0, boundary + 1).reduce(transitionEuchreSession, createEuchreSession(session.initialSeed, session.initialDealer));
}

export type EuchrePosition = {
  viewer: EuchreSeat; dealer: EuchreSeat; turn: EuchreSeat; phase: EuchreHand["phase"]; round: 1 | 2;
  hand: Card[]; upcard: Card; contract: EuchreContract | null; inactiveSeat: EuchreSeat | null;
  calls: EuchreCall[]; currentTrick: EuchrePlay[]; completedTricks: EuchreTrick[]; cardsRemaining: number[];
};
// Opponents and future coaching receive public observations, never the deal or seed.
export function euchrePosition(hand: EuchreHand, viewer: EuchreSeat): EuchrePosition {
  if (!Number.isInteger(viewer) || viewer < 0 || viewer > 3) throw Error("Invalid Euchre viewer.");
  const copyPlay = (play: EuchrePlay): EuchrePlay => ({ seat: play.seat, card: { ...play.card } });
  return { viewer, dealer: hand.dealer, turn: hand.turn, phase: hand.phase, round: hand.round,
    hand: hand.hands[viewer].map(card => ({ ...card })), upcard: { ...hand.upcard },
    contract: hand.contract && { ...hand.contract }, inactiveSeat: hand.inactiveSeat,
    calls: hand.calls.map(call => ({ ...call })), currentTrick: hand.currentTrick.map(copyPlay),
    completedTricks: hand.completedTricks.map(trick => ({ winner: trick.winner, cards: trick.cards.map(copyPlay) })),
    cardsRemaining: hand.hands.map(cards => cards.length) };
}
