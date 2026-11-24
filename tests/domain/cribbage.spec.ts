import { expect, test } from "@playwright/test";
import { get } from "svelte/store";
import { advanceCribbageOpponent, createCribbageSession, transitionCribbageSession, cribbageComplete, cribbageScores,
  cribbageLegalCards, cribbageSuggestion, countCribbageHand, countCribbagePeg, cribbageValue, cribbageCards, cribbageDealer, type CribbageSession } from "../../src/domain/cribbage";
import { compareCribbageCardsForDisplay } from "../../src/presentation/cardOrdering";
import { normalizeCribbageSave, restoreCribbageSession, saveCribbageSession, cribbageSaveKey } from "../../src/persistence/cribbageSave";
import { createCribbageFeature } from "../../src/features/cribbage/cribbageFeature";
import { cribbageLearningSteps, cribbageQuestionAnswer, cribbageQuestionChoices, cribbageExplanation, cribbagePegArithmetic, cribbageAnswerLabel } from "../../src/lessons/cribbage/exercises";
import { cribbageCourses } from "../../src/lessons/cribbage/courses";
import { cribbageScoreRows, cribbageCountBreakdown } from "../../src/features/cribbage/cribbageScorePresentation";
import { cribbagePointsSheet } from "../../src/lessons/cribbage/scoring";
import { cribbageTopics } from "../../src/games/cribbage";
import { gameAccess, hasReleasedGameAccess } from "../../src/games/accessPolicy";

const stamp = "2026-11-24T12:00:00.000Z";
function step(session: CribbageSession): CribbageSession {
  if (session.review) return advanceCribbageOpponent(transitionCribbageSession(session, { type: "continue" }));
  const suggested = cribbageSuggestion(session);
  return advanceCribbageOpponent(transitionCribbageSession(session, session.game.phase === "crib"
    ? { type: "discard", cards: [suggested[0], suggested[1]] } : { type: "play", card: suggested[0] }));
}
test("Cribbage values, 29 hand, multiple runs, flushes and nobs use the common counter", () => {
  expect(["AC", "7H", "10S", "JD", "QC", "KH"].map(cribbageValue)).toEqual([1, 7, 10, 10, 10, 10]);
  expect(countCribbageHand(["5H", "5D", "5C", "JS"], "5S")).toEqual({ fifteens: 16, pairs: 12, runs: 0, flush: 0, nobs: 1, total: 29 });
  expect(countCribbageHand(["3H", "3D", "4C", "5S"], "9H").runs).toBe(6);
  expect(countCribbageHand(["2H", "4H", "7H", "9H"], "KS").flush).toBe(4);
  expect(countCribbageHand(["2H", "4H", "7H", "9H"], "KS", true).flush).toBe(0);
  expect(countCribbageHand(["2H", "4H", "7H", "9H"], "KH", true).flush).toBe(5);
  expect(() => countCribbageHand(["5C", "5C", "5H", "JS"], "5S")).toThrow();
});
test("pegging counts rank pairs and unordered consecutive runs without crossing 31", () => {
  expect(countCribbagePeg(["5C", "5D"], "5H")).toMatchObject({ total: 15, points: 8 });
  expect(countCribbagePeg(["4C", "2D"], "3H").points).toBe(3);
  expect(countCribbagePeg(["4C", "2D", "3H"], "4S").points).toBe(3);
  expect(countCribbagePeg(["4C", "2D", "3H", "4S"], "3C").points).toBe(0);
  expect(countCribbagePeg(["KC", "QD"], "10H").points).toBe(0);
  expect(countCribbagePeg(["KC", "QD", "10H"], "AS")).toMatchObject({ total: 31, points: 2 });
  expect(() => countCribbagePeg(["KC", "QD", "10H"], "2S")).toThrow();
});
test("Cribbage hands sort ace low by rank, while go awards once and gives the other player the next lead", () => {
  expect(cribbageCards(["KH", "AC", "2D", "2S", "10C"]).sort(compareCribbageCardsForDisplay).map(card => card.id)).toEqual(["AC", "2S", "2D", "10C", "KH"]);
  let session = createCribbageSession(0);
  session = { ...session, game: { ...session.game, phase: "pegging", toPlay: 0, count: 26,
    hands: [["2H", "2D"], ["8S", "KS"]], run: [{ seat: 1, card: "KC" }, { seat: 0, card: "8C" }, { seat: 1, card: "8D" }] } };
  session = transitionCribbageSession(session, { type: "play", card: "2H" });
  expect(session.game.toPlay).toBe(0);
  expect(session.game.count).toBe(28);
  expect(session.messages.at(-1)).toContain("cannot play: go");
  session = transitionCribbageSession(session, { type: "play", card: "2D" });
  expect(session.game.scores).toEqual([3, 0]);
  expect(session.game.toPlay).toBe(1);
  expect(session.game.count).toBe(0);
  expect(session.game.run).toEqual([]);
  expect(session.game.peg?.why).toEqual(["a pair", "go"]);
});
test("seeded deals are immutable, private discards stay hidden and illegal moves fail", () => {
  const initial = advanceCribbageOpponent(createCribbageSession(42)), before = structuredClone(initial);
  expect(initial.game.hands[initial.player]).toHaveLength(6);
  expect(initial.game.starter).toBeNull();
  expect(initial.game.toPlay).toBe(initial.player);
  expect(() => transitionCribbageSession(initial, { type: "continue" })).toThrow();
  expect(() => transitionCribbageSession(initial, { type: "discard", cards: [initial.game.hands[initial.player][0], initial.game.hands[initial.player][0]] })).toThrow();
  const after = step(initial);
  expect(initial).toEqual(before);
  expect(after.game.starter).not.toBeNull();
  expect(after.game.kept.every(hand => hand.length === 4)).toBe(true);
  for (const seed of [-1, NaN, 1.5, Infinity, 0x100000000]) expect(() => createCribbageSession(seed)).toThrow();
});
test("full games stop at 121, pause for ordered counts and survive replay at every phase", () => {
  for (let seed = 0; seed < 12; seed++) {
    let session = advanceCribbageOpponent(createCribbageSession(seed));
    let actions = 0, reviewed = false;
    while (!cribbageComplete(session)) {
      expect(actions++).toBeLessThan(500);
      const before = session;
      session = step(session);
      expect(session.game.count).toBeLessThanOrEqual(31);
      expect(session.review || session.game.phase === "over" || session.game.toPlay === session.player).toBeTruthy();
      if (session.review) {
        reviewed = true;
        expect(session.review.rows.map(row => row.label)).toEqual(["Non-dealer hand", "Dealer hand", "Dealer crib"].slice(0, session.review.rows.length));
        const final = session.review.rows.at(-1)!;
        expect(final.scores).toEqual(session.game.scores);
        expect(cribbageScores(session)).toEqual([session.review.rows[session.review.index].scores[session.player], session.review.rows[session.review.index].scores[1 - session.player]]);
        expect(() => transitionCribbageSession(session, { type: "play", card: "AC" })).toThrow();
      }
      if (seed === 0) expect(restoreCribbageSession(saveCribbageSession(session, stamp))).toEqual(session);
      expect(before.events.length).toBeLessThan(session.events.length);
    }
    expect(reviewed).toBe(true);
    expect(session.game.scores.filter(score => score >= 121)).toHaveLength(1);
    expect(() => transitionCribbageSession(session, { type: "play", card: "AC" })).toThrow();
    expect(normalizeCribbageSave(saveCribbageSession(session, stamp))?.scores).toEqual(cribbageScores(session));
  }
});
test("instant wins at heels, pegging and first hand count skip later scores", () => {
  let session = advanceCribbageOpponent(createCribbageSession(0));
  session = { ...session, game: { ...session.game, scores: [119, 0], cut: "JS" } };
  const winner = step(session);
  expect(winner.game.phase).toBe("over");
  expect(winner.game.scores).toEqual([121, 0]);
  expect(winner.review).toBeNull();
  let pegging = step(advanceCribbageOpponent(createCribbageSession(3)));
  pegging = { ...pegging, game: { ...pegging.game, phase: "pegging", toPlay: pegging.player, scores: pegging.player === 0 ? [120, 0] : [0, 120],
    hands: pegging.player === 0 ? [["5H"], ["KC"]] : [["KC"], ["5H"]], count: 10, run: [{ seat: 1 - pegging.player, card: "10C" }] } };
  const won = transitionCribbageSession(pegging, { type: "play", card: "5H" });
  expect(cribbageComplete(won)).toBe(true);
  expect(won.game.scores[pegging.player]).toBe(122);
  let checkedCounting = false;
  for (let seed = 0; seed < 20 && !checkedCounting; seed++) {
    let final = createCribbageSession(seed);
    while (final.game.phase === "crib" || final.game.hands.flat().length > 1) {
      const suggested = cribbageSuggestion({ ...final, player: final.game.toPlay! });
      final = transitionCribbageSession(final, final.game.phase === "crib"
        ? { type: "discard", cards: [suggested[0], suggested[1]] } : { type: "play", card: suggested[0] });
    }
    const dealer = cribbageDealer(final), pone = 1 - dealer;
    if (final.game.toPlay !== dealer || countCribbageHand(final.game.kept[pone], final.game.starter!).total === 0) continue;
    final = { ...final, game: { ...final.game, scores: pone === 0 ? [120, 0] : [0, 120] } };
    const card = cribbageSuggestion({ ...final, player: dealer })[0];
    final = transitionCribbageSession(final, { type: "play", card });
    expect(final.game.phase).toBe("over");
    expect(final.review?.rows).toHaveLength(1);
    expect(final.review!.rows[0].label).toBe("Non-dealer hand");
    expect(final.game.scores[dealer]).toBeLessThanOrEqual(13);
    expect(cribbageComplete(transitionCribbageSession(final, { type: "continue" }))).toBe(true);
    checkedCounting = true;
  }
  expect(checkedCounting).toBe(true);
});
test("opponent and coach recommendations do not read the concealed hand, starter or seed", () => {
  const before = advanceCribbageOpponent(createCribbageSession(1));
  const changed = { ...before, game: { ...before.game, seed: 999, cut: "JS",
    hands: before.game.hands.map((hand, seat) => seat === before.player ? hand : ["AH", "2H", "3H", "4H", "5H", "6H"]) } };
  expect(cribbageSuggestion(changed)).toEqual(cribbageSuggestion(before));
  const a = advanceCribbageOpponent({ ...before, player: 1 - before.player });
  const b = advanceCribbageOpponent({ ...changed, player: 1 - before.player });
  expect(a.events[before.events.length]).toEqual(b.events[before.events.length]);
});
test("save validation rejects malformed actions and recomputes cached values", () => {
  const saved = saveCribbageSession(step(advanceCribbageOpponent(createCribbageSession(4))), stamp);
  expect(normalizeCribbageSave({ ...saved, scores: [999, 999], handNumber: 900 })).toEqual(saved);
  for (const changed of [{ seed: -1 }, { savedAt: "invalid" }, { events: [{ type: "play", card: "joker" }] }, { events: [{ type: "continue" }] }, { events: [{ type: "discard", cards: ["AC", "AC"] }] }]) {
    expect(normalizeCribbageSave({ ...saved, ...changed })).toBeNull();
  }
});
test("six topics provide three decisions plus bounded distinct reinforcement with engine-derived answers", () => {
  expect(cribbageTopics).toHaveLength(6);
  for (const topic of cribbageTopics) {
    const steps = cribbageLearningSteps(topic.action);
    expect(steps).toHaveLength(3);
    expect(steps.map(step => step.teaching.stage)).toEqual(["worked", "supported", "independent"]);
    expect(new Set([...steps, ...steps.map(step => step.followUp!)].map(step => JSON.stringify(step.question))).size).toBe(6);
    for (const step of [...steps, ...steps.map(step => step.followUp!)]) {
      expect(cribbageQuestionChoices(step.question)).toContain(cribbageQuestionAnswer(step.question));
      expect(cribbageExplanation(step.question).length).toBeGreaterThan(50);
      expect(step.followUp?.followUp).toBeUndefined();
    }
  }
  expect(gameAccess("cribbage")).toBe("Premium");
  expect(hasReleasedGameAccess("cribbage")).toBe(false);
});
test("pegging lessons separate card-value addition from combinations and points earned", () => {
  const [fifteen, pair, run] = cribbageLearningSteps("pegging");
  expect(cribbagePegArithmetic(fifteen.question)?.rows).toEqual([
    { label: "Already played", value: "10" }, { label: "Add your card", value: "10 + 5 = 15" }
  ]);
  expect(fifteen.teaching.guidance).toContain("Pegging means earning points");
  expect(cribbageExplanation(fifteen.question)).toContain("exactly 15, which earns 2 points");
  expect(cribbageExplanation(fifteen.question)).not.toContain("consecutive ranks");
  expect(cribbagePegArithmetic(pair.question)?.rows[1].value).toBe("7 + 7 = 14");
  expect(cribbageExplanation(pair.question)).toContain("both 7: a pair earns 2 points");
  expect(cribbagePegArithmetic(run.question)?.rows).toEqual([
    { label: "Already played", value: "4 + 2 = 6" }, { label: "Add your card", value: "6 + 3 = 9" }
  ]);
  expect(cribbageExplanation(run.question)).toContain("4 + 2 + 3 = 9");
  expect(cribbageExplanation(run.question)).toContain("a run of 3");
  expect(cribbageAnswerLabel(cribbageQuestionAnswer(run.question), run.question)).toBe("3 points");
  const queen = { kind: "peg" as const, run: ["QH"], card: "5C" };
  expect(cribbagePegArithmetic(queen)?.rows[1].value).toBe("10 + 5 = 15");
  expect(cribbageExplanation(queen)).toContain("You earn 2 points");
  expect(cribbagePegArithmetic({ kind: "value", hand: ["AC"] })).toBeUndefined();
  const concept = cribbageCourses.find(course => course.pathStepId === "cribbage-pegging")!;
  expect(concept.concept.heading).toBe("The count is not your score");
  expect(concept.example.sequence[2].text).toContain("does not restart when you score");
});
test("the points sheet and counted-hand rows explain the same engine scores without adding heels twice", () => {
  const maximum = countCribbageHand(["5H", "5D", "5C", "JS"], "5S");
  expect(cribbageScoreRows(maximum)).toEqual([
    { label: "Fifteens", calculation: "8 × 2", points: 16 },
    { label: "Pairs", calculation: "6 × 2", points: 12 },
    { label: "Nobs", calculation: "Jack matches starter suit", points: 1 }
  ]);
  const doubleRun = countCribbageHand(["5C", "5D", "6H", "7S"], "8C");
  expect(cribbageScoreRows(doubleRun)).toContainEqual({ label: "Runs of 4", calculation: "2 × 4", points: 8 });
  const tripleRun = countCribbageHand(["3C", "3D", "3H", "4S"], "5C");
  expect(cribbageScoreRows(tripleRun)).toContainEqual({ label: "Runs of 3", calculation: "3 × 3", points: 9 });
  const quadRun = countCribbageHand(["3C", "3D", "4H", "4S"], "5C");
  expect(cribbageScoreRows(quadRun)).toContainEqual({ label: "Runs of 3", calculation: "4 × 3", points: 12 });
  for (const count of [maximum, doubleRun, tripleRun, quadRun, countCribbageHand(["2H", "4H", "7H", "9H"], "KS", true)]) {
    expect(cribbageScoreRows(count).reduce((sum, row) => sum + row.points, 0)).toBe(count.total);
    expect(cribbageCountBreakdown(count).rows.at(-1)).toEqual({ label: "Total", value: `${count.total} points` });
  }
  const pegging = cribbagePointsSheet.sections[0].rows;
  expect(pegging.find(row => row.label === "Make exactly 15")?.points).toBe(String(countCribbagePeg(["10C"], "5H").points));
  expect(pegging.find(row => row.label === "Three equal ranks in a row")?.points).toBe(String(countCribbagePeg(["3C", "3D"], "3H").points));
  expect(cribbagePointsSheet.sections[2].note).toContain("not again in the hand total");
});
test("match feature saves/resumes selection and unsaved guided state never changes match storage", async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const feature = createCribbageFeature({ storage: () => storage, nextSeed: () => 2 });
  await feature.start();
  const hand = get(feature).session!.game.hands[get(feature).session!.player];
  feature.select(hand[0]); feature.select(hand[1]); feature.select(hand[2]);
  expect(get(feature.discards)).toEqual(hand.slice(0, 2));
  feature.select(hand[0]); expect(get(feature.discards)).toEqual([hand[1]]);
  feature.act({ type: "discard", cards: [hand[0], hand[1]] });
  expect(get(feature.discards)).toEqual([]);
  expect(cribbageLegalCards(get(feature).session!).length).toBeGreaterThan(0);
  const resumed = createCribbageFeature({ storage: () => storage, nextSeed: () => 3 });
  resumed.resume(); expect(get(resumed).session).toEqual(get(feature).session);
  const saved = values.get(cribbageSaveKey);
  const guided = createCribbageFeature({ storage: () => undefined, nextSeed: () => 2 });
  await guided.start();
  const recommendation = cribbageSuggestion(get(guided).session!);
  guided.act({ type: "discard", cards: [recommendation[0], recommendation[1]] });
  expect(values.get(cribbageSaveKey)).toBe(saved);
});
