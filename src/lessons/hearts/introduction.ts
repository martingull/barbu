import { generateHeartsPracticeSet } from "../../domain/heartsPractice";
import { drillStepFromGeneratedScenario } from "../generatedDrill";

const decisions = [
  { id: "hearts-first-trick-follow-clubs", title: "Follow suit" },
  { id: "hearts-avoid-heart-duck", title: "Avoid a heart" },
  { id: "hearts-queen-safe-dump", title: "Move the queen" }
];

export function heartsIntroductionSteps(seed: number) {
  const pool = generateHeartsPracticeSet(seed).scenarios;
  // Keep the first experience ordered, regardless of the practice pool's seed rotation.
  return decisions.map(({ id, title }) => {
    const scenario = pool.find(item => item.id.startsWith(`${id}-`));
    if (!scenario) throw Error("The Hearts introduction could not be loaded.");
    return drillStepFromGeneratedScenario({ ...scenario, title });
  });
}
