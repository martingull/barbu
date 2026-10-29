import type { DrillResult } from "../lessons/drillDecision";
import type { PlayBarbuAttempt } from "../lessons/drillReview";
import type { LearningEvidence } from "../domain/learningEvidence";
import type { LearningCharacterId } from "../presentation/learningCharacters";
import type { DecisionReview } from "../lessons/decisionReview";

export type FeatureServices = {
  completedSteps: Record<string, boolean>;
  learningEvidence?: LearningEvidence;
  history: PlayBarbuAttempt[];
  nextSeed: () => number;
  onBack: () => void;
  onReference: () => void;
  onCompleteStep: (id: string, results?: DrillResult[]) => void;
  onResetSteps: (ids: string[]) => void;
  onExerciseComplete: (results: DrillResult[]) => void;
  onSurfaceChange: (fixed: boolean) => void;
};

export type CustomExerciseContext = {
  coach?: LearningCharacterId;
  action: string;
  seed: number;
  fromCourse: boolean;
  onBack: () => void;
  onComplete: (results?: DrillResult[], reviews?: DecisionReview[]) => void;
};

export type LearningEntry =
  | { kind: "continue" }
  | { kind: "step"; id: string }
  | { kind: "exercise"; action: string }
  | { kind: "introduction"; action: string; title: string };
