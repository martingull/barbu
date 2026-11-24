import type { GameDefinition } from "./gameRegistry";
import { createGameTableDefinition, gameRulesCopy } from "./tableFactory";

export type SpadesLearnPathAction = "object" | SpadesPracticeAction;
export type SpadesPracticeAction = "follow" | "trump" | "bid" | "bags" | "score" | "lead" | "nil" | "settle";

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
      nextSummary: "Start by seeing your hand, estimating a bid, then playing to the partnership target.",
      completeSummary: "You have tried partnership books, following suit, trump, bidding, nil, bags and hand scoring.",
    },
    tabIntros: {
      learn: {
        eyebrow: "Learn",
        title: "Learn fixed-trump trick play.",
        summary:
          "Spades starts from Whist-family table habits, then makes one thing constant: spades are always trump."
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
        { id: "reference", label: gameRulesCopy.referenceTitle, destination: "Spades rules" },
        { id: "fixed-trump", label: "Spades trump", destination: "Spades fixed-trump concept" },
        { id: "books", label: "Books", destination: "Spades books concept" },
        { id: "bidding", label: "Bidding", destination: "Spades bidding concept" }
      ],
      play: [{ id: "play-spades", label: "Play Spades", destination: "Spades scored hand" }]
    }
  }),
  learnSteps: [
    {
      id: "spades-object",
      step: "Concept",
      title: "Win your books",
      summary: "Spades is partnership trick-taking where each side tries to win the books it promised.",
      action: "object"
    },
    {
      id: "spades-follow-suit",
      step: "Rule",
      title: "Follow suit first",
      summary: "Follow the led suit when possible; when void, you may trump or discard.",
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
      id: "spades-leading", step: "Rule", title: "Lead spades legally",
      summary: "Know when spades are unbroken, broken, or your only remaining suit.", action: "lead"
    },
    {
      id: "spades-books",
      step: "Scoring",
      title: "Count books",
      summary: "Each trick is a book. Estimate your bid from visible winners and realistic nil chances.",
      action: "bid"
    },
    {
      id: "spades-nil", step: "Tactic", title: "Play nil",
      summary: "Duck, shed dangerous winners and help partner after a failed nil.", action: "nil"
    },
    {
      id: "spades-bags",
      step: "Tactic",
      title: "Avoid extra bags",
      summary: "Extra tricks still score, but they become bags you should track.",
      action: "bags"
    },
    {
      id: "spades-scoring",
      step: "Scoring",
      title: "Score a hand",
      summary: "Separate contract points, nil, bags and the ten-bag penalty.",
      action: "score"
    },
    {
      id: "spades-settlement", step: "Scoring", title: "Nil and set bids",
      summary: "Score a missed bid and successful nil, including when partner is set.", action: "settle"
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
          id: "books-and-partners", label: "Books", title: "Win your books",
          summary: "Identify the winner, the partnership and who leads next.", action: "object", group: "fixed-drills"
        },
        {
          id: "follow-suit",
          label: "Rule",
          title: "Follow suit",
          summary: "Play three short table decisions where the led suit comes before trump.",
          action: "follow",
          group: "fixed-drills"
        },
        {
          id: "trump-or-discard",
          label: "Trump",
          title: "Trump or discard",
          summary: "Practice when to cut, preserve, or overtrump with spades.",
          action: "trump",
          group: "fixed-drills"
        },
        {
          id: "legal-leads", label: "Rule", title: "Lead spades legally",
          summary: "Try the unbroken-spades rule and its exceptions.", action: "lead", group: "fixed-drills"
        },
        {
          id: "bid-books",
          label: "Bidding",
          title: "Bid books",
          summary: "Read three full thirteen-card hands and choose a starter bid or nil.",
          action: "bid",
          group: "fixed-drills"
        },
        {
          id: "play-nil", label: "Nil", title: "Play nil",
          summary: "Keep nil intact and change plans after it fails.", action: "nil", group: "fixed-drills"
        },
        {
          id: "score-hand", label: "Scoring", title: "Score a hand",
          summary: "Calculate made bids, failed nil and a ten-bag penalty.", action: "score", group: "fixed-drills"
        },
        {
          id: "bags",
          label: "Scoring",
          title: "Avoid bags",
          summary: "Practice ducking extra tricks while still protecting nil when it matters.",
          action: "bags",
          group: "fixed-drills"
        },
        {
          id: "nil-settlement", label: "Scoring", title: "Nil and set bids",
          summary: "Separate nil success from partner's made or missed contract.", action: "settle", group: "fixed-drills"
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
      "Play a partnership hand with spades always trump. The table estimates hidden bids, you adjust your own, and the hand scores nil, bags, and ten-bag penalties.",
    footerNote: "You and Barbu play against Left and Right."
  },
  proTabConfig: {
    featuresAriaLabel: "Spades pro features",
    headingTitle: "More Spades.",
    headingSummary: "Play subscriber AI partners, competitive matches, and advanced bid review."
  }
};
