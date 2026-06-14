import type { Card, GuidedTrick, Suit } from "./lessonTypes";

type BrowserDrillStep = {
  contract: string;
  title: string;
  trick: GuidedTrick;
};

type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

const nonHeartSuits: Suit[] = ["C", "D", "S"];
const suitNames: Record<Suit, string> = {
  C: "clubs",
  D: "diamonds",
  H: "hearts",
  S: "spades"
};
const suitOrder: Record<Suit, number> = { C: 0, D: 1, H: 2, S: 3 };
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

export function generateBrowserPlayBarbuDrillSteps(seed: number): BrowserDrillStep[] {
  return [
    generatedNoHeartsStep(seed * 3),
    generatedNoQueensStep(seed * 3 + 1),
    generatedKingOfHeartsStep(seed * 3 + 2)
  ];
}

function generatedNoHeartsStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const leadCard = card(choose(rng, ["7", "8", "9", "10"]), ledSuit);
  const heartCard = card(choose(rng, ["4", "5", "6", "7"]), "H");
  const lowPlayerCard = card(choose(rng, ["2", "3", "4", "5"]), ledSuit);
  const highPlayerCard = card(choose(rng, ["J", "Q", "K"]), ledSuit);
  const offSuitCard = card(choose(rng, ["9", "10", "J", "Q"]), firstNonMatchingSuit(ledSuit, "H"));
  const leftWinner = card("A", ledSuit);
  const playerHand = [lowPlayerCard, highPlayerCard, card("8", "H"), offSuitCard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "No Hearts",
    title: "Avoid the heart trick",
    trick: {
      title: "Follow suit with a heart at risk",
      beforeResult: `Tutor led ${leadCard.label}. Right is void in ${ledSuitName} and discarded ${heartCard.label}.`,
      afterResult: `Left wins with ${leftWinner.label} and takes 1 heart penalty from Right's ${heartCard.label}.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Choose a ${ledSuitName} card.`,
      legalCardIds: [lowPlayerCard.id, highPlayerCard.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: leadCard },
        { seat: "Right", card: heartCard }
      ],
      tableAfterChoice: [{ seat: "Left", card: leftWinner }],
      pendingBySeat: { Left: leftWinner.label, You: "You" },
      playedExplanations: {
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows ${ledSuitName} and keeps you clear of the heart trick.`,
        [highPlayerCard.id]: `${highPlayerCard.label} follows ${ledSuitName} and stays below ${leftWinner.label}.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "good",
        [highPlayerCard.id]: "good"
      }
    }
  };
}

function generatedNoQueensStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const leadCard = card(choose(rng, ["5", "6", "7", "8"]), ledSuit);
  const queenCard = card("Q", ledSuit);
  const rightCard = card(choose(rng, ["7", "8", "9", "10"]), ledSuit);
  const lowPlayerCard = card(choose(rng, ["2", "3", "4"]), ledSuit);
  const highPlayerCard = card(choose(rng, ["K", "A"]), ledSuit);
  const offSuitCard = card(choose(rng, ["4", "5", "6", "7"]), firstNonMatchingSuit(ledSuit, "H"));
  const playerHand = [lowPlayerCard, highPlayerCard, card("9", "H"), offSuitCard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "No Queens",
    title: "Duck the queen trick",
    trick: {
      title: "Duck the queen trick",
      beforeResult: `Left led ${leadCard.label}. Tutor played ${queenCard.label}. Right followed ${rightCard.label}.`,
      afterResult: `The trick contains ${queenCard.label}. The winner takes the queen penalty.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Choose a ${ledSuitName} card without capturing the queen.`,
      legalCardIds: [lowPlayerCard.id, highPlayerCard.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: queenCard },
        { seat: "Right", card: rightCard }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows ${ledSuitName} and leaves the queen with Tutor.`,
        [highPlayerCard.id]: `${highPlayerCard.label} follows ${ledSuitName} but captures ${queenCard.label}.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "good",
        [highPlayerCard.id]: "penalty"
      }
    }
  };
}

function generatedKingOfHeartsStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const leadCard = card(choose(rng, ["9", "10", "J"]), "H");
  const kingCard = card("K", "H");
  const lowPlayerCard = card(choose(rng, ["2", "3", "4", "5"]), "H");
  const highPlayerCard = card("A", "H");
  const leftCard = card("Q", "H");
  const offSuitCard = card(choose(rng, ["7", "8", "9", "10"]), choose(rng, nonHeartSuits));
  const playerHand = [lowPlayerCard, highPlayerCard, card("Q", "S"), offSuitCard].sort(compareCards);

  return {
    contract: "King of Hearts",
    title: "Stay under the king",
    trick: {
      title: "Stay under the king",
      beforeResult: `Tutor led ${leadCard.label}. Right played ${kingCard.label}, the contract card.`,
      afterResult: `The trick contains ${kingCard.label}. The winner takes the king of hearts penalty.`,
      emptyExplanation: "Hearts were led. Choose a heart that does not capture KH.",
      legalCardIds: [lowPlayerCard.id, highPlayerCard.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: leadCard },
        { seat: "Right", card: kingCard }
      ],
      tableAfterChoice: [{ seat: "Left", card: leftCard }],
      pendingBySeat: { Left: leftCard.label, You: "You" },
      playedExplanations: {
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows hearts and stays below KH.`,
        [highPlayerCard.id]: `${highPlayerCard.label} follows hearts but captures KH.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "good",
        [highPlayerCard.id]: "penalty"
      }
    }
  };
}

function card(rank: Rank, suit: Suit): Card {
  const label = `${rank}${suit}`;
  return { id: label, rank, suit, label };
}

function choose<T>(rng: DeterministicRng, values: T[]) {
  return values[rng.nextInt(values.length)];
}

function firstNonMatchingSuit(ledSuit: Suit, excludedSuit: Suit): Suit {
  return (["C", "D", "S"] as Suit[]).find((suit) => suit !== ledSuit && suit !== excludedSuit) ?? "C";
}

function compareCards(left: Card, right: Card) {
  return suitOrder[left.suit] - suitOrder[right.suit] || rankOrder[left.rank as Rank] - rankOrder[right.rank as Rank];
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

class DeterministicRng {
  private state: number;

  constructor(seed: number) {
    this.state = (seed ^ 0x9e3779b9) >>> 0;
  }

  nextInt(upperBound: number) {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state % upperBound;
  }
}
