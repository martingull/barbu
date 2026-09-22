import { createGameTableDefinition } from "../tableFactory";

export const cardCountingTable = createGameTableDefinition({
  id: "card-counting", title: "Card Counting I", family: "Card skills", referenceId: "",
  defaultTab: "play",
  scorecard: { label: "Memory checks", unitLabel: "Correct", objective: "Track played cards", leaderRule: "high-score" },
  learn: {
    pathAriaLabel: "Card Counting I learning path", pathEyebrow: "Learn", pathTitle: "Memory skills",
    progressAriaLabel: "Card Counting I progress", nextSummary: "Count one suit, then track high cards.",
    completeSummary: "Apply your memory in a full hand.", referenceSummary: ""
  },
  tabIntros: {
    learn: { eyebrow: "Learn", title: "Memory skills", summary: "Track played cards through focused decisions." },
    play: { eyebrow: "Play", title: "Real hands with memory checks.", summary: "Start with Black Lady, then try trump, court-card, and danger-card tracking." },
    perfect: { eyebrow: "Compete", title: "", summary: "" }
  },
  actionsByTab: {}
});
