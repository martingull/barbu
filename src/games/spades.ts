import type { GameDefinition } from "../gameRegistry";
import { createGameTableDefinition } from "../tableFactory";

export type SpadesLearnPathAction = "object" | SpadesPracticeAction;
export type SpadesPracticeAction = "follow" | "trump" | "bid" | "bags";

export const spadesDef: GameDefinition<SpadesLearnPathAction | SpadesPracticeAction> = {
  table: createGameTableDefinition({
    id: "spades",
    title: "Spades table",
    family: "Whist",
    referenceId: "spades",
    scorecard: {
      label: "Spades scorecard",
      unitLabel: "Books",
      objective: "Meet your bid",
      leaderRule: "high-score"
    },
    learn: {
      pathAriaLabel: "Spades lesson path",
      pathEyebrow: "Training path",
      pathTitle: "Learn the Spades table",
      progressAriaLabel: "Spades course progress",
      nextSummary: "Start with fixed-trump partnership play, bids, and book targets.",
      completeSummary: "You have tried the first Spades habits: follow suit, count spades, bid books, and watch bags.",
      referenceSummary: "Check the Spades baseline: partnership play, spades as trump, bidding, bags, and later nil."
    },
    tabIntros: {
      learn: {
        eyebrow: "Learn",
        title: "Learn fixed-trump trick play.",
        summary:
          "Spades starts from Whist-family table habits, then makes one thing constant: spades are always trump."
      },
      practice: {
        eyebrow: "Practice",
        title: "Practice one Spades habit.",
        summary: "Practice follow-suit, trump decisions, book targets, and avoiding unnecessary bags."
      },
      play: {
        eyebrow: "Play",
        title: "Play a Spades hand.",
        summary:
          "Play You and Barbu against Left and Right with spades fixed as trump, visible bids, bags, and match scoring."
      },
      perfect: {
        eyebrow: "Pro",
        title: "Paid Spades tables.",
        summary: "Pro is for subscriber AI partners, competitive play, and advanced bidding practice."
      }
    },
    defaultTab: "play",
    actionsByTab: {
      learn: [
        { id: "reference", label: "Reference", destination: "Spades reference" },
        { id: "fixed-trump", label: "Spades trump", destination: "Spades fixed-trump concept" },
        { id: "books", label: "Books", destination: "Spades books concept" },
        { id: "bidding", label: "Bidding", destination: "Spades bidding concept" }
      ],
      practice: [
        { id: "follow-suit", label: "Follow suit", destination: "Spades practice: Follow suit" },
        { id: "trump-or-discard", label: "Trump or discard", destination: "Spades practice: Trump or discard" },
        { id: "bid-books", label: "Bid books", destination: "Spades practice: Bid books" },
        { id: "bags", label: "Avoid bags", destination: "Spades practice: Avoid bags" }
      ],
      play: [{ id: "play-spades", label: "Play Spades", destination: "Spades scored hand" }]
    }
  }),
  learnSteps: [
    {
      id: "spades-object",
      step: "Concept",
      title: "Win your books",
      summary: "Spades is partnership trick-taking where the target is to win the tricks your side promised.",
      action: "object"
    },
    {
      id: "spades-follow-suit",
      step: "Rule",
      title: "Follow suit first",
      summary: "Spades only become available when you cannot follow the led suit.",
      action: "follow"
    },
    {
      id: "spades-trump",
      step: "Trump",
      title: "Spades always trump",
      summary: "A low spade can beat a high plain-suit card once you are void.",
      action: "trump"
    },
    {
      id: "spades-books",
      step: "Scoring",
      title: "Count books",
      summary: "Each trick is a book. The bid tells you how many your partnership needs.",
      action: "bid"
    },
    {
      id: "spades-bags",
      step: "Tactic",
      title: "Avoid extra bags",
      summary: "Extra tricks still score, but they become bags you should track.",
      action: "bags"
    }
  ],
  practiceGroups: [
    {
      id: "fixed-drills",
      ariaLabel: "Spades practice drills",
      eyebrow: "Practice set",
      title: "Practice one Spades habit.",
      layout: "entry-grid",
      entries: [
        {
          id: "follow-suit",
          label: "Rule",
          title: "Follow suit",
          summary: "Find the legal card before thinking about trump.",
          action: "follow",
          group: "fixed-drills"
        },
        {
          id: "trump-or-discard",
          label: "Trump",
          title: "Trump or discard",
          summary: "When you are void, decide whether spending a spade is worth it.",
          action: "trump",
          group: "fixed-drills"
        },
        {
          id: "bid-books",
          label: "Bidding",
          title: "Bid books",
          summary: "Estimate how many tricks your side can take before the hand begins.",
          action: "bid",
          group: "fixed-drills"
        },
        {
          id: "bags",
          label: "Scoring",
          title: "Avoid bags",
          summary: "Make the bid without taking more tricks than the scorecard needs.",
          action: "bags",
          group: "fixed-drills"
        }
      ]
    }
  ],
  playTabConfig: {
    actionAriaLabel: "Spades play actions",
    groupAriaLabel: "Spades hand",
    groupEyebrow: "Partnership hand",
    primaryLabel: "Play Spades",
    supportingCopy:
      "Play a partnership hand with spades always trump. The table sets simple side bids, scores made bids, and tracks bags.",
    footerNote: "You and Barbu play against Left and Right."
  },
  proTabConfig: {
    featuresAriaLabel: "Spades pro features",
    headingTitle: "More Spades.",
    headingSummary: "Play subscriber AI partners, competitive matches, and advanced bid review."
  }
};
