import { createGameTableDefinition } from "./tableFactory";
import type { GameDefinition } from "./gameRegistry";
import type { CountingExercise } from "../domain/cardCountingQuestions";

export const cardCountingTable = createGameTableDefinition({
  id: "card-counting", title: "Card Counting I", family: "Card skills", referenceId: "",
  defaultTab: "learn", availableTabs: ["learn"],
  scorecard: { label: "Memory checks", unitLabel: "Correct", objective: "Track played cards", leaderRule: "high-score" },
  learn: {
    pathAriaLabel: "Card Counting I exercises", pathEyebrow: "Learn", pathTitle: "Memory skills",
    progressAriaLabel: "Card Counting I progress", nextSummary: "Count one suit, then track high cards.",
    completeSummary: "Apply your memory in a full hand."
  },
  tabIntros: {
    learn: { eyebrow: "Learn", title: "Memory skills", summary: "Start by tracking one suit. Then remember played cards while making decisions in a full hand." },
    play: { eyebrow: "Play", title: "Real hands with memory checks.", summary: "Start with Black Lady, then try trump, court-card, and danger-card tracking." },
    perfect: { eyebrow: "Compete", title: "", summary: "" }
  },
  actionsByTab: {}
});

export const cardCountingExercises: { eyebrow: string; title: string; summary: string; action: CountingExercise }[] = [
  {
    eyebrow: "Warm-up",
    title: "Count trumps",
    summary: "Watch all thirteen tricks in segments, then answer how many hearts appeared.",
    action: "trump-count"
  },
  {
    eyebrow: "Black Lady",
    title: "Heart memory hand",
    summary: "Play a full Black Lady hand and answer heart-memory checks as the hand develops.",
    action: "heart-memory"
  },
  {
    eyebrow: "Three amigos",
    title: "Three amigos memory",
    summary: "Play a real Whist hand while remembering kings, queens, and jacks that have left the table.",
    action: "high-card-memory"
  },
  {
    eyebrow: "No Queens memory",
    title: "Danger cards",
    summary: "Play a real No Queens hand. Avoid winning queens while remembering which queens are already gone.",
    action: "danger-count"
  },
  {
    eyebrow: "Whist mechanics",
    title: "Whist memory hand",
    summary: "Play a Whist hand while tracking trumps, boss cards, and suit voids.",
    action: "whist-memory"
  }
];

export const cardCountingDef: GameDefinition<CountingExercise> = {
  table: cardCountingTable,
  learnSteps: [],
  practiceGroups: [
    { id: "warm-up", ariaLabel: "Warm up", eyebrow: "Memory", title: "Warm up", layout: "action-list",
      entries: cardCountingExercises.filter(exercise => exercise.action === "trump-count").map(exercise => ({
        id: exercise.action, label: exercise.eyebrow, title: exercise.title, summary: exercise.summary, action: exercise.action, group: "warm-up" })) },
    { id: "memory-hands", ariaLabel: "Practise in a hand", eyebrow: "Memory", title: "Practise in a hand", layout: "action-list",
      entries: cardCountingExercises.filter(exercise => exercise.action !== "trump-count").map(exercise => ({
        id: exercise.action, label: exercise.eyebrow, title: exercise.title, summary: exercise.summary, action: exercise.action, group: "memory-hands" })) }
  ],
  playTabConfig: { actionAriaLabel: "Card Counting I practice", groupAriaLabel: "Card Counting I exercises",
    groupEyebrow: "Memory hands", primaryLabel: "Heart memory hand" },
  proTabConfig: { featuresAriaLabel: "Card Counting pro features", headingTitle: "", headingSummary: "" }
};
