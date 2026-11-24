import {
  startCribbage, playCribbage, cribbageComputer, cribbageMoves, dealerOf,
  showCount, pegPoints, cardValue, chooseCrib, choosePeg, cribbageView,
  type CribbageGame, type CribbageMove, type CribbageCount
} from "@johnmorrisdotca/toranpu/cribbage";
import { standardDeck } from "./deck";
import type { Card } from "./types";

export type CribbageScore = CribbageCount;
export type CribbageAction = { type: "discard"; cards: [string, string] } | { type: "play"; card: string } | { type: "continue" };
export type CribbageCountRow = { seat: number; label: string; cards: string[]; count: CribbageScore; scores: [number, number] };
export type CribbageReview = { starter: string; rows: CribbageCountRow[]; index: number };
export type CribbageSession = {
  seed: number; player: number; game: CribbageGame; events: CribbageAction[];
  review: CribbageReview | null; messages: string[];
};
const cards = new Map(standardDeck().map(card => [card.id, card]));
const externalCard = (id: string) => id.startsWith("T") ? `10${id.slice(1)}` : id;
const nativeCard = (id: string) => id.startsWith("10") ? `T${id.slice(2)}` : id;
export function cribbageCards(ids: readonly string[]): Card[] {
  return ids.map(id => { const card = cards.get(externalCard(id)); if (!card) throw Error("Unknown Cribbage card."); return card; });
}
export const cribbageValue = (id: string) => { cribbageCards([id]); return cardValue(nativeCard(id)); };
export function countCribbageHand(hand: readonly string[], starter: string, crib = false): CribbageScore {
  if (hand.length !== 4 || new Set([...hand, starter].map(nativeCard)).size !== 5) throw Error("Count four different cards and a separate starter.");
  cribbageCards([...hand, starter]);
  return showCount(hand.map(nativeCard), nativeCard(starter), crib);
}
export function countCribbagePeg(run: readonly string[], card: string) {
  cribbageCards([...run, card]);
  const native = [...run, card].map(nativeCard);
  const total = native.reduce((sum, id) => sum + cardValue(id), 0);
  if (total > 31 || new Set(native).size !== native.length) throw Error("That card cannot be pegged.");
  return { ...pegPoints(native, total), total };
}
export function createCribbageSession(seed: number): CribbageSession {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error("Invalid Cribbage deal seed.");
  const player = seed % 2;
  const game = startCribbage(121, player === 0 ? ["You", "Barbu"] : ["Barbu", "You"], undefined, seed, [player !== 0, player !== 1]);
  if (!game) throw Error("Cribbage could not be dealt.");
  return { seed, player, game, events: [], review: null, messages: [] };
}
export const cribbageDealer = (session: CribbageSession) => dealerOf(session.game.deal);
export const cribbageName = (session: CribbageSession, seat: number) => seat === session.player ? "You" : "Barbu";
export const cribbageComplete = (session: CribbageSession) => session.game.phase === "over" && !session.review;
export function cribbageScores(session: CribbageSession): [number, number] {
  const scores = session.review ? session.review.rows[session.review.index].scores : session.game.scores;
  return [scores[session.player], scores[1 - session.player]];
}
export function cribbageLegalCards(session: CribbageSession): string[] {
  if (session.review || session.game.toPlay !== session.player) return [];
  return (session.game.phase === "crib" ? [...session.game.hands[session.player]]
    : cribbageMoves(session.game).flatMap(move => "play" in move ? [move.play] : [])).map(externalCard);
}
export function cribbageSuggestion(session: CribbageSession): string[] {
  if (session.review || session.game.phase === "over" || session.game.toPlay !== session.player) return [];
  return (session.game.phase === "crib" ? chooseCrib(session.game.hands[session.player], cribbageDealer(session) === session.player)
    : [choosePeg(cribbageView(session.game))]).map(externalCard);
}
export function suggestCribbageDiscard(hand: string[], ownCrib: boolean): string[] {
  cribbageCards(hand);
  if (hand.length !== 6 || new Set(hand.map(nativeCard)).size !== 6) throw Error("Choose from six different cards.");
  return chooseCrib(hand.map(nativeCard), ownCrib).map(externalCard);
}
export function cribbageScoreParts(count: CribbageScore): string {
  const parts = [["Fifteens", count.fifteens], ["Pairs", count.pairs], ["Runs", count.runs], ["Flush", count.flush], ["Nobs", count.nobs]] as const;
  return parts.filter(([, value]) => value > 0).map(([label, value]) => `${label} ${value}`).join(" · ") || "No scoring combinations";
}

function countingReview(session: CribbageSession, next: CribbageGame, move: CribbageMove): CribbageReview | null {
  if (next.results.length === session.game.results.length || !("play" in move)) return null;
  const result = next.results[next.results.length - 1];
  const last = countCribbagePeg(session.game.run.map(play => play.card), move.play);
  const scores: [number, number] = [...session.game.scores];
  scores[session.game.toPlay!] += last.points + (last.total === 31 ? 0 : 1);
  const rows: CribbageCountRow[] = [];
  for (const [seat, label, hand, count] of [
    [1 - result.dealer, "Non-dealer hand", result.hands[1 - result.dealer], result.counts[1 - result.dealer]],
    [result.dealer, "Dealer hand", result.hands[result.dealer], result.counts[result.dealer]],
    [result.dealer, "Dealer crib", result.crib, result.cribCount]
  ] as const) {
    scores[seat] += count.total;
    rows.push({ seat, label, cards: [...hand], count, scores: [...scores] });
    if (scores[seat] >= 121) break;
  }
  return { starter: result.starter, rows, index: 0 };
}

export function transitionCribbageSession(session: CribbageSession, action: CribbageAction): CribbageSession {
  if (action.type === "continue") {
    if (!session.review) throw Error("There is no hand count to continue.");
    const index = session.review.index + 1;
    return { ...session, events: [...session.events, action],
      review: index < session.review.rows.length ? { ...session.review, index } : null };
  }
  if (session.review || session.game.phase === "over") throw Error("Finish reviewing the hand before playing.");
  const move: CribbageMove = action.type === "discard" ? { crib: [nativeCard(action.cards[0]), nativeCard(action.cards[1])] } : { play: nativeCard(action.card) };
  const game = playCribbage(session.game, move);
  if (!game) throw Error(action.type === "discard" ? "Choose two different cards from your hand." : "Choose a card that keeps the count at 31 or below.");
  const seat = session.game.toPlay!;
  const messages = [...session.messages];
  if (action.type === "play") {
    const score = countCribbagePeg(session.game.run.map(play => play.card), action.card);
    messages.push(`${cribbageName(session, seat)} played ${cribbageCards([action.card])[0].label}: ${score.total}.${score.points ? ` +${score.points} (${score.why.join(", ")}).` : ""}`);
    if (game.deal > session.game.deal || game.count === 0 || game.peg?.why.some(why => why === "go" || why === "last card")) {
      messages.push(score.total === 31 ? "31 for two. The count starts again at zero." : `${cribbageName(session, seat)}: one for ${game.results.length > session.game.results.length ? "last card" : "go"}. The count resets.`);
    } else if (game.toPlay === seat) messages.push(`${cribbageName(session, 1 - seat)} cannot play: go. ${cribbageName(session, seat)} plays again.`);
  } else if (game.starter) messages.push(`Starter: ${cribbageCards([game.starter])[0].label}.${game.peg?.why.includes("his heels") ? ` ${cribbageName(session, cribbageDealer(session))}: two for heels (a jack starter).` : ""}`);
  return { ...session, game, events: [...session.events, action], review: countingReview(session, game, move), messages: messages.slice(-4) };
}
export function advanceCribbageOpponent(session: CribbageSession): CribbageSession {
  let next = session;
  for (let turns = 0; turns < 10 && !next.review && next.game.phase !== "over" && next.game.toPlay !== next.player; turns++) {
    const move = cribbageComputer(next.game);
    next = transitionCribbageSession(next, "crib" in move ? { type: "discard", cards: [externalCard(move.crib[0]), externalCard(move.crib[1])] } : { type: "play", card: externalCard(move.play) });
  }
  if (!next.review && next.game.phase !== "over" && next.game.toPlay !== next.player) throw Error("Cribbage could not reach your next turn.");
  return next;
}
