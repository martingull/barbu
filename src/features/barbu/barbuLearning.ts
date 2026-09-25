import { fullHandContracts } from "../../domain/contractRegistry";
import { generateBarbuPracticeSet } from "../../domain/barbuPractice";
import { drillStepFromGeneratedScenario } from "../../lessons/generatedDrill";
import { orderPracticePool, type DrillStep } from "../../lessons/drillDecision";
import type { PlayBarbuAttempt } from "../../lessons/drillReview";
import type { SaveStorage } from "../../persistence/saveStore";
import { guidedLessons } from "../../lessons/catalog";

export function isBarbuAttempt(attempt: PlayBarbuAttempt) {
  return attempt.results.length > 0 && attempt.results.every(result => fullHandContracts.some(contract => contract === result.contract));
}

export function exerciseContract(action: string) {
  return guidedLessons.find(lesson => lesson.id === action)?.contract
    ?? fullHandContracts.find(contract => contract === action) ?? "";
}

export function barbuExerciseTitle(action: string) {
  const contract = exerciseContract(action);
  return action === "mixed" ? "Mixed contract review" : action.startsWith("barbu-")
    ? `Fixed drill: ${contract}` : `Replay ${contract}`;
}

export function createBarbuPracticeLoader(storage: () => SaveStorage | undefined, usePracticeSeed: () => number) {
  const drillPatternMemoryStorageKey = "barbu.drillPatternMemory.v1";
  const maxStoredDrillPatterns = 6;
  let recentDrillScenarioIds = loadDrillPatternMemory();
  function loadDrillPatternMemory() {
    try {
      const storedMemory = JSON.parse(storage()?.getItem(drillPatternMemoryStorageKey) ?? "[]");

      return Array.isArray(storedMemory)
        ? storedMemory.filter((item): item is string => typeof item === "string").slice(0, maxStoredDrillPatterns)
        : [];
    } catch {
      return [];
    }
  }

  function rememberDrillScenarioPattern(scenarioId: string | undefined) {
    if (!scenarioId) {
      return;
    }

    recentDrillScenarioIds = [
      scenarioId,
      ...recentDrillScenarioIds.filter((recentScenarioId) => recentScenarioId !== scenarioId)
    ].slice(0, maxStoredDrillPatterns);

    try { storage()?.setItem(drillPatternMemoryStorageKey, JSON.stringify(recentDrillScenarioIds)); }
    catch { /* Keep pattern memory for this session when persistence is unavailable. */ }
  }

  function loadGeneratedDrillSessionSteps(focusContract = "") {
    const seed = usePracticeSeed();
    const candidates = generateBarbuPracticeSet(seed).scenarios
      .map(drillStepFromGeneratedScenario)
      .filter((step) => !focusContract || step.contract === focusContract);

    if (focusContract) {
      return orderPracticePool(candidates, seed);
    }

    const selectedSteps: DrillStep[] = [];

    for (const contract of fullHandContracts) {
      const contractCandidates = candidates.filter((step) => step.contract === contract);

      if (contractCandidates.length === 0) {
        continue;
      }

      const contractSeed = seed + selectedSteps.length * 13;
      selectedSteps.push(selectGeneratedDrillCandidate(contractCandidates, contractSeed, selectedSteps));
    }

    return selectedSteps.length > 0 ? selectedSteps : [selectGeneratedDrillCandidate(candidates, seed)];
  }

  function selectGeneratedDrillCandidate(candidates: DrillStep[], seed: number, sessionSteps: DrillStep[] = []) {
    const lastStep = sessionSteps[sessionSteps.length - 1];
    const activeScenarioIds = sessionSteps
      .slice(-maxStoredDrillPatterns)
      .map((step) => step.scenarioId)
      .filter((scenarioId): scenarioId is string => Boolean(scenarioId));
    const recentScenarioIds = new Set([...recentDrillScenarioIds, ...activeScenarioIds]);
    const freshCandidates =
      candidates.length > 1
        ? candidates.filter((step) => !step.scenarioId || !recentScenarioIds.has(step.scenarioId))
        : candidates;
    const nonRepeatingCandidates =
      candidates.length > 1 && lastStep?.scenarioId
        ? candidates.filter((step) => step.scenarioId !== lastStep.scenarioId)
        : candidates;
    const candidatePool =
      freshCandidates.length > 0
        ? freshCandidates
        : nonRepeatingCandidates.length > 0
          ? nonRepeatingCandidates
          : candidates;
    const selectedCandidate = candidatePool[generatedCandidateIndex(seed, candidatePool.length)];

    rememberDrillScenarioPattern(selectedCandidate.scenarioId);
    return selectedCandidate;
  }

  function generatedCandidateIndex(seed: number, candidateCount: number) {
    return (Math.imul(seed, 2654435761) + 1013904223 >>> 0) % candidateCount;
  }

  return {
    load(action: string, fromCourse = false) {
      if (fromCourse) return { seed: 0 };
      if (action === "domino") return { seed: usePracticeSeed() };
      const contract = exerciseContract(action);
      if (!contract && action !== "mixed") throw Error("Unknown Barbu exercise.");
      return loadGeneratedDrillSessionSteps(contract);
    }
  };
}
