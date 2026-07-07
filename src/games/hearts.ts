import type { GameDefinition } from "../gameRegistry";
import { createGameTableDefinition } from "../tableFactory";

export type HeartsLearnPathAction = "object" | "queen" | "avoid" | "pass" | "break" | "moon" | "score";
export type HeartsPracticeAction = "quick" | "pass" | "first" | "avoid" | "queen" | "break" | "moon" | "score";

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
      practice: {
        eyebrow: "Practice",
        title: "Repeat the Hearts habits.",
        summary:
          "Use short drills for the danger cards, then move into live-hand practice for broken hearts, moon defense, and score reading."
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
      practice: [
        { id: "quick-drill", label: "Quick drill", destination: "Hearts practice: Quick drill" },
        { id: "pass-three", label: "Pass three", destination: "Hearts practice: Pass three" },
        { id: "first-trick", label: "First trick", destination: "Hearts practice: First trick" },
        { id: "avoid-hearts", label: "Avoid hearts", destination: "Hearts practice: Avoid hearts" },
        { id: "queen-danger", label: "Queen of Spades danger", destination: "Hearts practice: Queen of Spades danger" },
        { id: "break-hearts", label: "Break hearts", destination: "Hearts practice: Break hearts" },
        { id: "stop-the-moon", label: "Stop the moon", destination: "Hearts practice: Stop the moon" },
        { id: "score-a-hand", label: "Score a hand", destination: "Hearts practice: Score a hand" }
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
      summary: "Move obvious danger cards before the first trick starts.",
      action: "pass"
    },
    {
      id: "hearts-break",
      step: "Rule",
      title: "Break hearts",
      summary: "Learn when hearts can legally be led.",
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
      id: "practice-actions",
      ariaLabel: "Hearts table actions",
      eyebrow: "Practice",
      title: "Practice actions",
      layout: "action-list",
      entries: [
        {
          id: "quick-drill",
          label: "Practice",
          title: "Quick drill",
          summary: "Run a short mixed Hearts loop with immediate feedback.",
          action: "quick",
          group: "practice-actions"
        }
      ]
    },
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
          summary: "Choose the three danger cards before the hand begins.",
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
          summary: "Decide whether a heart lead is legal before hearts have been broken.",
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
