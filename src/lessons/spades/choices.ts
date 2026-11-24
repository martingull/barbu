import { standardDeck } from "../../domain/deck";
import { spadesBidEstimate } from "../../domain/spadesBidding";
import { spadesPlayerSideSeats, spadesScoreForSide } from "../../domain/spadesScoring";
import { trickWinner } from "../../domain/trickTakingRules";
import type { Card, Seat, TableCard } from "../../domain/types";
import type { SpadesBidState } from "../../domain/spadesBidding";
import { formatCardLabel } from "../../presentation/cardDisplay";
import { formatSignedScore, scoreSeatLabel } from "../../presentation/scorePresentation";
import type { DrillResult } from "../drillDecision";
import type { DecisionReview } from "../decisionReview";
import { teachingStages, type Teaching, type FeedbackBreakdown } from "../learningPresentation";

export type SpadesChoiceTopic = "object" | "bid" | "score" | "settle";
export type SpadesChoiceStep = {
  id: string; title: string; prompt: string; hand: Card[]; table: TableCard[];
  options: { id: string; label: string }[]; correct: string; explanation: string;
  breakdown: FeedbackBreakdown; teaching?: Teaching; followUp?: SpadesChoiceStep;
  score?: { bids: SpadesBidState; tricks: Record<Seat, number>; carriedBags: number };
};
const cards = (ids: string) => ids.split(" ").map(id => {
  const card = standardDeck().find(card => card.id === id);
  if (!card) throw Error(`Unknown Spades teaching card: ${id}`);
  return card;
});
function numericChoices(answer: number, alternatives: number[], score = false) {
  return [...new Set([answer, ...alternatives, answer + 10, answer - 10])].slice(0, 3).map(value => ({
    id: String(value), label: score ? `${formatSignedScore(value)} points` : value === 0 ? "Nil (0)" : `Bid ${value}`
  }));
}
function foundation(id: string, ids: string, question: "winner" | "side" | "lead"): SpadesChoiceStep {
  const table = cards(ids).map((card, index) => ({ card, seat: (["Left", "Tutor", "Right", "You"] as Seat[])[index] }));
  const winner = trickWinner(table, "S")!;
  const name = scoreSeatLabel(winner.seat), own = spadesPlayerSideSeats.includes(winner.seat);
  const side = own ? "You + Barbu" : "Left + Right";
  const explanation = `${name} ${winner.seat === "You" ? "win" : "wins"} with ${formatCardLabel(winner.card)}, ${winner.card.suit === "S" ? "the highest spade (trump)" : "the highest card of the led suit"}. ${side} gain one book. ${name} ${winner.seat === "You" ? "lead" : "leads"} next.`;
  const options = question === "side" ? ["You + Barbu", "Left + Right", "Neither side"].map(label => ({ id: label, label }))
    : [winner.seat, ...(["Tutor", "Right", "You", "Left"] as Seat[]).filter(seat => seat !== winner.seat)].slice(0, 3).map(seat => ({ id: seat, label: scoreSeatLabel(seat) }));
  return { id, title: "Win your books", hand: [], table, options,
    correct: question === "side" ? side : winner.seat,
    prompt: `All four cards have been played. ${question === "winner" ? "Who won this book?" : question === "side" ? "Which partnership takes this book?" : "Who leads to the next trick?"}`,
    explanation, breakdown: { label: "Spades decision breakdown", rows: [
      { label: "Winner", value: `${name}: ${formatCardLabel(winner.card)}` }, { label: "Book for", value: side }, { label: "Next lead", value: name }
    ] } };
}
function bidding(id: string, ids: string): SpadesChoiceStep {
  const hand = cards(ids), estimate = spadesBidEstimate(hand);
  const explanation = estimate.nilSuggested
    ? "This hand has no aces, protected side-suit kings or high spades, and limited spade length. The starter estimate suggests nil. It is a risk assessment, not a promise: you must avoid every trick."
    : `${estimate.nonSpadeAces} side-suit aces + ${estimate.protectedNonSpadeKings} protected side-suit kings + ${estimate.highSpades} high spades + ${estimate.longSpades} extra spades beyond three = ${estimate.bid} estimated books. Other bids are legal; this question uses the starter estimate, not an exact prediction.`;
  return { id, title: "Count books", hand, table: [],
    prompt: "Read all thirteen cards. Using the starter estimate, which bid would you choose?",
    options: numericChoices(estimate.bid, estimate.bid === 0 ? [1, 3] : [0, estimate.bid + 2]), correct: String(estimate.bid), explanation,
    breakdown: { label: "Spades bid estimate", rows: [
      { label: "Side-suit aces", value: String(estimate.nonSpadeAces) }, { label: "Protected side-suit kings", value: String(estimate.protectedNonSpadeKings) },
      { label: "High spades (A, K, Q)", value: String(estimate.highSpades) }, { label: "Spades beyond three", value: String(estimate.longSpades) },
      { label: "Recommendation", value: estimate.bid === 0 ? "Consider nil; zero tricks required" : `${estimate.bid} books; not guaranteed` }
    ] } };
}
function scoring(id: string, title: string, bid: [number, number], won: [number, number], carriedBags: number, alternatives: number[]): SpadesChoiceStep {
  const bids = { You: bid[0], Tutor: bid[1], Left: 3, Right: 3 };
  const other = 13 - won[0] - won[1];
  const tricks = { You: won[0], Tutor: won[1], Left: Math.floor(other / 2), Right: Math.ceil(other / 2) };
  const score = spadesScoreForSide(tricks, bids, spadesPlayerSideSeats, carriedBags);
  const nilPoints = score.nilResults.reduce((sum, nil) => sum + nil.score, 0);
  const explanation = `${score.won} bid books against ${score.bid} required: ${formatSignedScore(score.contractPoints)} contract points. ${score.nilTricks ? `Failed-nil tricks count as bags, not bid books. ` : ""}${score.extra} ${score.extra === 1 ? "bag adds 1 point" : `bags add ${score.extra} points`}; nil: ${formatSignedScore(nilPoints)}. ${score.bagPenalty ? `Crossing ten bags costs ${score.bagPenalty}. ` : ""}Total: ${formatSignedScore(score.score)}; ${carriedBags + score.bags} bags carried forward.`;
  return { id, title, hand: [], table: [], score: { bids, tricks, carriedBags },
    prompt: "All thirteen tricks are played. What is the hand score for You + Barbu?",
    options: numericChoices(score.score, alternatives, true), correct: String(score.score), explanation,
    breakdown: { label: "Spades hand score breakdown", rows: [
      { label: "Bid books / target", value: `${score.won} / ${score.bid}` },
      { label: "Contract", value: formatSignedScore(score.contractPoints) }, { label: "Bags this hand", value: `${score.extra} points` },
      { label: "Nil", value: formatSignedScore(nilPoints) }, { label: "Ten-bag penalty", value: String(-score.bagPenalty) },
      { label: "Hand total", value: formatSignedScore(score.score) }, { label: "Bags carried forward", value: String(carriedBags + score.bags) }
    ] } };
}

export function spadesChoiceSteps(topic: SpadesChoiceTopic): SpadesChoiceStep[] {
  const base = topic === "object" ? [
    foundation("spades-object-winner", "9C KC 4C 3C", "winner"),
    foundation("spades-object-side", "AH 4S KH 7S", "side"),
    foundation("spades-object-lead", "8H 10H QH AC", "lead")
  ] : topic === "bid" ? [
    bidding("spades-bid-balanced", "AS KS 7S AH 4H KD 8D 3D 2D 9C 6C 4C 2C"),
    bidding("spades-bid-nil", "2S 5S 8S 2H 5H 8H 10H 2D 5D 9D 2C 6C 10C"),
    bidding("spades-bid-length", "AS QS JS 9S 7S 4S AH 2H 3D 6D 4C 8C 10C")
  ] : topic === "settle" ? [
    scoring("spades-set-normal", "A missed partnership bid", [3, 2], [2, 2], 0, [40, -40]),
    scoring("spades-set-nil-made", "Nil and partner both succeed", [0, 4], [0, 4], 0, [40, 100]),
    scoring("spades-set-partner-missed", "Nil succeeds; partner is set", [0, 4], [0, 3], 0, [-40, 130])
  ] : [
    scoring("spades-score-made", "Make the partnership bid", [3, 2], [4, 2], 0, [50, 60]),
    scoring("spades-score-nil", "Nil and partner's bid", [0, 4], [1, 3], 0, [-59, -140]),
    scoring("spades-score-bags", "Cross the ten-bag threshold", [2, 2], [3, 3], 9, [42, -60])
  ];
  const companions = topic === "object" ? [
    foundation("spades-object-winner-again", "6D JD KD 3D", "winner"),
    foundation("spades-object-side-again", "AD 2C 9S 3C", "side"),
    foundation("spades-object-lead-again", "QC AC 3C KC", "lead")
  ] : topic === "bid" ? [
    bidding("spades-bid-balanced-again", "KS QS 3S AD 7D 9D KH 5H 4H 2C 5C 8C JC"),
    bidding("spades-bid-nil-again", "2S 7S 3H 6H 9H JH 3D 6D 8D 10D 3C 5C 9C"),
    bidding("spades-bid-length-again", "KS QS 10S 8S 6S 2S AD 4D KH 5H 2C 7C JC")
  ] : topic === "settle" ? [
    scoring("spades-set-normal-again", "Count the full bid penalty", [2, 4], [2, 3], 0, [50, -50]),
    scoring("spades-set-nil-made-again", "Nil plus one bag", [0, 3], [0, 4], 0, [130, 140]),
    scoring("spades-set-partner-missed-again", "Keep nil separate from the contract", [0, 3], [0, 2], 0, [120, -30])
  ] : [
    scoring("spades-score-made-again", "Meet the bid exactly", [2, 4], [3, 3], 2, [62, 66]),
    scoring("spades-score-nil-again", "Separate nil tricks from bid books", [0, 3], [2, 2], 0, [-69, -130]),
    scoring("spades-score-bags-again", "Count the bags carried forward", [3, 2], [4, 3], 8, [52, -50])
  ];
  const principle = topic === "object" ? "The highest spade wins; without a spade, compare the led suit. Partners share books, and the winner leads next."
    : topic === "bid" ? "Count side aces, protected side kings, high spades and spades beyond three. Check nil separately; this is an estimate."
    : "Separate contract points, bags and nil. Failed-nil tricks are bags, not partner's bid books. Apply the ten-bag penalty last.";
  return base.map((step, index) => {
    const options = [...step.options.slice(index), ...step.options.slice(0, index)];
    return { ...step, options, teaching: { stage: teachingStages[index], guidance: index === 0
      ? `Choose ${step.options.find(option => option.id === step.correct)!.label}. ${step.explanation}` : index === 1 ? principle : undefined },
      followUp: { ...companions[index], teaching: { stage: "reinforcement" } } };
  });
}

export function spadesChoiceDecision(step: SpadesChoiceStep, selected: string) {
  const choice = step.options.find(option => option.id === selected);
  if (!choice) throw Error("Choose one of the available answers.");
  const good = selected === step.correct;
  const explanation = `${good ? "Correct." : "Not quite."} ${step.explanation}`;
  const result: DrillResult = { contract: "Spades", cardLabel: choice.label, outcome: good ? "good" : "risky", clean: good,
    reason: step.hand.length ? "bid_selection" : step.score ? "contract_target" : "trick_winner" };
  const review: DecisionReview = { title: step.title, prompt: step.prompt, explanation, breakdown: step.breakdown,
    context: step.score ? `You bid ${step.score.bids.You}, took ${step.score.tricks.You}; Barbu bid ${step.score.bids.Tutor}, took ${step.score.tricks.Tutor}. Bags carried in: ${step.score.carriedBags}.` : undefined,
    groups: step.hand.length ? [{ label: "Your bidding hand", cards: step.hand }]
      : step.table.length ? [{ label: "Completed trick", cards: step.table.map(play => play.card),
        captions: Object.fromEntries(step.table.map(play => [play.card.id, scoreSeatLabel(play.seat)])) }] : [] };
  return { result, review, explanation };
}
