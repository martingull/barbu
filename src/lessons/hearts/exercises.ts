import { generateHeartsPracticeSet, generateHeartsPracticeFollowUp, generateHeartsPassPractice, generateHeartsPassFollowUp, heartsPassPracticeCount, type HeartsPracticeFocus } from "../../domain/heartsPractice";
import type { HeartsPassScenario } from "../../domain/types";
import { orderPracticePool, type DrillStep } from "../drillDecision";
import { drillStepFromGeneratedScenario } from "../generatedDrill";

const topicTitles: Record<HeartsPracticeFocus, string> = {
  "first-trick": "Opening trick", "avoid-hearts": "Avoid hearts", "queen-danger": "Queen danger",
  "break-hearts": "Break hearts", "stop-moon": "Stop the moon", "score-hand": "Score a hand"
};

export type HeartsPassStep = HeartsPassScenario & { followUp?: HeartsPassStep };

export function heartsPassingSteps(seed: number): HeartsPassStep[] {
  return Array.from({ length: heartsPassPracticeCount }, (_, index) => ({
    ...generateHeartsPassPractice(seed + index), followUp: generateHeartsPassFollowUp(seed + index)
  }));
}

export function heartsPracticeSteps(seed: number, focus: HeartsPracticeFocus): DrillStep[] {
  const steps = generateHeartsPracticeSet(seed, focus).scenarios.map(scenario => {
    const step = drillStepFromGeneratedScenario(scenario);
    const followUp = drillStepFromGeneratedScenario(generateHeartsPracticeFollowUp(step.scenarioId!, focus));
    if (focus === "score-hand") followUp.choiceMode = "select";
    // Keep the header stable while the position-specific prompt changes below.
    return { ...step, title: topicTitles[focus], followUp: { ...followUp, title: topicTitles[focus] } };
  });
  return focus === "break-hearts" ? steps : orderPracticePool(steps, seed);
}
