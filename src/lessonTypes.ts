export type Suit = "C" | "D" | "H" | "S";

export type Card = {
  id: string;
  rank: string;
  suit: Suit;
  label: string;
};

export type Seat = "Tutor" | "Left" | "You" | "Right";

export type TableCard = {
  seat: Seat;
  card: Card;
};

export type GuidedCardOutcome = "good" | "risky" | "penalty";
export type PracticeReason =
  | "followed_suit"
  | "void_discard"
  | "avoided_penalty"
  | "captured_penalty"
  | "won_clean_trick"
  | "off_suit";

export type GuidedTrick = {
  title: string;
  beforeResult: string;
  afterResult: string;
  emptyExplanation: string;
  legalCardIds: string[];
  hand: Card[];
  tableBeforeChoice: TableCard[];
  tableAfterChoice: TableCard[];
  pendingBySeat: Partial<Record<Seat, string>>;
  playedExplanations: Partial<Record<string, string>>;
  cardOutcomes: Partial<Record<string, GuidedCardOutcome>>;
  cardReasons?: Partial<Record<string, PracticeReason>>;
};

export type GuidedLesson = {
  id: string;
  family: string;
  game: string;
  contract: string;
  title: string;
  summary: string;
  tricks: GuidedTrick[];
};

export type GeneratedPracticeScenario = {
  id: string;
  title: string;
  contract: string;
  ledSuit: Suit;
  prompt: string;
  tableBeforeChoice: TableCard[];
  playerHand: Card[];
  tableAfterChoice: TableCard[];
  legalCardIds: string[];
  outcomes: GeneratedPracticeOutcome[];
};

export type GeneratedDrillSet = {
  id: string;
  title: string;
  scenarios: GeneratedPracticeScenario[];
};

export type GeneratedPracticeOutcome = {
  cardId: string;
  outcomeKind: GuidedCardOutcome | "illegal";
  reason: PracticeReason;
  isLegal: boolean;
  winner: Seat | "Unknown" | null;
  penalty: number | null;
  explanation: string;
  completedTrick: TableCard[] | null;
};

export type HandStatus = "in_progress" | "complete";

export type CompletedHandTrick = {
  cards: TableCard[];
  winner: Seat | "Unknown";
  winnerIndex: number;
  penalty: number;
  outcome: "captured_penalty" | "avoided_penalty" | "won_clean_trick" | "stayed_clear";
};

export type FullHandContract =
  | "No Hearts"
  | "No Queens"
  | "King of Hearts"
  | "No Last Two"
  | "No Tricks"
  | "Hearts Trumps"
  | "Domino";

export type FullHandState = {
  id: string;
  contract: FullHandContract;
  hands: Card[][];
  currentPlayerIndex: number;
  currentPlayer: Seat | "Unknown";
  currentTrick: TableCard[];
  completedTricks: CompletedHandTrick[];
  playerHand: Card[];
  legalCardIds: string[];
  playerPenalty: number;
  totalPenalty: number;
  cardsRemaining: number;
  trickNumber: number;
  status: HandStatus;
  prompt: string;
};

export type NoHeartsHandState = FullHandState;

export type DominoHandState = {
  id: string;
  contract: "Domino";
  hands: Card[][];
  currentPlayerIndex: number;
  currentPlayer: Seat | "Unknown";
  layout: Card[][];
  passedPlayers: Array<Seat | "Unknown">;
  outOrder: Array<Seat | "Unknown">;
  playerHand: Card[];
  legalCardIds: string[];
  scores: number[];
  cardsRemaining: number;
  status: HandStatus;
  prompt: string;
};
