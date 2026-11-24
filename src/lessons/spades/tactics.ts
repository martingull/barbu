import { standardDeck } from "../../domain/deck";
import { legalSpadesCards } from "../../domain/spadesRules";
import type { GuidedCardOutcome, Seat } from "../../domain/types";
import type { DrillStep } from "../drillDecision";

export type SpadesTacticTopic = "nil" | "lead";
type Position = {
  id: string; title: string; hand: string; table?: string; prompt: string;
  good: string[]; feedback: Record<string, string>; penalty?: string[]; broken?: boolean;
};
const positions: Record<SpadesTacticTopic, Position[]> = {
  nil: [
    { id: "duck", title: "Duck your dangerous card", hand: "3C QC 8S", table: "9C JC KC",
      prompt: "Your nil is intact: you have no tricks. Clubs were led and all three other players have played. Lose this trick while shedding your higher club.", good: ["QC"],
      feedback: { QC: "Q♣ stays below K♣ and removes your more dangerous club. Your nil survives this trick.",
        "3C": "3♣ safely loses too, but leaves Q♣ to escape later. Q♣ is the higher card you can shed now.", "8S": "You must follow clubs. A spade is illegal while you still hold clubs." } },
    { id: "discard", title: "Discard a future winner", hand: "AH 4H 8S", table: "9D KD AD",
      prompt: "Your nil is intact. You have no diamonds. All three other players have played; remove your dangerous ace without winning.", good: ["AH"], penalty: ["8S"],
      feedback: { AH: "A♥ cannot win a diamond trick. Discarding it removes a future forced winner and keeps nil intact.",
        "4H": "4♥ loses legally, but leaves A♥ as a danger later. This is a chance to discard the ace safely.", "8S": "8♠ trumps the diamonds and wins. Your nil fails, costing 100 points." } },
    { id: "failed", title: "After your nil fails", hand: "3H AH 7S", table: "9H KH 4H",
      prompt: "Your nil already failed on an earlier trick. Barbu bid four and has three bid books. Barbu's K♥ is winning; keep this needed book with partner.", good: ["3H"],
      feedback: { "3H": "3♥ leaves the book with Barbu, completing partner's bid. Your failed-nil tricks cannot fulfil that bid.",
        AH: "A♥ overtakes Barbu. It would be a failed-nil bag, not the fourth book toward partner's bid.", "7S": "Hearts were led and you have hearts. You must follow suit." } }
  ],
  lead: [
    { id: "unbroken", title: "Before spades are broken", hand: "4C 5D QS AS",
      prompt: "You lead with four cards left. No spade has been played. Choose a legal lead while you still have a plain suit.", good: ["4C", "5D"],
      feedback: { "4C": "4♣ is legal. While spades are unbroken and you hold a plain suit, lead a plain suit.",
        "5D": "5♦ is legal too. Either plain-suit card may be led; a spade may not.", QS: "Q♠ cannot be led yet: spades are unbroken and you still hold plain-suit cards.", AS: "Even A♠ cannot be led before spades break while you hold another suit." } },
    { id: "broken", title: "After a spade is played", hand: "AS 3D 8D", broken: true,
      prompt: "Earlier, a player trumped a club lead with a spade. Neither partner bid nil and your side needs a book. Choose the certain winner you may now lead.", good: ["AS"],
      feedback: { AS: "A♠ is now a legal lead and cannot be beaten. The earlier trump broke spades; you may lead them even with diamonds remaining.",
        "3D": "3♦ is legal, but not a certain winner. With nil absent and a book needed, A♠ gives the sure trick.", "8D": "8♦ is legal too, but can be beaten. A♠ is the certain winner for this question." } },
    { id: "only-spades", title: "Only spades remain", hand: "2S 5S JS AS",
      prompt: "No spade has been played, but all four cards left in your hand are spades. Choose any legal lead. This question tests permission, not the best tactic.", good: ["2S", "5S", "JS", "AS"],
      feedback: Object.fromEntries(["2S", "5S", "JS", "AS"].map(id => [id, "Every card in this hand is a legal lead. Holding only spades is the exception to waiting for spades to break; it does not guarantee that every spade will win."])) }
  ]
};
const companions: Record<SpadesTacticTopic, Position[]> = {
  nil: [
    { id: "duck-again", title: "Shed the higher loser", hand: "4D QD 9S", table: "8D JD KD",
      prompt: "Your nil is still intact. Diamonds were led; you play last. Shed your higher diamond without taking the trick.", good: ["QD"],
      feedback: { QD: "Q♦ loses to K♦ and removes your higher diamond. Nil stays intact.", "4D": "4♦ loses safely, but leaves Q♦ for later. Shed the queen under this king.", "9S": "You have diamonds, so you cannot trump this trick." } },
    { id: "discard-again", title: "Throw the ace away", hand: "AC 3C 6S", table: "9H QH AH",
      prompt: "Your nil is intact. You are void in hearts and play last. Remove the card most likely to force a later win.", good: ["AC"], penalty: ["6S"],
      feedback: { AC: "A♣ is off suit and cannot win this heart trick. Discard it to remove a dangerous winner.", "3C": "3♣ is safe now, but keeps A♣ in your hand. Use this opportunity to discard the ace.", "6S": "6♠ wins by trumping. Winning any trick breaks your nil." } },
    { id: "failed-again", title: "Let partner complete the bid", hand: "2C AC JS", table: "8C KC 4C",
      prompt: "You bid nil but already took a trick. Barbu bid three and has two books. Barbu's K♣ is winning; help partner meet the bid.", good: ["2C"],
      feedback: { "2C": "2♣ leaves the third bid book with Barbu. The failed-nil penalty remains, but partner's contract succeeds.", AC: "A♣ would take the book away from Barbu and add a failed-nil bag instead. Nil tricks do not count toward partner's bid.", JS: "Clubs were led and you hold clubs. J♠ is illegal." } }
  ],
  lead: [
    { id: "unbroken-again", title: "Keep the spades for later", hand: "4H 6C KS JS",
      prompt: "Four cards remain. Spades are unbroken and you lead. Choose any legal plain-suit lead.", good: ["4H", "6C"],
      feedback: { "4H": "4♥ is a legal lead before spades are broken.", "6C": "6♣ is legal too. You can choose either plain suit.", KS: "K♠ is not a legal lead yet while another suit remains.", JS: "J♠ cannot be led before spades break while you have a plain suit." } },
    { id: "broken-again", title: "Use a legal trump winner", hand: "AS 2H 7H", broken: true,
      prompt: "A spade trumped a diamond earlier. Your side still needs a book and neither partner bid nil. Lead the card that cannot be beaten.", good: ["AS"],
      feedback: { AS: "A♠ is a legal lead after spades break, and it guarantees the needed book.", "2H": "2♥ is legal but not a guaranteed winner. The ace of trumps supplies the sure book.", "7H": "7♥ is legal but can lose. A♠ is the certain winner requested here." } },
    { id: "only-spades-again", title: "The all-spades exception", hand: "3S 6S 10S QS",
      prompt: "No spade has appeared, but your four remaining cards are all spades. Choose any permitted lead, not necessarily a winning one.", good: ["3S", "6S", "10S", "QS"],
      feedback: Object.fromEntries(["3S", "6S", "10S", "QS"].map(id => [id, "Any of these spades may be led because you have no other suit. Legal does not mean certain to win."])) }
  ]
};
const cards = (ids: string) => ids.split(" ").map(id => {
  const card = standardDeck().find(card => card.id === id);
  if (!card) throw Error(`Unknown Spades teaching card: ${id}`);
  return card;
});
function tactic(topic: SpadesTacticTopic, position: Position): DrillStep {
  const hand = cards(position.hand), lead = topic === "lead";
  const table = position.table ? cards(position.table).map((card, index) => ({ card, seat: (["Left", "Tutor", "Right"] as Seat[])[index] })) : [];
  const legal = legalSpadesCards(hand, table[0]?.card.suit, position.broken ?? false);
  return { scenarioId: `spades-${topic}-${position.id}`, contract: "Spades", title: lead ? "Lead spades legally" : "Play nil",
    ...(lead ? { choiceMode: "select" as const, showTable: false } : {}),
    trick: { title: position.title, beforeResult: position.prompt, afterResult: position.feedback[position.good[0]],
      emptyExplanation: lead ? "Choose a lead from your remaining cards. No later cards are known." : "Follow suit first, then consider your nil and partner's bid.",
      hand, tableBeforeChoice: table, tableAfterChoice: [], pendingBySeat: { You: lead ? "Choose a lead" : "Your choice" },
      legalCardIds: legal.map(card => card.id), playedExplanations: position.feedback,
      cardOutcomes: Object.fromEntries(hand.map(card => [card.id, position.good.includes(card.id) ? "good" : position.penalty?.includes(card.id) ? "penalty" : "risky"])) as Record<string, GuidedCardOutcome>,
      cardReasons: lead ? Object.fromEntries(hand.filter(card => !legal.includes(card)).map(card => [card.id, "illegal_lead" as const])) : undefined }
  };
}
export function spadesTacticSteps(topic: SpadesTacticTopic): DrillStep[] {
  return positions[topic].map((position, index) => ({ ...tactic(topic, position), followUp: tactic(topic, companions[topic][index]) }));
}
