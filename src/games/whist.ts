import type { GameDefinition } from "../gameRegistry";
import { createGameTableDefinition } from "../tableFactory";

export type WhistLearnPathAction = "object" | WhistPracticeAction;
export type WhistPracticeAction = "lead" | "follow" | "trump" | "third" | "return" | "odd";

export const whistDef: GameDefinition<WhistLearnPathAction | WhistPracticeAction> = {
  table: createGameTableDefinition({
    id: "whist",
    title: "Whist table",
    family: "Whist",
    referenceId: "whist",
    scorecard: {
      label: "Whist scorecard",
      unitLabel: "Odd tricks",
      objective: "Partnership score leads",
      leaderRule: "high-score"
    },
    learn: {
      pathAriaLabel: "Whist lesson path",
      pathEyebrow: "Training path",
      pathTitle: "Learn the Whist table",
      progressAriaLabel: "Whist course progress",
      nextSummary: "Open a compact Whist decision, then repeat the same habit in practice.",
      completeSummary: "You have tried the first Whist habits: partnerships, trumps, suit invites, and odd tricks.",
      referenceSummary: "Check the Whist baseline: partnerships, trumps, odd tricks, and silent table signals."
    },
    tabIntros: {
      learn: {
        eyebrow: "Learn",
        title: "Learn partnership trick play.",
        summary:
          "Whist teaches the partnership habits behind many later games: follow suit, manage trumps, lead strength, and read partner."
      },
      practice: {
        eyebrow: "Practice",
        title: "Repeat one Whist habit.",
        summary: "Repeat compact partnership trick-taking topics, then test the same habits in a full Whist hand."
      },
      play: {
        eyebrow: "Play",
        title: "Play a partnership hand.",
        summary:
          "Play You and Barbu against Left and Right with a visible trump suit, follow-suit play, and odd-trick scoring."
      },
      perfect: {
        eyebrow: "Pro",
        title: "Paid partnership tables.",
        summary: "Pro is for subscriber AI partnerships and competitive play. Card counting lives in its own game packs."
      }
    },
    defaultTab: "play",
    actionsByTab: {
      learn: [
        { id: "reference", label: "Reference", destination: "Whist reference" },
        { id: "follow-suit", label: "Follow suit", destination: "Whist follow-suit concept" },
        { id: "trumps", label: "Trump wins", destination: "Whist trump concept" },
        { id: "partner-suits", label: "Partner signals", destination: "Whist partnership concept" }
      ],
      practice: [
        { id: "opening-lead", label: "Opening lead", destination: "Whist practice: Opening lead" },
        { id: "follow-suit", label: "Follow suit", destination: "Whist practice: Follow suit" },
        { id: "trump-or-discard", label: "Trump or discard", destination: "Whist practice: Trump or discard" },
        { id: "third-hand-high", label: "Third hand high", destination: "Whist practice: Third hand high" },
        { id: "return-partner-suit", label: "Return partner's suit", destination: "Whist practice: Return partner's suit" },
        { id: "odd-tricks", label: "Count odd tricks", destination: "Whist practice: Count odd tricks" }
      ],
      play: [{ id: "play-whist", label: "Play Whist", destination: "Whist partnership hand" }]
    }
  }),
  learnSteps: [
    {
      id: "whist-object",
      step: "Concept",
      title: "Win tricks together",
      summary: "Whist is partnership trick-taking: you and the player opposite you score as a side.",
      action: "object"
    },
    {
      id: "whist-follow-suit",
      step: "Rule",
      title: "Follow suit",
      summary: "The led suit controls the trick unless someone who is void plays a trump.",
      action: "follow"
    },
    {
      id: "whist-trumps",
      step: "Example",
      title: "Trump wins",
      summary: "The dealer's last card sets trump; a low trump can beat a high plain-suit card.",
      action: "trump"
    },
    {
      id: "whist-partner",
      step: "Partnership",
      title: "Read your partner",
      summary: "Return partner's suit, support their lead, and avoid fighting your own side.",
      action: "third"
    },
    {
      id: "whist-opening-lead",
      step: "Lead",
      title: "Opening leads",
      summary: "Invite a long plain suit: low from broken length, high from an honour sequence.",
      action: "lead"
    },
    {
      id: "whist-suit-invite",
      step: "Signals",
      title: "Invite a suit",
      summary: "Lead a strong or long suit to show partner where your hand wants help.",
      action: "return"
    },
    {
      id: "whist-odd-tricks",
      step: "Scoring",
      title: "Count odd tricks",
      summary: "Score tricks above six. Five points wins a game; win two games to take the rubber.",
      action: "odd"
    }
  ],
  practiceGroups: [
    {
      id: "fixed-drills",
      ariaLabel: "Whist practice drills",
      eyebrow: "Practice set",
      title: "Practice one Whist habit.",
      layout: "entry-grid",
      entries: [
        {
          id: "opening-lead",
          label: "Lead",
          title: "Opening lead",
          summary: "Try three opening leads: broken length, an honour sequence, and a plain-suit ace.",
          action: "lead",
          group: "fixed-drills"
        },
        {
          id: "follow-suit",
          label: "Rule",
          title: "Follow suit",
          summary: "Find the legal card when the led suit controls the trick.",
          action: "follow",
          group: "fixed-drills"
        },
        {
          id: "trump-or-discard",
          label: "Trump",
          title: "Trump or discard",
          summary: "Decide when a void hand should cut with trump or throw away.",
          action: "trump",
          group: "fixed-drills"
        },
        {
          id: "third-hand-high",
          label: "Partnership",
          title: "Third hand high",
          summary: "Allow for fourth hand, play high from unequal honours, and preserve a secure partner winner.",
          action: "third",
          group: "fixed-drills"
        },
        {
          id: "return-partner-suit",
          label: "Signal",
          title: "Return partner's suit",
          summary: "Notice a suit invitation and lead it back when you get control.",
          action: "return",
          group: "fixed-drills"
        },
        {
          id: "odd-tricks",
          label: "Scoring",
          title: "Count odd tricks",
          summary: "Translate tricks above six into partnership points.",
          action: "odd",
          group: "fixed-drills"
        }
      ]
    }
  ],
  playTabConfig: {
    actionAriaLabel: "Whist play actions",
    groupAriaLabel: "Whist partnership hand",
    groupEyebrow: "Partnership hand",
    primaryLabel: "Play Whist"
  },
  proTabConfig: {
    featuresAriaLabel: "Whist pro features",
    headingTitle: "More Whist.",
    headingSummary: "Play subscriber AI contracts or competitive settlement tables."
  }
};
