import type { Card } from "./types";
import { canastaDeck, canastaTeam, canastaTarget, canastaDiscards, canastaSpecial, completedCanastas,
  isCanastaWild, planCanastaMelds, resolveCanastaCards, scoreCanastaSide, validateCanastaMeld, deadCanastaRank,
  type CanastaSide, type CanastaScore, type MeldRequest } from "./canastaRules";

export type CanastaAction = { type: "draw" } | { type: "expose"; cardId: string }
  | { type: "meld"; groups: MeldRequest[] }
  | { type: "pickup"; pair: string[]; groups: MeldRequest[] }
  | { type: "discard"; cardId: string } | { type: "special" } | { type: "next"; seed: number };
export type CanastaResult = { reason: string; scores: [CanastaScore, CanastaScore]; special?: { team: number; name: string; points: number } };
export type CanastaHand = {
  hands: Card[][]; stock: Card[]; discards: Card[]; sides: [CanastaSide, CanastaSide]; talons: Card[][];
  dealer: number; turn: number; phase: "draw" | "play" | "complete"; allWildAtDraw: boolean;
  openedThisTurn: boolean; bonusSize: number; drewStock: boolean; result: CanastaResult | null; log: string[];
};
export type CanastaSession = { initialSeed: number; events: CanastaAction[]; hand: CanastaHand; scores: [number, number]; handNumber: number };
export const canastaSeatNames = ["You", "West", "Barbu", "East"];
export const canastaComplete = (session: CanastaSession) => session.scores.some(score => score >= canastaTarget);
const validSeed = (seed: number) => Number.isSafeInteger(seed) && seed >= 0;
const emptySide = (): CanastaSide => ({ melds: [], threes: [], opened: false });

function deal(seed: number, dealer: number): CanastaHand {
  if (!validSeed(seed)) throw Error("Invalid Canasta seed.");
  const deck = canastaDeck(seed), hands: Card[][] = [[], [], [], []];
  for (let index = 0; index < 52; index++) hands[(dealer + 1 + index) % 4].push(deck[index]);
  return { hands, stock: deck.slice(52), discards: [], sides: [emptySide(), emptySide()], talons: [[], [], [], []],
    dealer, turn: (dealer + 1) % 4, phase: "draw", allWildAtDraw: false, openedThisTurn: false, bonusSize: 0,
    drewStock: false, result: null, log: ["Modern American Canasta. You and Barbu are partners."] };
}
export function createCanastaSession(seed: number): CanastaSession {
  return { initialSeed: seed, events: [], hand: deal(seed, seed % 4), scores: [0, 0], handNumber: 1 };
}
export function canastaNeedsThrees(hand: CanastaHand): boolean {
  return hand.hands[hand.turn].filter(card => card.rank === "3").length > (hand.sides[canastaTeam(hand.turn)].opened ? 0 : 1);
}
export function legalCanastaDiscards(hand: CanastaHand): Card[] {
  if (hand.phase !== "play" || canastaNeedsThrees(hand)) return [];
  return canastaDiscards(hand.hands[hand.turn], hand.sides, canastaTeam(hand.turn), !hand.discards.length,
    hand.allWildAtDraw, hand.openedThisTurn && hand.stock.length >= 9);
}
function log(hand: CanastaHand, message: string) { hand.log = [...hand.log.slice(-11), message]; }
function finish(hand: CanastaHand, reason: string, out = -1, special?: CanastaResult["special"]) {
  const scores = hand.sides.map((side, team) => scoreCanastaSide(side,
    hand.hands.flatMap((cards, player) => canastaTeam(player) === team ? [[...cards, ...hand.talons[player]]] : []), out >= 0 && canastaTeam(out) === team)) as [CanastaScore, CanastaScore];
  if (special) scores[special.team] = { canastas: 0, bonuses: special.points, melds: 0, threes: 0, penalties: 0, inHand: 0, total: special.points };
  hand.result = { reason, scores, ...(special ? { special } : {}) };
  hand.phase = "complete";
  log(hand, reason);
}
function drawOne(hand: CanastaHand): Card | undefined {
  const card = hand.stock.shift();
  if (!card) { finish(hand, "The stock is exhausted."); return; }
  hand.hands[hand.turn].push(card);
  if (hand.stock.length === 8) log(hand, "Turn card: eight stock cards remain. No more opening bonuses.");
  if (card.rank === "3" && !hand.stock.length) finish(hand, "The last stock card is a three. The hand ends immediately.");
  return card;
}

function opening(hand: CanastaHand, groups: MeldRequest[], score: number) {
  const team = canastaTeam(hand.turn), side = hand.sides[team], cards = hand.hands[hand.turn];
  if (cards.some(card => card.rank === "3")) throw Error("Expose your three before melding.");
  const result = planCanastaMelds(cards, hand.sides, team, groups, score);
  if (!side.opened) {
    hand.openedThisTurn = true;
    hand.bonusSize = hand.sides[1 - team].opened ? 3 : 4;
    side.opened = true;
  }
  side.melds = result.melds;
  hand.hands[hand.turn] = cards.filter(card => !result.selected.some(selected => selected.id === card.id));
}

export function transitionCanastaSession(session: CanastaSession, action: CanastaAction): CanastaSession {
  if (canastaComplete(session)) throw Error("This match is complete.");
  if (action.type === "next") {
    if (session.hand.phase !== "complete") throw Error("Finish this hand first.");
    return { ...session, hand: deal(action.seed, (session.hand.dealer + 1) % 4), handNumber: session.handNumber + 1, events: [...session.events, action] };
  }
  if (session.hand.phase === "complete") throw Error("This hand is complete.");
  const hand = structuredClone(session.hand), player = hand.turn, team = canastaTeam(player), side = hand.sides[team], name = canastaSeatNames[player];
  if (action.type === "expose") {
    const card = resolveCanastaCards(hand.hands[player], [action.cardId])[0];
    if (card.rank !== "3") throw Error("Only threes are exposed for replacement.");
    if (!hand.stock.length) { finish(hand, "No stock card remains to replace the three."); }
    else {
      hand.hands[player] = hand.hands[player].filter(c => c.id !== card.id);
      side.threes.push(card);
      log(hand, `${name} exposed a three.`);
      drawOne(hand);
    }
  } else {
    if (canastaNeedsThrees(hand)) throw Error("Expose your threes first. Before opening you may keep one for a straight.");
    if (action.type === "draw") {
      if (hand.phase !== "draw") throw Error("You have already drawn this turn.");
      hand.allWildAtDraw = hand.hands[player].every(isCanastaWild);
      hand.drewStock = true;
      hand.phase = "play";
      log(hand, `${name} drew from stock.`);
      drawOne(hand);
    } else if (action.type === "meld") {
      if (hand.phase !== "play") throw Error("Draw before melding, or include your opening when taking the pile.");
      opening(hand, action.groups, session.scores[team]);
      if (!legalCanastaDiscards(hand).length) throw Error("Keep a legal discard and a card to continue, unless you can go out.");
      log(hand, `${name} melded ${action.groups.map(group => group.rank).join(", ")}.`);
    } else if (action.type === "pickup") {
      if (hand.phase !== "draw") throw Error("Take the pile instead of drawing, not afterwards.");
      const top = hand.discards.at(-1);
      if (!top || top.rank === "3" || isCanastaWild(top) || deadCanastaRank(hand.sides, top.rank)) throw Error("This discard cannot be picked up.");
      const pair = resolveCanastaCards(hand.hands[player], action.pair);
      if (pair.length !== 2 || pair.some(card => card.rank !== top.rank || isCanastaWild(card))) throw Error("You need two natural cards matching the top discard.");
      if (!side.opened) opening(hand, action.groups, session.scores[team]);
      else if (action.groups.length) throw Error("After opening, take the pile before making other melds.");
      const existing = side.melds.find(meld => meld.rank === top.rank);
      const additions = [...pair.filter(card => !existing?.cards.some(c => c.id === card.id)), top];
      validateCanastaMeld(top.rank, additions, existing, false);
      if (existing) existing.cards.push(...additions);
      else side.melds.push({ rank: top.rank, cards: additions });
      hand.hands[player] = hand.hands[player].filter(card => !pair.some(c => c.id === card.id));
      hand.hands[player].push(...hand.discards.slice(0, -1));
      log(hand, `${name} took ${hand.discards.length} cards from the discard pile.`);
      hand.discards = [];
      hand.phase = "play";
      hand.drewStock = false;
      hand.allWildAtDraw = false;
      if (!legalCanastaDiscards(hand).length) throw Error("Taking this pile leaves no legal discard.");
    } else if (action.type === "special") {
      const special = canastaSpecial(hand.hands[player]);
      if (hand.phase !== "play" || !hand.drewStock || side.opened || !special) throw Error("A special hand needs 14 cards, a stock draw, and an unopened partnership.");
      finish(hand, `${name} declared ${special.name}.`, -1, { team, ...special });
    } else if (action.type === "discard") {
      const card = legalCanastaDiscards(hand).find(card => card.id === action.cardId);
      if (!card) throw Error("Choose a legal discard. Threes cannot be discarded; wilds and an empty pile have restrictions.");
      hand.hands[player] = hand.hands[player].filter(c => c.id !== card.id);
      hand.discards.push(card);
      log(hand, `${name} discarded ${card.label}.`);
      if (!hand.hands[player].length && completedCanastas(side) >= 2) finish(hand, `${name} went out.`, player);
      else {
        if (hand.openedThisTurn && hand.stock.length >= 9) {
          hand.talons[player] = hand.stock.splice(0, hand.bonusSize);
          log(hand, `${name} reserved ${hand.bonusSize} bonus cards for their next turn.`);
          if (hand.stock.length <= 8) log(hand, "Turn card: opening bonuses are now closed.");
        }
        hand.turn = (player + 1) % 4;
        hand.hands[hand.turn].push(...hand.talons[hand.turn]);
        hand.talons[hand.turn] = [];
        hand.phase = "draw"; hand.drewStock = false; hand.openedThisTurn = false; hand.bonusSize = 0; hand.allWildAtDraw = false;
      }
    } else throw Error("Unknown Canasta action.");
  }
  const scores = session.scores.map((score, team) => score + (hand.result?.scores[team].total ?? 0)) as [number, number];
  const event = action.type === "meld" || action.type === "pickup"
    ? { ...action, groups: action.groups.map(group => ({ rank: group.rank, cardIds: [...group.cardIds] })),
      ...(action.type === "pickup" ? { pair: [...action.pair] } : {}) } : { ...action };
  return { ...session, hand, scores, events: [...session.events, event] };
}

export function replayCanastaHand(session: CanastaSession) {
  let boundary = -1;
  session.events.forEach((event, index) => { if (event.type === "next") boundary = index; });
  return session.events.slice(0, boundary + 1).reduce(transitionCanastaSession, createCanastaSession(session.initialSeed));
}
