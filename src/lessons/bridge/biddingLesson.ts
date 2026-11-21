import { standardDeck } from "../../domain/deck";
import { bridgeHighCardPoints } from "../../domain/bridgeBidding";
import { bridgeCallLabel } from "../../domain/bridgeAuction";
import { bridgeBiddingSystems, type BridgeBiddingSystemId } from "../../domain/bridgeSystems";
import type { BridgeAuctionCall } from "../../domain/types";
import { teachingStages } from "../learningPresentation";
import type { BridgeChoiceStep } from "./learning";

export type BiddingExample = { title: string; prompt: string; why: string; options: string[];
  positions: [{ hand: string; call: string; calls?: BridgeAuctionCall[] }, { hand: string; call: string; calls?: BridgeAuctionCall[] }] };

export function biddingLesson(topic: string, system: BridgeBiddingSystemId, principle: string, examples: BiddingExample[]): BridgeChoiceStep[] {
  const deck = standardDeck(), prefix = system === "acol-foundation" ? "acol" : "american";
  return examples.map((spec, index) => {
    const make = (position: BiddingExample["positions"][number], followUp: boolean): BridgeChoiceStep => {
      const hand = position.hand.split(" ").map(id => {
        const card = deck.find(card => card.id === id);
        if (!card) throw Error(`Unknown bidding lesson card ${id}`);
        return card;
      });
      const calls = position.calls ?? [];
      return { id: `bridge-${prefix}-${topic}-${index}${followUp ? "-follow-up" : ""}`, title: spec.title, prompt: spec.prompt,
        context: calls.length ? calls.map(call => `${({ Tutor: "North", Right: "East", You: "South", Left: "West", Unknown: "Unknown" })[call.seat]}: ${bridgeCallLabel(call.call)}`).join(". ") + ". South to call." : "South deals. No calls yet.",
        contextDetail: `${bridgeBiddingSystems[system].name}. You: ${bridgeHighCardPoints(hand)} HCP.`, hand, auction: calls,
        options: spec.options.map(id => ({ id, label: bridgeCallLabel(id) })), correct: position.call,
        explanations: Object.fromEntries(spec.options.map(id => [id, `${id === position.call ? "Good." : "Compare the strength, shape and earlier calls."} ${spec.why}`])),
        teaching: { stage: followUp ? "reinforcement" : teachingStages[index], guidance: followUp ? principle
          : index === 0 ? `Try ${bridgeCallLabel(position.call)}. ${spec.why}` : index === 1 ? principle : undefined } };
    };
    return { ...make(spec.positions[0], false), followUp: make(spec.positions[1], true) };
  });
}
