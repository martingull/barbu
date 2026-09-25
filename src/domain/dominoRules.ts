import type { Card } from "./types";
import { cardRank } from "./trickTakingRules";

export function isLegalDominoPlacement(lane: Card[], card: Card, startRank = "7"): boolean {
  if (!lane.length) return card.rank === startRank;
  const ranks = lane.map(cardRank);
  const rank = cardRank(card);
  return rank === Math.min(...ranks) - 1 || rank === Math.max(...ranks) + 1;
}
