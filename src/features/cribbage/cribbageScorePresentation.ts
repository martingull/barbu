import type { CribbageScore } from "../../domain/cribbage";
import type { FeedbackBreakdown } from "../../lessons/learningPresentation";

export type CribbageScoreRow = { label: string; calculation: string; points: number };
export function cribbageScoreRows(count: CribbageScore): CribbageScoreRow[] {
  const rows: CribbageScoreRow[] = [];
  if (count.fifteens) rows.push({ label: "Fifteens", calculation: `${count.fifteens / 2} × 2`, points: count.fifteens });
  if (count.pairs) rows.push({ label: "Pairs", calculation: `${count.pairs / 2} × 2`, points: count.pairs });
  if (count.runs) {
    // A five-card show has one 3/4/5-card run, or repeated 3-card runs / two 4-card runs.
    const length = count.runs <= 5 ? count.runs : count.runs === 8 ? 4 : 3;
    rows.push({ label: `Runs of ${length}`, calculation: `${count.runs / length} × ${length}`, points: count.runs });
  }
  if (count.flush) rows.push({ label: "Same-suit flush", calculation: `${count.flush} cards`, points: count.flush });
  if (count.nobs) rows.push({ label: "Nobs", calculation: "Jack matches starter suit", points: count.nobs });
  return rows;
}
export function cribbageCountBreakdown(count: CribbageScore): FeedbackBreakdown {
  return { label: "Cribbage scoring breakdown", rows: [
    ...cribbageScoreRows(count).map(row => ({ label: row.label, value: `${row.calculation} = ${row.points}` })),
    { label: "Total", value: `${count.total} points` }
  ] };
}
