import { countCribbageHand, countCribbagePeg, cribbageValue, suggestCribbageDiscard, type CribbageScore } from "./cribbage";

export type CribbageQuestion =
  | { kind: "value"; hand: string[] }
  | { kind: "count"; hand: string[]; starter: string; crib: boolean }
  | { kind: "peg"; run: string[]; card: string; last?: boolean }
  | { kind: "discard"; hand: string[]; ownCrib: boolean };
export function cribbageQuestionAnswer(question: CribbageQuestion): string {
  switch (question.kind) {
    case "value": return String(cribbageValue(question.hand[0]));
    case "count": return String(countCribbageHand(question.hand, question.starter, question.crib).total);
    case "peg": {
      const score = countCribbagePeg(question.run, question.card);
      return String(score.points + (question.last && score.total !== 31 ? 1 : 0));
    }
    case "discard": {
      return suggestCribbageDiscard(question.hand, question.ownCrib).sort().join(",");
    }
  }
}
export function cribbageQuestionCount(question: CribbageQuestion): CribbageScore | null {
  return question.kind === "count" ? countCribbageHand(question.hand, question.starter, question.crib) : null;
}
export function cribbageQuestionChoices(question: CribbageQuestion): string[] {
  const answer = cribbageQuestionAnswer(question);
  if (question.kind === "discard") {
    const pairs = [answer, question.hand.slice(0, 2).sort().join(","), question.hand.slice(-2).sort().join(","), question.hand.slice(1, 3).sort().join(",")];
    return [...new Set(pairs)].slice(0, 3).sort();
  }
  return [...new Set([Math.max(0, Number(answer) - 2), Number(answer), Number(answer) + 2, Number(answer) + 1])].slice(0, 3).map(String);
}
