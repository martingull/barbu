import type { Card, DominoHandState } from "./types";
import { trickTakingSeats as seats } from "./trickTakingScore";
import { dealDomino, dominoRanks, dominoSuits, compareDominoCards } from "./dominoDeal";
import { chooseDominoCard, legalDominoCards } from "./dominoPolicy";

export type DominoAction = { type: "play-card"; cardId: string } | { type: "pass" } | { type: "replay" };

// Same start/transition boundary as trick hands, but no trick-taking state or review gates.
export const dominoHandEngine = {
  start({ seed, startRank = "7" }: { seed: number; startRank?: string }): DominoHandState {
    if (!dominoRanks.includes(startRank)) throw new Error("Invalid Domino start rank");
    return startDeal(`domino-hand-${seed}`, dealDomino(seed), startRank);
  },
  transition(state: DominoHandState, action: DominoAction): DominoHandState {
    if (state.contract !== "Domino") throw new Error("Expected a Domino hand");
    if (action.type === "replay") {
      if (!state.initialHands) throw new Error("Original Domino deal is unavailable");
      return startDeal(state.id, state.initialHands, state.startRank ?? "7");
    }
    if (state.status === "complete" || state.currentPlayerIndex !== 2) return state;
    const legal = legalDominoCards(state, 2);
    const card = action.type === "play-card" ? legal.find(c => c.id === action.cardId) : undefined;
    if (action.type === "play-card" ? !card : legal.length > 0) return state;
    const next = clone(state);
    advanceTurn(next, card);
    return advanceToPlayer(next);
  }
};

function startDeal(id: string, hands: Card[][], startRank: string): DominoHandState {
  const initialHands = hands.map(hand => hand.map(card => ({ ...card })).sort(compareDominoCards));
  return advanceToPlayer({ id, contract: "Domino", initialHands, hands: initialHands.map(hand => [...hand]),
    currentPlayerIndex: 0, currentPlayer: "Tutor", startRank, layout: [[], [], [], []], passedPlayers: [], outOrder: [],
    playerHand: [], legalCardIds: [], scores: [0, 0, 0, 0], cardsRemaining: 52, status: "in_progress", prompt: "" });
}

function clone(state: DominoHandState): DominoHandState {
  return { ...state, hands: state.hands.map(hand => [...hand]), layout: state.layout.map(lane => [...lane]),
    passedPlayers: [...state.passedPlayers], outOrder: [...state.outOrder] };
}

function advanceToPlayer(state: DominoHandState): DominoHandState {
  while (state.status === "in_progress" && state.currentPlayerIndex !== 2) advanceTurn(state, chooseDominoCard(state));
  return hydrateDominoHand(state);
}

function advanceTurn(state: DominoHandState, card?: Card) {
  const player = state.currentPlayerIndex;
  if (card) {
    state.hands[player] = state.hands[player].filter(held => held.id !== card.id);
    state.layout[dominoSuits.indexOf(card.suit)].push(card);
    state.layout[dominoSuits.indexOf(card.suit)].sort(compareDominoCards);
    state.passedPlayers = [];
    if (!state.hands[player].length && !state.outOrder.includes(seats[player])) state.outOrder.push(seats[player]);
  } else if (!state.passedPlayers.includes(seats[player])) state.passedPlayers.push(seats[player]);
  if (state.outOrder.length === 4 || state.hands.every(hand => !hand.length)) {
    state.status = "complete";
  } else if (state.passedPlayers.length >= 4) {
    state.outOrder.push(...seats.filter(seat => !state.outOrder.includes(seat)));
    state.status = "complete";
  } else state.currentPlayerIndex = (player + 1) % 4;
}

export function hydrateDominoHand(state: DominoHandState): DominoHandState {
  const scores = seats.map(seat => [45, 20, 5, -5][state.outOrder.indexOf(seat)] ?? 0);
  const legal = state.status === "in_progress" && state.currentPlayerIndex === 2 ? legalDominoCards(state, 2) : [];
  return { ...state, currentPlayer: seats[state.currentPlayerIndex], playerHand: [...state.hands[2]],
    startRank: state.startRank ?? "7", legalCardIds: legal.map(card => card.id), scores,
    cardsRemaining: state.hands.flat().length,
    prompt: state.status === "complete" ? `Domino complete. You scored ${scores[2]} points.`
      : !legal.length ? "No legal placement. Pass and wait for the layout to open."
      : `Play a ${state.startRank ?? "7"} to start a suit, or extend a suit by one rank.` };
}
