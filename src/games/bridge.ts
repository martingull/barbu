import type { GameDefinition } from "./gameRegistry";
import { createGameTableDefinition, gameRulesCopy } from "./tableFactory";
import { bridgeSystemAgreement, type BridgeBiddingSystemId } from "../domain/bridgeSystems";

export type BridgeLearnPathAction = "contracts" | "bidding" | "responding" | "support" | "rebidding" | "stayman" | "transfers" | "declarer" | "dummy" | "defense";
export type BridgePracticeAction = "bidding" | "responding" | "support" | "rebidding" | "stayman" | "transfers" | "declarer" | "defense";

export const bridgeBiddingAgreement = "Barbu Natural: five-card majors and a 15-17 1NT. Not Acol or complete SAYC; check your club's agreements.";
export const bridgeBiddingSkillId = (id: string, system: BridgeBiddingSystemId) =>
  system !== "barbu-natural" && ["bridge-bidding", "bridge-responding", "bridge-support", "bridge-rebidding", "bridge-stayman", "bridge-transfers"].includes(id)
    ? id.replace("bridge-", system === "acol-foundation" ? "bridge-acol-" : "bridge-american-") : id;

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
      completeSummary: "You have tried opening bids, responding to partner, declarer play, the dummy, and defense.",
    },
    tabIntros: {
      learn: {
        eyebrow: "Learn",
        title: "Learn declarer and defense.",
        summary:
          `Learn bidding, dummy, declarer play and defense. ${bridgeBiddingAgreement}`
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
        { id: "reference", label: gameRulesCopy.referenceTitle, destination: "Bridge rules" },
        { id: "bidding", label: "Bidding", destination: "Bridge bidding concept" },
        { id: "responding", label: "Respond to 1NT", destination: "Bridge responding concept" },
        { id: "support", label: "Support partner's major", destination: "Bridge support concept" },
        { id: "declarer", label: "Declarer play", destination: "Bridge declarer concept" },
        { id: "dummy", label: "The Dummy", destination: "Bridge dummy concept" },
        { id: "defense", label: "Defense", destination: "Bridge defense concept" }
      ],
      play: [{ id: "play-bridge", label: "Play Bridge", destination: "Bridge partnership hand" }]
    }
  }),
  learnSteps: [
    {
      id: "bridge-contracts", step: "Start", title: "Read the contract",
      summary: "Find the trump suit and the number of tricks your partnership needs.", action: "contracts"
    },
    {
      id: "bridge-dummy", step: "Seats", title: "The Dummy",
      summary: "Keep declarer and dummy separate, and play from the hand whose turn it is.", action: "dummy"
    },
    {
      id: "bridge-bidding",
      step: "System",
      title: "Opening bids",
      summary: "Use basic natural bidding: 15-17 balanced opens 1NT, five-card majors open first, and weak hands pass.",
      action: "bidding"
    },
    {
      id: "bridge-responding", step: "Partnership", title: "Respond to 1NT",
      summary: "Add your strength to partner's range: pass, invite, or bid game.", action: "responding"
    },
    {
      id: "bridge-support", step: "Fit", title: "Support partner's major",
      summary: "Find an eight-card fit, then choose a simple raise, an invitation or game.", action: "support"
    },
    {
      id: "bridge-declarer",
      step: "Concept",
      title: "Declarer play",
      summary: "The declarer plays both their own hand and their partner's exposed hand.",
      action: "declarer"
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
          id: "responding", label: "Respond", title: "Respond to 1NT",
          summary: "Choose a partnership target after a 15-17 1NT opening.",
          action: "responding", group: "bridge-drills"
        },
        {
          id: "support", label: "Support", title: "Support partner's major",
          summary: "Raise partner's five-card major with support and the right strength.",
          action: "support", group: "bridge-drills"
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

export function bridgeDefinitionFor(system: BridgeBiddingSystemId): GameDefinition {
  if (system === "barbu-natural") return bridgeDef;
  const learnSteps: GameDefinition["learnSteps"] = bridgeDef.learnSteps.map(step => ({ ...step, id: bridgeBiddingSkillId(step.id, system),
    summary: step.action === "bidding" && system === "acol-foundation" ? "Count points, use a weak 1NT, or open a four-card suit with a plan for your rebid." : step.summary }));
  learnSteps.splice(5, 0,
    { id: bridgeBiddingSkillId("bridge-rebidding", system), step: "Rebid", title: "Rebid in notrump", action: "rebidding", summary: system === "acol-foundation" ? "Show 15-19 balanced after opening a suit and hearing a one-level response." : "Distinguish a 12-14 notrump rebid from an 18-19 jump rebid." },
    { id: bridgeBiddingSkillId("bridge-stayman", system), step: "Enquire", title: "Find a major with Stayman", action: "stayman", summary: "Ask about a four-card major, interpret the answer and choose the target." });
  if (system === "standard-american") learnSteps.splice(7, 0, {
    id: bridgeBiddingSkillId("bridge-transfers", system), step: "Transfer", title: "Use Jacoby transfers", action: "transfers", summary: "Show a five-card major, let partner bid it, then describe your strength." });
  return { ...bridgeDef, learnSteps, table: { ...bridgeDef.table,
    tabs: { ...bridgeDef.table.tabs, learn: { ...bridgeDef.table.tabs.learn,
      intro: { ...bridgeDef.table.tabs.learn.intro,
        summary: `Learn bidding, dummy, declarer play and defense. ${bridgeSystemAgreement(system)}` } } } },
    practiceGroups: bridgeDef.practiceGroups.map(group => ({ ...group, entries: [
      ...(group.entries ?? []).map(entry => ({ ...entry, summary: learnSteps.find(step => step.action === entry.action)?.summary ?? entry.summary })),
      ...learnSteps.filter(step => ["rebidding", "stayman", "transfers"].includes(step.action)).map(step => ({
        id: step.action, label: step.title, title: step.title, summary: step.summary, action: step.action, group: group.id }))
    ] })) };
}
