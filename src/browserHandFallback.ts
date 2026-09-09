import { chooseWhistCard, whistPositionFromHand } from "./whistPolicy";
import { chooseHeartsCard, chooseHeartsPass, heartsPositionFromHand } from "./heartsPolicy";
import type {
  Card,
  BridgeAuctionCall,
  BridgeContractState,
  BridgeVulnerability,
  CompletedHandTrick,
  FullHandContract,
  FullHandState,
  HeartsPassScenario,
  Seat,
  Suit,
  TableCard
} from "./lessonTypes";

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
const bridgeVulnerabilityCycle: BridgeVulnerability[] = ["None", "NS", "EW", "Both"];

export function startBrowserHeartsHand(seed: number): FullHandState {
  return startBrowserFullHand("Hearts", seed, { startAtTwoOfClubs: true });
}

export function startBrowserWhistHand(seed: number, dealer?: number): FullHandState {
  if (dealer !== undefined && (!Number.isInteger(dealer) || dealer < 0 || dealer > 3)) throw new Error("Invalid Whist dealer");
  return startBrowserWhistFamilyHand("Whist", seed, undefined, dealer);
}

export function startBrowserBridgeHand(seed: number): FullHandState {
  return startBrowserWhistFamilyHand("Bridge", seed, null);
}

function startBrowserWhistFamilyHand(contract: "Whist" | "Spades" | "Bridge", seed: number, fixedTrump?: Suit | null, selectedDealer?: number): FullHandState {
  const deck = shuffledDeck(seed);
  const dealer = selectedDealer ?? whistDealerForSeed(seed);
  const leader = contract === "Bridge" ? dealer : (dealer + 1) % 4;
  const trumpSuit = fixedTrump !== undefined ? fixedTrump : deck[dealer + 48].suit;
  const hands: Card[][] = [[], [], [], []];

  deck.forEach((card, index) => hands[index % 4].push(card));
  hands.forEach((hand) => hand.sort(compareCards));

  const bridgeDealer = contract === "Bridge" ? playerNames[dealer] : undefined;
  const bridgeVulnerability = contract === "Bridge" ? bridgeVulnerabilityCycle[seed % bridgeVulnerabilityCycle.length] : undefined;

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
    bridgeVulnerability
  });

  return contract === "Bridge" ? initialState : advanceToPlayerTurn(initialState);
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

export function generateBrowserHeartsPassPractice(seed: number): HeartsPassScenario {
  if (seed % 2 === 1) {
    const playerHand = [
      card("2", "C"),
      card("3", "C"),
      card("4", "C"),
      card("5", "C"),
      card("6", "C"),
      card("7", "C"),
      card("8", "C"),
      card("Q", "S"),
      card("A", "H"),
      card("K", "H"),
      card("2", "D"),
      card("4", "D"),
      card("9", "S")
    ].sort(compareCards);

    return {
      id: `browser-hearts-pass-long-clubs-${seed}`,
      title: "Build a long suit",
      prompt:
        "Choose three cards to pass while keeping the long club run together for later control.",
      playerHand,
      recommendedPass: [card("Q", "S"), card("A", "H"), card("K", "H")],
      explanation:
        "This hand keeps 2C through 8C together. A long suit can become a planned exit route, so pass the danger cards without breaking the run."
    };
  }

  const lowSuit = seed % 2 === 0 ? "C" : "D";
  const sideSuit = lowSuit === "C" ? "D" : "C";
  const playerHand = [
    card("Q", "S"),
    card("A", "H"),
    card("K", "H"),
    card("A", "S"),
    card("K", "S"),
    card("2", "H"),
    card("3", "H"),
    card("2", lowSuit),
    card("4", lowSuit),
    card("6", lowSuit),
    card("3", sideSuit),
    card("5", sideSuit),
    card("7", sideSuit)
  ].sort(compareCards);

  return {
    id: `browser-hearts-pass-${seed}`,
    title: "Pass the danger cards",
    prompt:
      "Choose three cards to pass. Start with Queen of Spades, high hearts, then dangerous high spades.",
    playerHand,
    recommendedPass: recommendBrowserHeartsPassCards(playerHand),
    explanation:
      "Beginner pass rule: move the obvious danger cards before the hand starts. Later we can teach suit-shortening and table reads."
  };
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

export function playBrowserNoHeartsCard(state: FullHandState, cardId: string): FullHandState {
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
  return playBrowserWhistFamilyCard(state, cardId);
}

function playBrowserWhistFamilyCard(state: FullHandState, cardId: string): FullHandState {
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
      prompt: promptForState(state, state.playerPenalty)
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
  if (state.contract === "Whist") return chooseWhistCard(whistPositionFromHand(state));
  const legal = legalCardsForState(state, state.currentPlayerIndex);
  if (state.contract === "Hearts") return chooseHeartsCard(heartsPositionFromHand(state, legal));
  const led = ledSuit(state);

  if (!legal.length) {
    return undefined;
  }

  if (!led) {
    if (state.contract === "Bridge") {
      return chooseBridgeLeadCard(state, legal);
    }
    if (state.contract === "Spades") {
      return chooseSpadesLeadCard(state, legal);
    }
    if (state.contract === "Hearts Trumps") {
      return highestCard(legal.filter((card) => card.suit === "H")) ?? highestCard(legal);
    }
    if (state.contract === "No Last Two") {
      return state.completedTricks.length >= 10 ? lowestCard(legal) : highestCard(legal);
    }
    if (state.contract === "No Queens") {
      return lowestCard(legal.filter((card) => card.rank !== "Q")) ?? lowestCard(legal);
    }
    return lowestCard(legal.filter((card) => !isPenaltyCard(state.contract, card))) ?? lowestCard(legal);
  }

  const followsSuit = legal.every((card) => card.suit === led);

  if (!followsSuit) {
    if (state.contract === "Bridge") {
      return chooseBridgeVoidCard(state, legal);
    }
    if (state.contract === "Spades") {
      return chooseSpadesVoidCard(state, legal);
    }
    if (state.contract === "Hearts Trumps") {
      return (
        lowestCard(legal.filter((card) => cardWouldWinTrick(state, card))) ??
        lowestCard(legal.filter((card) => card.suit !== "H")) ??
        lowestCard(legal)
      );
    }
    if (state.contract === "No Tricks") {
      return highestCard(legal);
    }
    if (state.contract === "No Queens") {
      return highestCard(legal.filter((card) => card.rank === "Q")) ?? highestCard(legal);
    }
    return highestCard(legal.filter((card) => isPenaltyCard(state.contract, card))) ?? highestCard(legal);
  }

  if (state.contract === "Bridge") {
    return chooseBridgeFollowCard(state, legal);
  }

  if (state.contract === "Spades") {
    return chooseSpadesFollowCard(state, legal);
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

  if (state.contract === "No Last Two" && state.completedTricks.length >= 10) {
    return highestNonWinningCard(state, legal) ?? lowestCard(legal);
  }

  if (state.contract === "No Last Two") {
    return highestCard(legal);
  }

  if (state.currentTrick.some((played) => isPenaltyCard(state.contract, played.card))) {
    return highestNonWinningCard(state, legal) ?? lowestCard(legal);
  }

  if (
    state.contract === "No Hearts" ||
    state.contract === "No Queens" ||
    state.contract === "King of Hearts"
  ) {
    return highestNonWinningCard(state, legal) ?? lowestCard(legal);
  }

  return lowestCard(legal);
}

export function chooseBrowserOpponentCardForState(state: FullHandState) {
  return chooseOpponentCard(hydrateFullHandState(cloneState(state)));
}

function chooseBridgeLeadCard(state: FullHandState, legal: Card[]) {
  const trump = whistTrumpSuitFromState(state);
  const declarerSide = bridgeDeclarerIndex(state) % 2;
  const currentSide = state.currentPlayerIndex % 2;

  if (currentSide === declarerSide) {
    if (trump) {
      const trumpLead = highestCard(legal.filter((card) => card.suit === trump));
      if (trumpLead) {
        return trumpLead;
      }
    }

    return highestCardFromLongestSuit(legal.filter((card) => card.suit !== trump), legal) ?? highestCard(legal);
  }

  return lowestCardFromLongestSuit(legal.filter((card) => card.suit !== trump), legal) ?? lowestCard(legal);
}

function chooseBridgeFollowCard(state: FullHandState, legal: Card[]) {
  const declarerSide = bridgeDeclarerIndex(state) % 2;
  const currentSide = state.currentPlayerIndex % 2;

  if (currentSide === declarerSide) {
    return lowestWinningCard(state, legal) ?? lowestCard(legal);
  }

  if (whistPartnerIsWinning(state)) {
    return lowestCard(legal);
  }

  return lowestWinningCard(state, legal) ?? lowestCard(legal);
}

function chooseBridgeVoidCard(state: FullHandState, legal: Card[]) {
  const trump = whistTrumpSuitFromState(state);
  const declarerSide = bridgeDeclarerIndex(state) % 2;
  const currentSide = state.currentPlayerIndex % 2;
  const lowestNonTrump = lowestCard(legal.filter((card) => card.suit !== trump)) ?? lowestCard(legal);

  if (currentSide === declarerSide) {
    return lowestCard(legal.filter((card) => trump && card.suit === trump && cardWouldWinTrick(state, card))) ?? lowestNonTrump;
  }

  if (whistPartnerIsWinning(state)) {
    return lowestNonTrump;
  }

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
  const lockedBid = spadesBidFromId(state.id, playerIndex);
  if (lockedBid !== undefined) {
    return lockedBid;
  }

  const cards = spadesReconstructedHand(state, playerIndex);

  if (shouldSuggestSpadesNil(cards)) {
    return 0;
  }

  const suitGroups = cardsBySuit(cards);
  const nonSpadeAces = cards.filter((card) => card.suit !== "S" && card.rank === "A").length;
  const protectedNonSpadeKings = cards.filter(
    (card) => card.suit !== "S" && card.rank === "K" && suitGroups[card.suit].length >= 2
  ).length;
  const highSpades = suitGroups.S.filter((card) => rankOrder[card.rank as Rank] >= rankOrder.Q).length;
  const longSpades = Math.max(0, suitGroups.S.length - 3);

  return Math.max(1, Math.min(13, nonSpadeAces + protectedNonSpadeKings + highSpades + longSpades));
}

function spadesBidFromId(id: string, playerIndex: number) {
  const encoded = id.split("-bids-")[1]?.split("-")[0];
  const bidText = encoded?.split(".")[playerIndex];
  const bid = bidText === undefined ? Number.NaN : Number(bidText);

  return Number.isFinite(bid) ? Math.max(0, Math.min(13, bid)) : undefined;
}

function shouldSuggestSpadesNil(cards: Card[]) {
  const suitGroups = cardsBySuit(cards);
  const spades = suitGroups.S;
  const hasAce = cards.some((card) => card.rank === "A");
  const hasHighSpade = spades.some((card) => rankOrder[card.rank as Rank] >= rankOrder.Q);
  const hasProtectedKing = cards.some((card) => card.suit !== "S" && card.rank === "K" && suitGroups[card.suit].length >= 2);
  const highCardCount = cards.filter((card) => rankOrder[card.rank as Rank] >= rankOrder.J).length;

  return !hasAce && !hasHighSpade && !hasProtectedKing && highCardCount <= 2 && spades.length <= 3;
}

function spadesReconstructedHand(state: FullHandState, playerIndex: number) {
  const cards = [...(state.hands[playerIndex] ?? [])];

  cards.push(
    ...state.currentTrick
      .filter((played) => playerNames.indexOf(played.seat) === playerIndex)
      .map((played) => played.card)
  );
  for (const trick of state.completedTricks) {
    cards.push(
      ...trick.cards
        .filter((played) => playerNames.indexOf(played.seat) === playerIndex)
        .map((played) => played.card)
    );
  }

  return cards;
}

function cardsBySuit(cards: Card[]) {
  return cards.reduce(
    (groups, card) => {
      groups[card.suit] = [...groups[card.suit], card];
      return groups;
    },
    { C: [], D: [], H: [], S: [] } as Record<Suit, Card[]>
  );
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

function highestNonWinningCard(state: FullHandState, cards: Card[]) {
  return highestCard(cards.filter((card) => !cardWouldWinTrick(state, card)));
}

function lowestWinningCard(state: FullHandState, cards: Card[]) {
  return lowestCard(cards.filter((card) => cardWouldWinTrick(state, card)));
}

function highestNonWinningQueen(state: FullHandState, cards: Card[]) {
  return highestCard(cards.filter((card) => card.rank === "Q" && !cardWouldWinTrick(state, card)));
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

function recommendBrowserHeartsPassCards(hand: Card[]) {
  return hand
    .slice()
    .sort((left, right) => heartsPassPriority(left) - heartsPassPriority(right) || compareByRankThenSuit(left, right))
    .slice(-3)
    .reverse();
}

function heartsPassPriority(card: Card) {
  if (card.rank === "Q" && card.suit === "S") {
    return 100;
  }
  if (card.suit === "H" && rankOrder[card.rank as Rank] >= rankOrder.Q) {
    return 80 + rankOrder[card.rank as Rank];
  }
  if (card.suit === "S" && rankOrder[card.rank as Rank] >= rankOrder.K) {
    return 60 + rankOrder[card.rank as Rank];
  }
  if (card.suit === "H") {
    return 20 + rankOrder[card.rank as Rank];
  }
  return 0;
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
  if (contract === "No Tricks" || contract === "Hearts Trumps" || contract === "Whist" || contract === "Spades" || contract === "Bridge") {
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

function legalCardsForState(state: FullHandState, playerIndex: number) {
  const basicLegal = legalCards(state.hands[playerIndex], ledSuit(state));

  if (state.contract === "Spades") {
    return legalSpadesCardsForState(state, basicLegal);
  }

  if (state.contract !== "Hearts" || !basicLegal.length) {
    return basicLegal;
  }

  if (!state.completedTricks.length && !state.currentTrick.length) {
    return basicLegal.filter((card) => card.id === "2C");
  }

  if (!state.currentTrick.length) {
    if (heartsHaveBeenBroken(state)) {
      return basicLegal;
    }

    const nonHearts = basicLegal.filter((card) => card.suit !== "H");
    return nonHearts.length ? nonHearts : basicLegal;
  }

  if (!state.completedTricks.length) {
    const nonPenalties = basicLegal.filter((card) => !isPenaltyCard("Hearts", card));
    return nonPenalties.length ? nonPenalties : basicLegal;
  }

  return basicLegal;
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
  if (state.contract === "Hearts Trumps" || state.contract === "Whist" || state.contract === "Spades" || state.contract === "Bridge") {
    const trumpSuit = (state.contract === "Whist" || state.contract === "Spades" || state.contract === "Bridge") ? whistTrumpSuitFromState(state) : "H";
    const trumpWinner = cards
      .filter((played) => played.card.suit === trumpSuit)
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

    if (state.status === "complete") {
      return state.contract === "Bridge"
        ? `Bridge hand complete. Contract: ${bridgeContractLabel}.`
        : `${state.contract} hand complete. ${trump} were trumps.`;
    }

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

export function startBrowserHand(contract: string, seed: number, dealer?: number): FullHandState {
    switch (contract) {
        case "Hearts": return startBrowserHeartsHand(seed);
        case "Whist":
      return startBrowserWhistHand(seed, dealer);
    case "Spades":
      return startBrowserSpadesHand(seed);
    case "Bridge":
      return startBrowserBridgeHand(seed);
    case "No Hearts": return startBrowserNoHeartsHand(seed);
        case "No Queens": return startBrowserNoQueensHand(seed);
        case "King of Hearts": return startBrowserKingOfHeartsHand(seed);
        case "No Last Two": return startBrowserNoLastTwoHand(seed);
        case "No Tricks": return startBrowserNoTricksHand(seed);
        case "Hearts Trumps": return startBrowserPositiveTricksHand(seed);
        default: throw new Error(`Unknown contract: ${contract}`);
    }
}

export function playBrowserHandCard(contract: string, state: FullHandState, cardId: string): FullHandState {
    switch (contract) {
        case "Hearts": return playBrowserHeartsCard(state, cardId);
        case "Whist":
      return playBrowserWhistCard(state, cardId);
    case "Spades":
      return playBrowserSpadesCard(state, cardId);
    case "Bridge":
      return playBrowserBridgeCard(state, cardId);
    case "No Hearts": return playBrowserNoHeartsCard(state, cardId);
        case "No Queens": return playBrowserNoQueensCard(state, cardId);
        case "King of Hearts": return playBrowserKingOfHeartsCard(state, cardId);
        case "No Last Two": return playBrowserNoLastTwoCard(state, cardId);
        case "No Tricks": return playBrowserNoTricksCard(state, cardId);
        case "Hearts Trumps": return playBrowserPositiveTricksCard(state, cardId);
        default: throw new Error(`Unknown contract: ${contract}`);
    }
}
