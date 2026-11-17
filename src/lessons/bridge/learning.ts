import { standardDeck } from "../../domain/deck";
import { legalCards, trickWinner } from "../../domain/trickTakingRules";
import { bridgeBidById, bridgeCallLabel } from "../../domain/bridgeAuction";
import { bridgeHighCardPoints } from "../../domain/bridgeBidding";
import type { Card, Seat } from "../../domain/types";
import { compassSeatLabels, formatCardLabel, formatCardList, suitSymbol } from "../../presentation/cardDisplay";
import { drillTableCards, type DrillStep } from "../drillDecision";
import { teachingStages, type Teaching } from "../learningPresentation";
import { bridgeContractSteps, bridgeBiddingPracticeSteps, bridgeDummyDrillPool, bridgeDeclarerDrillPool, bridgeDefenseDrillPool } from "./exercises";

const pools = { dummy: bridgeDummyDrillPool, declarer: bridgeDeclarerDrillPool, defense: bridgeDefenseDrillPool };
type CardTopic = keyof typeof pools;
const principles = {
  contracts: "Read the level and strain: six base tricks plus the level is the partnership target. NT means no trump suit.",
  bidding: "Describe your own strength and shape: weak balanced hands pass, 15-17 balanced opens 1NT, opening strength with a five-card major shows that major.",
  responding: "After partner's 15-17 1NT, balanced hands without a four-card major pass with 0-7 HCP, invite with 2NT on 8-9, and bid 3NT on 10-15. Points guide the target; they do not guarantee tricks.",
  support: "After partner opens a five-card major, three-card support makes an eight-card fit. In Barbu Natural, raise to two with 6-9 HCP, invite at three with 10-12, and bid game at four with 13+ on these balanced hands.",
  dummy: "Declarer directs two separate hands. Follow suit from the hand whose turn it is, not from the partnership's combined cards.",
  declarer: "Plan partnership winners and entries. Finesses, developing length and unblocking can create tricks, but hidden cards still matter.",
  defense: "Defenders work together: support partner's lead, use exposed dummy, and preserve partnership winners."
};
export const bridgeTakeaway = (action: string) => principles[action as keyof typeof principles] ?? principles.contracts;
const cards = (ids: string): Card[] => ids ? ids.split(" ").map(id => {
  const card = standardDeck().find(card => card.id === id);
  if (!card) throw Error(`Unknown teaching card ${id}`);
  return card;
}) : [];
type Companion = { hand: string; table: string; after?: string; good: string; prompt: string; explanation: string;
  seat?: Seat; reference: string; referenceLabel: string; select?: boolean };
const companions: Record<CardTopic, Companion[]> = {
  dummy: [
    { hand: "AD 3D 7C", table: "KD", after: "4D 5D", good: "AD 3D", seat: "Tutor", reference: "5D 8H 9C", referenceLabel: "South declarer",
      prompt: "South declares 1NT. West leads K♦. Choose a legal card from North dummy.",
      explanation: "Dummy has diamonds: A♦ or 3♦ follows suit. 7♣ is illegal. South directs the choice but cannot supply a card from South's hand." },
    { hand: "3D 6H 8S", table: "9C", after: "QC AC", good: "3D 6H 8S", seat: "Tutor", reference: "AC 4H 5S", referenceLabel: "South declarer",
      prompt: "West leads a club in 1NT. North dummy has no clubs. Choose from North's hand.",
      explanation: "All three cards are legal discards from North. South's A♣ does not oblige North to follow clubs; each hand follows suit separately." },
    { hand: "AS 5S 8D", table: "2S QS", after: "6S", good: "AS", reference: "4C 7H", referenceLabel: "North dummy",
      prompt: "In 1NT, North led a spade and East played Q♠. South plays next. Secure this trick.",
      explanation: "A♠ wins from South's hand. 5♠ leaves East's queen ahead; 8♦ is illegal because South has spades." }
  ],
  declarer: [
    { hand: "AD QD 8D 4C", table: "2D 5D", after: "JD", good: "QD", reference: "3D 6D 9C", referenceLabel: "North dummy (excerpt)",
      prompt: "In 1NT, North led low toward South's A-Q and East followed low. Try the finesse while keeping the ace.",
      explanation: "Q♦ tests whether East holds K♦ and keeps A♦. In this line West follows J♦, so the queen wins; a king with West would beat it. A♦ wins now but does not test the finesse." },
    { hand: "KH QH JH 5C", table: "", good: "KH QH JH", reference: "10H 9H 8H 2H 3C", referenceLabel: "North dummy (excerpt)", select: true,
      prompt: "In 1NT, hearts have not been played. Choose a lead that develops dummy's long suit.",
      explanation: "A touching heart honour starts forcing out A♥. You may concede a trick before the remaining hearts become winners; keep an entry to North. 5♣ does not start that plan." },
    { hand: "KS 2S 4D", table: "AS 5S", after: "3S", good: "KS", reference: "QS 4S", referenceLabel: "North dummy (all remaining cards)",
      prompt: "In 3NT you have six tricks and three remain. North leads A♠; J♠ through 6♠ are gone. South's diamond is a loser. Preserve access to North's Q♠ and 4♠.",
      explanation: "Play K♠ under A♠ to unblock. South can follow 2♠ to Q♠ and discard the diamond on 4♠. Keeping K♠ would block the suit. 4♦ is illegal while South has spades." }
  ],
  defense: [
    { hand: "QH 10H 8H 5H 2H AC 7D", table: "", good: "5H", reference: "", referenceLabel: "Dummy is still hidden", select: true,
      prompt: "East declares 1NT. Lead from your long hearts using the fourth-highest agreement.",
      explanation: "5♥ is fourth highest from Q-10-8-5-2 and invites partner's help without spending an honour. This is a lead agreement, not a rule or a guaranteed winner." },
    { hand: "AH JH 3H 6C", table: "4H QH", after: "7H", good: "AH", reference: "8H 6H 2D", referenceLabel: "East dummy (excerpt)",
      prompt: "North leads low against West's 1NT. East dummy plays Q♥. South plays third; support partner.",
      explanation: "A♥ beats dummy's queen. J♥ or 3♥ leaves dummy ahead; 6♣ is illegal while South has hearts. Third hand high is a guideline, not a requirement." },
    { hand: "AD 3D 7S", table: "4D KD 5D", good: "3D", reference: "6D 8D 9H", referenceLabel: "East dummy (excerpt)",
      prompt: "West declares 1NT and led diamonds. North's K♦ is winning after East followed low. South plays last. Keep partnership winners.",
      explanation: "3♦ lets North win and preserves A♦ for another trick. A♦ spends two partnership winners together. 7♠ is illegal while South has diamonds." }
  ]
};
function companion(spec: Companion, topic: CardTopic, index: number): DrillStep {
  const hand = cards(spec.hand), before = cards(spec.table), seat = spec.seat ?? "You";
  const seats: Seat[] = ["Tutor", "Right", "You", "Left"];
  const acting = seats.indexOf(seat);
  return { scenarioId: `bridge-${topic}-follow-up-${index}`, contract: "Bridge", title: pools[topic][index].title,
    playingSeat: seat, handLabel: `${compassSeatLabels[seat]}: choose a card`, choiceMode: spec.select ? "select" : undefined,
    referenceHand: spec.reference ? { label: spec.referenceLabel, cards: cards(spec.reference) } : undefined,
    teaching: { stage: "reinforcement" }, trick: {
      title: "Another example", hand, legalCardIds: legalCards(hand, before[0]?.suit).map(card => card.id),
      tableBeforeChoice: before.map((card, index) => ({ card, seat: seats[(acting - before.length + index + 4) % 4] })),
      tableAfterChoice: cards(spec.after ?? "").map((card, index) => ({ card, seat: seats[(acting + index + 1) % 4] })),
      pendingBySeat: { [seat]: "Your choice" }, beforeResult: spec.prompt, afterResult: spec.explanation, emptyExplanation: "Choose from the active hand.",
      playedExplanations: Object.fromEntries(hand.map(card => [card.id, spec.explanation])),
      cardOutcomes: Object.fromEntries(hand.map(card => [card.id, spec.good.split(" ").includes(card.id) ? "good" : "risky"]))
    } };
}
function present(step: DrillStep): DrillStep {
  return { ...step, breakdownByCard: Object.fromEntries(step.trick.hand.map(card => {
    const legal = step.trick.legalCardIds.includes(card.id);
    const winner = legal && !step.choiceMode ? trickWinner(drillTableCards(step, card), null) : undefined;
    return [card.id, { label: "Bridge decision breakdown", rows: [
      { label: "Active hand", value: compassSeatLabels[step.playingSeat ?? "You"] },
      { label: "Chosen card", value: formatCardLabel(card) },
      ...(!legal ? [{ label: "Legal cards", value: formatCardList(step.trick.hand.filter(c => step.trick.legalCardIds.includes(c.id))) }]
        : winner ? [{ label: "Winner in this line", value: `${compassSeatLabels[winner.seat]}: ${formatCardLabel(winner.card)}` },
          { label: "Why", value: "Highest card of the led suit; no trump" }]
        : [{ label: "Plan", value: "A choice of lead, not a promised response from hidden hands" }])
    ] }];
  })) };
}
export function bridgeLearningSteps(topic: CardTopic): DrillStep[] {
  return pools[topic].map((step, index) => {
    const answer = step.trick.hand.find(card => step.trick.cardOutcomes?.[card.id] === "good")!;
    return { ...present(step), trick: { ...step.trick, emptyExplanation: index === 2 ? "Choose your card, then check the result." : step.trick.emptyExplanation },
      teaching: { stage: teachingStages[index], guidance: index === 0 ? `Try ${formatCardLabel(answer)}. ${principles[topic]}` : index === 1 ? principles[topic] : undefined },
      followUp: present(companion(companions[topic][index], topic, index)) };
  });
}

export type BridgeChoiceStep = {
  id: string; title: string; prompt: string; context: string; contextDetail?: string; hand: Card[]; options: { id: string; label: string }[];
  correct: string; explanations: Record<string, string>; teaching: Teaching; followUp?: BridgeChoiceStep;
};
function targetChoice(bid: string, title: string, options: string[], teaching: Teaching): BridgeChoiceStep {
  const contract = bridgeBidById(bid);
  const explanation = `Six base tricks + level ${contract.level} = ${contract.target} tricks. ${contract.strain === "NT" ? "No suit is trump." : `${suitSymbol(contract.strain)} is trump.`}`;
  return { id: `bridge-target-${bid}`, title, prompt: `In ${contract.label}, how many tricks must declarer and dummy win together?`,
    context: contract.longLabel, contextDetail: contract.strain === "NT" ? "No trump suit" : `${suitSymbol(contract.strain)} is trump`,
    hand: [], options: options.map(id => ({ id, label: `${id} ${id === "1" ? "trick" : "tricks"}` })),
    correct: String(contract.target), explanations: Object.fromEntries(options.map(id => [id, explanation])), teaching };
}
function responseChoices(): BridgeChoiceStep[] {
  const examples = [
    { title: "You can stop here", correct: "Pass",
      hand: "KS 7S 2S QH 8H 3H JD 9D 4D JC 10C 6C 2C",
      followHand: "QS 8S 3S KH 9H 2H JD 8D 4D 10C 7C 5C 2C" },
    { title: "Let partner judge", correct: "2NT",
      hand: "AS 8S 3S QH 7H 2H KD 9D 4D 10C 8C 6C 2C",
      followHand: "KS 8S 2S QH 6H 3H JD 9D 5D QC 8C 4C 2C" },
    { title: "Choose your response", correct: "3NT",
      hand: "KS 9S 4S AH 8H 2H QD 7D 3D JC 9C 5C 2C",
      followHand: "AS 9S 3S KH 7H 2H QD 8D 4D KC 10C 6C 2C" }
  ];
  return examples.map((example, index) => {
    const make = (ids: string, followUp: boolean): BridgeChoiceStep => {
      const hand = cards(ids);
      const points = bridgeHighCardPoints(hand);
      const total = `${points + 15}-${points + 17}`;
      const why = example.correct === "Pass"
        ? `${points} + partner's 15-17 = ${total} HCP. Pass: below the usual 25-point game guide, keep the seven-trick target.`
        : example.correct === "2NT"
          ? `${points} + 15-17 = ${total} HCP. Invite with 2NT: game is possible, not certain. Partner may pass or bid 3NT with a maximum.`
          : `${points} + 15-17 = ${total} HCP. Bid 3NT: even partner's minimum reaches the usual game guide. Nine tricks are still needed.`;
      const objections: Record<string, string> = {
        Pass: "Passing would stop short of exploring game.",
        "2NT": example.correct === "Pass" ? "An invitation overstates this hand." : "An invitation understates this hand.",
        "3NT": "Jumping to game asks for nine tricks without enough evidence."
      };
      return {
        id: `bridge-responding-${index}${followUp ? "-follow-up" : ""}`, title: example.title,
        prompt: "Partner opened 1NT. With this balanced hand, what should you call?",
        context: "North (partner): 1NT. East: Pass. South (you) to call.",
        contextDetail: `Partner: 15-17 HCP. You: ${points} HCP.`, hand,
        correct: example.correct, options: ["Pass", "2NT", "3NT"].map(id => ({ id, label: bridgeCallLabel(id) })),
        explanations: Object.fromEntries(["Pass", "2NT", "3NT"].map(id => [id, `${id === example.correct ? "Good." : objections[id]} ${why}`])),
        teaching: { stage: followUp ? "reinforcement" : teachingStages[index],
          guidance: followUp ? principles.responding : index === 0 ? `Try Pass. ${why}`
            : index === 1 ? "Add your points to both ends of partner's range. Does game depend on partner having a maximum?" : undefined }
      };
    };
    return { ...make(example.hand, false), followUp: make(example.followHand, true) };
  });
}

function supportChoices(): BridgeChoiceStep[] {
  const examples = [
    { title: "Show your fit", suit: "H", level: 2, hand: "KS 7S 2S QH 8H 3H JD 9D 4D 9C 10C 6C 2C",
      followSuit: "S", followHand: "AS 8S 3S QH 7H 2H KD 9D 4D 10C 8C 6C 2C" },
    { title: "Invite partner to game", suit: "S", level: 3, hand: "KS 9S 4S AH 8H 2H QD 7D 3D JC 9C 5C 2C",
      followSuit: "H", followHand: "AS 9S 3S KH 7H 2H QD 8D 4D KC 10C 6C 2C" },
    { title: "Choose the partnership target", suit: "H", level: 4, hand: "AS 8S 3S QH 7H 2H KD 9D 4D AC 8C 6C 2C",
      followSuit: "S", followHand: "KS 9S 4S AH 8H 2H AD 7D 3D KC 9C 5C 2C" }
  ] as const;
  return examples.map((example, index) => {
    const make = (ids: string, suit: "H" | "S", followUp: boolean): BridgeChoiceStep => {
      const hand = cards(ids), points = bridgeHighCardPoints(hand);
      const symbol = suitSymbol(suit), correct = `${example.level}${suit}`;
      const options = ["Pass", `2${suit}`, `3${suit}`, `4${suit}`];
      const fit = `Partner's five or more ${symbol} plus your three makes at least eight trumps.`;
      const why = example.level === 2 ? `With ${points} HCP, raise to 2${symbol}: show 6-9 points and support without inviting game.`
        : example.level === 3 ? `With ${points} HCP, invite with 3${symbol}: show 10-12 points and let partner pass or bid game with extra strength.`
        : `With ${points} HCP, bid 4${symbol}: this hand has the support and strength for the ten-trick game target.`;
      const objections: Record<string, string> = {
        Pass: "Passing hides your support and responding strength.",
        [`2${suit}`]: "A simple raise understates this hand's strength.",
        [`3${suit}`]: example.level === 2 ? "An invitation overstates this hand's strength." : "An invitation understates this hand's strength.",
        [`4${suit}`]: "Jumping to game overstates this hand's strength."
      };
      return {
        id: `bridge-support-${index}${followUp ? "-follow-up" : ""}`, title: example.title,
        prompt: `Partner opened 1${symbol}. How should you show your support?`,
        context: `North (partner): 1${symbol}. East: Pass. South (you) to call.`,
        contextDetail: `Barbu Natural. Partner: 5+ ${symbol}. You: 3 ${symbol}, ${points} HCP.`, hand,
        options: options.map(id => ({ id, label: bridgeCallLabel(id) })), correct,
        explanations: Object.fromEntries(options.map(id => [id, `${id === correct ? "Good." : objections[id]} ${fit} ${why} Points and fit guide bidding; they do not guarantee tricks.`])),
        teaching: { stage: followUp ? "reinforcement" : teachingStages[index],
          guidance: followUp ? principles.support : index === 0 ? `Try 2${symbol}. ${fit} ${why}`
            : index === 1 ? "Check the fit first, then use your strength to choose a simple raise, an invitation or game." : undefined }
      };
    };
    return { ...make(example.hand, example.suit, false), followUp: make(example.followHand, example.followSuit, true) };
  });
}

export function bridgeChoiceSteps(topic: "contracts" | "bidding" | "responding" | "support"): BridgeChoiceStep[] {
  if (topic === "support") return supportChoices();
  if (topic === "responding") return responseChoices();
  if (topic === "contracts") return bridgeContractSteps.map((step, index) => ({
    ...targetChoice(step.bid, step.title, step.options, { stage: teachingStages[index], guidance: step.hint || undefined }),
    followUp: targetChoice(["2C", "2NT", "5D"][index], "Read another contract", [["2", "8", "10"], ["2", "6", "8"], ["5", "10", "11"]][index], { stage: "reinforcement", guidance: principles.contracts })
  }));
  // New hands test the same bid principles without repeating the original deal.
  const followHands = ["AC 2C 5C QD 3D 6D JH 4H 7H 2S 8S 9S 10S", "AC KC 4C AD 8D 3D QH JH 5H QS 6S 2S 3S", "AH KH QH 3H 2H AS 4S 7D 6D 5D 8C 6C 2C"];
  return bridgeBiddingPracticeSteps.map((step, index) => {
    const make = (id: string, hand: Card[], correct: string, options: string[], explanations: Record<string, string>, teaching: Teaching): BridgeChoiceStep => ({
      id, title: step.title, prompt: "You are South, the dealer. Which opening describes your hand in basic natural bidding?",
      context: `HCP: ${bridgeHighCardPoints(hand)}. Dealer: South. Vulnerability: ${step.vulnerability}.`, hand,
      correct, options: options.map(id => ({ id, label: bridgeCallLabel(id) })), explanations, teaching
    });
    const correct = ["Pass", "1NT", "1H"][index];
    const options = index === 2 ? ["Pass", "1C", "1NT", "1H"] : step.options;
    const why = ["7 HCP and a balanced hand are below opening strength. Pass.", "16 HCP with a balanced hand fits the 15-17 1NT opening.", "13 HCP with five hearts: open 1♥ to show your major."][index];
    return { ...make(step.id, step.hand, step.correctCall, step.options, step.explanations as Record<string, string>,
      { stage: teachingStages[index], guidance: step.hint || undefined }), prompt: step.prompt,
      followUp: make(`${step.id}-follow-up`, cards(followHands[index]), correct, options,
        Object.fromEntries(options.map(call => [call, `${call === correct ? "Good." : "Compare again."} ${why}`])),
        { stage: "reinforcement", guidance: principles.bidding }) };
  });
}
