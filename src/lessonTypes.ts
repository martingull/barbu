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

export type GeneratedPracticeOutcome = {
  cardId: string;
  isLegal: boolean;
  winner: Seat | "Unknown" | null;
  penalty: number | null;
  explanation: string;
  completedTrick: TableCard[] | null;
};
