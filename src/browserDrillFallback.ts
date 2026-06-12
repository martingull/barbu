import type { Card, GuidedTrick, Suit } from "./lessonTypes";

type BrowserDrillStep = {
  contract: string;
  title: string;
  trick: GuidedTrick;
};

type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

const ledSuits: Suit[] = ["C", "D", "S"];
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

export function generateBrowserNoHeartsDrillSteps(seed: number): BrowserDrillStep[] {
  return [0, 1, 2].map((offset) => generatedNoHeartsStep(seed * 3 + offset));
}

function generatedNoHeartsStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, ledSuits);
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
        [lowPlayerCard.id]: "best",
        [highPlayerCard.id]: "safe"
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
