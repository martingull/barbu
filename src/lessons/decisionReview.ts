import type { Card, Seat } from "../domain/types";
import { drillDecision, type DrillStep } from "./drillDecision";
import { scoreSeatLabel } from "../presentation/scorePresentation";
import type { FeedbackBreakdown } from "./learningPresentation";

// These visible-position snapshots live only for the current lesson, not in saves.
export type DecisionReview = {
  title: string;
  prompt: string;
  explanation: string;
  context?: string;
  breakdown?: FeedbackBreakdown;
  selectedCardIds?: string[];
  groups: { label: string; cards: Card[]; captions?: Record<string, string> }[];
};

export function drillDecisionReview(step: DrillStep, card: Card, seatLabels: Partial<Record<Seat, string>> = {}): DecisionReview {
  const table = step.trick.tableBeforeChoice;
  const layout = step.contract === "Domino";
  return {
    title: step.trick.title,
    prompt: step.trick.beforeResult,
    explanation: drillDecision(step, card).feedback,
    breakdown: step.breakdownByCard?.[card.id],
    selectedCardIds: [card.id],
    groups: [
      ...(table.length ? [{ label: layout ? "Layout before your choice" : "Table before your choice", cards: table.map(play => play.card),
        captions: layout ? undefined : Object.fromEntries(table.map((play, index) =>
          [play.card.id, `${seatLabels[play.seat] ?? scoreSeatLabel(play.seat)}${index === 0 ? " (led)" : ""}`])) }] : []),
      ...(step.referenceHand ? [{ ...step.referenceHand,
        cards: step.referenceHand.cards.filter(card => !table.some(play => play.card.id === card.id)) }] : []),
      ...(step.choiceMode === "identify" ? [] : [{ label: step.handLabel ?? "Your hand before your choice", cards: step.trick.hand }])
    ]
  };
}
