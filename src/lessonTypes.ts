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
