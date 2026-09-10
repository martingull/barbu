import type { GameDefinition } from "../gameRegistry";
import { createGameTableDefinition } from "../tableFactory";

export type BridgeLearnPathAction = "bidding" | "declarer" | "dummy" | "defense";
export type BridgePracticeAction = "bidding" | "declarer" | "defense";

export const bridgeDef: GameDefinition<BridgeLearnPathAction | BridgePracticeAction> = {
  table: createGameTableDefinition({
    id: "bridge",
    title: "Bridge table",
    family: "Bridge",
    referenceId: "bridge",
    scorecard: {
      label: "Bridge scorecard",
      unitLabel: "Points",
      objective: "Contract vs Tricks made",
      leaderRule: "high-score"
    },
    learn: {
      pathAriaLabel: "Bridge lesson path",
      pathEyebrow: "Training path",
      pathTitle: "Learn the Bridge table",
      progressAriaLabel: "Bridge course progress",
      nextSummary: "Open a compact Bridge decision, then repeat the same habit in practice.",
      completeSummary: "You have tried the first Bridge habits: opening bids, declarer play, the dummy, and defense.",
      referenceSummary: "Check the Bridge baseline: basic natural bidding, declarer play, the dummy, and defense."
    },
    tabIntros: {
      learn: {
        eyebrow: "Learn",
        title: "Learn declarer and defense.",
        summary:
          "Bridge introduces basic natural bidding, the dummy, declarer play, and partnership defense."
      },
      practice: {
        eyebrow: "Practice",
        title: "Repeat one Bridge habit.",
        summary: "Repeat opening-bid, declarer-play, and defense decisions, then test the same habits in a full Bridge hand."
      },
      play: {
        eyebrow: "Play",
        title: "Play a Bridge hand.",
        summary:
          "Play South and North against East and West. Bid a natural system, declare the contract, and play with a visible dummy."
      },
      perfect: {
        eyebrow: "Pro",
        title: "Paid Bridge tables.",
        summary: "Pro is for subscriber AI partnerships and competitive play."
      }
    },
    defaultTab: "play",
    actionsByTab: {
      learn: [
        { id: "reference", label: "Reference", destination: "Bridge reference" },
        { id: "bidding", label: "Bidding", destination: "Bridge bidding concept" },
        { id: "declarer", label: "Declarer play", destination: "Bridge declarer concept" },
        { id: "dummy", label: "The Dummy", destination: "Bridge dummy concept" },
        { id: "defense", label: "Defense", destination: "Bridge defense concept" }
      ],
      practice: [
        { id: "bidding", label: "Bidding", destination: "Bridge practice: Bidding" },
        { id: "declarer-play", label: "Declarer play", destination: "Bridge practice: Declarer play" },
        { id: "defense", label: "Defense", destination: "Bridge practice: Defense" }
      ],
      play: [{ id: "play-bridge", label: "Play Bridge", destination: "Bridge partnership hand" }]
    }
  }),
  learnSteps: [
    {
      id: "bridge-bidding",
      step: "System",
      title: "Opening bids",
      summary: "Use basic natural bidding: 15-17 balanced opens 1NT, five-card majors open first, and weak hands pass.",
      action: "bidding"
    },
    {
      id: "bridge-declarer",
      step: "Concept",
      title: "Declarer play",
      summary: "The declarer plays both their own hand and their partner's exposed hand.",
      action: "declarer"
    },
    {
      id: "bridge-dummy",
      step: "Rule",
      title: "The Dummy",
      summary: "After the opening lead, the declarer's partner exposes their hand as the dummy.",
      action: "dummy"
    },
    {
      id: "bridge-defense",
      step: "Partnership",
      title: "Defense",
      summary: "The defenders work together to defeat the declarer's contract.",
      action: "defense"
    }
  ],
  practiceGroups: [
    {
      id: "bridge-drills",
      ariaLabel: "Bridge practice drills",
      eyebrow: "Practice set",
      title: "Practice one Bridge habit.",
      layout: "entry-grid",
      entries: [
        {
          id: "bidding",
          label: "Bidding",
          title: "Opening bids",
          summary: "Practice pass, 1NT, and five-card-major openings from the Bridge table.",
          action: "bidding",
          group: "bridge-drills"
        },
        {
          id: "declarer-play",
          label: "Declarer",
          title: "Declarer play",
          summary: "Practice finesses, establishing long suits, and timing winners in no trump.",
          action: "declarer",
          group: "bridge-drills"
        },
        {
          id: "defense",
          label: "Defense",
          title: "Defense",
          summary: "Practice opening leads, third-hand play, and preserving partner's winners.",
          action: "defense",
          group: "bridge-drills"
        }
      ]
    }
  ],
  playTabConfig: {
    actionAriaLabel: "Bridge play actions",
    groupAriaLabel: "Bridge partnership hand",
    groupEyebrow: "Partnership hand",
    primaryLabel: "Play Bridge"
  },
  proTabConfig: {
    featuresAriaLabel: "Bridge pro features",
    headingTitle: "More Bridge.",
    headingSummary: "Play subscriber AI contracts or competitive settlement tables."
  }
};
