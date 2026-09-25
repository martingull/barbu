import type { Card, DominoHandState } from "./types";
import { dominoSuits } from "./dominoDeal";
import { isLegalDominoPlacement } from "./dominoRules";
import { cardRank } from "./trickTakingRules";

export function legalDominoCards(state: DominoHandState, player: number): Card[] {
  return state.hands[player].filter(card => isLegalDominoPlacement(state.layout[dominoSuits.indexOf(card.suit)], card, state.startRank ?? "7"));
}

// Migration parity: the existing native tutor uses the next hand's hidden cards.
// A public-information opponent is separate strategy work, not implied by this migration.
export function chooseDominoCard(state: DominoHandState): Card | undefined {
  const legal = legalDominoCards(state, state.currentPlayerIndex);
  const own = state.hands[state.currentPlayerIndex];
  const nextPlayer = (state.currentPlayerIndex + 1) % 4;
  const before = legalDominoCards(state, nextPlayer).length;
  const priority = (card: Card) => {
    const layout = state.layout.map(lane => [...lane]);
    layout[dominoSuits.indexOf(card.suit)].push(card);
    const after = { ...state, layout };
    return [legalDominoCards(after, state.currentPlayerIndex).filter(c => c.id !== card.id).length,
      own.filter(c => c.suit === card.suit).length,
      -Math.max(0, legalDominoCards(after, nextPlayer).length - before),
      -cardRank(card), -dominoSuits.indexOf(card.suit)];
  };
  return legal.map(card => ({ card, priority: priority(card) })).sort((a, b) => {
    for (let i = 0; i < a.priority.length; i++) {
      const difference = b.priority[i] - a.priority[i];
      if (difference) return difference;
    }
    return 0;
  })[0]?.card;
}
