import type { GameDefinition } from "./gameRegistry";
import { createGameTableDefinition } from "./tableFactory";

export const canastaTopics = [
  { id: "canasta-melds", action: "melds", title: "Build a canasta", summary: "Match ranks, use wilds, and reach seven cards." },
  { id: "canasta-pile", action: "pile", title: "Take the pile", summary: "Use a natural pair and meet your opening requirement." },
  { id: "canasta-discard", action: "discard", title: "Choose a discard", summary: "Keep useful cards and respect the empty-pile rules." },
  { id: "canasta-finish", action: "finish", title: "Finish and score", summary: "Complete two canastas before going out." }
] as const;
export const canastaDef: GameDefinition = {
  table: createGameTableDefinition({ id: "canasta", title: "Canasta table", family: "Rummy", referenceId: "canasta", defaultTab: "play",
    scorecard: { label: "Canasta score", unitLabel: "Points", objective: "First to 8500", leaderRule: "high-score" },
    learn: { pathAriaLabel: "Canasta lessons", pathEyebrow: "Learn", pathTitle: "Learn Canasta", progressAriaLabel: "Canasta course progress",
      nextSummary: "Return to your next Canasta decision.", completeSummary: "Bring your partnership skills to the table.", referenceSummary: "Modern American rules, special hands, and scoring." },
    tabIntros: { learn: { eyebrow: "Rummy", title: "Learn Canasta", summary: "Build melds together. Know when to take the pile." },
      play: { eyebrow: "Modern American", title: "Canasta", summary: "You and Barbu against West and East. First to 8500 points." },
      perfect: { eyebrow: "Canasta", title: "Competitive Canasta", summary: "Partnership play." } }, actionsByTab: {} }),
  learnSteps: canastaTopics.map((topic, index) => ({ ...topic, step: String(index + 1) })),
  practiceGroups: [{ id: "canasta-skills", ariaLabel: "Canasta exercises", eyebrow: "Cards", title: "Try cards", layout: "action-list",
    entries: canastaTopics.map(topic => ({ ...topic, label: topic.title, group: "canasta-skills" })) }],
  playTabConfig: { actionAriaLabel: "Canasta actions", groupAriaLabel: "Play Canasta actions", groupEyebrow: "Modern American",
    primaryLabel: "Play Canasta", supportingCopy: "Four players, two partnerships. Build seven-card melds and finish with two canastas.",
    footerNote: "Special hands: straight, pairs, and garbage. Opening minimums: 125, 155, or 180 points." },
  proTabConfig: { featuresAriaLabel: "Canasta pro", headingTitle: "Competitive Canasta", headingSummary: "Partnership play." }
};
