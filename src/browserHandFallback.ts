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

export function startBrowserHeartsHand(seed: number): FullHandState {
  return startBrowserFullHand("Hearts", seed);
}

export function startBrowserHeartsPassingHand(seed: number): FullHandState {
  const deck = standardDeck();
  const rng = new DeterministicRng(seed);

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.nextInt(index + 1);
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  const hands: Card[][] = [[], [], [], []];
  deck.forEach((card, index) => hands[index % 4].push(card));
  hands.forEach((hand) => hand.sort(compareCards));

  return hydrateFullHandState({
    id: `browser-hearts-passing-hand-${seed}`,
    contract: "Hearts",
    hands,
    currentPlayerIndex: 2,
    currentPlayer: "You",
    currentTrick: [],
    completedTricks: [],
    playerHand: hands[2],
    legalCardIds: hands[2].map((card) => card.id),
    playerPenalty: 0,
    totalPenalty: 0,
    cardsRemaining: 52,
    trickNumber: 1,
    status: "in_progress",
    prompt: "Choose three cards to pass left."
  });
}

export function applyBrowserHeartsPass(state: FullHandState, cardIds: string[]): FullHandState {
  if (state.status === "complete" || state.currentTrick.length || state.completedTricks.length) {
    return state;
  }

  const uniqueCardIds = Array.from(new Set(cardIds));
  if (uniqueCardIds.length !== 3) {
    return state;
  }

  const nextState = cloneState(state);
  const passedCards: Card[][] = [[], [], [], []];
  passedCards[2] = uniqueCardIds
    .map((cardId) => nextState.hands[2].find((card) => card.id === cardId))
    .filter((card): card is Card => Boolean(card));

  if (passedCards[2].length !== 3) {
    return state;
  }

  nextState.hands.forEach((hand, player) => {
    if (player !== 2) {
      passedCards[player] = chooseHeartsPassCards(hand);
    }
  });

  passedCards.forEach((cards, player) => {
    cards.forEach((card) => removeCardFromHand(nextState.hands[player], card));
  });

  passedCards.forEach((cards, player) => {
    const recipient = (player + 1) % 4;
    nextState.hands[recipient].push(...cards);
  });

  nextState.hands.forEach((hand) => hand.sort(compareCards));
  nextState.id = nextState.id.replace("hearts-passing-hand", "hearts-hand");
  nextState.currentPlayerIndex = 0;
  nextState.currentPlayer = "Tutor";
  nextState.currentTrick = [];
  nextState.completedTricks = [];
  nextState.status = "in_progress";

  return advanceToPlayerTurn(nextState);
}

export function startBrowserNoHeartsHand(seed: number): FullHandState {
  return startBrowserFullHand("No Hearts", seed);
}

export function startBrowserNoQueensHand(seed: number): FullHandState {
  return startBrowserFullHand("No Queens", seed);
}

export function startBrowserKingOfHeartsHand(seed: number): FullHandState {
  return startBrowserFullHand("King of Hearts", seed);
}

export function startBrowserNoLastTwoHand(seed: number): FullHandState {
  return startBrowserFullHand("No Last Two", seed);
}

export function startBrowserNoTricksHand(seed: number): FullHandState {
  return startBrowserFullHand("No Tricks", seed);
}

export function startBrowserPositiveTricksHand(seed: number): FullHandState {
  return startBrowserFullHand("Hearts Trumps", seed);
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

export function playBrowserHeartsCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserFullHandCard(state, cardId);
}

export function playBrowserNoQueensCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserFullHandCard(state, cardId);
}

export function playBrowserKingOfHeartsCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserFullHandCard(state, cardId);
}

export function playBrowserNoLastTwoCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserFullHandCard(state, cardId);
}

export function playBrowserNoTricksCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserFullHandCard(state, cardId);
}

export function playBrowserPositiveTricksCard(state: FullHandState, cardId: string): FullHandState {
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
  const winnerIndex = trickWinner(state.contract, state.currentTrick);
  const penalty = scoreTrick(state, state.currentTrick);

  state.completedTricks.push({
    cards: [...state.currentTrick],
    winner: playerNames[winnerIndex],
    winnerIndex,
    penalty,
    outcome: completedTrickOutcome(winnerIndex, penalty),
    tacticalTags: completedTrickTacticalTags(state.contract, state.completedTricks.length + 1, {
      cards: [...state.currentTrick],
      winner: playerNames[winnerIndex],
      winnerIndex,
      penalty,
      outcome: completedTrickOutcome(winnerIndex, penalty)
    })
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

function completedTrickTacticalTags(
  contract: FullHandContract,
  trickNumber: number,
  trick: CompletedHandTrick
): CompletedHandTrick["tacticalTags"] {
  const tags: NonNullable<CompletedHandTrick["tacticalTags"]> = [];
  const led = trick.cards[0]?.card.suit;
  const playerCard = trick.cards.find((played) => played.seat === "You")?.card;

  if (led && playerCard) {
    tags.push(playerCard.suit === led ? "followed_suit" : "void_discard");
  }

  if (contract === "No Last Two") {
    tags.push(trickNumber >= 12 ? "final_two_trick" : "setup_trick");
  } else if (contract === "Hearts Trumps") {
    const trumpCards = trick.cards.filter((played) => played.card.suit === "H");
    const winnerCard = trick.cards.find((played) => played.seat === trick.winner)?.card;

    if (winnerCard?.suit === "H") {
      tags.push("trump_won");
    }
    if (winnerCard?.suit === "H" && trumpCards.length > 1) {
      tags.push("overtrumped");
    }
  } else if (
    (contract === "Hearts" || contract === "No Hearts" || contract === "No Queens" || contract === "King of Hearts") &&
    trick.penalty > 0
  ) {
    tags.push("danger_card_moved");
  }

  return tags;
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
    if (state.contract === "Hearts Trumps") {
      return highestCard(legal);
    }
    if (state.contract === "No Queens") {
      return lowestCard(legal.filter((card) => card.rank !== "Q")) ?? lowestCard(legal);
    }
    return lowestCard(legal.filter((card) => !isPenaltyCard(state.contract, card))) ?? lowestCard(legal);
  }

  const followsSuit = legal.every((card) => card.suit === led);

  if (!followsSuit) {
    if (state.contract === "Hearts Trumps") {
      return lowestCard(legal.filter((card) => cardWouldWinTrick(state, card))) ?? lowestCard(legal);
    }
    if (state.contract === "No Tricks") {
      return highestCard(legal);
    }
    if (state.contract === "No Queens") {
      return highestCard(legal.filter((card) => card.rank === "Q")) ?? highestCard(legal);
    }
    return highestCard(legal.filter((card) => isPenaltyCard(state.contract, card))) ?? highestCard(legal);
  }

  if (state.contract === "Hearts Trumps") {
    return lowestCard(legal.filter((card) => cardWouldWinTrick(state, card))) ?? lowestCard(legal);
  }

  if (state.contract === "No Tricks") {
    return highestNonWinningCard(state, legal) ?? lowestCard(legal);
  }

  if (state.contract === "No Queens") {
    return highestNonWinningQueen(state, legal) ?? highestNonWinningCard(state, legal) ?? lowestCard(legal);
  }

  if (state.contract === "No Last Two" && state.completedTricks.length >= 11) {
    return highestNonWinningCard(state, legal) ?? lowestCard(legal);
  }

  if (state.currentTrick.some((played) => isPenaltyCard(state.contract, played.card))) {
    return highestNonWinningCard(state, legal) ?? lowestCard(legal);
  }

  if (
    state.contract === "Hearts" ||
    state.contract === "No Hearts" ||
    state.contract === "No Queens" ||
    state.contract === "King of Hearts"
  ) {
    return highestNonWinningCard(state, legal) ?? lowestCard(legal);
  }

  return lowestCard(legal);
}

function cardWouldWinTrick(state: FullHandState, card: Card) {
  const led = ledSuit(state);

  if (!led) {
    return true;
  }
  if (state.contract === "Hearts Trumps") {
    const simulated = [...state.currentTrick, { seat: playerNames[state.currentPlayerIndex], card }];
    return trickWinner(state.contract, simulated) === state.currentPlayerIndex;
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

function highestNonWinningCard(state: FullHandState, cards: Card[]) {
  return highestCard(cards.filter((card) => !cardWouldWinTrick(state, card)));
}

function highestNonWinningQueen(state: FullHandState, cards: Card[]) {
  return highestCard(cards.filter((card) => card.rank === "Q" && !cardWouldWinTrick(state, card)));
}

function chooseHeartsPassCards(hand: Card[]) {
  return hand
    .slice()
    .sort((left, right) => {
      const leftPenalty = isPenaltyCard("Hearts", left) ? 3 : 0;
      const rightPenalty = isPenaltyCard("Hearts", right) ? 3 : 0;
      const leftQueenSpades = left.rank === "Q" && left.suit === "S" ? 2 : 0;
      const rightQueenSpades = right.rank === "Q" && right.suit === "S" ? 2 : 0;

      return (
        leftPenalty +
        leftQueenSpades -
        (rightPenalty + rightQueenSpades) ||
        rankOrder[left.rank as Rank] - rankOrder[right.rank as Rank] ||
        suitOrder[left.suit] - suitOrder[right.suit]
      );
    })
    .slice(-3);
}

function removeCardFromHand(hand: Card[], card: Card) {
  const index = hand.findIndex((heldCard) => heldCard.id === card.id);

  if (index >= 0) {
    hand.splice(index, 1);
  }
}

function compareByRankThenSuit(left: Card, right: Card) {
  return rankOrder[left.rank as Rank] - rankOrder[right.rank as Rank] || suitOrder[left.suit] - suitOrder[right.suit];
}

function scoreTrick(state: FullHandState, cards: TableCard[]) {
  if (state.contract === "No Tricks") {
    return 2;
  }
  if (state.contract === "Hearts Trumps") {
    return 5;
  }
  if (state.contract === "No Last Two") {
    if (state.completedTricks.length === 11) {
      return 10;
    }
    if (state.completedTricks.length === 12) {
      return 20;
    }
    return 0;
  }
  if (state.contract === "No Queens") {
    return cards.filter((played) => played.card.rank === "Q").length * 6;
  }
  if (state.contract === "King of Hearts") {
    return cards.filter((played) => isKingOfHearts(played.card)).length * 20;
  }
  if (state.contract === "Hearts") {
    return cards.reduce((total, played) => {
      if (played.card.suit === "H") {
        return total + 1;
      }
      if (played.card.rank === "Q" && played.card.suit === "S") {
        return total + 13;
      }
      return total;
    }, 0);
  }

  return cards
    .filter((played) => played.card.suit === "H")
    .reduce((total, played) => total + (played.card.rank === "A" ? 6 : 2), 0);
}

function isPenaltyCard(contract: FullHandContract, card: Card) {
  if (contract === "No Tricks" || contract === "Hearts Trumps") {
    return false;
  }
  if (contract === "No Last Two") {
    return false;
  }
  if (contract === "No Queens") {
    return card.rank === "Q";
  }
  if (contract === "King of Hearts") {
    return isKingOfHearts(card);
  }
  if (contract === "Hearts") {
    return card.suit === "H" || (card.rank === "Q" && card.suit === "S");
  }

  return card.suit === "H";
}

function isKingOfHearts(card: Card) {
  return card.rank === "K" && card.suit === "H";
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

function trickWinner(contract: FullHandContract, cards: TableCard[]) {
  if (contract === "Hearts Trumps") {
    const trumpWinner = cards
      .filter((played) => played.card.suit === "H")
      .reduce<TableCard | undefined>(
        (winner, played) =>
          !winner || rankOrder[played.card.rank as Rank] > rankOrder[winner.card.rank as Rank] ? played : winner,
        undefined
      );

    if (trumpWinner) {
      return playerNames.indexOf(trumpWinner.seat);
    }
  }

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
    return `Hand complete. You took ${playerPenalty} ${playerPenalty === 1 ? "point" : "points"}.`;
  }

  if (state.id.includes("hearts-passing-hand")) {
    return "Choose three cards to pass left.";
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
      cards: [...trick.cards],
      tacticalTags: [...(trick.tacticalTags ?? [])]
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
