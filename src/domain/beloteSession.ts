import { shuffledCards } from "./deck";
import { beloteDeck, beloteSuits, beloteSide, nextBeloteSeat, beloteTrickWinner, beloteCardPoints,
  legalBeloteCards, scoreBeloteHand, beloteRules, type BeloteSeat, type BelotePlay, type BeloteScore } from "./beloteRules";
import type { Card, Suit } from "./types";

export type BeloteAction = { type: "pass" } | { type: "take"; trump: Suit } | { type: "play-card"; cardId: string }
  | { type: "next-trick" } | { type: "next-hand"; seed: number };
export type BeloteCall = { seat: BeloteSeat; round: 1 | 2; trump: Suit | null };
export type BeloteTrick = { cards: BelotePlay[]; winner: BeloteSeat; points: number };
export type BeloteHand = {
  seed: number; dealer: BeloteSeat; turn: BeloteSeat; round: 1 | 2; passes: number;
  phase: "calling" | "playing" | "review" | "complete" | "passed_out";
  hands: Card[][]; stock: Card[]; upcard: Card; contract: { taker: BeloteSeat; trump: Suit } | null;
  calls: BeloteCall[]; currentTrick: BelotePlay[]; completedTricks: BeloteTrick[];
  beloteOwner: BeloteSeat | null; announcements: { seat: BeloteSeat; label: "Belote" | "Rebelote" }[];
  result: BeloteScore | null;
};
export type BeloteSession = { initialSeed: number; initialDealer: BeloteSeat; events: BeloteAction[];
  hand: BeloteHand; scores: [number, number]; carry: number; handNumber: number };
export const beloteComplete = (session: BeloteSession) => Math.max(...session.scores) >= beloteRules.target && session.scores[0] !== session.scores[1];
const validSeed = (seed: number) => Number.isSafeInteger(seed) && seed >= 0;
function deal(seed: number, dealer: BeloteSeat): BeloteHand {
  if (!validSeed(seed) || !Number.isInteger(dealer) || dealer < 0 || dealer > 3) throw Error("Invalid Belote deal.");
  const deck = shuffledCards(beloteDeck(), seed), hands: Card[][] = [[], [], [], []];
  let cursor = 0;
  for (const packet of [3, 2]) {
    let seat = nextBeloteSeat(dealer);
    for (let count = 0; count < 4; count++, seat = nextBeloteSeat(seat)) {
      hands[seat].push(...deck.slice(cursor, cursor + packet)); cursor += packet;
    }
  }
  return { seed, dealer, turn: nextBeloteSeat(dealer), round: 1, passes: 0, phase: "calling",
    hands, upcard: deck[20], stock: deck.slice(21), contract: null, calls: [], currentTrick: [], completedTricks: [],
    beloteOwner: null, announcements: [], result: null };
}
export function createBeloteSession(seed: number, dealer: BeloteSeat = (seed % 4) as BeloteSeat): BeloteSession {
  return { initialSeed: seed, initialDealer: dealer, events: [], hand: deal(seed, dealer), scores: [0, 0], carry: 0, handNumber: 1 };
}
export function transitionBeloteSession(session: BeloteSession, action: BeloteAction): BeloteSession {
  if (beloteComplete(session)) throw Error("This Belote game is complete.");
  if (action.type === "next-hand") {
    if (!["complete", "passed_out"].includes(session.hand.phase)) throw Error("Finish this deal first.");
    return { ...session, hand: deal(action.seed, nextBeloteSeat(session.hand.dealer)),
      events: [...session.events, { ...action }], handNumber: session.handNumber + 1 };
  }
  const hand: BeloteHand = { ...session.hand, hands: session.hand.hands.map(cards => [...cards]), stock: [...session.hand.stock],
    calls: [...session.hand.calls], currentTrick: [...session.hand.currentTrick],
    completedTricks: [...session.hand.completedTricks], announcements: [...session.hand.announcements] };
  const seat = hand.turn;
  if (action.type === "pass" || action.type === "take") {
    if (hand.phase !== "calling") throw Error("Taking is already finished.");
    if (action.type === "pass") {
      hand.calls.push({ seat, round: hand.round, trump: null });
      hand.turn = nextBeloteSeat(seat);
      if (++hand.passes === 4) {
        if (hand.round === 2) hand.phase = "passed_out";
        else { hand.round = 2; hand.passes = 0; }
      }
    } else {
      if (!beloteSuits.includes(action.trump) || (hand.round === 1) !== (action.trump === hand.upcard.suit)) throw Error("Choose an available trump suit.");
      hand.calls.push({ seat, round: hand.round, trump: action.trump });
      hand.contract = { taker: seat, trump: action.trump };
      hand.hands[seat].push(hand.upcard);
      let cursor = 0, recipient = nextBeloteSeat(hand.dealer);
      for (let count = 0; count < 4; count++, recipient = nextBeloteSeat(recipient)) {
        const packet = recipient === seat ? 2 : 3;
        hand.hands[recipient].push(...hand.stock.slice(cursor, cursor + packet)); cursor += packet;
      }
      hand.stock = [];
      const owner = hand.hands.findIndex(cards => cards.some(card => card.suit === action.trump && card.rank === "K")
        && cards.some(card => card.suit === action.trump && card.rank === "Q"));
      hand.beloteOwner = owner === -1 ? null : owner as BeloteSeat;
      hand.turn = nextBeloteSeat(hand.dealer); hand.phase = "playing";
    }
  } else if (action.type === "play-card") {
    if (hand.phase !== "playing" || !hand.contract) throw Error("Wait for card play.");
    const trump = hand.contract.trump;
    const card = legalBeloteCards(hand.hands[seat], hand.currentTrick, trump, seat).find(card => card.id === action.cardId);
    if (!card) throw Error("Follow suit, trump when required and overtrump an opponent when possible.");
    hand.hands[seat] = hand.hands[seat].filter(other => other.id !== card.id);
    hand.currentTrick.push({ seat, card });
    if (seat === hand.beloteOwner && card.suit === trump && ["K", "Q"].includes(card.rank)) {
      hand.announcements.push({ seat, label: hand.announcements.length ? "Rebelote" : "Belote" });
    }
    if (hand.currentTrick.length === 4) {
      const winner = beloteTrickWinner(hand.currentTrick, trump)!;
      hand.completedTricks.push({ cards: hand.currentTrick, winner, points: hand.currentTrick.reduce((sum, play) => sum + beloteCardPoints(play.card, trump), 0) });
      hand.currentTrick = []; hand.turn = winner;
      hand.phase = hand.completedTricks.length === 8 ? "complete" : "review";
      if (hand.phase === "complete") {
        const points: [number, number] = [0, 0], tricks: [number, number] = [0, 0];
        for (const trick of hand.completedTricks) { points[beloteSide(trick.winner)] += trick.points; tricks[beloteSide(trick.winner)]++; }
        hand.result = scoreBeloteHand(beloteSide(hand.contract.taker), points, tricks, beloteSide(winner),
          hand.announcements.length === 2 ? beloteSide(hand.beloteOwner!) : null, session.carry);
      }
    } else hand.turn = nextBeloteSeat(seat);
  } else if (action.type === "next-trick") {
    if (hand.phase !== "review") throw Error("There is no trick to advance.");
    hand.phase = "playing";
  } else throw Error("Unknown Belote action.");
  return { ...session, hand, events: [...session.events, { ...action }],
    scores: hand.result ? [session.scores[0] + hand.result.awarded[0], session.scores[1] + hand.result.awarded[1]] : [...session.scores],
    carry: hand.result?.carry ?? session.carry };
}
export function replayBeloteHand(session: BeloteSession): BeloteSession {
  if (beloteComplete(session)) throw Error("This Belote game is complete.");
  let boundary = session.events.length - 1;
  while (boundary >= 0 && session.events[boundary].type !== "next-hand") boundary--;
  return session.events.slice(0, boundary + 1).reduce(transitionBeloteSession, createBeloteSession(session.initialSeed, session.initialDealer));
}
export type BelotePosition = Omit<BeloteHand, "seed" | "hands" | "stock" | "beloteOwner" | "result"> & { viewer: BeloteSeat; hand: Card[]; cardsRemaining: number[] };
export function belotePosition(hand: BeloteHand, viewer: BeloteSeat): BelotePosition {
  if (!Number.isInteger(viewer) || viewer < 0 || viewer > 3) throw Error("Invalid Belote viewer.");
  return structuredClone({ viewer, hand: hand.hands[viewer], cardsRemaining: hand.hands.map(cards => cards.length),
    dealer: hand.dealer, turn: hand.turn, round: hand.round, passes: hand.passes, phase: hand.phase,
    upcard: hand.upcard, contract: hand.contract, calls: hand.calls, currentTrick: hand.currentTrick,
    completedTricks: hand.completedTricks, announcements: hand.announcements });
}
