import type { Card } from "./types";
import { shuffledDeck } from "./deck";
import { bestMeldLayout, type MeldLayout } from "./rummyMelds";

export type GinPlayer = 0 | 1;
export type GinAction = { type: "pass" } | { type: "draw"; source: "stock" | "discard" }
  | { type: "discard"; cardId: string; knock?: boolean } | { type: "next"; seed: number };
export type GinResult = { kind: "knock" | "gin" | "undercut" | "draw"; winner: GinPlayer | null;
  knocker: GinPlayer | null; points: number; layouts: [MeldLayout, MeldLayout] };
export type GinHand = {
  hands: [Card[], Card[]]; stock: Card[]; discards: Card[]; dealer: GinPlayer; turn: GinPlayer;
  phase: "offer" | "draw" | "discard" | "complete"; passes: number; forcedStock: boolean;
  blockedDiscard: string; known: [Card[], Card[]]; result: GinResult | null; message: string;
};
export type GinSession = { initialSeed: number; events: GinAction[]; hand: GinHand; scores: [number, number]; wins: [number, number]; handNumber: number };
export const ginRules = { target: 100, knockLimit: 10, ginBonus: 20, undercutBonus: 10, boxBonus: 20, gameBonus: 100 } as const;
export const otherGinPlayer = (player: GinPlayer): GinPlayer => player === 0 ? 1 : 0;
export const ginComplete = (session: GinSession) => session.scores.some(score => score >= ginRules.target);

function deal(seed: number, dealer: GinPlayer): GinHand {
  if (!Number.isSafeInteger(seed) || seed < 0) throw Error("Invalid Gin Rummy seed");
  const deck = shuffledDeck(seed), hands: [Card[], Card[]] = [[], []];
  for (let index = 0; index < 20; index++) hands[index % 2 === 0 ? otherGinPlayer(dealer) : dealer].push(deck[index]);
  return { hands, stock: deck.slice(21), discards: [deck[20]], dealer, turn: otherGinPlayer(dealer), phase: "offer",
    passes: 0, forcedStock: false, blockedDiscard: "", known: [[], []], result: null, message: "The non-dealer has first choice of the upcard." };
}
export function createGinSession(seed: number): GinSession {
  return { initialSeed: seed, events: [], hand: deal(seed, seed % 2 as GinPlayer), scores: [0, 0], wins: [0, 0], handNumber: 1 };
}
export function ginDiscardLayout(hand: GinHand, cardId: string) {
  if (hand.phase !== "discard" || cardId === hand.blockedDiscard || !hand.hands[hand.turn].some(card => card.id === cardId)) return null;
  return bestMeldLayout(hand.hands[hand.turn].filter(card => card.id !== cardId));
}
export function scoreGinHand(hands: [Card[], Card[]], knocker: GinPlayer): GinResult {
  const attacking = bestMeldLayout(hands[knocker]);
  if (attacking.points > ginRules.knockLimit) throw Error("Knocking requires at most 10 deadwood points.");
  const defending = bestMeldLayout(hands[otherGinPlayer(knocker)], attacking.points ? attacking.melds : []);
  const gin = attacking.points === 0, undercut = !gin && defending.points <= attacking.points;
  const winner = undercut ? otherGinPlayer(knocker) : knocker;
  return { kind: gin ? "gin" : undercut ? "undercut" : "knock", winner, knocker,
    points: gin ? ginRules.ginBonus + defending.points : undercut ? ginRules.undercutBonus + attacking.points - defending.points : defending.points - attacking.points,
    layouts: knocker === 0 ? [attacking, defending] : [defending, attacking] };
}
export function ginFinalScores(session: GinSession): [number, number] {
  if (!ginComplete(session)) return [...session.scores];
  const winner: GinPlayer = session.scores[0] >= ginRules.target ? 0 : 1;
  return session.scores.map((score, player) => score + ginRules.boxBonus * session.wins[player]
    + (player === winner ? ginRules.gameBonus * (session.scores[otherGinPlayer(winner)] === 0 ? 2 : 1) : 0)) as [number, number];
}
export function transitionGinSession(session: GinSession, action: GinAction): GinSession {
  if (ginComplete(session)) throw Error("This game is complete.");
  if (action.type === "next") {
    if (session.hand.phase !== "complete") throw Error("Finish this hand first.");
    const dealer = session.hand.result?.winner ?? session.hand.dealer;
    return { ...session, events: [...session.events, action], hand: deal(action.seed, dealer), handNumber: session.handNumber + 1 };
  }
  if (session.hand.phase === "complete") throw Error("This hand is complete.");
  const hand: GinHand = { ...session.hand, hands: session.hand.hands.map(cards => [...cards]) as [Card[], Card[]],
    stock: [...session.hand.stock], discards: [...session.hand.discards], known: session.hand.known.map(cards => [...cards]) as [Card[], Card[]] };
  const player = hand.turn, name = player === 0 ? "You" : "Barbu";
  if (action.type === "pass") {
    if (hand.phase !== "offer") throw Error("Only the opening upcard can be passed.");
    hand.passes++;
    hand.turn = otherGinPlayer(player);
    if (hand.passes === 2) { hand.phase = "draw"; hand.forcedStock = true; }
    hand.message = `${name} passed the opening upcard.`;
  } else if (action.type === "draw") {
    if (hand.phase !== "offer" && hand.phase !== "draw") throw Error("Discard before drawing again.");
    if (action.source === "stock" && hand.phase === "offer") throw Error("Take or pass the opening upcard first.");
    if (action.source === "discard" && hand.forcedStock) throw Error("Both players passed; draw from the stock.");
    if (action.source === "stock" && hand.stock.length <= 2) throw Error("The stock is exhausted.");
    const card = action.source === "stock" ? hand.stock.shift() : hand.discards.pop();
    if (!card) throw Error("That pile is empty.");
    hand.hands[player].push(card);
    hand.blockedDiscard = action.source === "discard" ? card.id : "";
    if (action.source === "discard") hand.known[player].push(card);
    hand.forcedStock = false;
    hand.phase = "discard";
    hand.message = action.source === "stock" ? `${name} drew from the stock.` : `${name} took ${card.label}.`;
  } else {
    const layout = ginDiscardLayout(hand, action.cardId);
    if (!layout) throw Error("Choose a card to discard, other than the upcard just taken.");
    if (action.knock && layout.points > ginRules.knockLimit) throw Error("Knocking requires at most 10 deadwood points.");
    const card = hand.hands[player].find(c => c.id === action.cardId)!;
    hand.hands[player] = hand.hands[player].filter(c => c.id !== card.id);
    hand.known[player] = hand.known[player].filter(c => c.id !== card.id);
    hand.discards.push(card);
    hand.blockedDiscard = "";
    hand.message = `${name} discarded ${card.label}.`;
    if (action.knock) hand.result = scoreGinHand(hand.hands, player);
    else if (hand.stock.length <= 2) hand.result = { kind: "draw", winner: null, knocker: null, points: 0,
      layouts: [bestMeldLayout(hand.hands[0]), bestMeldLayout(hand.hands[1])] };
    hand.phase = hand.result ? "complete" : "draw";
    if (!hand.result) hand.turn = otherGinPlayer(player);
  }
  const scores: [number, number] = [...session.scores], wins: [number, number] = [...session.wins];
  if (hand.result?.winner !== null && hand.result?.winner !== undefined) {
    scores[hand.result.winner] += hand.result.points;
    wins[hand.result.winner]++;
  }
  return { ...session, hand, scores, wins, events: [...session.events, action] };
}

export function replayGinHand(session: GinSession): GinSession {
  let boundary = -1;
  session.events.forEach((event, index) => { if (event.type === "next") boundary = index; });
  return session.events.slice(0, boundary + 1).reduce(transitionGinSession, createGinSession(session.initialSeed));
}
