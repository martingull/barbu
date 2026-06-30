import type { Card, DominoHandState, Seat, Suit } from "./lessonTypes";

type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

const suits: Suit[] = ["C", "D", "H", "S"];
const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const rankOrder: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};
const suitOrder: Record<Suit, number> = { C: 0, D: 1, H: 2, S: 3 };
const playerNames: Seat[] = ["Tutor", "Right", "You", "Left"];
const dominoScores = [45, 20, 5, -5];
const defaultDominoStartRank: Rank = "7";

export function startBrowserDominoHand(seed: number): DominoHandState {
  const deck = standardDeck();
  const rng = new DeterministicRng(seed);

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.nextInt(index + 1);
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  const hands: Card[][] = [[], [], [], []];
  deck.forEach((card, index) => hands[index % 4].push(card));
  hands.forEach((hand) => hand.sort(compareCards));

  return advanceToPlayerTurn(
    hydrateDominoState({
      id: `browser-domino-hand-${seed}`,
      contract: "Domino",
      hands,
      currentPlayerIndex: 0,
      currentPlayer: "Tutor",
      startRank: defaultDominoStartRank,
      layout: [[], [], [], []],
      passedPlayers: [],
      outOrder: [],
      playerHand: hands[2],
      legalCardIds: [],
      scores: [0, 0, 0, 0],
      cardsRemaining: 52,
      status: "in_progress",
      prompt: ""
    })
  );
}

export function playBrowserDominoCard(state: DominoHandState, cardId: string): DominoHandState {
  if (state.status === "complete" || state.currentPlayerIndex !== 2) {
    return state;
  }

  const card = state.hands[2].find((heldCard) => heldCard.id === cardId);
  if (!card || !legalDominoCards(state, 2).some((legalCard) => legalCard.id === card.id)) {
    return state;
  }

  const nextState = cloneDominoState(state);
  playCardForCurrentPlayer(nextState, card);
  return advanceToPlayerTurn(nextState);
}

export function passBrowserDominoTurn(state: DominoHandState): DominoHandState {
  if (state.status === "complete" || state.currentPlayerIndex !== 2 || legalDominoCards(state, 2).length > 0) {
    return state;
  }

  const nextState = cloneDominoState(state);
  passCurrentPlayer(nextState);
  return advanceToPlayerTurn(nextState);
}

function advanceToPlayerTurn(state: DominoHandState): DominoHandState {
  const nextState = cloneDominoState(state);

  while (nextState.status === "in_progress" && nextState.currentPlayerIndex !== 2) {
    const legal = legalDominoCards(nextState, nextState.currentPlayerIndex);

    if (legal.length) {
      playCardForCurrentPlayer(nextState, legal[0]);
    } else {
      passCurrentPlayer(nextState);
    }
  }

  return hydrateDominoState(nextState);
}

function playCardForCurrentPlayer(state: DominoHandState, card: Card) {
  const hand = state.hands[state.currentPlayerIndex];
  const index = hand.findIndex((heldCard) => heldCard.id === card.id);

  if (index < 0 || !isLegalDominoCard(state, card)) {
    return;
  }

  hand.splice(index, 1);
  state.layout[suitOrder[card.suit]].push(card);
  state.layout[suitOrder[card.suit]].sort(compareCards);
  state.passedPlayers = [];

  if (!hand.length && !state.outOrder.includes(playerNames[state.currentPlayerIndex])) {
    state.outOrder.push(playerNames[state.currentPlayerIndex]);
  }

  advanceTurnOrComplete(state);
}

function passCurrentPlayer(state: DominoHandState) {
  const player = playerNames[state.currentPlayerIndex];
  if (!state.passedPlayers.includes(player)) {
    state.passedPlayers.push(player);
  }
  advanceTurnOrComplete(state);
}

function advanceTurnOrComplete(state: DominoHandState) {
  if (state.outOrder.length === 4 || state.hands.every((hand) => hand.length === 0)) {
    state.status = "complete";
    return;
  }

  if (state.passedPlayers.length >= 4) {
    for (const player of playerNames) {
      if (!state.outOrder.includes(player)) {
        state.outOrder.push(player);
      }
    }
    state.status = "complete";
    return;
  }

  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 4;
  state.currentPlayer = playerNames[state.currentPlayerIndex];
}

function hydrateDominoState(state: DominoHandState): DominoHandState {
  const legal = state.status === "in_progress" && state.currentPlayerIndex === 2 ? legalDominoCards(state, 2) : [];

  return {
    ...state,
    currentPlayer: playerNames[state.currentPlayerIndex],
    playerHand: [...state.hands[2]],
    legalCardIds: legal.map((card) => card.id),
    scores: dominoSeatScores(state.outOrder),
    cardsRemaining: state.hands.flat().length,
    prompt: dominoPrompt(state)
  };
}

function legalDominoCards(state: DominoHandState, playerIndex: number) {
  return state.hands[playerIndex].filter((card) => isLegalDominoCard(state, card));
}

function isLegalDominoCard(state: DominoHandState, card: Card) {
  const lane = state.layout[suitOrder[card.suit]];
  const startRank = (state.startRank ?? defaultDominoStartRank) as Rank;

  if (!lane.length) {
    return card.rank === startRank;
  }

  const low = Math.min(...lane.map((played) => rankOrder[played.rank as Rank]));
  const high = Math.max(...lane.map((played) => rankOrder[played.rank as Rank]));
  const rank = rankOrder[card.rank as Rank];
  return rank === low - 1 || rank === high + 1;
}

function dominoSeatScores(outOrder: Array<Seat | "Unknown">) {
  const scores = [0, 0, 0, 0];
  outOrder.forEach((seat, index) => {
    const playerIndex = playerNames.indexOf(seat as Seat);
    if (playerIndex >= 0) {
      scores[playerIndex] = dominoScores[index] ?? 0;
    }
  });
  return scores;
}

function dominoPrompt(state: DominoHandState) {
  if (state.status === "complete") {
    return `Domino complete. You scored ${state.scores[2] ?? 0} points.`;
  }
  if (!legalDominoCards(state, 2).length) {
    return "No legal placement. Pass and wait for the layout to open.";
  }
  return `Play a ${state.startRank ?? defaultDominoStartRank} to start a suit, or extend a suit by one rank.`;
}

function standardDeck() {
  return suits.flatMap((suit) => ranks.map((rank) => card(rank, suit)));
}

function card(rank: Rank, suit: Suit): Card {
  return {
    id: `${rank}${suit}`,
    rank,
    suit,
    label: `${rank}${suit}`
  };
}

function compareCards(left: Card, right: Card) {
  return suitOrder[left.suit] - suitOrder[right.suit] || rankOrder[left.rank as Rank] - rankOrder[right.rank as Rank];
}

function cloneDominoState(state: DominoHandState): DominoHandState {
  return {
    ...state,
    hands: state.hands.map((hand) => hand.map((card) => ({ ...card }))),
    layout: state.layout.map((lane) => lane.map((card) => ({ ...card }))),
    passedPlayers: [...state.passedPlayers],
    outOrder: [...state.outOrder],
    playerHand: state.playerHand.map((card) => ({ ...card })),
    legalCardIds: [...state.legalCardIds],
    scores: [...state.scores]
  };
}

class DeterministicRng {
  private state: bigint;

  constructor(seed: number) {
    this.state = BigInt(seed) ^ 0x9e3779b97f4a7c15n;
  }

  nextInt(upperBound: number) {
    this.state = this.state * 6364136223846793005n + 1n;
    return Number(this.state % BigInt(upperBound));
  }
}
