import type { GameDefinition } from "./gameRegistry";
import { createGameTableDefinition } from "./tableFactory";

export const ginTopics = [
  { id: "gin-melds", action: "melds", title: "Sets and runs", summary: "Find combinations and reduce unmatched points." },
  { id: "gin-draw", action: "draw", title: "Draw and discard", summary: "Choose between the upcard and the unknown stock." },
  { id: "gin-knock", action: "knock", title: "Knock and gin", summary: "Finish with ten or fewer unmatched points." }
] as const;
export const ginRummyDef: GameDefinition = {
  table: createGameTableDefinition({
    id: "gin-rummy", title: "Gin Rummy table", family: "Rummy", referenceId: "gin-rummy", defaultTab: "play",
    scorecard: { label: "Gin score", unitLabel: "Points", objective: "First to 100", leaderRule: "high-score" },
    learn: { pathAriaLabel: "Gin Rummy lessons", pathEyebrow: "Learn", pathTitle: "Learn Gin Rummy",
      progressAriaLabel: "Gin Rummy course progress", nextSummary: "Build your next combination.", completeSummary: "Take your skills into a full game.",
      referenceSummary: "Check draws, knocking, layoffs and classic scoring." },
    tabIntros: {
      learn: { eyebrow: "Rummy", title: "Learn Gin Rummy", summary: "Build sets and runs. Keep your deadwood low." },
      play: { eyebrow: "Two players", title: "Gin Rummy", summary: "You and Barbu, first to 100 points." },
      perfect: { eyebrow: "Later", title: "Competitive Gin", summary: "Tournament variants are not included." }
    }, actionsByTab: {}
  }),
  learnSteps: ginTopics.map((topic, index) => ({ ...topic, step: String(index + 1) })),
  practiceGroups: [{ id: "gin-skills", ariaLabel: "Gin Rummy exercises", eyebrow: "Cards", title: "Try cards", layout: "action-list",
    entries: ginTopics.map(topic => ({ ...topic, label: topic.title, group: "gin-skills" })) }],
  playTabConfig: { actionAriaLabel: "Gin Rummy actions", groupAriaLabel: "Play Gin Rummy actions", groupEyebrow: "Classic Gin",
    primaryLabel: "Play Gin Rummy", supportingCopy: "Two players. Knock at 10 or less; gin earns 20 extra points. First to 100 wins, then game and box bonuses are added.",
    footerNote: "Melds and layoffs use the lowest-deadwood arrangement automatically." },
  proTabConfig: { featuresAriaLabel: "Gin Rummy pro", headingTitle: "Competitive Gin", headingSummary: "Not available yet." }
};
