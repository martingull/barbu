import { standardDeck } from "../../domain/deck";
import { trickWinner } from "../../domain/trickTakingRules";
import type { Suit, TableCard } from "../../domain/types";
import { formatCardLabel } from "../../presentation/cardDisplay";
import { scoreSeatLabel } from "../../presentation/scorePresentation";
import type { DrillStep } from "../drillDecision";
import { teachingStages } from "../learningPresentation";

type Position = { id: string; title: string; prompt: string; cards: [string, string, string, string]; trump: Suit };
const suitNames = { C: "Clubs", D: "Diamonds", H: "Hearts", S: "Spades" };
const principle = "Look for trump first; otherwise compare only the led suit. The winner takes the trick for their partnership and leads next.";

function winnerQuestion(position: Position): DrillStep {
  const deck = standardDeck();
  const table: TableCard[] = position.cards.map((id, index) => {
    const card = deck.find(card => card.id === id);
    if (!card) throw Error(`Unknown Whist teaching card ${id}`);
    return { card, seat: (["Left", "Tutor", "Right", "You"] as const)[index] };
  });
  const winner = trickWinner(table, position.trump)!;
  const side = winner.seat === "You" || winner.seat === "Tutor" ? "You + Barbu" : "Left + Right";
  const reason = winner.card.suit === position.trump ? "Highest trump" : "Highest card of the led suit";
  const next = `${scoreSeatLabel(winner.seat)} ${winner.seat === "You" ? "lead" : "leads"} next.`;
  const explanation = `${formatCardLabel(winner.card)} wins: ${reason.toLowerCase()}. ${side} take this trick. ${next}`;
  return {
    scenarioId: `whist-object-${position.id}`, contract: "Whist", title: "Win tricks together",
    choiceMode: "identify", handLabel: "Which card won?",
    trick: {
      title: position.title, beforeResult: `${suitNames[position.trump]} are trumps. ${position.prompt}`,
      afterResult: explanation, emptyExplanation: "All four cards have been played. Choose the winning card below, not another card to play.",
      hand: table.map(play => play.card), legalCardIds: table.map(play => play.card.id),
      tableBeforeChoice: table, tableAfterChoice: [], pendingBySeat: {},
      cardOutcomes: Object.fromEntries(table.map(({ card }) => [card.id, card.id === winner.card.id ? "good" : "risky"])),
      playedExplanations: Object.fromEntries(table.map(({ card }) => [card.id,
        `${card.id === winner.card.id ? "Correct." : `${formatCardLabel(card)} did not win.`} ${explanation}`]))
    },
    breakdownByCard: Object.fromEntries(table.map(({ card }) => [card.id, { label: "Whist decision breakdown", rows: [
      { label: "Led suit", value: suitNames[table[0].card.suit] },
      { label: "Trump", value: suitNames[position.trump] },
      { label: "Winner", value: `${scoreSeatLabel(winner.seat)}: ${formatCardLabel(winner.card)}` },
      { label: "Why", value: reason }, { label: "Trick for", value: side },
      { label: "Next lead", value: scoreSeatLabel(winner.seat) }
    ] }]))
  };
}

export function whistFoundationSteps(): DrillStep[] {
  const positions: Position[] = [
    { id: "partner-wins", title: "A trick for your partnership", trump: "S", cards: ["9C", "KC", "4C", "3C"],
      prompt: "Left led clubs. No trump was played. Barbu sits opposite you and is your partner. Choose the winning card." },
    { id: "small-trump", title: "Trump changes the winner", trump: "H", cards: ["AD", "2H", "KD", "QD"],
      prompt: "Diamonds were led. Barbu had no diamonds and played a heart. A trump beats every card of a plain suit. Which card wins?" },
    { id: "opponents-win", title: "Who takes this trick?", trump: "D", cards: ["8S", "10S", "QS", "AH"],
      prompt: "Spades were led. All four players have played. Choose the winning card, then check which side takes the trick and who leads next." }
  ];
  const companions: Position[] = [
    { id: "partner-wins-again", title: "Find the winning partnership", trump: "H", cards: ["6D", "JD", "KD", "3D"],
      prompt: "Diamonds were led and no trump appeared. Choose the card that takes this trick for its side." },
    { id: "small-trump-again", title: "Compare two trumps", trump: "C", cards: ["KS", "4C", "AS", "8C"],
      prompt: "Spades were led. Barbu and You had no spades and trumped. Which card wins now?" },
    { id: "opponents-win-again", title: "Follow the led suit", trump: "S", cards: ["7H", "9H", "QH", "AC"],
      prompt: "Hearts were led. You had no hearts and discarded an ace. Which card wins this trick?" }
  ];
  return positions.map((position, index) => {
    const step = winnerQuestion(position);
    const answer = step.trick.hand.find(card => step.trick.cardOutcomes[card.id] === "good")!;
    return { ...step, teaching: { stage: teachingStages[index], guidance: index === 0
      ? `Choose ${formatCardLabel(answer)}. A king beats the lower clubs; Barbu's trick belongs to your side.` : index === 1 ? principle : undefined },
      followUp: { ...winnerQuestion(companions[index]), teaching: { stage: "reinforcement" } } };
  });
}
