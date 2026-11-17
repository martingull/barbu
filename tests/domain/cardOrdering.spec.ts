import { expect, test } from "@playwright/test";
import { canastaDeck } from "../../src/domain/canastaRules";
import { canastaCards } from "../../src/lessons/canasta/exercises";
import { compareCanastaCardsForDisplay, sortCardsForDisplay } from "../../src/presentation/cardOrdering";
import { standardDeck } from "../../src/domain/deck";

test("Canasta groups threes, natural ranks and wilds without changing its cards", () => {
  const cards = canastaCards("1-QC 1-QS 0-JB 0-2D 0-3H 0-AC 0-QC 0-QS 0-JR 0-4D");
  const before = structuredClone(cards);
  const ordered = sortCardsForDisplay(Object.freeze(cards), compareCanastaCardsForDisplay);
  expect(ordered.map(card => card.id)).toEqual(["0-3H", "0-4D", "0-QS", "1-QS", "0-QC", "1-QC", "0-AC", "0-2D", "0-JR", "0-JB"]);
  expect(cards).toEqual(before);
  expect(new Set(ordered.map(card => card.id)).size).toBe(cards.length);
  expect(ordered.every(card => cards.includes(card))).toBe(true);
});

test("Canasta order is deterministic across both packs and all suits", () => {
  const expected = sortCardsForDisplay(canastaDeck(0), compareCanastaCardsForDisplay);
  expect([...new Set(expected.map(card => card.rank))]).toEqual(["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "Joker"]);
  for (const seed of [1, 3, 9, 37]) {
    expect(sortCardsForDisplay(canastaDeck(seed), compareCanastaCardsForDisplay)).toEqual(expected);
  }
  expect(sortCardsForDisplay([...expected].reverse(), compareCanastaCardsForDisplay)).toEqual(expected);
  const queens = expected.filter(card => card.rank === "Q");
  expect(queens.map(card => card.id)).toEqual(["0-QS", "1-QS", "0-QH", "1-QH", "0-QD", "1-QD", "0-QC", "1-QC"]);
});

test("default hand ordering remains suit-first with low ranks first", () => {
  const deck = standardDeck();
  const expected = ["S", "H", "D", "C"].flatMap(suit => ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"].map(rank => rank + suit));
  expect(sortCardsForDisplay(deck).map(card => card.id)).toEqual(expected);
  sortCardsForDisplay(canastaDeck(0), compareCanastaCardsForDisplay);
  expect(sortCardsForDisplay([...deck].reverse()).map(card => card.id)).toEqual(expected);
  expect(deck).toEqual(standardDeck());
});
