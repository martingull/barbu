import type { GameDefinition } from "../gameRegistry";
import { createGameTableDefinition } from "../tableFactory";

export type BarbuLearnPathAction = "lesson" | "generated" | "review" | "planned";
export type BarbuPracticeAction = "quick" | "fixed" | "domino";

export const barbuDef: GameDefinition<BarbuLearnPathAction | BarbuPracticeAction> = {
  table: createGameTableDefinition({
    id: "barbu",
    title: "Barbu's table",
    family: "Hearts",
    referenceId: "barbu",
    scorecard: {
      label: "Barbu scorecard",
      unitLabel: "Score",
      objective: "High score leads",
      leaderRule: "high-score"
    },
    learn: {
      pathAriaLabel: "Barbu lesson path",
      pathEyebrow: "Training path",
      pathTitle: "Learn the Barbu table",
      progressAriaLabel: "Barbu course progress",
      nextSummary: "Return to the next short card decision.",
      completeSummary: "Look over the first Barbu table before another pass.",
      referenceSummary: "Check the baseline rules, scoring, and variants."
    },
    tabIntros: {
      learn: {
        eyebrow: "Learn",
        title: "Learn the Barbu table.",
        summary: "Start with compact guided card decisions, then move into drills and a full table session."
      },
      practice: {
        eyebrow: "Practice",
        title: "Sharpen one decision at a time.",
        summary: "Use short mixed drills when you want rhythm, or isolate one contract pattern when a rule feels weak."
      },
      play: {
        eyebrow: "Play",
        title: "Challenge the table.",
        summary: "Play the current local Barbu run: contracts in sequence, cumulative score, and a final table result."
      },
      perfect: {
        eyebrow: "Pro",
        title: "Paid table play.",
        summary: "Pro is for subscriber AI play and competitive tables. Card counting lives in its own game packs."
      }
    },
    defaultTab: "play",
    actionsByTab: {
      learn: [
        { id: "review-results", label: "Review results", destination: "Barbu review" },
        { id: "reset-path", label: "Reset path", destination: "Barbu Learn" },
        { id: "continue-path", label: "Continue with next lesson", destination: "Next Barbu learning step" },
        { id: "reference", label: "Reference", destination: "Barbu reference" },
        { id: "contracts", label: "Barbu contracts", destination: "Barbu contract map" }
      ],
      practice: [
        { id: "quick-drill", label: "Quick drill", destination: "Barbu practice: Quick drill" },
        { id: "fixed-drills", label: "Fixed drills", destination: "Barbu practice: Fixed drills" },
        { id: "domino-hand", label: "Play a full layout hand", destination: "Barbu practice: Play a full layout hand" }
      ],
      play: [
        { id: "continue-play-barbu", label: "Continue Play Barbu", destination: "Saved Play Barbu run" },
        { id: "play-barbu", label: "Play Barbu", destination: "New Play Barbu run" }
      ],
      perfect: [
        { id: "ai-play", label: "Play against AI", destination: "Subscriber AI table" },
        { id: "competitive-play", label: "Competitive Play", destination: "Subscriber competitive table" }
      ]
    }
  }),
  learnSteps: [
    {
      id: "meet-contract",
      step: "Concept",
      title: "Meet the contract",
      summary: "Barbu names the danger cards and the object before play begins.",
      action: "lesson",
      lessonId: "barbu-no-hearts"
    },
    {
      id: "spot-danger",
      step: "Example",
      title: "Spot the danger",
      summary: "Read the table, identify who is likely to take the penalty, then choose.",
      action: "lesson",
      lessonId: "barbu-no-queens"
    },
    {
      id: "play-trick",
      step: "Guided trick",
      title: "Play the trick",
      summary: "Make the legal play and get immediate feedback from Barbu.",
      action: "lesson",
      lessonId: "barbu-king-of-hearts"
    },
    {
      id: "contract-no-last-two",
      step: "Contract",
      title: "Avoid the final tricks",
      summary: "Learn why the final two tricks change the hand.",
      action: "lesson",
      lessonId: "barbu-no-last-two"
    },
    {
      id: "contract-no-tricks",
      step: "Contract",
      title: "Avoid every trick",
      summary: "Practice ducking under the current winner.",
      action: "lesson",
      lessonId: "barbu-no-tricks"
    },
    {
      id: "contract-hearts-trumps",
      step: "Contract",
      title: "Use trumps",
      summary: "See when a heart can cut the led suit.",
      action: "lesson",
      lessonId: "barbu-hearts-trumps"
    },
    {
      id: "contract-domino",
      step: "Layout",
      title: "Build Domino",
      summary: "Place sevens and extend suit lanes.",
      action: "lesson",
      lessonId: "barbu-domino"
    },
    {
      id: "generated-drill",
      step: "Practice",
      title: "Practice table",
      summary: "Run generated practice decisions and review the next repetition.",
      action: "generated"
    },
    {
      id: "review",
      step: "Review",
      title: "Review the hand",
      summary: "Review your latest table and choose what to practice next.",
      action: "review"
    }
  ],
  practiceGroups: [
    {
      id: "practice-actions",
      ariaLabel: "Barbu table actions",
      eyebrow: "Practice",
      title: "Practice actions",
      layout: "action-list",
      entries: [
        {
          id: "quick-drill",
          label: "Practice",
          title: "Quick drill",
          summary: "Run a short mixed-contract loop with immediate feedback.",
          action: "quick",
          group: "practice-actions"
        }
      ]
    },
    {
      id: "fixed-drills",
      ariaLabel: "Fixed contract drills",
      eyebrow: "Fixed drills",
      title: "Practice one contract pattern.",
      layout: "lesson-grid",
      lessonSource: "barbu-fixed-lessons"
    },
    {
      id: "full-hands",
      ariaLabel: "Full hand practice",
      eyebrow: "Full hands",
      title: "Practice the table surface.",
      layout: "entry-grid",
      entries: [
        {
          id: "domino-hand",
          label: "Domino",
          title: "Play a full layout hand",
          summary: "Use the same Domino table as Play Barbu: open suits, pass only when blocked, and race to go out.",
          action: "domino",
          group: "full-hands"
        }
      ]
    }
  ],
  playTabConfig: {
    actionAriaLabel: "Barbu table actions",
    groupAriaLabel: "Play actions",
    groupEyebrow: "Play",
    primaryLabel: "Play Barbu",
    supportingCopy:
      "Play a local, 7-game Barbu session. This runs all contracts once in a fixed order with AI opponents and keeps a cumulative score. There is no active dealer choice."
  },
  proTabConfig: {
    featuresAriaLabel: "Barbu pro features",
    headingTitle: "More Barbu.",
    headingSummary: "Play subscriber AI contracts or competitive settlement tables."
  }
};
