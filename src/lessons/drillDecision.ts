import type { Card, GuidedCardOutcome, GuidedTrick, PracticeReason } from "../lessonTypes";
import { formatCardLabel } from "../cardDisplay";

export type DrillStep = { scenarioId?: string; contract: string; title: string; trick: GuidedTrick };
export type DrillResult = { contract: string; cardLabel: string; outcome: GuidedCardOutcome | "illegal"; reason: PracticeReason; clean: boolean };
export const drillOutcomeLabels = { good: "Good", risky: "Risky", penalty: "Penalty", illegal: "Illegal" } as const;

export function drillDecision(step: DrillStep, card: Card) {
  const legal = step.trick.legalCardIds.includes(card.id);
  const outcome = legal ? step.trick.cardOutcomes?.[card.id] ?? "good" : "illegal";
  const reason = !legal ? "off_suit" : step.trick.cardReasons?.[card.id]
    ?? (outcome === "penalty" ? "captured_penalty" : outcome === "risky" ? "won_clean_trick" : "followed_suit");
  const result: DrillResult = { contract: step.contract, cardLabel: card.label, outcome, reason, clean: outcome === "good" };
  return { result, feedback: step.trick.playedExplanations[card.id]
    ?? (legal ? "That legal play completes the trick." : `${formatCardLabel(card)} is not legal while you still have a legal card.`) };
}

export function orderPracticePool(steps: DrillStep[], seed: number) {
  if (steps.length <= 1) return steps;
  const offset = seed % steps.length;
  return [...steps.slice(offset), ...steps.slice(0, offset)];
}
