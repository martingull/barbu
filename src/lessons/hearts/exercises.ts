import { generateHeartsPracticeSet, generateHeartsPracticeFollowUp, generateHeartsPassPractice, generateHeartsPassFollowUp, heartsPassPracticeCount, type HeartsPracticeFocus } from "../../domain/heartsPractice";
import type { HeartsPassScenario, GeneratedPracticeScenario } from "../../domain/types";
import type { DrillStep } from "../drillDecision";
import { drillStepFromGeneratedScenario } from "../generatedDrill";
import content from "../../../content/hearts-practice.json" with { type: "json" };
import { heartsPoints } from "../../domain/heartsRules";
import { formatCardLabel, formatCardList } from "../../presentation/cardDisplay";
import { scoreSeatLabel } from "../../presentation/scorePresentation";
import { teachingStages, type Teaching, type FeedbackBreakdown } from "../learningPresentation";

const topicTitles: Record<HeartsPracticeFocus, string> = {
  "first-trick": "Opening trick", "avoid-hearts": "Avoid hearts", "queen-danger": "Queen danger",
  "break-hearts": "Break hearts", "stop-moon": "Stop the moon", "score-hand": "Score a hand"
};

const supportedHints: Record<HeartsPracticeFocus, string> = {
  "first-trick": "Follow clubs if you can. If you cannot, keep points out of the first trick when possible. A low card can leave the lead elsewhere.",
  "avoid-hearts": "Follow suit first. If you are void, consider moving a heart to someone else's trick.",
  "queen-danger": "Check the led suit. If you cannot follow it, look for a chance to discard Q♠.",
  "break-hearts": "Hearts being broken allows a heart lead, but never removes the duty to follow suit.",
  "stop-moon": "Taking some points yourself can stop one player from collecting all 26.",
  "score-hand": "Each heart is 1 point, Q♠ is 13, and every other card is 0."
};
export type HeartsPassStep = HeartsPassScenario & { teaching?: Teaching; followUp?: HeartsPassStep };

export function heartsPassingSteps(seed: number): HeartsPassStep[] {
  return Array.from({ length: heartsPassPracticeCount }, (_, index) => {
    const step = generateHeartsPassPractice(seed + index);
    return { ...step, teaching: { stage: teachingStages[index], guidance: index === 0
      ? `Try ${formatCardList(step.recommendedPass)}. ${step.explanation}`
      : index === 1 ? "Look at what you keep: low cards can help you duck, and an empty suit may give you a discard later." : undefined },
      followUp: { ...generateHeartsPassFollowUp(seed + index), teaching: { stage: "reinforcement" } } };
  });
}

export function heartsPassBreakdown(step: HeartsPassScenario, selected: string[]): FeedbackBreakdown {
  const kept = step.playerHand.filter(card => !selected.includes(card.id));
  return { label: "Passing breakdown", rows: [
    { label: "Passing", value: formatCardList(step.playerHand.filter(card => selected.includes(card.id))) },
    { label: "Before receiving", value: (["S", "H", "D", "C"] as const).map((suit, index) => `${["♠", "♥", "♦", "♣"][index]} ${kept.filter(card => card.suit === suit).length}`).join(" · ") }
  ] };
}

function heartsScenarioStep(scenario: GeneratedPracticeScenario): DrillStep {
  return { ...drillStepFromGeneratedScenario(scenario), breakdownByCard: Object.fromEntries(scenario.outcomes.map(outcome => {
    const card = scenario.playerHand.find(card => card.id === outcome.cardId)!;
    const hearts = outcome.completedTrick?.filter(play => play.card.suit === "H").length ?? 0;
    const queen = outcome.completedTrick?.some(play => play.card.suit === "S" && play.card.rank === "Q");
    const rows = !outcome.isLegal ? [{ label: "Legal cards", value: formatCardList(scenario.playerHand.filter(card => scenario.legalCardIds.includes(card.id))) }]
      : outcome.completedTrick ? [
        { label: "Winner", value: outcome.winner && outcome.winner !== "Unknown" ? scoreSeatLabel(outcome.winner) : "Unknown" },
        { label: "Hearts", value: `${hearts} × 1 = ${hearts}` },
        { label: "Q♠", value: queen ? "13" : "0" },
        { label: "Trick points", value: String(outcome.penalty) }
      ] : [{ label: "Chosen card", value: formatCardLabel(card) }, { label: "Card points", value: String(heartsPoints(card)) }];
    return [card.id, { label: "Hearts decision breakdown", rows }];
  })) };
}

export function heartsPracticeSteps(seed: number, focus: HeartsPracticeFocus): DrillStep[] {
  const order = content.topics.find(topic => topic.topic === focus)!.scenarios.map(item => item.id);
  const steps = generateHeartsPracticeSet(seed, focus).scenarios
    .sort((a, b) => order.findIndex(id => a.id.startsWith(`${id}-`)) - order.findIndex(id => b.id.startsWith(`${id}-`)))
    .map((scenario, index): DrillStep => {
    const step = heartsScenarioStep(scenario);
    const followUp = heartsScenarioStep(generateHeartsPracticeFollowUp(step.scenarioId!, focus));
    if (focus === "score-hand") { step.choiceMode = "select"; followUp.choiceMode = "select"; }
    const example = scenario.outcomes.find(outcome => outcome.outcomeKind === "good")!;
    // Keep the header stable while the position-specific prompt changes below.
    return { ...step, title: topicTitles[focus], teaching: { stage: teachingStages[index], guidance: index === 0
      ? `Try ${formatCardLabel(scenario.playerHand.find(card => card.id === example.cardId)!)}. ${example.explanation}`
      : index === 1 ? supportedHints[focus] : undefined },
      followUp: { ...followUp, title: topicTitles[focus], teaching: { stage: "reinforcement" } } };
  });
  return steps;
}
