import { beloteDeck, beloteSuits, scoreBeloteHand } from "../../domain/beloteRules";
import { beloteRecommendedAnswer, type BeloteQuestion } from "../../domain/beloteLearning";
import { beloteTopics } from "../../games/belote";
import { formatCardLabel, suitSymbol } from "../../presentation/cardDisplay";
import { teachingStages, type Teaching, type FeedbackBreakdown } from "../learningPresentation";
import type { Card, Suit } from "../../domain/types";

export const beloteCards = (ids: string): Card[] => ids ? ids.split(" ").map(id => {
  const card = beloteDeck().find(card => card.id === id); if (!card) throw Error(`Unknown Belote card: ${id}`); return card;
}) : [];
const play = (hand: string, cards: string, seats: (0 | 1 | 2 | 3)[], goal: "legal" | "support" = "legal"): BeloteQuestion => ({
  kind: "play", hand: beloteCards(hand), trump: "H", trick: beloteCards(cards).map((card, index) => ({ card, seat: seats[index] })), goal
});
function questions(action: string): BeloteQuestion[] {
  switch (action) {
    case "values": return [
      { kind: "value", hand: beloteCards("JH"), trump: "H" },
      { kind: "rank", hand: beloteCards("KH 9H AH"), trump: "H" },
      { kind: "rank", hand: beloteCards("KC 10C QC"), trump: "H" }
    ];
    case "taking": return [
      { kind: "take", hand: beloteCards("JH 9H AH AC 7S"), trump: "H", upcard: beloteCards("KH")[0], round: 1 },
      { kind: "take", hand: beloteCards("7H 8D QC 9S KC"), trump: "H", upcard: beloteCards("QH")[0], round: 1 },
      { kind: "take", hand: beloteCards("JS 9S AS AC 7H"), trump: "S", upcard: beloteCards("KD")[0], round: 2 }
    ];
    case "follow": return [play("7C AH 10D", "KC", [3]), play("9D KH AC", "AD 8H", [0, 3]), play("7H JH AS", "9H", [3])];
    case "trumping": return [play("7H AC KS", "10D", [3]), play("7H JH AC", "AD 7D 9H", [1, 0, 3]), play("7H 8H AC", "AD 7D JH", [1, 0, 3])];
    case "partner": return [
      play("AC 7D 7S", "7H JH 8H", [1, 0, 3], "support"),
      play("7C 10D 8S", "8H 9H 7H", [1, 0, 3], "support"),
      play("KC QD 7S", "8H AH 7H", [1, 0, 3], "support")
    ];
    case "bonus": return [
      { kind: "belote", hand: beloteCards("KH QH 7C"), trump: "H" },
      { kind: "belote", hand: beloteCards("KC QC AH"), trump: "H" },
      { kind: "belote", hand: beloteCards("KS QS JD"), trump: "S" }
    ];
    case "scoring": return [
      { kind: "score", hand: [], trump: "H", points: [90, 62], tricks: [5, 3], last: 0, taker: 0, bonus: null },
      { kind: "score", hand: [], trump: "H", points: [50, 102], tricks: [3, 5], last: 1, taker: 0, bonus: 0 },
      { kind: "score", hand: [], trump: "H", points: [152, 0], tricks: [8, 0], last: 0, taker: 0, bonus: null }
    ];
    default: throw Error("Unknown Belote topic.");
  }
}
function companion(q: BeloteQuestion): BeloteQuestion {
  const suit = (s: Suit): Suit => beloteSuits[(beloteSuits.indexOf(s) + 1) % 4];
  const card = (c: Card): Card => ({ ...c, suit: suit(c.suit), id: `${c.rank}${suit(c.suit)}` });
  if (q.kind === "score") return { ...q, hand: [], points: [q.points[1], q.points[0]], tricks: [q.tricks[1], q.tricks[0]],
    last: (1 - q.last) as 0 | 1, taker: (1 - q.taker) as 0 | 1, bonus: q.bonus === null ? null : (1 - q.bonus) as 0 | 1 };
  if (q.kind === "value") return { kind: "value", trump: suit(q.trump), hand: [{ ...card(q.hand[0]), rank: "9", id: `9${suit(q.hand[0].suit)}` }] };
  return { ...q, trump: suit(q.trump), hand: q.hand.map(card),
    ...(q.kind === "take" ? { upcard: card(q.upcard) } : {}),
    ...(q.kind === "play" ? { trick: q.trick.map(p => ({ ...p, card: card(p.card) })) } : {}) };
}
export type BeloteStep = { title: string; question: BeloteQuestion; teaching: Teaching; followUp?: BeloteStep };
export function belotePrompt(q: BeloteQuestion): string {
  return q.kind === "value" ? "How many card points is this card worth?" : q.kind === "rank" ? "Choose the highest-ranking card shown."
    : q.kind === "take" ? "Which taking plan does the visible hand support?" : q.kind === "belote" ? "How many belote/rebelote bonus points can this hand earn?"
    : q.kind === "score" ? "How many points are added to You + North for this deal?" : q.goal === "support" ? "You play last and North is winning. Feed the most valuable legal card." : "Choose a legal card for South.";
}
export function beloteExplanation(q: BeloteQuestion): string {
  const answer = beloteRecommendedAnswer(q);
  if (q.kind === "value") return `${formatCardLabel(q.hand[0])} is worth ${answer}. Trump jack scores 20, trump nine 14; aces score 11 and tens 10.`;
  if (q.kind === "rank") return `${formatCardLabel(q.hand.find(card => card.id === answer)!)} ranks highest here. Trump: J, 9, A, 10, K, Q, 8, 7. Other suits: A, 10, K, Q, J, 9, 8, 7.`;
  if (q.kind === "belote") return answer === "20" ? "One player holds both king and queen of trump. Playing the first automatically announces Belote, the second Rebelote. The 20-point bonus stays with that side even if its contract fails." : "Only the king and queen of trump together earn Belote. A plain-suit pair has no announcement in this profile.";
  if (q.kind === "take") return `${answer === "pass" ? "Pass is the cautious recommendation" : `Taking ${suitSymbol(answer as Suit)} is the recommendation`} from the five visible cards and upcard. Strong trumps and outside aces support taking; the remaining cards are still unknown. Other available calls are legal, not guaranteed mistakes.`;
  if (q.kind === "score") {
    const result = scoreBeloteHand(q.taker, q.points, q.tricks, q.last, q.bonus);
    return `${result.kind === "set" ? "Takers failed: defenders receive the deal's card points; Belote stays with its owner." : result.capot !== null ? "All eight tricks: replace the last-trick 10 with 100, making 252." : "Contract made: each side keeps its card points and bonus."} You + North add ${answer}. Card points include the final-trick bonus; tricks alone do not determine the contract.`;
  }
  return q.goal === "support" ? "North's winning trump is secure because South plays last. Follow suit if possible; otherwise feed the highest-value card shown rather than wasting points."
    : "Follow suit first. On a trump lead, overtake when possible. If void and an opponent is winning, trump and overtrump if possible; undertrump if necessary. A winning partner permits a discard.";
}
export function beloteLearningSteps(action: string): BeloteStep[] {
  const topic = beloteTopics.find(topic => topic.action === action);
  if (!topic) throw Error("Unknown Belote topic.");
  return questions(action).map((question, index) => {
    const other = companion(question);
    return { title: topic.title, question, teaching: { stage: teachingStages[index], guidance: index === 0 ? beloteExplanation(question) : index === 1 ? topic.summary : undefined },
      followUp: { title: topic.title, question: other, teaching: { stage: "reinforcement", guidance: beloteExplanation(other) } } };
  });
}
export function beloteAnswerChoices(q: BeloteQuestion) {
  if (q.kind === "rank" || q.kind === "play") return q.hand.map(card => ({ id: card.id, label: formatCardLabel(card) }));
  if (q.kind === "take") return [{ id: "pass", label: "Pass" }, ...(q.round === 1 ? [q.upcard.suit] : beloteSuits.filter(s => s !== q.upcard.suit)).map(s => ({ id: s, label: `Take ${suitSymbol(s)}` }))];
  const answer = Number(beloteRecommendedAnswer(q));
  return [...new Set([answer, 0, 10, 14, 20, 162, 252])].sort((a, b) => a - b)
    .filter(n => n === answer || (q.kind === "score" ? [0, 20, 162, 252].includes(n) : [0, 10, 14, 20].includes(n))).map(n => ({ id: String(n), label: `${n} points` }));
}
export function beloteBreakdown(q: BeloteQuestion): FeedbackBreakdown {
  const rows = [{ label: "Trump", value: suitSymbol(q.trump) }];
  if (q.kind === "take") rows.push({ label: "Round", value: String(q.round) });
  if (q.kind === "play") rows.push({ label: "Play", value: "Anticlockwise; South is you" });
  if (q.kind === "score") rows.push(
    { label: "Card points, before last trick", value: `${q.points[0]} / ${q.points[1]}` },
    { label: "Tricks: You+North / East+West", value: `${q.tricks[0]} / ${q.tricks[1]}` },
    { label: "Last trick", value: q.last === 0 ? "You + North" : "East + West" },
    { label: "Takers", value: q.taker === 0 ? "You + North" : "East + West" },
    { label: "Belote bonus", value: q.bonus === null ? "None" : q.bonus === 0 ? "You + North: 20" : "East + West: 20" });
  return { label: "Belote position", rows };
}
