import type { Card, CompletedHandTrick, FullHandContract, FullHandState, Seat, Suit, TableCard } from "./lessonTypes";

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
const playerNames: Array<Seat> = ["Tutor", "Right", "You", "Left"];

export function startBrowserNoHeartsHand(seed: number): FullHandState {
  return startBrowserFullHand("No Hearts", seed);
}

export function startBrowserNoQueensHand(seed: number): FullHandState {
  return startBrowserFullHand("No Queens", seed);
}

function startBrowserFullHand(contract: FullHandContract, seed: number): FullHandState {
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
    hydrateFullHandState({
      id: `browser-${contract.toLowerCase().replace(/\s+/g, "-")}-hand-${seed}`,
      contract,
      hands,
      currentPlayerIndex: 0,
      currentPlayer: "Tutor",
      currentTrick: [],
      completedTricks: [],
      playerHand: hands[2],
      legalCardIds: [],
      playerPenalty: 0,
      totalPenalty: 0,
      cardsRemaining: 52,
      trickNumber: 1,
      status: "in_progress",
      prompt: ""
    })
  );
}

export function playBrowserNoHeartsCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserFullHandCard(state, cardId);
}

export function playBrowserNoQueensCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserFullHandCard(state, cardId);
}

function playBrowserFullHandCard(state: FullHandState, cardId: string): FullHandState {
  const selectedCard = state.hands[2].find((card) => card.id === cardId);

  if (!selectedCard || state.status === "complete" || state.currentPlayerIndex !== 2) {
    return state;
  }

  if (!legalCards(state.hands[2], ledSuit(state)).some((card) => card.id === cardId)) {
    return state;
  }

  const nextState = cloneState(state);
  playCardForCurrentPlayer(nextState, selectedCard);
  return advanceToPlayerTurn(nextState);
}

function advanceToPlayerTurn(state: FullHandState): FullHandState {
  const nextState = cloneState(state);

  while (nextState.status === "in_progress" && nextState.currentPlayerIndex !== 2) {
    const card = chooseOpponentCard(nextState);

    if (!card) {
      nextState.status = "complete";
      break;
    }

    playCardForCurrentPlayer(nextState, card);
  }

  return hydrateFullHandState(nextState);
}

function playCardForCurrentPlayer(state: FullHandState, card: Card) {
  const hand = state.hands[state.currentPlayerIndex];
  const cardIndex = hand.findIndex((heldCard) => heldCard.id === card.id);

  if (cardIndex < 0) {
    return;
  }

  hand.splice(cardIndex, 1);
  state.currentTrick.push({ seat: playerNames[state.currentPlayerIndex], card });

  if (state.currentTrick.length === 4) {
    completeTrick(state);
    return;
  }

  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 4;
  state.currentPlayer = playerNames[state.currentPlayerIndex];
}

function completeTrick(state: FullHandState) {
  const winnerIndex = trickWinner(state.currentTrick);
  const penalty = scoreTrick(state.contract, state.currentTrick);

  state.completedTricks.push({
    cards: [...state.currentTrick],
    winner: playerNames[winnerIndex],
    winnerIndex,
    penalty,
    outcome: completedTrickOutcome(winnerIndex, penalty)
  });
  state.currentTrick = [];
  state.currentPlayerIndex = winnerIndex;
  state.currentPlayer = playerNames[winnerIndex];

  if (state.hands.flat().length === 0) {
    state.status = "complete";
  }
}

function completedTrickOutcome(winnerIndex: number, penalty: number): CompletedHandTrick["outcome"] {
  if (winnerIndex === 2 && penalty > 0) {
    return "captured_penalty";
  }
  if (winnerIndex !== 2 && penalty > 0) {
    return "avoided_penalty";
  }
  if (winnerIndex === 2) {
    return "won_clean_trick";
  }
  return "stayed_clear";
}

function hydrateFullHandState(state: FullHandState): FullHandState {
  const playerHand = state.hands[2];
  const legal = state.status === "in_progress" && state.currentPlayerIndex === 2 ? legalCards(playerHand, ledSuit(state)) : [];
  const playerPenalty = state.completedTricks
    .filter((trick) => trick.winnerIndex === 2)
    .reduce((total, trick) => total + trick.penalty, 0);
  const totalPenalty = state.completedTricks.reduce((total, trick) => total + trick.penalty, 0);

  return {
    ...state,
    currentPlayer: playerNames[state.currentPlayerIndex],
    playerHand: [...playerHand],
    legalCardIds: legal.map((card) => card.id),
    playerPenalty,
    totalPenalty,
    cardsRemaining: state.hands.flat().length,
    trickNumber: Math.min(state.completedTricks.length + 1, 13),
    prompt: promptForState(state, playerPenalty)
  };
}

function chooseOpponentCard(state: FullHandState) {
  const legal = legalCards(state.hands[state.currentPlayerIndex], ledSuit(state));
  const led = ledSuit(state);

  if (!legal.length) {
    return undefined;
  }

  if (!led) {
    return lowestCard(legal.filter((card) => !isPenaltyCard(state.contract, card))) ?? lowestCard(legal);
  }

  const followsSuit = legal.every((card) => card.suit === led);

  if (!followsSuit) {
    return highestCard(legal.filter((card) => isPenaltyCard(state.contract, card))) ?? highestCard(legal);
  }

  if (state.currentTrick.some((played) => isPenaltyCard(state.contract, played.card))) {
    return highestCard(legal.filter((card) => !cardWouldWinTrick(state, card))) ?? lowestCard(legal);
  }

  return lowestCard(legal);
}

function cardWouldWinTrick(state: FullHandState, card: Card) {
  const led = ledSuit(state);

  if (!led) {
    return true;
  }
  if (card.suit !== led) {
    return false;
  }

  const currentWinner = state.currentTrick
    .filter((played) => played.card.suit === led)
    .reduce((winner, played) =>
      rankOrder[played.card.rank as Rank] > rankOrder[winner.card.rank as Rank] ? played : winner
    );

  return rankOrder[card.rank as Rank] > rankOrder[currentWinner.card.rank as Rank];
}

function lowestCard(cards: Card[]) {
  return cards.slice().sort(compareByRankThenSuit)[0];
}

function highestCard(cards: Card[]) {
  return cards.slice().sort(compareByRankThenSuit).pop();
}

function compareByRankThenSuit(left: Card, right: Card) {
  return rankOrder[left.rank as Rank] - rankOrder[right.rank as Rank] || suitOrder[left.suit] - suitOrder[right.suit];
}

function scoreTrick(contract: FullHandContract, cards: TableCard[]) {
  if (contract === "No Queens") {
    return cards.filter((played) => played.card.rank === "Q").length;
  }

  return cards.filter((played) => played.card.suit === "H").length;
}

function isPenaltyCard(contract: FullHandContract, card: Card) {
  return contract === "No Queens" ? card.rank === "Q" : card.suit === "H";
}

function legalCards(hand: Card[], led: Suit | undefined) {
  if (!led) {
    return hand;
  }

  const suitedCards = hand.filter((card) => card.suit === led);
  return suitedCards.length ? suitedCards : hand;
}

function ledSuit(state: FullHandState): Suit | undefined {
  return state.currentTrick[0]?.card.suit;
}

function trickWinner(cards: TableCard[]) {
  const led = cards[0].card.suit;
  const winner = cards
    .filter((played) => played.card.suit === led)
    .reduce((currentWinner, played) =>
      rankOrder[played.card.rank as Rank] > rankOrder[currentWinner.card.rank as Rank] ? played : currentWinner
    );

  return playerNames.indexOf(winner.seat);
}

function promptForState(state: FullHandState, playerPenalty: number) {
  if (state.status === "complete") {
    const penaltyName = state.contract === "No Queens" ? "queen" : "heart";
    return `Hand complete. You took ${playerPenalty} ${playerPenalty === 1 ? penaltyName : `${penaltyName}s`}.`;
  }

  const led = ledSuit(state);

  if (!led) {
    return "You won the last trick. Lead any card to the next trick.";
  }

  return `${suitName(led)} were led. Follow suit if you can.`;
}

function standardDeck() {
  return suits.flatMap((suit) => ranks.map((rank) => card(rank, suit)));
}

function card(rank: Rank, suit: Suit): Card {
  const label = `${rank}${suit}`;
  return { id: label, rank, suit, label };
}

function compareCards(left: Card, right: Card) {
  return suitOrder[left.suit] - suitOrder[right.suit] || rankOrder[left.rank as Rank] - rankOrder[right.rank as Rank];
}

function suitName(suit: Suit) {
  return { C: "Clubs", D: "Diamonds", H: "Hearts", S: "Spades" }[suit];
}

function cloneState(state: FullHandState): FullHandState {
  return {
    ...state,
    hands: state.hands.map((hand) => [...hand]),
    currentTrick: [...state.currentTrick],
    completedTricks: state.completedTricks.map((trick) => ({
      ...trick,
      cards: [...trick.cards]
    })),
    playerHand: [...state.playerHand],
    legalCardIds: [...state.legalCardIds]
  };
}

class DeterministicRng {
  private state: number;

  constructor(seed: number) {
    this.state = (seed ^ 0xa0761d64) >>> 0;
  }

  nextInt(upperBound: number) {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state % upperBound;
  }
}
