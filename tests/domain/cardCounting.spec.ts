import { expect, test } from "@playwright/test";
import { startMemoryHand, transitionMemoryHand, memoryHandQuestion, memoryHandDefinitions,
  startCountRound, transitionCountRound } from "../../src/domain/cardCountingSession";
import { buildTrumpCountRound, buildTrumpMemoryQuestion, buildCourtMemoryQuestion, buildDangerMemoryQuestion,
  buildWhistMemoryQuestion, type MemoryExercise } from "../../src/domain/cardCountingQuestions";
import { typescriptHandEngine } from "../../src/domain/handEngine";
import { memoryReviewCards } from "../../src/features/card-counting/countingPresentation";
import type { TableCard } from "../../src/domain/types";

test("counting questions use only played cards and preserve their existing seed choices", () => {
  const tricks: TableCard[][] = [[
    { seat: "Tutor", card: { id: "2H", rank: "2", suit: "H", label: "2H" } },
    { seat: "Right", card: { id: "KH", rank: "K", suit: "H", label: "KH" } },
    { seat: "You", card: { id: "QH", rank: "Q", suit: "H", label: "QH" } },
    { seat: "Left", card: { id: "QC", rank: "Q", suit: "C", label: "QC" } }
  ]];
  expect(buildTrumpMemoryQuestion(tricks, 2)).toMatchObject({ kind: "count", answer: 3 });
  expect(buildCourtMemoryQuestion(tricks, 2)).toMatchObject({ kind: "count", answer: 3 });
  expect(buildDangerMemoryQuestion(tricks, 2)).toMatchObject({ kind: "count", answer: 2 });
  expect(buildWhistMemoryQuestion(tricks, "H", 2)).toMatchObject({ kind: "void_spotter", answer: "Left", targetSuit: "H" });
  for (let seed = 1; seed < 32; seed++) {
    for (const question of [buildTrumpMemoryQuestion(tricks, seed), buildCourtMemoryQuestion(tricks, seed),
      buildDangerMemoryQuestion(tricks, seed), buildWhistMemoryQuestion(tricks, "H", seed)]) {
      if ("options" in question) {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options).size).toBe(4);
        expect(question.options).toContain(question.answer);
      } else if ("targetCard" in question && question.kind !== "boss_card") {
        expect(question.answer).toBe(tricks.flat().some(play => play.card.id === question.targetCard.id));
      }
    }
  }
});

for (const exercise of Object.keys(memoryHandDefinitions) as MemoryExercise[]) {
  test(`${exercise} uses the real hand engine, gates checkpoints, settles once and replays the same deal`, () => {
    for (const seed of [1, 3, 17, 51]) {
      let session = startMemoryHand(exercise, seed);
      const initial = structuredClone(session);
      expect(session.fullHand).toEqual(typescriptHandEngine(memoryHandDefinitions[exercise].contract)!.start({ seed }));
      expect(transitionMemoryHand(session, { type: "check" })).toBe(session);
      const checkpoints: number[] = [];
      for (let trick = 1; trick <= 13; trick++) {
        const previous = structuredClone(session);
        const id = session.fullHand.legalCardIds[0];
        const expected = typescriptHandEngine(session.fullHand.contract)!.transition(session.fullHand, { type: "play-card", cardId: id });
        const next = transitionMemoryHand(session, { type: "play-card", cardId: id });
        expect(session).toEqual(previous);
        session = next;
        expect(session.fullHand).toEqual(expected);
        const question = memoryHandQuestion(session);
        if (question) {
          checkpoints.push(trick);
          expect(transitionMemoryHand(session, { type: "next" })).toBe(session);
          expect(transitionMemoryHand(session, { type: "answer", answer: "You" })).toBe(session);
          expect(transitionMemoryHand(session, { type: "play-card", cardId: session.fullHand.legalCardIds[0] })).toBe(session);
          session = transitionMemoryHand(session, { type: "answer", answer: question.answer });
          session = transitionMemoryHand(session, { type: "check" });
          expect(transitionMemoryHand(session, { type: "check" })).toBe(session);
          expect(transitionMemoryHand(session, { type: "answer", answer: false })).toBe(session);
        }
        session = transitionMemoryHand(session, { type: "next" });
      }
      expect(checkpoints).toEqual(memoryHandDefinitions[exercise].checkpoints);
      expect(session.fullHand.status).toBe("complete");
      expect(session.attempts).toBe(3);
      expect(session.clean).toBe(3);
      expect(memoryReviewCards(session)).toHaveLength(exercise === "danger-count" ? 4 : exercise === "high-card-memory" ? 12 : 13);
      expect(transitionMemoryHand(session, { type: "next" })).toBe(session);
      expect(transitionMemoryHand(session, { type: "replay" })).toEqual(initial);
    }
  });
}

test("warm-up reveals thirteen groups, hides them at three checkpoints and resets scores on replay", () => {
  for (const seed of [1, 2, 19, 151]) {
    let session = startCountRound(seed);
    const initial = structuredClone(session);
    expect(new Set(session.round.tricks.flat().map(play => play.card.id)).size).toBe(52);
    expect(session.round).toEqual(buildTrumpCountRound(seed));
    expect(transitionCountRound(session, { type: "check" })).toBe(session);
    for (let trick = 0; trick < 13; trick++) {
      expect(session.trick).toBe(trick);
      expect(session.stage).toBe("reveal");
      const before = structuredClone(session);
      const next = transitionCountRound(session, { type: "next" });
      expect(session).toEqual(before);
      session = next;
      if (session.stage === "answer") {
        expect([3, 7, 12]).toContain(trick);
        expect(transitionCountRound(session, { type: "next" })).toBe(session);
        const question = session.round.questions[session.question];
        const cards = session.round.tricks.slice(question.startTrick, question.endTrick + 1).flat().map(play => play.card);
        expect(question.answer).toBe(question.kind === "count" ? cards.filter(card => card.suit === "H").length : cards.some(card => card.id === question.targetCard.id));
        session = transitionCountRound(session, { type: "answer", answer: question.answer });
        session = transitionCountRound(session, { type: "check" });
        expect(transitionCountRound(session, { type: "check" })).toBe(session);
        session = transitionCountRound(session, { type: "next" });
      }
    }
    expect(session).toMatchObject({ stage: "complete", attempts: 3, clean: 3 });
    expect(transitionCountRound(session, { type: "replay" })).toEqual(initial);
  }
});
