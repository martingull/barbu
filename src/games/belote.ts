import { createGameTableDefinition } from "./tableFactory";
import type { GameDefinition } from "./gameRegistry";

export const beloteTopics = [
  { id: "belote-values", action: "values", title: "Read ranks and points", summary: "Trump jack and nine change rank and value; ten beats king outside trump." },
  { id: "belote-taking", action: "taking", title: "Take or pass", summary: "Decide from five cards, then complete the eight-card hand." },
  { id: "belote-follow", action: "follow", title: "Follow the led suit", summary: "Follow suit before choosing whether to win the trick." },
  { id: "belote-trumping", action: "trumping", title: "Trump and overtrump", summary: "When void, check who is winning before spending a trump." },
  { id: "belote-partner", action: "partner", title: "Feed your partner", summary: "Put valuable cards on a secure partnership trick." },
  { id: "belote-bonus", action: "bonus", title: "Belote and rebelote", summary: "The king and queen of trump together earn a protected 20." },
  { id: "belote-scoring", action: "scoring", title: "Settle the contract", summary: "Count card points, the last trick, failed contracts and capot." }
] as const;
const intro = { eyebrow: "Classic Belote", title: "Win points together.", summary: "South and North play together. Choose trump, capture valuable cards and race to 1,000. No sequence or four-of-a-kind announcements." };
export const beloteDef: GameDefinition = {
  table: createGameTableDefinition({ id: "belote", title: "Belote", family: "Jass", referenceId: "belote", defaultTab: "learn",
    scorecard: { label: "Belote score", unitLabel: "Points", objective: "First partnership to 1,000", leaderRule: "high-score" },
    learn: { pathAriaLabel: "Belote lesson path", pathEyebrow: "Learn", pathTitle: "Learn Belote", progressAriaLabel: "Belote progress",
      nextSummary: "Learn Classic Belote one decision at a time.", completeSummary: "Try a guided deal, then take your skills into independent Play.",
      guidedHandGoal: "Take or pass from your own cards, follow the trumping rules and count your partnership's card points." },
    tabIntros: { learn: intro, play: intro, perfect: intro }, actionsByTab: {} }),
  learnSteps: beloteTopics.map((topic, index) => ({ ...topic, step: String(index + 1), decisionFirst: true })),
  practiceGroups: [{ id: "belote-skills", ariaLabel: "Belote exercises", eyebrow: "Cards", title: "Try cards", layout: "action-list",
    entries: beloteTopics.map(topic => ({ ...topic, label: topic.title, group: "belote-skills" })) }],
  playTabConfig: { actionAriaLabel: "Belote play actions", groupAriaLabel: "Belote partnership game", groupEyebrow: "Classic, no announcements", primaryLabel: "Play Belote" },
  proTabConfig: { featuresAriaLabel: "Belote", headingTitle: "Belote", headingSummary: "" }
};
