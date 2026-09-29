import type { Card } from "./types";
import { standardDeck, shuffledCards } from "./deck";

export type CanastaTeam = 0 | 1;
export type CanastaMeld = { rank: string; cards: Card[] };
export type MeldRequest = { rank: string; cardIds: string[] };
export type CanastaSide = { melds: CanastaMeld[]; threes: Card[]; opened: boolean };
export const canastaRanks = ["4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "Wild"];
export const canastaTarget = 8500;
export const canastaTeam = (seat: number): CanastaTeam => seat % 2 as CanastaTeam;
export const isCanastaWild = (card: Card) => card.rank === "2" || card.rank === "Joker";
export const canastaValue = (card: Card) => card.rank === "Joker" ? 50 : ["A", "2"].includes(card.rank) ? 20 : ["8", "9", "10", "J", "Q", "K"].includes(card.rank) ? 10 : 5;
export const initialCanastaMinimum = (score: number) => score < 3000 ? 125 : score < 5000 ? 155 : 180;
export const completedCanastas = (side: CanastaSide) => side.melds.filter(meld => meld.cards.length === 7).length;
export const deadCanastaRank = (sides: CanastaSide[], rank: string) => sides.some(side => side.melds.some(meld => meld.rank === rank && meld.cards.length === 7));

export function canastaDeck(seed: number): Card[] {
  const packs = [0, 1].flatMap(pack => [...standardDeck(),
    { id: "JR", rank: "Joker", suit: "H" as const, label: "Red joker" },
    { id: "JB", rank: "Joker", suit: "C" as const, label: "Black joker" }
  ].map(card => ({ ...card, id: `${pack}-${card.id}` })));
  return shuffledCards(packs, seed);
}

export function resolveCanastaCards(hand: Card[], ids: string[]): Card[] {
  if (!ids.length || new Set(ids).size !== ids.length) throw Error("Select each card once.");
  return ids.map(id => {
    const card = hand.find(card => card.id === id);
    if (!card) throw Error("That card is not in your hand.");
    return card;
  });
}

export function validateCanastaMeld(rank: string, additions: Card[], existing: CanastaMeld | undefined, opening: boolean) {
  if (!canastaRanks.includes(rank) || !additions.length) throw Error("Choose a meld rank and cards.");
  const cards = [...existing?.cards ?? [], ...additions];
  if (cards.length < 3 || cards.length > 7) throw Error("A meld needs 3 to 7 cards.");
  const wild = cards.filter(isCanastaWild).length, natural = cards.length - wild;
  if (rank === "Wild") {
    if (natural) throw Error("A wild meld contains only twos and jokers.");
    return;
  }
  if (cards.some(card => !isCanastaWild(card) && card.rank !== rank)) throw Error("Natural cards must match the meld rank.");
  if (wild > 2 || natural < 2) throw Error("Use at least two natural cards and at most two wild cards.");
  if (rank === "7" && wild) throw Error("Sevens must stay natural.");
  if (rank === "A" && additions.some(isCanastaWild) && (!opening && !existing?.cards.some(isCanastaWild))) throw Error("Natural aces must stay natural.");
  if (!opening && additions.some(isCanastaWild) && natural < 5) throw Error("After opening, five natural cards are needed before adding a wild card.");
}

// Validate the whole opening together: a single small meld need not meet the minimum alone.
export function planCanastaMelds(hand: Card[], sides: CanastaSide[], team: CanastaTeam, requests: MeldRequest[], score: number) {
  if (!requests.length || new Set(requests.map(request => request.rank)).size !== requests.length) throw Error("Choose one group per rank.");
  const selected = resolveCanastaCards(hand, requests.flatMap(request => request.cardIds));
  const side = sides[team], opening = !side.opened;
  const melds = side.melds.map(meld => ({ ...meld, cards: [...meld.cards] }));
  for (const request of requests) {
    const cards = resolveCanastaCards(hand, request.cardIds), existing = melds.find(meld => meld.rank === request.rank);
    if (request.rank !== "Wild" && deadCanastaRank(sides, request.rank)) throw Error("That rank is closed at this table.");
    validateCanastaMeld(request.rank, cards, existing, opening);
    if (existing) existing.cards.push(...cards);
    else melds.push({ rank: request.rank, cards });
  }
  const wildMeld = melds.find(meld => meld.rank === "Wild");
  if (wildMeld && wildMeld.cards.length < 7 && requests.some(request => request.rank !== "Wild" && resolveCanastaCards(hand, request.cardIds).some(isCanastaWild))) {
    throw Error("Complete the wild canasta before using wilds in other melds.");
  }
  if (opening) {
    const splash = melds.some(meld => meld.cards.length === 7 && (meld.rank === "Wild" || !meld.cards.some(isCanastaWild)));
    if (!splash) {
      if (selected.reduce((sum, card) => sum + canastaValue(card), 0) < initialCanastaMinimum(score)) throw Error(`Your opening needs ${initialCanastaMinimum(score)} points from your hand.`);
      if (!melds.some(meld => meld.rank === "Wild" || !meld.cards.some(isCanastaWild))) throw Error("Your opening needs a natural meld or a wild-card meld.");
    }
  }
  return { melds, selected };
}

export function canastaDiscards(hand: Card[], sides: CanastaSide[], team: CanastaTeam, emptyPile: boolean, allWildAtDraw: boolean, bonusPending = false): Card[] {
  const goingOut = hand.length === 1 && completedCanastas(sides[team]) >= 2;
  if (hand.length === 1 && !goingOut && !bonusPending) return [];
  const natural = hand.filter(card => !isCanastaWild(card) && card.rank !== "3");
  if (goingOut) return hand.filter(card => card.rank !== "3");
  if (!natural.length) return allWildAtDraw ? hand.filter(isCanastaWild) : [];
  if (!emptyPile) return natural;
  const ordinary = natural.filter(card => card.rank !== "A" && card.rank !== "7" && !deadCanastaRank(sides, card.rank));
  if (ordinary.length) return ordinary;
  const live = natural.filter(card => !deadCanastaRank(sides, card.rank));
  return live.length ? live : natural;
}

export function canastaSpecial(hand: Card[]): { name: string; points: number } | null {
  if (hand.length !== 14) return null;
  const counts = new Map<string, number>();
  hand.forEach(card => counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1));
  if (counts.size === 14) return { name: "Straight", points: 3000 };
  if (hand.some(card => card.rank === "3" || card.rank === "Joker")) return null;
  const sizes = [...counts.values()].sort((a, b) => a - b).join(",");
  if (sizes === "2,2,2,2,2,2,2") {
    if (!counts.has("2")) return { name: "Pairs", points: 2500 };
    if (counts.has("7") && counts.has("A")) return { name: "Pairs with twos", points: 2000 };
  }
  if (!counts.has("2") && sizes === "3,3,4,4") return { name: "Garbage", points: 2000 };
  return null;
}

export type CanastaScore = { canastas: number; bonuses: number; melds: number; threes: number; penalties: number; inHand: number; total: number };
export function scoreCanastaSide(side: CanastaSide, hands: Card[][], wentOut: boolean): CanastaScore {
  const canastas = completedCanastas(side);
  let bonuses = wentOut ? 100 : 0, penalties = 0;
  for (const meld of side.melds) {
    const pure = !meld.cards.some(isCanastaWild), jokers = meld.cards.filter(card => card.rank === "Joker").length;
    if (meld.cards.length === 7) bonuses += meld.rank === "Wild" ? jokers === 0 ? 3000 : jokers === 4 ? 2500 : 2000
      : pure ? ["A", "7"].includes(meld.rank) ? 2500 : 500 : 300;
    else if (meld.rank === "Wild") penalties += jokers === 4 ? 2500 : 2000;
    else if (meld.rank === "7" || meld.rank === "A" && pure) penalties += 2500;
  }
  for (const hand of hands) for (const rank of ["A", "7"]) if (hand.filter(card => card.rank === rank).length >= 3) penalties += 1500;
  const red = side.threes.filter(card => card.suit === "D" || card.suit === "H").length;
  const values = [0, 100, 300, 500, 1000];
  const threes = (values[red] + values[side.threes.length - red]) * (canastas === 0 ? -1 : canastas === 1 ? 0 : 1);
  const melds = side.melds.flatMap(meld => meld.cards).reduce((sum, card) => sum + canastaValue(card), 0) * (canastas ? 1 : -1);
  const inHand = hands.flat().reduce((sum, card) => sum + canastaValue(card), 0);
  return { canastas, bonuses, melds, threes, penalties, inHand, total: bonuses + melds + threes - penalties - inHand };
}
