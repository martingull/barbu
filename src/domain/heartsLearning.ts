import type { Card, CompletedHandTrick, TableCard } from "./types";
import { heartsPoints, legalHeartsCards } from "./heartsRules";
import { trickWinner } from "./trickTakingRules";

// Short teaching positions use the same legality and scoring as a full hand.
export function heartsLearningDecision(table: TableCard[], hand: Card[], card: Card, identify = false) {
  const legal = identify || legalHeartsCards(hand, table[0]?.card.suit, false, true).some(item => item.id === card.id);
  const cards = identify ? table : [...table, { seat: "You" as const, card }];
  const winner = trickWinner(cards)!;
  const points = cards.reduce((sum, play) => sum + heartsPoints(play.card), 0);
  const correct = legal && (identify ? winner.card.id === card.id : winner.seat !== "You" || points === 0);
  return { legal, correct, winner, points };
}

// Review only the exposed trick, never concealed hands or speculative alternatives.
export function heartsLearningTrick(trick: CompletedHandTrick) {
  const winner = trickWinner(trick.cards);
  const player = trick.cards.find(play => play.seat === "You");
  const lead = trick.cards[0];
  if (!winner || !player || !lead) return null;
  return {
    winner, player, lead,
    hearts: trick.cards.filter(play => play.card.suit === "H").length,
    queen: trick.cards.some(play => play.card.suit === "S" && play.card.rank === "Q"),
    points: trick.cards.reduce((sum, play) => sum + heartsPoints(play.card), 0),
    playerLed: lead.seat === "You",
    followedSuit: player.card.suit === lead.card.suit
  };
}
