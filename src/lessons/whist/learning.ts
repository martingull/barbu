import { standardDeck } from "../../domain/deck";
import { legalCards, trickWinner } from "../../domain/trickTakingRules";
import { whistOddTricksForSide } from "../../domain/whistScoring";
import type { Seat, Suit } from "../../domain/types";
import type { WhistPracticeAction } from "../../games/whist";
import { formatCardLabel, formatCardList } from "../../presentation/cardDisplay";
import { scoreSeatLabel } from "../../presentation/scorePresentation";
import { drillTableCards, type DrillStep } from "../drillDecision";
import { teachingStages } from "../learningPresentation";
import { whistFollowSuitDrillPool, whistTrumpOrDiscardDrillPool, whistThirdHandHighDrillPool,
  whistReturnPartnerSuitDrillPool, whistOpeningLeadLessonPool, whistOddTrickDrillPool } from "./exercises";

const pools = { lead: whistOpeningLeadLessonPool, follow: whistFollowSuitDrillPool, trump: whistTrumpOrDiscardDrillPool,
  third: whistThirdHandHighDrillPool, return: whistReturnPartnerSuitDrillPool, odd: whistOddTrickDrillPool };
type WhistStep = DrillStep & { trump: Suit; playerTricksBefore?: number };
const principles = {
  lead: "Opening leads communicate through cards: often fourth highest from broken length, top of an honour sequence. These are conventions, not compulsory plays.",
  follow: "Follow the led suit whenever possible. Then ask which partnership is winning and whether spending strength helps.",
  trump: "When void, you may trump or discard. Use enough trump to win a useful trick, or preserve it when partner is already winning.",
  third: "Third hand high allows for the unseen fourth hand. Save strength when partner is secure; use the cheaper of equivalent winners.",
  return: "Partner's earlier lead can invite a suit back. Consider returning it, but reconsider when shown voids or exhausted winners make it unhelpful.",
  odd: "Only tricks above six score: seven earns one point, eight earns two. Five points wins a game; two games wins a rubber."
};
export const whistTakeaway = (action: string) => principles[action as WhistPracticeAction] ?? principles.follow;

type Companion = { hand: string; table: string; after?: string; good: string; trump: Suit; prompt: string; explanation: string; playerTricksBefore?: number };
const companions: Record<WhistPracticeAction, Companion[]> = {
  follow: [
    { hand: "2D AD 8S", table: "9D QD", after: "5D", good: "AD", trump: "S", prompt: "Barbu led diamonds and Right covered with the queen. You play third. Follow suit and support your side.", explanation: "A♦ follows suit and beats Q♦. 2♦ leaves Right ahead; 8♠ is illegal while you have diamonds. Left still had a turn when you chose." },
    { hand: "3C KC 7S", table: "8C", after: "AC QC", good: "3C", trump: "H", prompt: "Right led clubs. You play second, before Left and Barbu. Keep strength while following suit.", explanation: "3♣ follows low, preserving K♣ for later. K♣ spends strength before partner acts; 7♠ is illegal. Second hand low is a guideline, not a guarantee." },
    { hand: "3H KH 9D", table: "8H 4H QH", good: "KH", trump: "C", prompt: "Left led hearts. Barbu followed low and Right played the queen. You play last.", explanation: "K♥ beats Right's Q♥ and secures this trick. 3♥ lets Right win; 9♦ is illegal while you have hearts." }
  ],
  trump: [
    { hand: "3H JH 7C", table: "8D 2D AD", good: "3H", trump: "H", prompt: "You play last with no diamonds. Right is winning with the ace. Win without spending more trump than needed.", explanation: "3♥ is enough to trump A♦. J♥ wins but spends more; 7♣ is a legal discard, not a winner." },
    { hand: "4D KD 9C", table: "10S AS 5S", good: "9C", trump: "D", prompt: "You have no spades and play last. Barbu's ace is winning. Keep your trump for another trick.", explanation: "9♣ leaves the trick with Barbu. Either diamond overtakes your own partner without adding a partnership trick." },
    { hand: "8C QC 4H", table: "KD 2D 6C", good: "8C", trump: "C", prompt: "Diamonds were led; Right trumped with 6♣. You have no diamonds and play last.", explanation: "8♣ overtrumps Right. Q♣ also wins but costs more; 4♥ is a legal discard. Overtrumping is optional, not a rule." }
  ],
  third: [
    { hand: "AS 3S 6D", table: "10S QS", after: "7S", good: "AS", trump: "D", prompt: "Barbu led spades, Right played the queen, and Left still has a turn. Support partner.", explanation: "A♠ beats Q♠ and protects against a higher spade in fourth hand. 3♠ leaves Right ahead; 6♦ is illegal while you have spades." },
    { hand: "2H AH 8C", table: "KH 5H", after: "9H", good: "2H", trump: "S", prompt: "Barbu led K♥. Right followed low. You hold the ace, so no higher heart is outside your hand.", explanation: "2♥ leaves Barbu's king ahead without spending your ace. A♥ overtakes partner; 8♣ is illegal. A later trump could still beat the king." },
    { hand: "QC AC 4D", table: "8C JC", after: "KC", good: "AC", trump: "H", prompt: "Barbu led clubs and Right played J♣. You play third; K♣ is unaccounted for.", explanation: "A♣ allows for an unseen king in fourth hand. Q♣ only beats the cards already visible; 4♦ is illegal while you have clubs." }
  ],
  lead: [
    { hand: "QD 10D 8D 6D 2D KC 7S", table: "", good: "6D", trump: "H", prompt: "Choose a lead from your long diamonds, Q-10-8-6-2, using the fourth-highest convention.", explanation: "6♦ is fourth highest from this broken five-card suit. It invites diamonds without spending Q♦; the other suits do not show that length." },
    { hand: "KS QS JS 5S AD 8C", table: "", good: "KS", trump: "C", prompt: "Choose the conventional lead from your K-Q-J spade sequence.", explanation: "K♠ leads the top of the sequence. Q♠ or J♠ hides a higher touching honour; another suit does not show this strength." },
    { hand: "AD KD AH 5H 3H 8S", table: "", good: "AH", trump: "D", prompt: "Choose a plain-suit ace to cash while keeping your two top trumps for later.", explanation: "A♥ is the plain-suit ace. A♦ and K♦ spend trump control; a lower heart does not cash the ace now. This is a plan, not a ban on leading trump." }
  ],
  return: [
    { hand: "7H KD 5C", table: "", good: "7H", trump: "S", prompt: "You are on lead. Barbu previously led hearts from strength; no opponent has shown a heart void. Choose the return.", explanation: "7♥ returns the invited suit. K♦ and 5♣ change suits instead. Partner's lead is evidence, not a promise of a winner." },
    { hand: "3D QH JC", table: "", good: "3D", trump: "S", prompt: "Barbu previously invited diamonds. You are on lead with a cheap diamond return and no shown reason to switch.", explanation: "3♦ gives partner's diamonds another chance. Q♥ and J♣ start different suits rather than supporting the invitation." },
    { hand: "6S AH 10D", table: "", good: "6S", trump: "H", prompt: "Barbu previously invited spades. Choose that plain-suit return instead of drawing trump.", explanation: "6♠ returns partner's spades. A♥ leads trump, which is legal but a different plan; 10♦ switches to diamonds." }
  ],
  odd: [
    { hand: "4D QD 8C", table: "KH 2H AH", good: "4D", trump: "D", playerTricksBefore: 6, prompt: "Your side has six tricks. You have no hearts and play last. Win the first odd trick.", explanation: "4♦ wins your seventh trick: 7 - 6 = 1 point. Q♦ also wins but costs more trump; 8♣ leaves your side on six, still zero points." },
    { hand: "5H KH 8D", table: "10C AC 4C", good: "8D", trump: "H", playerTricksBefore: 7, prompt: "Your side has seven tricks. Barbu is winning with A♣. You have no clubs and play last.", explanation: "8♦ leaves Barbu the eighth trick: 8 - 6 = 2 points. Trumping also gives your side eight, but spends a card that might win another trick." },
    { hand: "5S JS 8H", table: "QD 3D AD", good: "5S", trump: "S", playerTricksBefore: 8, prompt: "Your side has eight tricks. You are void in diamonds and play last. Take the ninth with the cheapest winning trump.", explanation: "5♠ wins the ninth trick: 9 - 6 = 3 points. J♠ costs more; 8♥ leaves your side on eight and two points." }
  ]
};

const cards = (ids: string) => ids ? ids.split(" ").map(id => {
  const card = standardDeck().find(card => card.id === id);
  if (!card) throw Error(`Unknown teaching card ${id}`);
  return card;
}) : [];
function companionStep(spec: Companion, topic: WhistPracticeAction, index: number): WhistStep {
  const hand = cards(spec.hand);
  const before = cards(spec.table);
  const seats: Seat[] = ["Tutor", "Right", "You", "Left"];
  const table = before.map((card, i) => ({ card, seat: seats[(6 - before.length + i) % 4] }));
  return { scenarioId: `whist-${topic}-follow-up-${index}`, contract: "Whist", title: pools[topic][index].title,
    trump: spec.trump, playerTricksBefore: spec.playerTricksBefore, trick: {
      title: "Another example", hand, tableBeforeChoice: table,
      tableAfterChoice: cards(spec.after ?? "").map((card, i) => ({ card, seat: seats[(3 + i) % 4] })),
      pendingBySeat: { You: "Your choice" }, legalCardIds: legalCards(hand, before[0]?.suit).map(card => card.id),
      beforeResult: spec.prompt, afterResult: spec.explanation, emptyExplanation: "Choose a card for this position.",
      playedExplanations: Object.fromEntries(hand.map(card => [card.id, spec.explanation])),
      cardOutcomes: Object.fromEntries(hand.map(card => [card.id, card.id === spec.good ? "good" : "risky"]))
    } };
}
function present(step: WhistStep, topic: WhistPracticeAction): WhistStep {
  const trump = { C: "Clubs", D: "Diamonds", H: "Hearts", S: "Spades" }[step.trump];
  // Lead questions select a plan; do not invent responses to an alternative suit.
  const prepared: WhistStep = { ...step, choiceMode: topic === "lead" || topic === "return" ? "select" : undefined,
    trick: { ...step.trick, beforeResult: step.trick.beforeResult.includes(`${trump} are trumps.`)
      ? step.trick.beforeResult : `${trump} are trumps. ${step.trick.beforeResult}` } };
  return { ...prepared, breakdownByCard: Object.fromEntries(step.trick.hand.map(card => {
    const legal = step.trick.legalCardIds.includes(card.id);
    const winner = legal && !prepared.choiceMode ? trickWinner(drillTableCards(prepared, card), step.trump) : undefined;
    const rows = [{ label: "Trump", value: trump }];
    if (!legal) rows.push({ label: "Legal cards", value: formatCardList(step.trick.hand.filter(c => step.trick.legalCardIds.includes(c.id))) });
    else if (winner) {
      const ownSide = winner.seat === "You" || winner.seat === "Tutor";
      rows.push({ label: "Winner", value: `${scoreSeatLabel(winner.seat)}: ${formatCardLabel(winner.card)}` },
        { label: "Why", value: winner.card.suit === step.trump ? "Highest trump" : "Highest card of the led suit" },
        { label: "Trick for", value: ownSide ? "You + Barbu" : "Left + Right" });
      if (step.playerTricksBefore !== undefined) {
        const count = step.playerTricksBefore + Number(ownSide);
        rows.push({ label: "Your side now", value: `${count} tricks: ${whistOddTricksForSide(count)} points above six` });
      }
    } else rows.push({ label: "Chosen lead", value: formatCardLabel(card) },
      { label: "Convention", value: "A partnership plan, not a compulsory play or a guaranteed winner" });
    return [card.id, { label: "Whist decision breakdown", rows }];
  })) };
}
export function whistLearningSteps(topic: WhistPracticeAction): DrillStep[] {
  return pools[topic].map((original, index) => {
    const step = present(original, topic);
    const answer = step.trick.hand.find(card => step.trick.cardOutcomes?.[card.id] === "good")!;
    return { ...step, trick: { ...step.trick, emptyExplanation: index === 2 ? "Choose your card, then check the result." : step.trick.emptyExplanation },
      teaching: { stage: teachingStages[index], guidance: index === 0
      ? `Try ${formatCardLabel(answer)}. ${step.trick.playedExplanations[answer.id]}` : index === 1 ? principles[topic] : undefined },
      followUp: { ...present(companionStep(companions[topic][index], topic, index), topic), teaching: { stage: "reinforcement" } } };
  });
}
