import solver from "javascript-lp-solver";
import type { Card } from "./types";

export const rummyRank = (card: Card) => card.rank === "A" ? 1 : ({ J: 11, Q: 12, K: 13 }[card.rank] ?? Number(card.rank));
export const deadwoodValue = (card: Card) => Math.min(10, rummyRank(card));
export const deadwoodPoints = (cards: Card[]) => cards.reduce((sum, card) => sum + deadwoodValue(card), 0);
export type Meld = { kind: "set" | "run"; cards: Card[] };
export type MeldLayout = { melds: Meld[]; deadwood: Card[]; points: number; layoffs: Array<{ target: number; cards: Card[] }> };

export function rummyMelds(hand: Card[]): Meld[] {
  const melds: Meld[] = [];
  for (const rank of new Set(hand.map(card => card.rank))) {
    const group = hand.filter(card => card.rank === rank).sort((a, b) => a.id.localeCompare(b.id));
    if (group.length >= 3) melds.push({ kind: "set", cards: group });
    if (group.length === 4) for (const card of group) melds.push({ kind: "set", cards: group.filter(c => c.id !== card.id) });
  }
  for (const suit of ["C", "D", "H", "S"]) {
    const cards = hand.filter(card => card.suit === suit).sort((a, b) => rummyRank(a) - rummyRank(b));
    for (let start = 0; start < cards.length; start++) {
      for (let end = start + 1; end < cards.length; end++) {
        if (rummyRank(cards[end]) !== rummyRank(cards[end - 1]) + 1) break;
        if (end - start >= 2) melds.push({ kind: "run", cards: cards.slice(start, end + 1) });
      }
    }
  }
  return melds;
}

export function bestMeldLayout(hand: Card[], exposed: Meld[] = []): MeldLayout {
  type Candidate = { cards: Card[]; meld?: Meld; target?: number };
  const candidates: Candidate[] = rummyMelds(hand).map(meld => ({ cards: meld.cards, meld }));
  exposed.forEach((meld, target) => {
    if (meld.kind === "set") {
      if (meld.cards.length === 3) for (const card of hand.filter(c => c.rank === meld.cards[0].rank)) candidates.push({ cards: [card], target });
      return;
    }
    const ranks = meld.cards.map(rummyRank);
    const extensions = (rank: number, direction: number) => {
      const cards: Card[] = [];
      for (let value = rank + direction; value >= 1 && value <= 13; value += direction) {
        const card = hand.find(c => c.suit === meld.cards[0].suit && rummyRank(c) === value);
        if (!card) break;
        cards.push(card);
      }
      return cards;
    };
    const low = extensions(Math.min(...ranks), -1), high = extensions(Math.max(...ranks), 1);
    for (let l = 0; l <= low.length; l++) for (let h = 0; h <= high.length; h++) {
      if (l + h) candidates.push({ cards: [...low.slice(0, l), ...high.slice(0, h)], target });
    }
  });
  const constraints: Record<string, { max: number }> = Object.fromEntries(hand.map(card => [card.id, { max: 1 }]));
  exposed.forEach((_, index) => { constraints[`target${index}`] = { max: 1 }; });
  const variables: Record<string, Record<string, number>> = {};
  candidates.forEach((candidate, index) => {
    variables[`meld${index}`] = { value: deadwoodPoints(candidate.cards), ...Object.fromEntries(candidate.cards.map(card => [card.id, 1])) };
    if (candidate.target !== undefined) variables[`meld${index}`][`target${candidate.target}`] = 1;
  });
  // One set-packing model handles competing melds and chained layoffs together.
  const result = candidates.length ? solver.Solve({ optimize: "value", opType: "max", constraints, variables,
    binaries: Object.fromEntries(Object.keys(variables).map(key => [key, 1])) }) : {};
  const chosen = candidates.filter((_, index) => Number((result as Record<string, unknown>)[`meld${index}`] ?? 0) > 0.5);
  const used = new Set(chosen.flatMap(candidate => candidate.cards.map(card => card.id)));
  const deadwood = hand.filter(card => !used.has(card.id));
  return { melds: chosen.flatMap(candidate => candidate.meld ? [candidate.meld] : []), deadwood, points: deadwoodPoints(deadwood),
    layoffs: chosen.flatMap(candidate => candidate.target === undefined ? [] : [{ target: candidate.target, cards: candidate.cards }]) };
}
