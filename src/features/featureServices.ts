import type { DrillResult } from "../lessons/drillDecision";
import type { PlayBarbuAttempt } from "../lessons/drillReview";

export type FeatureServices = {
  completedSteps: Record<string, boolean>;
  history: PlayBarbuAttempt[];
  nextSeed: () => number;
  onBack: () => void;
  onReference: () => void;
  onCompleteStep: (id: string) => void;
  onExerciseComplete: (results: DrillResult[]) => void;
  onSurfaceChange: (fixed: boolean) => void;
};

export type CustomExerciseContext = {
  action: string;
  seed: number;
  fromCourse: boolean;
  courseComplete: boolean;
  onBack: () => void;
  onComplete: () => void;
};
