import { expect, test } from "@playwright/test";
import { canastaDeck, canastaSideScoring, scoreCanastaSide, canastaMeldPenalty, type CanastaSide, type CanastaScoreItem } from "../../src/domain/canastaRules";
import { createCanastaSession, transitionCanastaSession } from "../../src/domain/canastaSession";
import { canastaObservation } from "../../src/domain/canastaPolicy";
import { canastaMeldPreview } from "../../src/domain/canastaMeldPreview";
import { canastaScoreRows, canastaScoreItemLabel } from "../../src/features/canasta/canastaScorePresentation";
import { saveCanastaSession, normalizeCanastaSave, restoreCanastaSession } from "../../src/persistence/canastaSave";

const deck = canastaDeck(0);
const cards = (ids: string) => ids.split(" ").filter(Boolean).map(id => deck.find(card => card.id === id)!);
const rankCards = (rank: string, count: number) => deck.filter(card => card.rank === rank).slice(0, count);
const side = (): CanastaSide => ({ opened: true, melds: [], threes: [] });
function position(ids: string, phase: "draw" | "play" = "play") {
  const session = createCanastaSession(3);
  session.hand.phase = phase; session.hand.drewStock = phase === "play";
  session.hand.hands[0] = cards(ids); session.hand.sides = [side(), side()];
  return session;
}
function checkTotals(items: CanastaScoreItem[], score: ReturnType<typeof scoreCanastaSide>) {
  expect(items.reduce((sum, item) => sum + item.points, 0)).toBe(score.total);
  for (const category of ["bonuses", "penalties", "threes", "melds", "inHand"] as const) {
    const sum = items.filter(item => item.category === category).reduce((total, item) => total + item.points, 0);
    expect(sum || 0).toBe((category === "penalties" || category === "inHand" ? -score[category] : score[category]) || 0);
  }
}

test("score reasons account for every penalty without changing the aggregate score", () => {
  const s = side(); s.melds = [{ rank: "4", cards: rankCards("4", 7) }, { rank: "7", cards: rankCards("7", 3) }];
  s.threes = cards("0-3C 1-3C 0-3D");
  const { score, items } = canastaSideScoring(s, [rankCards("A", 3), rankCards("A", 3)], false);
  expect(score).toEqual({ canastas: 1, bonuses: 500, threes: 0, penalties: 5500, melds: 50, inHand: 120, total: -5070 });
  expect(items.filter(item => item.category === "penalties")).toEqual([
    { category: "penalties", reason: "unfinished_meld", rank: "7", count: 3, points: -2500 },
    { category: "penalties", reason: "held_danger", rank: "A", count: 3, handIndex: 0, points: -1500 },
    { category: "penalties", reason: "held_danger", rank: "A", count: 3, handIndex: 1, points: -1500 }
  ]);
  expect(items.filter(item => item.reason === "held_danger").map(item => canastaScoreItemLabel(item, 0))).toEqual(["You: 3 aces held", "Barbu: 3 aces held"]);
  checkTotals(items, score);
});

test("natural, mixed, ace, seven and wild canasta bonuses have their own reasons", () => {
  const examples = [
    { rank: "4", cards: rankCards("4", 7), bonus: 500, label: "Natural fours canasta" },
    { rank: "Q", cards: [...rankCards("Q", 5), ...cards("0-2C 0-2D")], bonus: 300, label: "Mixed queens canasta" },
    { rank: "A", cards: rankCards("A", 7), bonus: 2500, label: "Natural aces canasta" },
    { rank: "7", cards: rankCards("7", 7), bonus: 2500, label: "Natural sevens canasta" },
    { rank: "Wild", cards: rankCards("2", 7), bonus: 3000, label: "All-twos canasta" },
    { rank: "Wild", cards: [...rankCards("Joker", 4), ...rankCards("2", 3)], bonus: 2500, label: "Wild canasta (four jokers)" },
    { rank: "Wild", cards: [...rankCards("Joker", 2), ...rankCards("2", 5)], bonus: 2000, label: "Wild canasta" }
  ];
  for (const example of examples) {
    const s = side(); s.melds = [example];
    const { score, items } = canastaSideScoring(s, [], false);
    expect(score.bonuses).toBe(example.bonus); expect(score.penalties).toBe(0);
    expect(canastaScoreItemLabel(items[0], 0)).toBe(example.label);
    checkTotals(items, score);
  }
});

test("threes explain negative, zero and positive scores; melded cards reverse without a canasta", () => {
  for (const count of [0, 1, 2]) {
    const s = side(); s.threes = cards("0-3H 0-3D 0-3C");
    s.melds = ["4", "5"].slice(0, count).map(rank => ({ rank, cards: rankCards(rank, 7) }));
    const { score, items } = canastaSideScoring(s, [cards("0-KC")], false);
    expect(score.threes).toBe([-400, 0, 400][count]);
    const red = items.find(item => item.reason === "threes" && item.colour === "red")!;
    expect(red.points).toBe([-300, 0, 300][count]);
    expect(canastaScoreItemLabel(red, 0)).toContain(["no canasta", "one canasta: no score", "2+ canastas"][count]);
    checkTotals(items, score);
  }
  const s = side(); s.melds = [{ rank: "Q", cards: rankCards("Q", 3) }];
  expect(canastaSideScoring(s, [], false).items.find(item => item.reason === "melded_cards")?.points).toBe(-30);
});

test("score rows keep both teams' signs and totals, including special-hand overrides and reserved cards", () => {
  const session = position("0-KC", "draw"); session.hand.stock = [];
  session.hand.sides[0].melds = [{ rank: "7", cards: rankCards("7", 3) }];
  session.hand.talons[0] = cards("0-JR");
  const ended = transitionCanastaSession(session, { type: "draw" });
  const result = ended.hand.result!;
  result.scoreItems.forEach((items, team) => checkTotals(items, result.scores[team]));
  const rows = canastaScoreRows(result);
  expect(rows.find(row => row.label === "Unfinished sevens")!.values[0]).toBe(-2500);
  expect(rows.find(row => row.label === "Cards left with both partners")!.values[0]).toBe(-result.scores[0].inHand);
  for (const team of [0, 1]) expect(rows.reduce((sum, row) => sum + (row.values[team] ?? 0), 0)).toBe(result.scores[team].total);
  const saved = saveCanastaSession(transitionCanastaSession(createCanastaSession(3), { type: "draw" }), "2026-11-17T12:00:00Z");
  expect(restoreCanastaSession(normalizeCanastaSave(saved)!)).toEqual(transitionCanastaSession(createCanastaSession(3), { type: "draw" }));
  const special = position("0-4C 0-4D 0-5C 0-5D 0-6C 0-6D 0-8C 0-8D 0-9C 0-9D 0-QC 0-QD 0-KC 0-KD");
  special.hand.sides[0].opened = false;
  const declared = transitionCanastaSession(special, { type: "special" }).hand.result!;
  expect(declared.scoreItems[0]).toEqual([{ category: "bonuses", reason: "special_hand", name: "Pairs", points: 2500 }]);
  declared.scoreItems.forEach((items, team) => checkTotals(items, declared.scores[team]));
  expect(canastaScoreRows(declared).find(row => row.label === "Pairs (special hand)")!.values).toEqual([2500, null]);
});

test("meld previews use the scoring penalty and do not block a risky legal move", () => {
  for (const [rank, ids, penalty] of [
    ["7", "0-7C 0-7D 0-7H", 2500], ["A", "0-AC 0-AD 0-AH", 2500],
    ["Wild", "0-JR 0-JB 0-2C", 2000], ["Wild", "0-JR 0-JB 1-JR 1-JB", 2500]
  ] as const) {
    const session = position(`${ids} 0-4C 0-5C`), before = structuredClone(session);
    const action = { type: "meld" as const, groups: [{ rank, cardIds: cards(ids).map(card => card.id) }] };
    expect(canastaMeldPreview(canastaObservation(session), action)).toEqual({ error: "", risks: [{ rank, count: cards(ids).length, points: -penalty }] });
    const after = transitionCanastaSession(session, action);
    expect(canastaMeldPenalty(after.hand.sides[0].melds[0])).toBe(penalty);
    expect(session).toEqual(before);
  }
});

test("completed groups and mixed aces remove warnings, while invalid drafts remain invalid", () => {
  const session = position("0-AC 0-AD 0-AH 0-AS 1-AC 1-AD 1-AH 0-4C 0-5C");
  const action = { type: "meld" as const, groups: [{ rank: "A", cardIds: session.hand.hands[0].filter(card => card.rank === "A").map(card => card.id) }] };
  expect(canastaMeldPreview(canastaObservation(session), action)).toEqual({ error: "", risks: [] });
  const mixed = position("0-AC 0-AD 0-2C 0-4C 0-5C");
  mixed.hand.sides[0].melds = [{ rank: "A", cards: cards("0-AH 0-AS 0-2D") }];
  expect(canastaMeldPreview(canastaObservation(mixed), { type: "meld", groups: [{ rank: "A", cardIds: ["0-AC", "0-AD"] }] })).toEqual({ error: "", risks: [] });
  const invalid = canastaMeldPreview(canastaObservation(session), { type: "meld", groups: [{ rank: "A", cardIds: ["0-AC"] }] });
  expect(invalid.error).toContain("3 to 7"); expect(invalid.risks).toEqual([]);
});

test("pile pickup warns for its automatic meld, but unrelated old risks are not repeated", () => {
  const session = position("0-AC 0-AD 0-4C 0-5C", "draw"); session.hand.discards = cards("0-AH");
  session.hand.sides[0].melds = [{ rank: "7", cards: rankCards("7", 3) }];
  const action = { type: "pickup" as const, pair: ["0-AC", "0-AD"], groups: [] };
  const preview = canastaMeldPreview(canastaObservation(session), action);
  expect(preview).toEqual({ error: "", risks: [{ rank: "A", count: 3, points: -2500 }] });
  const changed = structuredClone(session); changed.hand.hands[2].reverse(); changed.hand.stock.reverse();
  changed.hand.talons[2] = cards("1-JR"); changed.initialSeed = 999;
  expect(canastaMeldPreview(canastaObservation(changed), action)).toEqual(preview);
});
