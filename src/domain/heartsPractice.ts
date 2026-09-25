import content from "../../content/hearts-practice.json" with { type: "json" };
import type { Card, GeneratedDrillSet, GeneratedPracticeOutcome, GeneratedPracticeScenario, HeartsPassScenario, Seat, Suit, TableCard } from "./types";
import { heartsPoints, legalHeartsCards } from "./heartsRules";
import { cardRank, trickWinner } from "./trickTakingRules";

export const heartsPracticeTopics = ["first-trick", "avoid-hearts", "queen-danger", "break-hearts", "stop-moon", "score-hand"] as const;
export type HeartsPracticeFocus = typeof heartsPracticeTopics[number];
type Template = {
  id: string; title: string; prompt: string; ledSuit: string;
  hand: string[]; before: string[][]; after: string[][];
  heartsBroken?: boolean; targetPoints?: number;
};
const suitNames = { C: "clubs", D: "diamonds", S: "spades", H: "hearts" };

function card(id: string): Card {
  return { id, label: id, rank: id.slice(0, -1), suit: id.slice(-1) as Suit };
}

function table(entries: string[][]): TableCard[] {
  return entries.map(([seat, id]) => ({ seat: seat as Seat, card: card(id) }));
}

function checkSeed(seed: number) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw Error("Practice seed must be a non-negative safe integer.");
}

export function generateHeartsPracticeSet(seed: number, focus?: HeartsPracticeFocus): GeneratedDrillSet {
  checkSeed(seed);
  if (focus !== undefined && !heartsPracticeTopics.includes(focus)) throw Error("Unknown Hearts practice topic.");
  const scenarios: GeneratedPracticeScenario[] = [];
  for (let round = 0; round < 3; round++) {
    heartsPracticeTopics.forEach((topic, index) => {
      if (focus && focus !== topic) return;
      // Preserve native pool ordering without rounding large integer seeds.
      const scenarioSeed = BigInt(seed) * 97n + BigInt(index + round * 7);
      const template = content.topics[index].scenarios[topic === "break-hearts" ? round : Number(scenarioSeed % 3n)];
      scenarios.push(createScenario(template, topic, scenarioSeed));
    });
  }
  return { id: `hearts-practice-${focus ?? "mixed"}-${seed}`, title: "Hearts practice", scenarios };
}

function createScenario(template: Template, topic: HeartsPracticeFocus, seed: bigint): GeneratedPracticeScenario {
  const hand = template.hand.map(card);
  const led = template.ledSuit as Suit;
  const legal = topic === "score-hand" ? hand : legalHeartsCards(
    hand, template.before.length === 0 ? undefined : led, topic === "first-trick", template.heartsBroken ?? true
  );
  const scenario: GeneratedPracticeScenario = {
    id: `${template.id}-${seed}`, title: template.title, contract: "Hearts", ledSuit: led,
    prompt: template.prompt, playerHand: hand, tableBeforeChoice: table(template.before),
    tableAfterChoice: table(template.after), legalCardIds: legal.map(card => card.id), outcomes: []
  };
  scenario.outcomes = hand.map(card => evaluateChoice(scenario, template, topic, card));
  return scenario;
}

function evaluateChoice(s: GeneratedPracticeScenario, template: Template, topic: HeartsPracticeFocus, card: Card): GeneratedPracticeOutcome {
  const outcome: GeneratedPracticeOutcome = {
    cardId: card.id, outcomeKind: "good", reason: "followed_suit", isLegal: s.legalCardIds.includes(card.id),
    winner: null, penalty: null, completedTrick: null, explanation: ""
  };
  if (!outcome.isLegal) {
    return { ...outcome, outcomeKind: "illegal", reason: "off_suit", explanation:
      topic === "break-hearts" && template.before.length === 0
        ? `${card.id} is not legal yet. Hearts have not been broken and you still have another suit.`
        : topic === "first-trick" && card.suit !== s.ledSuit && !s.playerHand.some(c => c.suit === s.ledSuit)
          ? `${card.id} is not legal on the first trick while you have a non-penalty discard.`
          : `${card.id} is not legal because ${suitNames[s.ledSuit]} were led and you still hold ${s.legalCardIds.join(" or ")}.`
    };
  }
  if (topic === "break-hearts") {
    const onlyHearts = s.playerHand.every(card => card.suit === "H");
    if (s.tableBeforeChoice.length) {
      const completedTrick = [...s.tableBeforeChoice, { seat: "You" as const, card }, ...s.tableAfterChoice];
      return { ...outcome, completedTrick, winner: trickWinner(completedTrick)!.seat,
        penalty: completedTrick.reduce((sum, play) => sum + heartsPoints(play.card), 0),
        explanation: `${card.id} follows hearts, as required. The other players can discard clubs and diamonds only because they have no hearts. Breaking hearts does not change the follow-suit rule.` };
    }
    return { ...outcome, explanation: onlyHearts
      ? `${card.id} is legal because only hearts remain. This lead breaks hearts. Each follower must play a heart if they have one; otherwise they may discard another suit.`
      : `${card.id} is a legal lead. Once hearts are broken, you may lead any suit you hold. Hearts are allowed, not required.` };
  }
  if (topic === "score-hand") {
    const points = heartsPoints(card);
    const correct = points === template.targetPoints;
    return { ...outcome, penalty: points, outcomeKind: correct ? "good" : points ? "risky" : "penalty",
      reason: correct ? "avoided_penalty" : points ? "captured_penalty" : "won_clean_trick",
      explanation: correct
        ? points === 13 ? "Queen of Spades is the 13-point danger card."
          : points === 1 ? `${card.id} is a heart, so it adds one penalty point.`
            : `${card.id} is clean: it is neither a heart nor the queen of spades.`
        : points === 13 ? "Queen of Spades is worth 13, but that is not the target card for this question."
          : points === 1 ? `${card.id} is a one-point heart, but that is not the target card for this question.`
            : `${card.id} does not score in Hearts.` };
  }
  const completedTrick = [...s.tableBeforeChoice, { seat: "You" as const, card }, ...s.tableAfterChoice];
  const winner = trickWinner(completedTrick)!.seat;
  const penalty = completedTrick.reduce((sum, played) => sum + heartsPoints(played.card), 0);
  const won = winner === "You";
  const missedHeart = topic === "avoid-hearts" && card.suit !== "H" && card.suit !== s.ledSuit && s.playerHand.some(c => c.suit === "H");
  const missedQueen = topic === "queen-danger" && card.id !== "QS" && card.suit !== s.ledSuit && s.playerHand.some(c => c.id === "QS");
  const outcomeKind = topic === "stop-moon" ? won && penalty > 0 ? "good" : "risky"
    : won && penalty > 0 ? "penalty" : missedHeart || missedQueen ? "risky"
      : topic === "queen-danger" ? "good" : won ? "risky" : "good";
  const reason = won && penalty > 0 ? "captured_penalty" : !won && penalty > 0 ? "avoided_penalty"
    : won ? "won_clean_trick" : topic !== "stop-moon" && card.suit !== s.ledSuit ? "void_discard" : "followed_suit";
  let explanation: string;
  if (topic === "first-trick" && !won && penalty === 0) {
    explanation = `${card.id} keeps the first trick clean and avoids taking control.`;
  } else if (missedHeart) {
    explanation = `${card.id} is legal, but you missed a chance to move a heart while ${winner} controls the trick.`;
  } else if (missedQueen) {
    explanation = `${card.id} is legal, but the queen of spades stays in your hand. Use the void turn to move it when someone else is winning.`;
  } else if (topic === "stop-moon") {
    explanation = won && penalty > 0
      ? `${card.id} takes ${penalty} points away from the moon threat. That is good defense even though points normally hurt.`
      : `${card.id} lets ${winner} keep control of the loaded trick. That can feed a moon attempt.`;
  } else if (card.suit !== "H" && card.suit !== "S" && penalty === 0) {
    explanation = `${card.id} follows ${suitNames[s.ledSuit]}. ${winner} wins the trick, and no Hearts penalty was added.`;
  } else if (won && penalty > 0) {
    explanation = `${card.id} follows ${suitNames[s.ledSuit]}. You win the trick and take ${penalty} Hearts penalty points.`;
  } else if (card.id === "QS" && !won) {
    explanation = `Queen of Spades leaves your hand. ${winner} wins the trick and takes the 13-point danger card.`;
  } else if (card.suit === "H" && !won) {
    explanation = `${card.id} moves a heart point away from you. ${winner} wins the trick and takes ${penalty} Hearts penalty points.`;
  } else if (won) {
    explanation = `${card.id} takes control. That is legal, but winning clean tricks in Hearts can put you on lead.`;
  } else {
    explanation = `${card.id} is legal. ${winner} wins the trick and takes ${penalty} Hearts penalty points.`;
  }
  return { ...outcome, winner, penalty, completedTrick, outcomeKind, reason, explanation };
}

export const heartsPassPracticeCount = content.passes.length;

export function generateHeartsPassPractice(seed: number): HeartsPassScenario {
  checkSeed(seed);
  const template = content.passes[seed % heartsPassPracticeCount];
  return { ...template, id: `${template.id}-${seed}`, playerHand: template.playerHand.map(card),
    recommendedPass: template.recommendedPass.map(card),
    alternatives: template.alternatives.map(option => ({ ...option, cardIds: [...option.cardIds] })) };
}

export function evaluateHeartsPass(scenario: HeartsPassScenario, selectedIds: string[]) {
  const selected = [...new Set(selectedIds)];
  const isComplete = selectedIds.length === 3 && selected.length === 3
    && selected.every(id => scenario.playerHand.some(card => card.id === id));
  if (!isComplete) return { isComplete, outcomeKind: "illegal" as const, explanation: "Choose exactly three different cards from your hand." };
  const plans = [{ cardIds: scenario.recommendedPass.map(card => card.id), explanation: scenario.explanation }, ...scenario.alternatives];
  const plan = plans.find(option => option.cardIds.length === 3 && option.cardIds.every(id => selected.includes(id)));
  if (plan) return { isComplete, outcomeKind: "good" as const, explanation: plan.explanation };

  const kept = scenario.playerHand.filter(card => !selected.includes(card.id));
  const spades = kept.filter(card => card.suit === "S");
  const exposedSpades = spades.length > 0 && spades.length <= 2 && spades.some(card => cardRank(card) >= 12);
  const brokeClubs = scenario.playerHand.filter(card => card.suit === "C").length >= 6
    && scenario.playerHand.some(card => card.suit === "C" && selected.includes(card.id));
  const explanation = exposedSpades
    ? "Your remaining high spades have little or no low cover. They can trap you with the queen."
    : brokeClubs ? "You gave away low clubs that could help you duck tricks while keeping more dangerous cards."
      : scenario.missedPlanExplanation;
  return { isComplete, outcomeKind: "risky" as const, explanation: `Legal pass. ${explanation}` };
}
