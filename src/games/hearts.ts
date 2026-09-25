import type { GameDefinition } from "./gameRegistry";
import { createGameTableDefinition } from "./tableFactory";

export type HeartsLearnPathAction = "object" | "queen" | "avoid" | "pass" | "break" | "moon" | "score";
export type HeartsPracticeAction = "pass" | "first" | "avoid" | "queen" | "break" | "moon" | "score";

export const heartsDef: GameDefinition<HeartsLearnPathAction | HeartsPracticeAction> = {
  table: createGameTableDefinition({
    id: "hearts",
    title: "Hearts table",
    family: "Hearts",
    referenceId: "hearts",
    scorecard: {
      label: "Hearts scorecard",
      unitLabel: "Penalty",
      objective: "Low score leads",
      leaderRule: "low-score"
    },
    learn: {
      pathAriaLabel: "Hearts lesson path",
      pathEyebrow: "Training path",
      pathTitle: "Learn the Hearts table",
      progressAriaLabel: "Hearts course progress",
      nextSummary: "Return to the next short Hearts decision.",
      completeSummary: "Replay any Hearts lesson or move into practice.",
      referenceSummary: "Check the current rules, names, scoring, and documented simplifications."
    },
    tabIntros: {
      learn: {
        eyebrow: "Learn",
        title: "Learn the Hearts table.",
        summary: "Move through short card decisions before playing full hands."
      },
      play: {
        eyebrow: "Play",
        title: "Play a Hearts match.",
        summary:
          "Hearts plays repeated hands to 100 points with rotating passes, 2C opening, Queen of Spades at 13, and shoot-the-moon scoring."
      },
      perfect: {
        eyebrow: "Pro",
        title: "Paid Hearts tables.",
        summary: "Pro is for subscriber AI opponents and competitive play. Card counting lives in its own game pack."
      }
    },
    defaultTab: "play",
    actionsByTab: {
      learn: [
        { id: "object", label: "Object", destination: "Hearts object concept" },
        { id: "queen-danger", label: "Queen of Spades", destination: "Queen of Spades concept" },
        { id: "passing", label: "Pass three", destination: "Hearts passing concept" },
        { id: "score-reading", label: "Score reading", destination: "Hearts score concept" },
        { id: "reference", label: "Reference", destination: "Hearts reference" }
      ],
      play: [{ id: "play-hearts", label: "Play Hearts", destination: "Hearts rotating-pass match" }]
    }
  }),
  learnSteps: [
    {
      id: "hearts-object",
      step: "Concept",
      title: "Object of Hearts",
      summary: "Avoid penalty points. Hearts are small; Queen of Spades is large.",
      action: "object"
    },
    {
      id: "hearts-queen",
      step: "Example",
      title: "Queen of Spades",
      summary: "Read whether Queen of Spades is moving into your trick or safely away.",
      action: "queen"
    },
    {
      id: "hearts-avoid",
      step: "Guided trick",
      title: "Avoid hearts",
      summary: "Follow suit and let heart points move away.",
      action: "avoid"
    },
    {
      id: "hearts-pass",
      step: "Before play",
      title: "Pass three",
      summary: "Remove danger, keep low exits, and create a void.",
      action: "pass"
    },
    {
      id: "hearts-break",
      step: "Rule",
      title: "Break hearts",
      summary: "Lead, follow, and choose the next suit after hearts break.",
      action: "break"
    },
    {
      id: "hearts-moon",
      step: "Tactic",
      title: "Stop the moon",
      summary: "Take danger on purpose when one player is collecting everything.",
      action: "moon"
    },
    {
      id: "hearts-score",
      step: "Review",
      title: "Score a hand",
      summary: "Find why Queen of Spades makes a trick much more expensive.",
      action: "score"
    }
  ],
  practiceGroups: [
    {
      id: "fixed-drills",
      ariaLabel: "Hearts practice drills",
      eyebrow: "Practice set",
      title: "Practice one Hearts pattern.",
      layout: "entry-grid",
      entries: [
        {
          id: "pass-three",
          label: "Passing",
          title: "Pass three",
          summary: "Three hands: exposed spades, low exits, and a void.",
          action: "pass",
          group: "fixed-drills"
        },
        {
          id: "first-trick",
          label: "Opening",
          title: "First trick",
          summary: "Follow clubs on the opening trick instead of dumping penalties.",
          action: "first",
          group: "fixed-drills"
        },
        {
          id: "avoid-hearts",
          label: "Hearts",
          title: "Avoid hearts",
          summary: "Follow suit and avoid taking heart penalties when another card can duck.",
          action: "avoid",
          group: "fixed-drills"
        },
        {
          id: "queen-danger",
          label: "Queen of Spades",
          title: "Queen of Spades danger",
          summary: "Practice the Queen of Spades habit: avoid winning when the danger card is loaded.",
          action: "queen",
          group: "fixed-drills"
        },
        {
          id: "break-hearts",
          label: "Play restriction",
          title: "Break hearts",
          summary: "Three positions: an all-heart lead, following hearts, and the next lead.",
          action: "break",
          group: "fixed-drills"
        },
        {
          id: "stop-the-moon",
          label: "Moon defense",
          title: "Stop the moon",
          summary: "Take a loaded trick when that is the only way to stop a moon threat.",
          action: "moon",
          group: "fixed-drills"
        },
        {
          id: "score-a-hand",
          label: "Scorecard",
          title: "Score a hand",
          summary: "Identify why Queen of Spades makes a Hearts trick much more expensive.",
          action: "score",
          group: "fixed-drills"
        }
      ]
    }
  ],
  playTabConfig: {
    actionAriaLabel: "Hearts table actions",
    groupAriaLabel: "Play Hearts actions",
    groupEyebrow: "Play",
    primaryLabel: "Play Hearts",
    supportingCopy:
      "Play repeated rotating-pass hands to 100 penalty points. Low score wins; shooting the moon is active."
  },
  proTabConfig: {
    featuresAriaLabel: "Hearts pro features",
    headingTitle: "More Hearts.",
    headingSummary: "Play subscriber AI contracts or competitive settlement tables."
  }
};
export const heartsIntroduction = {
  id: "hearts-introduction",
  title: "A taste of Hearts",
  summary: "Avoid penalty cards. Lowest score wins.",
  label: "Try Hearts",
  action: "introduction",
  completed: {
    title: "Hearts introduction complete",
    summary: "Passing, avoiding points and planning your hand.",
    label: "Learn Hearts"
  }
};
