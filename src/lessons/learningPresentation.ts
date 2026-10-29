export type TeachingStage = "worked" | "supported" | "independent" | "reinforcement";
export type Teaching = { stage: TeachingStage; guidance?: string };
export const teachingStages = ["worked", "supported", "independent"] as const;
export const teachingLabels: Record<TeachingStage, string> = {
  worked: "Worked example", supported: "With guidance", independent: "Your turn", reinforcement: "Another example"
};
export type FeedbackBreakdown = { label: string; rows: { label: string; value: string }[] };
