import type { GeneratedPracticeScenario, GuidedTrick, Seat } from "../lessonTypes";
import type { DrillStep } from "./drillDecision";

export function drillStepFromGeneratedScenario(scenario: GeneratedPracticeScenario): DrillStep {
  return {
    scenarioId: generatedScenarioPatternId(scenario.id),
    contract: scenario.contract,
    title: scenario.title,
    trick: guidedTrickFromGeneratedScenario(scenario)
  };
}


function generatedScenarioPatternId(id: string) {
  const lastHyphen = id.lastIndexOf("-");

  return lastHyphen > 0 ? id.slice(0, lastHyphen) : id;
}


function guidedTrickFromGeneratedScenario(scenario: GeneratedPracticeScenario): GuidedTrick {
  return {
    title: scenario.title,
    beforeResult: scenario.prompt,
    afterResult: "Generated drill complete. Check the explanation for the winner and penalty.",
    emptyExplanation: scenario.prompt,
    legalCardIds: scenario.legalCardIds,
    hand: scenario.playerHand,
    tableBeforeChoice: scenario.tableBeforeChoice,
    tableAfterChoice: scenario.tableAfterChoice,
    pendingBySeat: pendingSeatsForGeneratedScenario(scenario),
    playedExplanations: Object.fromEntries(
      scenario.outcomes.map((outcome) => [outcome.cardId, outcome.explanation])
    ),
    cardOutcomes: Object.fromEntries(
      scenario.outcomes.filter(outcome => outcome.outcomeKind !== "illegal")
        .map((outcome) => [outcome.cardId, outcome.outcomeKind as Exclude<typeof outcome.outcomeKind, "illegal">])
    ),
    cardReasons: Object.fromEntries(
      scenario.outcomes.map((outcome) => [outcome.cardId, outcome.reason])
    )
  };
}


function pendingSeatsForGeneratedScenario(scenario: GeneratedPracticeScenario) {
  const pendingBySeat: Partial<Record<Seat, string>> = { You: "You" };

  for (const play of scenario.tableAfterChoice) {
    pendingBySeat[play.seat] = play.card.label;
  }

  return pendingBySeat;
}
