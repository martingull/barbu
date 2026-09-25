import { legalCards, trickWinner } from "./trickTakingRules";
import { chooseBarbuCard } from "./barbuPolicy";
import { barbuTrickPoints, isBarbuTrickContract, type BarbuTrickContract } from "./barbuRules";
import { originalSpadesCards, spadesBidFromId, suggestedSpadesBidForCards } from "./spadesBidding";
import { heartsPoints, legalHeartsCards } from "./heartsRules";
import { chooseWhistCard, whistPositionFromHand } from "./whistPolicy";
import { bridgeBoardConditions } from "./bridgeBoard";
import { chooseHeartsCard, chooseHeartsPass, heartsPositionFromHand } from "./heartsPolicy";
import type {
  Card,
  BridgeAuctionCall,
  BridgeContractState,
  CompletedHandTrick,
  FullHandContract,
  FullHandState,
  Seat,
  Suit,
  TableCard
} from "./types";

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
const suitOrder: Record<Suit, number> = { C: 0, D: 1, S: 2, H: 3 };
const playerNames: Array<Seat> = ["Tutor", "Right", "You", "Left"];

export function startBrowserHeartsHand(seed: number): FullHandState {
  return startBrowserFullHand("Hearts", seed, { startAtTwoOfClubs: true });
}

export function startBrowserWhistHand(seed: number, dealer?: number): FullHandState {
  if (dealer !== undefined && (!Number.isInteger(dealer) || dealer < 0 || dealer > 3)) throw new Error("Invalid Whist dealer");
  return startBrowserWhistFamilyHand("Whist", seed, undefined, dealer);
}

export function replayWhistHand(state: FullHandState): FullHandState {
  const dealer = state.whistDealer ?? Number(state.id.match(/-dealer-(\d+)-/)?.[1]);
  if (!Number.isInteger(dealer) || dealer < 0 || dealer > 3) throw new Error("Invalid Whist dealer");
  return replayTrickTakingHand(state, (dealer + 1) % 4, { whistDealer: dealer });
}

export function replayHeartsHand(state: FullHandState): FullHandState {
  return replayTrickTakingHand(state);
}

export function replayBridgeHand(state: FullHandState): FullHandState {
  if (!state.bridgeContract) return state;
  const declarer = playerNames.indexOf(state.bridgeContract.declarer);
  return replayTrickTakingHand(state, (declarer + 1) % 4);
}

function replayTrickTakingHand(state: FullHandState, leader?: number, metadata: Partial<FullHandState> = {}): FullHandState {
  const hands = state.hands.map(hand => [...hand]);
  // Native and browser shuffles differ. Recover the actual deal, not just its seed.
  for (const play of [...state.completedTricks.flatMap(trick => trick.cards), ...state.currentTrick]) {
    const seat = playerNames.indexOf(play.seat);
    if (seat < 0) throw new Error(`Invalid ${state.contract} seat`);
    hands[seat].push(play.card);
  }
  if (hands.length !== 4 || hands.some(hand => hand.length !== 13) || new Set(hands.flat().map(card => card.id)).size !== 52) {
    throw new Error(`Cannot replay an incomplete ${state.contract} deal`);
  }
  hands.forEach(hand => hand.sort(compareCards));
  return advanceToPlayerTurn({
    ...state,
    ...metadata,
    hands,
    currentPlayerIndex: leader ?? playerWithCard(hands, "2C") ?? 0,
    dummyLegalCardIds: undefined,
    currentTrick: [],
    completedTricks: [],
    playerHand: hands[2],
    legalCardIds: [],
    playerPenalty: 0,
    totalPenalty: 0,
    cardsRemaining: 52,
    trickNumber: 1,
    status: "in_progress"
  });
}

export function startBrowserBridgeHand(seed: number, boardNumber = 1): FullHandState {
  const board = bridgeBoardConditions(boardNumber);
  const hand = startBrowserWhistFamilyHand("Bridge", seed, null, playerNames.indexOf(board.dealer));
  return { ...hand, bridgeBoardNumber: boardNumber, bridgeVulnerability: board.vulnerability };
}

function startBrowserWhistFamilyHand(contract: "Whist" | "Spades" | "Bridge", seed: number, fixedTrump?: Suit | null, selectedDealer?: number, deferPlay = false): FullHandState {
  const deck = shuffledDeck(seed);
  const dealer = selectedDealer ?? whistDealerForSeed(seed);
  const leader = contract === "Bridge" ? dealer : (dealer + 1) % 4;
  const trumpSuit = fixedTrump !== undefined ? fixedTrump : deck[dealer + 48].suit;
  const hands: Card[][] = [[], [], [], []];

  deck.forEach((card, index) => hands[index % 4].push(card));
  hands.forEach((hand) => hand.sort(compareCards));

  const bridgeDealer = contract === "Bridge" ? playerNames[dealer] : undefined;

  const initialState = hydrateFullHandState({
    id: `browser-${contract.toLowerCase()}-hand-${seed}-dealer-${dealer}-${trumpSuit}`,
    contract,
    hands,
    currentPlayerIndex: leader,
    currentPlayer: playerNames[leader],
    currentTrick: [],
    completedTricks: [],
    playerHand: hands[2],
    legalCardIds: [],
    playerPenalty: 0,
    totalPenalty: 0,
    cardsRemaining: 52,
    trickNumber: 1,
    status: "in_progress",
    prompt: "",
    trumpSuit,
    whistDealer: contract === "Whist" ? dealer : undefined,
    whistTurnedTrump: contract === "Whist" ? deck[dealer + 48] : undefined,
    bridgeDealer,
    bridgeVulnerability: contract === "Bridge" ? "None" : undefined
  });

  return contract === "Bridge" || deferPlay ? initialState : advanceToPlayerTurn(initialState);
}

export function applyBrowserBridgeAuction(
  state: FullHandState,
  bridgeContract: BridgeContractState,
  bridgeAuction: BridgeAuctionCall[]
): FullHandState {
  if (state.contract !== "Bridge") {
    return state;
  }

  const declarerIndex = playerNames.indexOf(bridgeContract.declarer);
  const dummyIndex = playerNames.indexOf(bridgeContract.dummy);
  const openingLeaderIndex = playerNames.indexOf(bridgeContract.openingLeader ?? playerNames[(declarerIndex + 1) % 4]);

  if (declarerIndex < 0 || dummyIndex < 0 || openingLeaderIndex < 0) {
    return state;
  }

  return advanceToPlayerTurn(
    hydrateFullHandState({
      ...cloneState(state),
      bridgeAuction,
      bridgeContract,
      bridgeDealer: bridgeContract.dealer ?? state.bridgeDealer,
      bridgeVulnerability: bridgeContract.vulnerability,
      trumpSuit: bridgeContract.strain === "NT" ? null : bridgeContract.strain,
      dummySeat: bridgeContract.dummy,
      dummyHand: state.hands[dummyIndex],
      currentPlayerIndex: openingLeaderIndex,
      currentPlayer: playerNames[openingLeaderIndex],
      currentTrick: [],
      completedTricks: [],
      legalCardIds: [],
      dummyLegalCardIds: [],
      playerPenalty: 0,
      totalPenalty: 0,
      cardsRemaining: state.hands.flat().length,
      trickNumber: 1,
      status: "in_progress",
      prompt: ""
    })
  );
}

export function startBrowserSpadesHand(seed: number): FullHandState {
  return startBrowserWhistFamilyHand("Spades", seed, "S");
}

export function startSpadesBiddingHand(seed: number): FullHandState {
  return startBrowserWhistFamilyHand("Spades", seed, "S", undefined, true);
}

export function beginSpadesHand(state: FullHandState, bids: Record<Seat, number>): FullHandState {
  return advanceToPlayerTurn({ ...cloneState(state), spadesBids: { ...bids } });
}

export function replaySpadesHand(state: FullHandState): FullHandState {
  const dealer = Number(state.id.match(/-dealer-([0-3])-/)?.[1]);
  // Older hand IDs may omit the dealer; the first recorded play still identifies the opener.
  const openingSeat = state.completedTricks[0]?.cards[0]?.seat ?? state.currentTrick[0]?.seat;
  const leader = Number.isInteger(dealer) ? (dealer + 1) % 4
    : openingSeat ? playerNames.indexOf(openingSeat) : state.currentPlayerIndex;
  if (!Number.isInteger(leader) || leader < 0 || leader > 3) throw new Error("Invalid Spades opening leader");
  return replayTrickTakingHand(state, leader);
}

export function startBrowserHeartsPassingHand(seed: number): FullHandState {
  const deck = shuffledDeck(seed);
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
    prompt: "Choose three cards to pass."
  });
}

export function applyBrowserHeartsPass(state: FullHandState, cardIds: string[], direction = 1): FullHandState {
  if (state.status === "complete" || state.currentTrick.length || state.completedTricks.length) {
    return state;
  }

  if (direction < 1 || direction > 3) {
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
    const recipient = (player + direction) % 4;
    nextState.hands[recipient].push(...cards);
  });

  nextState.hands.forEach((hand) => hand.sort(compareCards));
  nextState.id = nextState.id.replace("hearts-passing-hand", "hearts-hand");
  nextState.currentPlayerIndex = playerWithCard(nextState.hands, "2C") ?? 0;
  nextState.currentPlayer = playerNames[nextState.currentPlayerIndex];
  nextState.currentTrick = [];
  nextState.completedTricks = [];
  nextState.status = "in_progress";

  return advanceToPlayerTurn(nextState);
}

export function startBarbuHand(contract: BarbuTrickContract, seed: number): FullHandState {
  if (!isBarbuTrickContract(contract) || !Number.isSafeInteger(seed) || seed < 0) throw new Error("Invalid Barbu deal");
  return startBrowserFullHand(contract, seed);
}

export function replayBarbuHand(state: FullHandState): FullHandState {
  return replayTrickTakingHand(state, 0);
}

function startBrowserFullHand(
  contract: FullHandContract,
  seed: number,
  options: { startAtTwoOfClubs?: boolean; startingPlayerIndex?: number } = {}
): FullHandState {
  const deck = shuffledDeck(seed);
  const hands: Card[][] = [[], [], [], []];
  deck.forEach((card, index) => hands[index % 4].push(card));
  hands.forEach((hand) => hand.sort(compareCards));

  const currentPlayerIndex = options.startAtTwoOfClubs ? playerWithCard(hands, "2C") ?? 0 : options.startingPlayerIndex ?? 0;
  const id = `browser-${contract.toLowerCase().replace(/\s+/g, "-")}-hand-${seed}`;

  return advanceToPlayerTurn(
    hydrateFullHandState({
      id,
      contract,
      hands,
      currentPlayerIndex,
      currentPlayer: playerNames[currentPlayerIndex],
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

export function playBarbuCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserFullHandCard(state, cardId);
}

export function playBrowserHeartsCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserFullHandCard(state, cardId);
}

export function playBrowserWhistCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserWhistFamilyCard(state, cardId);
}

export function playBrowserSpadesCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserWhistFamilyCard(state, cardId);
}

export function playBrowserBridgeCard(state: FullHandState, cardId: string): FullHandState {
  if (!state.bridgeContract) return state;
  return playBrowserWhistFamilyCard(state, cardId);
}

function playBrowserWhistFamilyCard(state: FullHandState, cardId: string): FullHandState {
  return playBrowserFullHandCard(state, cardId);
}

function playBrowserFullHandCard(state: FullHandState, cardId: string): FullHandState {
  const playableSeatIndex = browserPlayableSeatIndex(state);
  const selectedCard = state.hands[playableSeatIndex].find((card) => card.id === cardId);

  if (!selectedCard || state.status === "complete" || state.currentPlayerIndex !== playableSeatIndex) {
    return state;
  }

  if (!legalCardsForState(state, playableSeatIndex).some((card) => card.id === cardId)) {
    return state;
  }

  const nextState = cloneState(state);
  playCardForCurrentPlayer(nextState, selectedCard);
  return advanceToPlayerTurn(nextState);
}

function advanceToPlayerTurn(state: FullHandState): FullHandState {
  const nextState = cloneState(state);

  while (nextState.status === "in_progress" && !browserSeatNeedsUserInput(nextState)) {
    const card = chooseOpponentCard(nextState);

    if (!card) {
      nextState.status = "complete";
      break;
    }

    playCardForCurrentPlayer(nextState, card);
  }

  return hydrateFullHandState(nextState);
}

function browserSeatNeedsUserInput(state: FullHandState) {
  if (state.currentPlayerIndex === 2) {
    return true;
  }

  return state.contract === "Bridge" && userControlsBridgeDummy(state) && state.currentPlayerIndex === bridgeDummyIndex(state);
}

function browserPlayableSeatIndex(state: FullHandState) {
  if (state.contract === "Bridge" && userControlsBridgeDummy(state) && state.currentPlayerIndex === bridgeDummyIndex(state)) {
    return bridgeDummyIndex(state);
  }

  return 2;
}

function bridgeDeclarerIndex(state: FullHandState) {
  const seat = state.bridgeContract?.declarer;
  const index = seat ? playerNames.indexOf(seat) : 2;

  return index >= 0 ? index : 2;
}

function bridgeDummyIndex(state: FullHandState) {
  const seat = state.bridgeContract?.dummy;
  const index = seat ? playerNames.indexOf(seat) : 0;

  return index >= 0 ? index : 0;
}

function userControlsBridgeDummy(state: FullHandState) {
  return bridgeDeclarerIndex(state) % 2 === 0;
}

function bridgeDummyIsRevealed(state: FullHandState) {
  return state.contract !== "Bridge" || state.currentTrick.length > 0 || state.completedTricks.length > 0;
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
  const winnerIndex = trickWinnerForState(state, state.currentTrick);
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
  } else if (contract === "Whist" || contract === "Spades" || contract === "Bridge") {
    const winnerCard = trick.cards.find((played) => played.seat === trick.winner)?.card;
    const playerCard = trick.cards.find((played) => played.seat === "You")?.card;
    const partnerCard = trick.cards.find((played) => played.seat === "Tutor")?.card;

    if (winnerCard && led && winnerCard.suit !== led) {
      tags.push("trump_won");
    }
    tags.push(trick.winnerIndex === 0 || trick.winnerIndex === 2 ? "partner_trick" : "opponent_trick");
    if (trick.winnerIndex === 0) {
      tags.push("partner_held");
    }
    if (trick.cards[0]?.seat === "Tutor" && (trick.winnerIndex === 0 || trick.winnerIndex === 2)) {
      tags.push("partner_supported");
    }
    if (trick.cards[2]?.seat === "You" && trick.cards[0]?.seat === "Tutor") {
      tags.push("third_hand_high");
    }
    if (
      trick.winnerIndex === 0 &&
      playerCard &&
      partnerCard &&
      playerCard.suit === partnerCard.suit &&
      rankOrder[playerCard.rank as Rank] < rankOrder[partnerCard.rank as Rank]
    ) {
      tags.push("avoided_overtake");
    }
  } else if (
    (contract === "Hearts" || contract === "No Hearts" || contract === "No Queens" || contract === "King of Hearts") &&
    trick.penalty > 0
  ) {
    tags.push("danger_card_moved");
    if (contract === "Hearts") {
      if (trick.cards.some((played) => played.card.id === "QS")) {
        tags.push("queen_spades_moved");
      }
      if (trick.cards.some((played) => played.card.suit === "H")) {
        tags.push("hearts_moved");
      }
      if (
        trick.winnerIndex === 2 &&
        trick.cards.some((played) => played.seat !== "You" && played.card.suit !== led)
      ) {
        tags.push("opponent_loaded_player_trick");
      }
      if (trick.winnerIndex === 2 && trick.cards[0]?.seat !== "You") {
        tags.push("pressure_lead");
      }
    }
  }

  return tags;
}

export function hydrateFullHandState(state: FullHandState): FullHandState {
  const dummyIndex = state.contract === "Bridge" ? bridgeDummyIndex(state) : -1;
  const dummyHand = state.contract === "Bridge"
    ? dummyIndex >= 0 && bridgeDummyIsRevealed(state)
      ? [...state.hands[dummyIndex]]
      : undefined
    : state.dummyHand;

  if (state.status === "complete") {
    state.legalCardIds = [];
    state.dummyLegalCardIds = [];
    return {
      ...state,
      dummyHand,
      playerHand: [...state.hands[2]],
      currentPlayer: playerNames[state.currentPlayerIndex],
      playerPenalty: state.completedTricks
        .filter((trick) => trick.winnerIndex === 2)
        .reduce((total, trick) => total + trick.penalty, 0),
      totalPenalty: state.completedTricks.reduce((total, trick) => total + trick.penalty, 0),
      cardsRemaining: state.hands.flat().length,
      trickNumber: Math.min(state.completedTricks.length + 1, 13),
      prompt: promptForState(state, state.completedTricks.filter(trick => trick.winnerIndex === 2).reduce((total, trick) => total + trick.penalty, 0))
    };
  }

  const isDummyTurn = state.contract === "Bridge" && userControlsBridgeDummy(state) && state.currentPlayerIndex === dummyIndex;

  state.legalCardIds = state.currentPlayerIndex === 2 ? legalCardsForState(state, 2).map((card) => card.id) : [];
  
  if (state.contract === "Bridge") {
    state.dummyLegalCardIds = !isDummyTurn ? [] : legalCardsForState(state, dummyIndex).map(
      (card) => card.id
    );
  }

  const playerHand = state.hands[2];
  const playerPenalty = state.completedTricks
    .filter((trick) => trick.winnerIndex === 2)
    .reduce((total, trick) => total + trick.penalty, 0);
  const totalPenalty = state.completedTricks.reduce((total, trick) => total + trick.penalty, 0);

  return {
    ...state,
    currentPlayer: playerNames[state.currentPlayerIndex],
    playerHand: [...playerHand],
    dummyHand,
    playerPenalty,
    totalPenalty,
    cardsRemaining: state.hands.flat().length,
    trickNumber: Math.min(state.completedTricks.length + 1, 13),
    prompt: promptForState(state, playerPenalty)
  };
}

function chooseOpponentCard(state: FullHandState) {
  if (isBarbuTrickContract(state.contract)) return chooseBarbuCard(state.contract, state.hands[state.currentPlayerIndex],
    state.currentTrick, playerNames[state.currentPlayerIndex], state.completedTricks.length);
  if (state.contract === "Whist") return chooseWhistCard(whistPositionFromHand(state));
  const legal = legalCardsForState(state, state.currentPlayerIndex);
  if (state.contract === "Hearts") return chooseHeartsCard(heartsPositionFromHand(state, legal));
  if (!legal.length) return undefined;
  const led = ledSuit(state);
  if (state.contract === "Bridge") {
    return !led ? chooseBridgeLeadCard(state, legal)
      : legal.every(card => card.suit === led) ? chooseBridgeFollowCard(state, legal) : chooseBridgeVoidCard(state, legal);
  }
  if (state.contract === "Spades") {
    return !led ? chooseSpadesLeadCard(state, legal)
      : legal.every(card => card.suit === led) ? chooseSpadesFollowCard(state, legal) : chooseSpadesVoidCard(state, legal);
  }
  throw new Error(`Unsupported trick-taking contract: ${state.contract}`);
}

export function chooseBrowserOpponentCardForState(state: FullHandState) {
  return chooseOpponentCard(hydrateFullHandState(cloneState(state)));
}

function chooseBridgeLeadCard(state: FullHandState, legal: Card[]) {
  const trump = whistTrumpSuitFromState(state);
  const declarerSide = bridgeDeclarerIndex(state) % 2;
  const currentSide = state.currentPlayerIndex % 2;

  if (currentSide === declarerSide) {
    const known = bridgeKnownCards(state);
    const outstandingTrumps = trump ? 13 - known.filter(card => card.suit === trump).length : 0;
    if (trump && outstandingTrumps > 0) {
      const trumpLead = highestCard(legal.filter((card) => card.suit === trump));
      if (trumpLead) {
        return trumpLead;
      }
    }

    const partner = state.hands[(state.currentPlayerIndex + 2) % 4];
    // Lead toward an exposed honor combination instead of leading away from it.
    for (const suit of suits) {
      if (suit === trump) continue;
      if (partner.some(card => card.suit === suit && card.rank === "A") && partner.some(card => card.suit === suit && card.rank === "Q") && !known.some(card => card.suit === suit && card.rank === "K")) {
        const lead = lowestCard(legal.filter(card => card.suit === suit));
        if (lead) return lead;
      }
    }
    const winners = legal.filter(card => card.suit !== trump && bridgeIsMaster(state, card));
    return highestCardFromLongestSuit(winners, legal) ?? highestCardFromLongestSuit(legal.filter(card => card.suit !== trump), legal) ?? highestCard(legal);
  }

  const plain = legal.filter(card => card.suit !== trump);
  let candidates = plain.length ? plain : legal;
  if (trump) {
    const withoutUnsupportedAce = candidates.filter(card => !candidates.some(held => held.suit === card.suit && held.rank === "A") || candidates.some(held => held.suit === card.suit && held.rank === "K"));
    if (withoutUnsupportedAce.length) candidates = withoutUnsupportedAce;
  }
  const longest = lowestCardFromLongestSuit(candidates, legal)!;
  const holding = legal.filter(card => card.suit === longest.suit).sort((a, b) => rankOrder[b.rank as Rank] - rankOrder[a.rank as Rank]);
  const sequence = holding.length >= (trump ? 2 : 3) && rankOrder[holding[0].rank as Rank] >= 12 && holding.slice(1, trump ? 2 : 3).every((card, index) => rankOrder[card.rank as Rank] === rankOrder[holding[0].rank as Rank] - index - 1);
  if (sequence) return holding[0];
  return !trump && holding.length >= 4 ? holding[3] : holding.at(-1);
}

function bridgeKnownCards(state: FullHandState): Card[] {
  const own = state.hands[state.currentPlayerIndex];
  const declarer = bridgeDeclarerIndex(state);
  const visible = state.currentPlayerIndex % 2 === declarer % 2
    ? state.hands[(state.currentPlayerIndex + 2) % 4]
    : state.currentTrick.length || state.completedTricks.length ? state.hands[(declarer + 2) % 4] : [];
  return [...own, ...visible, ...state.currentTrick.map(play => play.card), ...state.completedTricks.flatMap(trick => trick.cards.map(play => play.card))];
}

function bridgeIsMaster(state: FullHandState, card: Card) {
  const known = bridgeKnownCards(state);
  const dummy = (bridgeDeclarerIndex(state) + 2) % 4;
  const opposingDummy = state.currentPlayerIndex % 2 !== dummy % 2 ? state.hands[dummy] : [];
  return ranks.filter(rank => rankOrder[rank] > rankOrder[card.rank as Rank]).every(rank => known.some(known => known.suit === card.suit && known.rank === rank) && !opposingDummy.some(held => held.suit === card.suit && held.rank === rank));
}

function chooseBridgeFollowCard(state: FullHandState, legal: Card[]) {
  if (whistPartnerIsWinning(state)) {
    return lowestCard(legal);
  }
  // Third hand high, but use the cheapest winner when playing last.
  if (state.currentTrick.length === 2) {
    const queen = legal.find(card => card.rank === "Q");
    const declaring = state.currentPlayerIndex % 2 === bridgeDeclarerIndex(state) % 2;
    if (declaring && queen && legal.some(card => card.rank === "A") && cardWouldWinTrick(state, queen) && !bridgeKnownCards(state).some(card => card.suit === queen.suit && card.rank === "K")) return queen;
    return highestCard(legal.filter(card => cardWouldWinTrick(state, card))) ?? lowestCard(legal);
  }
  if (state.currentTrick.length === 1 && !legal.some(card => bridgeIsMaster(state, card))) return lowestCard(legal);
  return lowestWinningCard(state, legal) ?? lowestCard(legal);
}

function chooseBridgeVoidCard(state: FullHandState, legal: Card[]) {
  const trump = whistTrumpSuitFromState(state);
  const lowestNonTrump = lowestCard(legal.filter((card) => card.suit !== trump)) ?? lowestCard(legal);

  if (whistPartnerIsWinning(state)) return lowestNonTrump;

  return (
    lowestCard(legal.filter((card) => trump && card.suit === trump && cardWouldWinTrick(state, card))) ??
    lowestNonTrump
  );
}

function chooseSpadesLeadCard(state: FullHandState, legal: Card[]) {
  const context = spadesPlayContext(state);

  if (context.currentPlayerNil || context.sideHasContract) {
    return lowestCardFromLongestSuit(legal.filter((card) => card.suit !== "S"), legal) ?? lowestCard(legal);
  }

  if (context.partnerNil) {
    return highestCardFromLongestSuit(legal.filter((card) => card.suit !== "S"), legal) ?? highestCard(legal);
  }

  if (context.opponentNil) {
    return lowestCardFromLongestSuit(legal.filter((card) => card.suit !== "S"), legal) ?? lowestCard(legal);
  }

  if (spadesHaveBeenBroken(state)) {
    const highSpade = highestCard(legal.filter((card) => card.suit === "S"));
    if (highSpade) {
      return highSpade;
    }
  }

  return highestCardFromLongestSuit(legal.filter((card) => card.suit !== "S"), legal) ?? highestCard(legal);
}

function chooseSpadesFollowCard(state: FullHandState, legal: Card[]) {
  const context = spadesPlayContext(state);

  if (context.currentPlayerNil) {
    return highestCard(legal.filter((card) => !cardWouldWinTrick(state, card))) ?? lowestCard(legal);
  }

  if (context.partnerNil && context.currentWinner === context.partnerIndex) {
    return lowestWinningCard(state, legal) ?? lowestCard(legal);
  }

  if (context.opponentNilWinning) {
    return highestCard(legal.filter((card) => !cardWouldWinTrick(state, card))) ?? lowestCard(legal);
  }

  if (context.sideHasContract) {
    return highestCard(legal.filter((card) => !cardWouldWinTrick(state, card))) ?? lowestCard(legal);
  }

  if (whistPartnerIsWinning(state)) {
    return lowestCard(legal);
  }

  return lowestWinningCard(state, legal) ?? lowestCard(legal);
}

function chooseSpadesVoidCard(state: FullHandState, legal: Card[]) {
  const context = spadesPlayContext(state);

  if (context.currentPlayerNil) {
    return (
      highestCard(legal.filter((card) => !cardWouldWinTrick(state, card))) ??
      lowestCard(legal.filter((card) => card.suit !== "S")) ??
      lowestCard(legal)
    );
  }

  if (context.partnerNil && context.currentWinner === context.partnerIndex) {
    return lowestWinningCard(state, legal.filter((card) => card.suit === "S")) ?? lowestCard(legal);
  }

  if (context.opponentNilWinning) {
    return (
      lowestCard(legal.filter((card) => card.suit !== "S" && !cardWouldWinTrick(state, card))) ??
      lowestCard(legal.filter((card) => !cardWouldWinTrick(state, card))) ??
      lowestCard(legal)
    );
  }

  if (context.sideHasContract || whistPartnerIsWinning(state)) {
    return lowestCard(legal.filter((card) => card.suit !== "S")) ?? lowestCard(legal);
  }

  return (
    lowestCard(legal.filter((card) => card.suit === "S" && cardWouldWinTrick(state, card))) ??
    highestCard(legal.filter((card) => card.suit !== "S")) ??
    lowestCard(legal)
  );
}

function spadesPlayContext(state: FullHandState) {
  const currentPlayer = state.currentPlayerIndex;
  const partnerIndex = (currentPlayer + 2) % 4;
  const currentWinner = state.currentTrick.length ? trickWinnerForState(state, state.currentTrick) : undefined;
  const sideBid = spadesEstimatedBidForPlayer(state, currentPlayer) + spadesEstimatedBidForPlayer(state, partnerIndex);
  const sideTricks = state.completedTricks.filter((trick) => sameWhistPartnership(trick.winnerIndex, currentPlayer)).length;

  return {
    currentWinner,
    partnerIndex,
    currentPlayerNil: spadesEstimatedBidForPlayer(state, currentPlayer) === 0,
    partnerNil: spadesEstimatedBidForPlayer(state, partnerIndex) === 0,
    opponentNil: [0, 1, 2, 3].some(
      (player) => !sameWhistPartnership(player, currentPlayer) && spadesEstimatedBidForPlayer(state, player) === 0
    ),
    opponentNilWinning:
      currentWinner !== undefined &&
      !sameWhistPartnership(currentWinner, currentPlayer) &&
      spadesEstimatedBidForPlayer(state, currentWinner) === 0,
    sideHasContract: sideBid > 0 && sideTricks >= sideBid
  };
}

function spadesEstimatedBidForPlayer(state: FullHandState, playerIndex: number) {
  return state.spadesBids?.[playerNames[playerIndex]] ?? spadesBidFromId(state.id, playerIndex)
    ?? suggestedSpadesBidForCards(originalSpadesCards(state, playerNames[playerIndex]));
}

function whistPartnerIsWinning(state: FullHandState) {
  if (!state.currentTrick.length) {
    return false;
  }

  return sameWhistPartnership(trickWinnerForState(state, state.currentTrick), state.currentPlayerIndex);
}

function sameWhistPartnership(left: number, right: number) {
  return left % 2 === right % 2;
}

function cardWouldWinTrick(state: FullHandState, card: Card) {
  const led = ledSuit(state);

  if (!led) {
    return true;
  }
  if (state.contract === "Hearts Trumps" || state.contract === "Whist" || state.contract === "Spades" || state.contract === "Bridge") {
    const simulated = [...state.currentTrick, { seat: playerNames[state.currentPlayerIndex], card }];
    return trickWinnerForState(state, simulated) === state.currentPlayerIndex;
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

function lowestWinningCard(state: FullHandState, cards: Card[]) {
  return lowestCard(cards.filter((card) => cardWouldWinTrick(state, card)));
}

function highestCardFromLongestSuit(candidates: Card[], fullHand: Card[]) {
  return candidates.slice().sort((left, right) => {
    const suitPressure = suitCount(fullHand, right.suit) - suitCount(fullHand, left.suit);

    return suitPressure || rankOrder[right.rank as Rank] - rankOrder[left.rank as Rank] || suitOrder[left.suit] - suitOrder[right.suit];
  })[0];
}

function lowestCardFromLongestSuit(candidates: Card[], fullHand: Card[]) {
  return candidates.slice().sort((left, right) => {
    const suitPressure = suitCount(fullHand, right.suit) - suitCount(fullHand, left.suit);

    return suitPressure || rankOrder[left.rank as Rank] - rankOrder[right.rank as Rank] || suitOrder[left.suit] - suitOrder[right.suit];
  })[0];
}

function suitCount(cards: Card[], suit: Suit) {
  return cards.filter((card) => card.suit === suit).length;
}

function chooseHeartsPassCards(hand: Card[]) {
  return chooseHeartsPass(hand);
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
  if (state.contract === "Whist" || state.contract === "Spades" || state.contract === "Bridge") {
    return 1;
  }
  if (state.contract === "Hearts") {
    return cards.reduce((total, played) => total + heartsPoints(played.card), 0);
  }

  return barbuTrickPoints(state.contract as BarbuTrickContract, cards, state.completedTricks.length + 1);
}

function legalCardsForState(state: FullHandState, playerIndex: number) {
  const basicLegal = legalCards(state.hands[playerIndex], ledSuit(state));

  if (state.contract === "Spades") {
    return legalSpadesCardsForState(state, basicLegal);
  }

  if (state.contract !== "Hearts" || !basicLegal.length) return basicLegal;
  return legalHeartsCards(state.hands[playerIndex], ledSuit(state), !state.completedTricks.length, heartsHaveBeenBroken(state));
}

function legalSpadesCardsForState(state: FullHandState, basicLegal: Card[]) {
  if (!basicLegal.length || state.currentTrick.length || spadesHaveBeenBroken(state)) {
    return basicLegal;
  }

  const nonSpades = basicLegal.filter((card) => card.suit !== "S");
  return nonSpades.length ? nonSpades : basicLegal;
}

function spadesHaveBeenBroken(state: FullHandState) {
  return [...state.completedTricks.flatMap((trick) => trick.cards), ...state.currentTrick].some(
    (played) => played.card.suit === "S"
  );
}

function heartsHaveBeenBroken(state: FullHandState) {
  return [...state.completedTricks.flatMap((trick) => trick.cards), ...state.currentTrick].some(
    (played) => played.card.suit === "H"
  );
}

function playerWithCard(hands: Card[][], cardId: string) {
  const playerIndex = hands.findIndex((hand) => hand.some((card) => card.id === cardId));
  return playerIndex >= 0 ? playerIndex : undefined;
}

function ledSuit(state: FullHandState): Suit | undefined {
  return state.currentTrick[0]?.card.suit;
}

function trickWinnerForState(state: FullHandState, cards: TableCard[]) {
  const trump = state.contract === "Hearts Trumps" ? "H"
    : state.contract === "Whist" || state.contract === "Spades" || state.contract === "Bridge"
      ? whistTrumpSuitFromState(state) : undefined;
  return playerNames.indexOf(trickWinner(cards, trump)!.seat);
}

function promptForState(state: FullHandState, playerPenalty: number) {
  const bridgeContractLabel = state.bridgeContract?.label ?? "1 No Trump";
  const bridgeDeclarer = state.bridgeContract?.declarer ?? "You";
  const bridgeDummy = state.bridgeContract?.dummy ?? "Tutor";

  if (state.status === "complete") {
    if (state.contract === "Whist" || state.contract === "Spades" || state.contract === "Bridge") {
      return state.contract === "Bridge"
        ? `Bridge hand complete. Contract: ${bridgeContractLabel}.`
        : `${state.contract} hand complete. ${suitName(whistTrumpSuitFromState(state) ?? "S")} were trumps.`;
    }

    return `Hand complete. You took ${playerPenalty} ${playerPenalty === 1 ? "point" : "points"}.`;
  }

  if (state.id.includes("hearts-passing-hand")) {
    return "Choose three cards to pass.";
  }

  if (state.contract === "Hearts" && !state.completedTricks.length && !state.currentTrick.length) {
    return "You hold 2C, so you must open the first trick with 2C.";
  }

  if (state.contract === "Whist" || state.contract === "Spades" || state.contract === "Bridge") {
    const trumpSuit = whistTrumpSuitFromState(state);
    const trump = trumpSuit ? suitName(trumpSuit).toLowerCase() : "no trump";
    const led = ledSuit(state);

    if (!led) {
      if (state.contract === "Bridge") {
        if (state.currentPlayerIndex === bridgeDummyIndex(state)) {
          return `Dummy is on lead. Choose from ${bridgeSeatLabel(bridgeDummy)}'s exposed hand and plan the ${bridgeContractLabel} winners.`;
        }

        return bridgeDeclarer === "You" || bridgeDummy === "You"
          ? `You lead for declarer in ${bridgeContractLabel}. Choose a suit that builds winners.`
          : `You are defending ${bridgeContractLabel}. Make the opening lead before dummy appears.`;
      }
      if (state.contract === "Spades" && !spadesHaveBeenBroken(state)) {
        return "You lead. Spades are trump, but you cannot lead spades until they are broken unless you only hold spades.";
      }
      if (!state.completedTricks.length) {
        return `You are left of the dealer, so you lead first. Choose a suit that helps your side. ${trump} are trumps.`;
      }
      return `You lead. Choose a suit that helps your side. ${trump} are trumps.`;
    }

    if (state.contract === "Bridge") {
      return bridgeDeclarer === "You" || bridgeDummy === "You"
        ? `${suitName(led)} were led. Follow suit if you can. Contract: ${bridgeContractLabel}.`
        : `${suitName(led)} were led. You are defending ${bridgeContractLabel}; follow suit if you can.`;
    }

    return `${suitName(led)} were led. Follow suit if you can. Trump: ${trump}.`;
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

function shuffledDeck(seed: number) {
  const deck = standardDeck();
  const rng = new DeterministicRng(seed);

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.nextInt(index + 1);
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
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

function scoreSeatLabel(seat: Seat) {
  return seat === "Tutor" ? "Barbu" : seat;
}

function bridgeSeatLabel(seat: Seat) {
  if (seat === "Tutor") return "North";
  if (seat === "Right") return "East";
  if (seat === "You") return "South";
  return "West";
}

function whistDealerForSeed(seed: number) {
  return seed % 4;
}

function whistTrumpSuitFromState(state: FullHandState): Suit | null {
  if (state.trumpSuit !== undefined) {
    return state.trumpSuit;
  }
  return whistTrumpSuitFromId(state.id);
}

function whistTrumpSuitFromId(id: string): Suit {
  const suffix = id.split("-").pop();
  return suffix === "C" || suffix === "D" || suffix === "H" || suffix === "S" ? suffix : "S";
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
    legalCardIds: [...state.legalCardIds],
    dummyHand: state.dummyHand ? [...state.dummyHand] : undefined,
    dummyLegalCardIds: state.dummyLegalCardIds ? [...state.dummyLegalCardIds] : undefined
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
