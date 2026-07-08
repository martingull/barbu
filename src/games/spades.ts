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
      nextSummary: "Start with fixed-trump partnership play, then add bidding once the hand feels good.",
      completeSummary: "You have tried the first Spades habits: follow suit, count spades, and think in books.",
      referenceSummary: "Check the Spades baseline: partnership play, spades as trump, bidding, bags, and nil."
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
        summary: "Start with follow-suit and trump decisions. Bidding, bags, and nil are next-stage practice."
      },
      play: {
        eyebrow: "Play",
        title: "Play a starter Spades hand.",
        summary:
          "Play You and Barbu against Left and Right with spades fixed as trump. Bidding and full Spades scoring are planned next."
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
      play: [{ id: "play-spades", label: "Play Spades", destination: "Spades starter hand" }]
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
      summary: "Each trick is a book. Later, the bid tells you how many your partnership needs.",
      action: "bid"
    },
    {
      id: "spades-bags",
      step: "Tactic",
      title: "Avoid extra bags",
      summary: "Taking too many tricks can become costly once full Spades scoring is active.",
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
          summary: "Planned: estimate how many tricks your hand can help win.",
          action: "bid",
          group: "fixed-drills"
        },
        {
          id: "bags",
          label: "Scoring",
          title: "Avoid bags",
          summary: "Planned: learn when extra tricks help and when they hurt.",
          action: "bags",
          group: "fixed-drills"
        }
      ]
    }
  ],
  playTabConfig: {
    actionAriaLabel: "Spades play actions",
    groupAriaLabel: "Spades starter hand",
    groupEyebrow: "Starter hand",
    primaryLabel: "Play Spades",
    supportingCopy:
      "First version: play a partnership hand with spades always trump. Bidding, nil, and bags are next.",
    footerNote: "You and Barbu play against Left and Right."
  },
  proTabConfig: {
    featuresAriaLabel: "Spades pro features",
    headingTitle: "More Spades.",
    headingSummary: "Play subscriber AI partners, competitive matches, and advanced bid review."
  }
};
