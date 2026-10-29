import type { Card, GuidedCardOutcome, GuidedTrick, PracticeReason, Seat, TableCard } from "../domain/types";
import { formatCardLabel } from "../presentation/cardDisplay";
import type { Teaching, FeedbackBreakdown } from "./learningPresentation";

export type DrillStep = { scenarioId?: string; contract: string; title: string; trick: GuidedTrick;
  teaching?: Teaching; breakdownByCard?: Record<string, FeedbackBreakdown>;
  choiceMode?: "identify" | "select"; followUp?: DrillStep;
  playingSeat?: Seat; handLabel?: string; referenceHand?: { label: string; cards: Card[] };
  tableAfterByCard?: Partial<Record<string, TableCard[]>> };
export type DrillResult = { contract: string; cardLabel: string; outcome: GuidedCardOutcome | "illegal";
  reason: PracticeReason | "meld_count" | "contract_target" | "bid_selection" | "pass_selection" | "trick_winner"; clean: boolean };
export const drillOutcomeLabels = { good: "Good", risky: "Risky", penalty: "Penalty", illegal: "Illegal" } as const;

export function drillTableCards(step: DrillStep, checked?: Card): TableCard[] {
  const trick = step.trick;
  if (step.choiceMode || !checked || !trick.legalCardIds.includes(checked.id)) return trick.tableBeforeChoice;
  return [...trick.tableBeforeChoice, { seat: step.playingSeat ?? "You", card: checked },
    ...(step.tableAfterByCard?.[checked.id] ?? trick.tableAfterChoice)];
}

export function drillDecision(step: DrillStep, card: Card) {
  const legal = step.trick.legalCardIds.includes(card.id);
  const outcome = legal ? step.trick.cardOutcomes?.[card.id] ?? "good" : "illegal";
  const reason = step.choiceMode === "identify" ? "trick_winner" : !legal ? "off_suit" : step.trick.cardReasons?.[card.id]
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
