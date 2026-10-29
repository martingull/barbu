import { guidedLessons } from "../catalog";
import { legalCards, trickWinner } from "../../domain/trickTakingRules";
import { barbuTrickPoints, isBarbuTrickContract } from "../../domain/barbuRules";
import { isLegalDominoPlacement } from "../../domain/dominoRules";
import type { GuidedTrick, TableCard } from "../../domain/types";
import type { DrillStep } from "../drillDecision";
import { teachingStages } from "../learningPresentation";
import { lessonCards, barbuGuidedResult } from "./guidedFeedback";

type Companion = { hand: string[]; table: string[]; good: string[]; tip: string; number?: number };
// Each companion revisits the same decision with a different position, not the answer just memorised.
const companions: Record<string, Companion[]> = {
  "No Hearts": [
    { hand: ["3C", "AC", "7H"], table: ["8C", "6H", "QC"], good: ["3C"], tip: "Follow clubs below the queen to leave the heart points with Right." },
    { hand: ["KS", "4H", "2D"], table: ["8S", "10S", "3S"], good: ["KS"], tip: "Your spade is forced. A trick without hearts has no penalty in this contract." },
    { hand: ["3S", "AS", "9H"], table: ["9S", "AH", "QS"], good: ["3S"], tip: "The ace of hearts is worth 6 points. Stay below the winning spade." }
  ],
  "No Queens": [
    { hand: ["3H", "AH", "8C"], table: ["9H", "QH", "KH"], good: ["3H"], tip: "Follow hearts below the king. The trick winner takes the queen's 6 points." },
    { hand: ["AS", "4C", "8D"], table: ["6S", "QS", "10S"], good: ["AS"], tip: "Following spades is compulsory even when the only spade captures a queen." },
    { hand: ["QH", "AC", "3C"], table: ["KD", "AD", "9D"], good: ["QH"], tip: "With no diamonds, discard your queen into someone else's winning trick." }
  ],
  "King of Hearts": [
    { hand: ["3H", "AH", "6C"], table: ["8H", "JH", "KH"], good: ["3H"], tip: "Stay below the king. Taking it with the ace costs 20 points." },
    { hand: ["KH", "5S", "9D"], table: ["8C", "QC", "AC"], good: ["KH"], tip: "You have no clubs. Unload the king while Right wins with the ace." },
    { hand: ["KH", "3H", "6S"], table: ["6H", "AH", "10H"], good: ["KH"], tip: "The ace already wins. Play the king under it instead of keeping the danger." }
  ],
  "No Last Two": [
    { hand: ["3C", "KC"], table: ["8C", "JC", "6C"], good: ["3C"], number: 12, tip: "Trick 12 costs its winner 10 points. Duck below the jack." },
    { hand: ["AS"], table: ["8S", "KS", "5S"], good: ["AS"], number: 13, tip: "The final trick costs 20 points, but your only card is forced. That is not a decision mistake." },
    { hand: ["AH", "2H"], table: ["8H", "5H", "QH"], good: ["2H"], number: 12, tip: "Use the low heart to leave the twelfth trick with Right." }
  ],
  "No Tricks": [
    { hand: ["2S", "AS", "8H"], table: ["8S", "KS", "6S"], good: ["2S"], tip: "Every trick costs 2 points. Follow low instead of overtaking the king." },
    { hand: ["QH", "4C"], table: ["3H", "8H", "10H"], good: ["QH"], tip: "You must play your only heart, even though winning costs 2 points." },
    { hand: ["3D", "QD", "AS"], table: ["6D", "JD", "9D"], good: ["3D"], tip: "The low diamond ducks the trick; the queen wins a 2-point penalty." }
  ],
  "Hearts Trumps": [
    { hand: ["4H", "8H", "3C", "KS"], table: ["9D", "AD", "5D"], good: ["4H", "8H"], tip: "You have no diamonds. Either heart trumps the ace and wins 5 points." },
    { hand: ["AS", "2S", "QH"], table: ["4S", "JS", "KS"], good: ["AS"], tip: "You must follow spades. The ace wins without spending a trump." },
    { hand: ["6H", "QH", "9S"], table: ["AC", "8H", "3C"], good: ["QH"], tip: "A heart is already winning. Only your higher heart can overtrump it." }
  ],
  Domino: [
    { hand: ["9C", "7D", "JH"], table: ["6C", "7C", "8C"], good: ["9C", "7D"], tip: "Extend clubs by one rank, or open diamonds with a seven." },
    { hand: ["5H", "8D", "10S"], table: ["6H", "7H", "8H", "7D"], good: ["5H", "8D"], tip: "Join either end of an open lane. An unopened suit still needs its seven." },
    { hand: ["JC", "9H", "7S"], table: ["7C", "8C", "9C", "6H", "7H", "8H"], good: ["9H", "7S"], tip: "Do not skip the missing ten of clubs. Extend hearts or open spades." }
  ]
};

function companionTrick(contract: string, example: Companion): GuidedTrick {
  const hand = lessonCards(...example.hand);
  const table: TableCard[] = lessonCards(...example.table).map((card, index) => ({
    seat: contract === "Domino" ? "Tutor" : (["Left", "Tutor", "Right"] as const)[index], card
  }));
  const legal = contract === "Domino" ? hand.filter(card => isLegalDominoPlacement(table.filter(play => play.card.suit === card.suit).map(play => play.card), card))
    : legalCards(hand, table[0].card.suit);
  const trick: GuidedTrick = { title: "Try the same idea on a new table", hand, tableBeforeChoice: table,
    tableAfterChoice: [], pendingBySeat: { You: "You" }, legalCardIds: legal.map(card => card.id),
    beforeResult: contract === "Domino" ? "Choose a card that fits this layout." : `You play last in ${contract}${example.number ? `, trick ${example.number}` : ""}.`,
    afterResult: "", emptyExplanation: example.tip, playedExplanations: {}, cardOutcomes: {}, cardReasons: {}, trickNumber: example.number };
  for (const card of hand) {
    const allowed = legal.some(legalCard => legalCard.id === card.id);
    const plays = [...table, { seat: "You" as const, card }];
    const penalty = allowed && isBarbuTrickContract(contract) && contract !== "Hearts Trumps"
      && trickWinner(plays, null)?.seat === "You" && barbuTrickPoints(contract, plays, example.number ?? 1) > 0;
    trick.cardOutcomes[card.id] = penalty ? "penalty" : example.good.includes(card.id) ? "good" : "risky";
    trick.playedExplanations[card.id] = !allowed ? contract === "Domino"
      ? "That card leaves a gap or tries to open a suit without its seven. " + example.tip
      : "You still have the led suit and must follow it. " + example.tip : example.tip;
  }
  return trick;
}

function stepFor(contract: string, trick: GuidedTrick): DrillStep {
  const explanations = Object.fromEntries(trick.hand.map(card => [card.id,
    trick.playedExplanations[card.id] ?? "You still have the led suit. Follow it before considering the contract's goal."]));
  return { contract, title: trick.title, trick: { ...trick, playedExplanations: explanations },
    // A forced penalty costs points, but must not trigger remedial work for a correct decision.
    acceptedCardIds: trick.legalCardIds.length === 1 ? trick.legalCardIds : undefined,
    breakdownByCard: Object.fromEntries(trick.hand.filter(card => trick.legalCardIds.includes(card.id)).map(card => [card.id, {
      label: "Decision explained", rows: [{ label: contract === "Domino" ? "Placement" : "Trick result", value: barbuGuidedResult(contract, trick, card) }]
    }])) };
}

export function barbuLearningSteps(lessonId: string): DrillStep[] {
  const lesson = guidedLessons.find(lesson => lesson.id === lessonId);
  if (!lesson) throw Error("Unknown Barbu lesson.");
  return lesson.tricks.map((trick, index) => ({ ...stepFor(lesson.contract, trick),
    teaching: { stage: teachingStages[index] },
    followUp: { ...stepFor(lesson.contract, companionTrick(lesson.contract, companions[lesson.contract][index])),
      teaching: { stage: "reinforcement" } }
  }));
}
