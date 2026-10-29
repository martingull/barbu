import { standardDeck } from "../../domain/deck";
import { legalCards, trickWinner } from "../../domain/trickTakingRules";
import type { Seat } from "../../domain/types";
import { formatCardLabel, formatCardList } from "../../presentation/cardDisplay";
import { scoreSeatLabel } from "../../presentation/scorePresentation";
import { drillTableCards, type DrillStep } from "../drillDecision";
import { teachingStages } from "../learningPresentation";
import { spadesFollowSuitDrillPool, spadesTrumpOrDiscardDrillPool, spadesBidBooksDrillPool, spadesAvoidBagsDrillPool } from "./exercises";

export type SpadesLearningTopic = "follow" | "trump" | "bid" | "bags";
const pools = { follow: spadesFollowSuitDrillPool, trump: spadesTrumpOrDiscardDrillPool, bid: spadesBidBooksDrillPool, bags: spadesAvoidBagsDrillPool };
const principles = {
  follow: "Follow the led suit. If partner is winning, consider saving your high card; if an opponent is winning, check whether your side needs the trick.",
  trump: "When void, any card is legal. Use the lowest winning spade for a needed trick, or save trump if partner is already winning.",
  bid: "Count likely winners, not every high card. High spades and protected kings matter; nil means taking no tricks.",
  bags: "Once the partnership bid is covered, extra tricks become bags. Protecting partner's intact nil can be worth an extra trick."
};
export const spadesTakeaway = (action: string) => principles[action as SpadesLearningTopic] ?? principles.follow;

type Companion = { hand: string; table: string; good: string; prompt: string; explanation: string };
const companions: Record<SpadesLearningTopic, Companion[]> = {
  follow: [
    { hand: "2D AD 7S", table: "9D KD 5D", good: "2D", prompt: "Diamonds were led. Barbu, your non-nil partner, is winning. Follow suit and save strength.", explanation: "2♦ follows suit and leaves Barbu's K♦ winning. A♦ is legal but spends another winner; 7♠ cannot be played while you have diamonds." },
    { hand: "3C AC JS", table: "7C KC 4C", good: "3C", prompt: "Barbu is winning with K♣ and did not bid nil. Follow clubs without spending another winner.", explanation: "3♣ keeps the trick with Barbu. A♣ overtakes partner without adding a partnership trick, while J♠ is illegal." },
    { hand: "2D KD 8S", table: "8D 3D QD", good: "KD", prompt: "Your side needs a trick and neither partner bid nil. Right is winning with Q♦; you must follow diamonds.", explanation: "K♦ beats Right's Q♦ and wins a needed book. 2♦ lets Right win; 8♠ is illegal while you have diamonds." }
  ],
  trump: [
    { hand: "3S JS 6C", table: "8D 2D KD", good: "3S", prompt: "You have no diamonds. Your side needs a book and neither partner bid nil. Right is winning with K♦.", explanation: "3♠ is enough to win. J♠ spends more trump than needed; 6♣ discards without winning." },
    { hand: "4S QS 7H", table: "KC AC 3C", good: "7H", prompt: "You have no clubs. Barbu is winning with A♣ and did not bid nil. Preserve your trump.", explanation: "7♥ leaves the book with Barbu and keeps both spades. Trumping would take partner's book, not add another one." },
    { hand: "8S AS 4D", table: "KH 2H 6S", good: "8S", prompt: "Your side needs a book and neither partner bid nil. Hearts were led, but Right trumped with 6♠. You have no hearts.", explanation: "8♠ overtrumps 6♠. A♠ wins too but spends your strongest trump; 4♦ cannot win." }
  ],
  bid: [
    { hand: "AS 8H 2D", table: "", good: "AS", prompt: "This is a hand excerpt, not a full bid. Identify the surest winner.", explanation: "A♠ is the highest trump and wins when played legally. Neither low side card is a reliable book." },
    { hand: "KD 4D KC", table: "", good: "KD", prompt: "Which king has protection from another card in its suit?", explanation: "4♦ protects K♦ from being forced under A♦ immediately. K♣ is a singleton. A protected king is an estimate, not a guaranteed winner." },
    { hand: "KS 2H 5C", table: "", good: "KS", prompt: "Which card makes a nil bid dangerous?", explanation: "K♠ can be hard to lose. Nil requires zero tricks; the low side cards are easier to duck." }
  ],
  bags: [
    { hand: "3H AH 9S", table: "8H 2H KH", good: "3H", prompt: "Your side bid five and has five books. No partner bid nil. Avoid an extra book while following hearts.", explanation: "3♥ leaves the trick with Right. A♥ wins an extra bag; 9♠ is illegal because you still have hearts." },
    { hand: "5S QS 2C", table: "KD 3D AD", good: "2C", prompt: "Your side has made its bid, with no nil to protect. You have no diamonds. Avoid another bag.", explanation: "2♣ discards without winning. Either spade would trump A♦ and add a bag." },
    { hand: "QD 4D 7S", table: "3D JD 9D", good: "QD", prompt: "Barbu's nil is still intact, but J♦ is winning. Your partnership already has its bid. Protect nil.", explanation: "Q♦ takes the trick away from Barbu, preserving the possible +100 nil bonus even if you gain a bag. 4♦ breaks Barbu's nil; 7♠ is illegal." }
  ]
};
const cards = (ids: string) => ids ? ids.split(" ").map(id => {
  const card = standardDeck().find(card => card.id === id);
  if (!card) throw Error(`Unknown teaching card ${id}`);
  return card;
}) : [];
function companionStep(spec: Companion, topic: SpadesLearningTopic, index: number): DrillStep {
  const hand = cards(spec.hand);
  const table = cards(spec.table).map((card, i) => ({ card, seat: (["Left", "Tutor", "Right"] as Seat[])[i] }));
  return { scenarioId: `spades-${topic}-follow-up-${index}`, contract: "Spades", title: pools[topic][index].title,
    choiceMode: topic === "bid" ? "select" : undefined, trick: {
      title: "Another example", hand, tableBeforeChoice: table, tableAfterChoice: [], pendingBySeat: { You: "Your choice" },
      legalCardIds: legalCards(hand, table[0]?.card.suit).map(card => card.id),
      beforeResult: spec.prompt, afterResult: spec.explanation, emptyExplanation: "Choose a card for this position.",
      playedExplanations: Object.fromEntries(hand.map(card => [card.id, spec.explanation])),
      cardOutcomes: Object.fromEntries(hand.map(card => [card.id, card.id === spec.good ? "good" : "risky"]))
    } };
}
function withBreakdown(step: DrillStep): DrillStep {
  return { ...step, breakdownByCard: Object.fromEntries(step.trick.hand.map(card => {
    const legal = step.trick.legalCardIds.includes(card.id);
    const winner = !step.choiceMode && legal ? trickWinner(drillTableCards(step, card), "S") : undefined;
    const rows = !legal ? [{ label: "Legal cards", value: formatCardList(step.trick.hand.filter(c => step.trick.legalCardIds.includes(c.id))) }]
      : winner ? [{ label: "Winner", value: `${scoreSeatLabel(winner.seat)}: ${formatCardLabel(winner.card)}` },
        { label: "Why", value: winner.card.suit === "S" ? "Highest spade (trump)" : "Highest card of the led suit" },
        { label: "Book for", value: winner.seat === "You" || winner.seat === "Tutor" ? "You + Barbu" : "Left + Right" }]
      : [{ label: "Chosen card", value: formatCardLabel(card) }, { label: "Bid estimate", value: "A hand excerpt, not a full 13-card bid" }];
    return [card.id, { label: "Spades decision breakdown", rows }];
  })) };
}
export function spadesLearningSteps(topic: SpadesLearningTopic): DrillStep[] {
  return pools[topic].map((original, index) => {
    const step = withBreakdown({ ...original, choiceMode: topic === "bid" ? "select" : undefined });
    const answer = step.trick.hand.find(card => step.trick.cardOutcomes?.[card.id] === "good")!;
    return { ...step, teaching: { stage: teachingStages[index], guidance: index === 0
      ? `Try ${formatCardLabel(answer)}. ${step.trick.playedExplanations[answer.id]}`
      : index === 1 ? principles[topic] : undefined },
      followUp: { ...withBreakdown(companionStep(companions[topic][index], topic, index)), teaching: { stage: "reinforcement" } } };
  });
}
