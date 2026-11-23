import { createGameTableDefinition } from "./tableFactory";
import type { GameDefinition } from "./gameRegistry";

export const euchreTopics = [
  { id: "euchre-bowers", action: "bowers", title: "Meet the bowers", summary: "Find the highest trumps and the jack that changes suit." },
  { id: "euchre-follow", action: "follow", title: "Follow the real suit", summary: "The left bower belongs to trump, not its printed suit." },
  { id: "euchre-order", action: "order", title: "Order up and discard", summary: "Weigh the visible hand, then keep five cards as dealer." },
  { id: "euchre-second", action: "second", title: "Choose another trump", summary: "Choose from the other three suits, or pass." },
  { id: "euchre-partner", action: "partner", title: "Play with your partner", summary: "Win the needed trick without wasting a secure winner." },
  { id: "euchre-score", action: "score", title: "Go alone and score", summary: "Count made calls, sweeps, lone hands and euchres." }
] as const;
const intro = { eyebrow: "Euchre", title: "Win three tricks together.",
  summary: "You are South, partnered with North. Call trump, follow suit and take at least three of five tricks. First partnership to 10 wins." };
export const euchreTable = createGameTableDefinition({
  id: "euchre", title: "Euchre", family: "Euchre", referenceId: "euchre", defaultTab: "learn",
  scorecard: { label: "Euchre score", unitLabel: "Points", objective: "First partnership to 10", leaderRule: "high-score" },
  learn: { pathAriaLabel: "Euchre lesson path", pathEyebrow: "Learn", pathTitle: "Learn Euchre",
    progressAriaLabel: "Euchre progress", nextSummary: "Learn to call trump and win tricks with your partner.",
    completeSummary: "You have covered the foundations. Try a guided hand, then an independent game.",
    guidedHandGoal: "Call trump from your own hand, recognise the bowers and work towards three of five tricks with North." },
  tabIntros: { learn: intro, play: intro, perfect: intro }, actionsByTab: {}
});
export const euchreDef: GameDefinition = {
  table: euchreTable,
  learnSteps: euchreTopics.map((topic, index) => ({ ...topic, step: String(index + 1), decisionFirst: true })),
  practiceGroups: [{ id: "euchre-skills", ariaLabel: "Euchre exercises", eyebrow: "Cards", title: "Try cards", layout: "action-list",
    entries: euchreTopics.map(topic => ({ ...topic, label: topic.title, group: "euchre-skills" })) }],
  playTabConfig: { actionAriaLabel: "Euchre play actions", groupAriaLabel: "Euchre partnership game", groupEyebrow: "Game to 10", primaryLabel: "Play Euchre" },
  proTabConfig: { featuresAriaLabel: "Euchre Premium", headingTitle: "Euchre", headingSummary: "" }
};
