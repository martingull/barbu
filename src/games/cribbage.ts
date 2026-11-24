import { createGameTableDefinition } from "./tableFactory";
import type { GameDefinition } from "./gameRegistry";

export const cribbageTopics = [
  { id: "cribbage-values", action: "values", title: "Values and the starter", summary: "Aces count one; picture cards count ten. The starter is shared when counting." },
  { id: "cribbage-discard", action: "discard", title: "Choose two for the crib", summary: "Keep four useful cards and remember whose crib you are feeding." },
  { id: "cribbage-pegging", action: "pegging", title: "Peg for combinations", summary: "Score fifteens, pairs and runs without passing 31." },
  { id: "cribbage-go", action: "go", title: "Go, 31 and last card", summary: "Know when the count resets and who scores the final point." },
  { id: "cribbage-hand", action: "hand", title: "Count your hand", summary: "Count every fifteen, pair and run; add flushes and nobs." },
  { id: "cribbage-crib", action: "crib", title: "Count the dealer's crib", summary: "Apply the stricter crib flush and count in the right order." }
] as const;
const intro = { eyebrow: "Cribbage", title: "Make combinations. Race to 121.",
  summary: "Play against Barbu. Keep four of your six cards, peg combinations, then count both hands and the dealer's crib." };
export const cribbageDef: GameDefinition = {
  table: createGameTableDefinition({ id: "cribbage", title: "Cribbage", family: "Adding games", referenceId: "cribbage", defaultTab: "learn",
    scorecard: { label: "Cribbage score", unitLabel: "Points", objective: "First to 121", leaderRule: "high-score" },
    learn: { pathAriaLabel: "Cribbage lesson path", pathEyebrow: "Learn", pathTitle: "Learn Cribbage", progressAriaLabel: "Cribbage progress",
      nextSummary: "Start with card values, then learn the crib, pegging and hand counting.",
      completeSummary: "Try a guided deal, then race Barbu to 121 without guidance.",
      guidedHandGoal: "Choose two cards for the crib, peg without exceeding 31, then count the hands and crib in order." },
    tabIntros: { learn: intro, play: intro, perfect: intro }, actionsByTab: {} }),
  learnSteps: cribbageTopics.map((topic, index) => ({ ...topic, step: String(index + 1), decisionFirst: true })),
  practiceGroups: [{ id: "cribbage-skills", ariaLabel: "Cribbage exercises", eyebrow: "Cards", title: "Try cards", layout: "action-list",
    entries: cribbageTopics.map(topic => ({ ...topic, label: topic.title, group: "cribbage-skills" })) }],
  playTabConfig: { actionAriaLabel: "Cribbage play actions", groupAriaLabel: "Cribbage game", groupEyebrow: "Game to 121", primaryLabel: "Play Cribbage" },
  proTabConfig: { featuresAriaLabel: "Cribbage Premium", headingTitle: "Cribbage", headingSummary: "" }
};
