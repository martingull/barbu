import type { Card, GuidedCardOutcome, GuidedTrick, PracticeReason, Suit } from "./lessonTypes";

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
    generatedNoHeartsStep(seed * 5),
    generatedNoQueensStep(seed * 5 + 1),
    generatedKingOfHeartsStep(seed * 5 + 2),
    generatedNoLastTwoStep(seed * 5 + 3),
    generatedNoTricksStep(seed * 5 + 4)
  ];
}

function generatedNoHeartsStep(seed: number): BrowserDrillStep {
  return seed % 2 === 0 ? generatedNoHeartsFollowSuitStep(seed) : generatedNoHeartsVoidDiscardStep(seed);
}

function generatedNoHeartsFollowSuitStep(seed: number): BrowserDrillStep {
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
      },
      cardReasons: {
        [lowPlayerCard.id]: "avoided_penalty",
        [highPlayerCard.id]: "avoided_penalty"
      }
    }
  };
}

function generatedNoHeartsVoidDiscardStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const discardSuit = firstNonMatchingSuit(ledSuit, "H");
  const leadCard = card(choose(rng, ["6", "7", "8"]), ledSuit);
  const rightCard = card(choose(rng, ["9", "10", "J"]), ledSuit);
  const leftWinner = card("A", ledSuit);
  const heartCard = card(choose(rng, ["4", "5", "6"]), "H");
  const lowDiscard = card(choose(rng, ["2", "3", "4"]), discardSuit);
  const highDiscard = card("Q", discardSuit);
  const playerHand = [lowDiscard, highDiscard, heartCard, card("8", "H")].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];
  const legalCardIds = playerHand.map((card) => card.id);

  return {
    contract: "No Hearts",
    title: "Discard while void",
    trick: {
      title: "Discard while void in the led suit",
      beforeResult: `Tutor led ${leadCard.label}. Right followed ${rightCard.label}. You have no ${ledSuitName}.`,
      afterResult: `Left wins with ${leftWinner.label}. Your discard cannot win the led-suit trick.`,
      emptyExplanation: `You are void in ${ledSuitName}. Any card is legal.`,
      legalCardIds,
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: leadCard },
        { seat: "Right", card: rightCard }
      ],
      tableAfterChoice: [{ seat: "Left", card: leftWinner }],
      pendingBySeat: { Left: leftWinner.label, You: "You" },
      playedExplanations: Object.fromEntries(
        playerHand.map((playerCard) => [
          playerCard.id,
          playerCard.suit === "H"
            ? `${playerCard.label} is a legal heart discard because you are void in ${ledSuitName}.`
            : `${playerCard.label} is a legal safe discard because you are void in ${ledSuitName}.`
        ])
      ),
      cardOutcomes: cardOutcomesFor(playerHand, "good"),
      cardReasons: cardReasonsFor(playerHand, (playerCard) =>
        playerCard.suit === "H" ? "avoided_penalty" : "void_discard"
      )
    }
  };
}

function generatedNoQueensStep(seed: number): BrowserDrillStep {
  return seed % 2 === 0 ? generatedNoQueensCaptureStep(seed) : generatedNoQueensVoidDiscardStep(seed);
}

function generatedNoQueensCaptureStep(seed: number): BrowserDrillStep {
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
      },
      cardReasons: {
        [lowPlayerCard.id]: "avoided_penalty",
        [highPlayerCard.id]: "captured_penalty"
      }
    }
  };
}

function generatedNoQueensVoidDiscardStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const discardSuit = firstNonMatchingSuit(ledSuit, "H");
  const leadCard = card(choose(rng, ["5", "6", "7"]), ledSuit);
  const queenCard = card("Q", ledSuit);
  const leftWinner = card("A", ledSuit);
  const lowDiscard = card(choose(rng, ["2", "3", "4"]), discardSuit);
  const highDiscard = card("K", discardSuit);
  const playerQueen = card("Q", "H");
  const playerHand = [lowDiscard, highDiscard, playerQueen, card("8", "H")].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];
  const legalCardIds = playerHand.map((card) => card.id);

  return {
    contract: "No Queens",
    title: "Discard while void",
    trick: {
      title: "Discard when the queen is already loose",
      beforeResult: `Tutor led ${leadCard.label}. Right played ${queenCard.label}. You are void in ${ledSuitName}.`,
      afterResult: `Left wins with ${leftWinner.label}. Any queen in this trick goes to Left.`,
      emptyExplanation: `You have no ${ledSuitName}. Any discard is legal.`,
      legalCardIds,
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: leadCard },
        { seat: "Right", card: queenCard }
      ],
      tableAfterChoice: [{ seat: "Left", card: leftWinner }],
      pendingBySeat: { Left: leftWinner.label, You: "You" },
      playedExplanations: Object.fromEntries(
        playerHand.map((playerCard) => [
          playerCard.id,
          playerCard.rank === "Q"
            ? `${playerCard.label} is legal because you are void; Left still wins the trick.`
            : `${playerCard.label} is a legal discard because you are void in ${ledSuitName}.`
        ])
      ),
      cardOutcomes: cardOutcomesFor(playerHand, "good"),
      cardReasons: cardReasonsFor(playerHand, (playerCard) =>
        playerCard.rank === "Q" ? "avoided_penalty" : "void_discard"
      )
    }
  };
}

function generatedKingOfHeartsStep(seed: number): BrowserDrillStep {
  return seed % 2 === 0 ? generatedKingOfHeartsCaptureStep(seed) : generatedKingOfHeartsVoidDiscardStep(seed);
}

function generatedKingOfHeartsCaptureStep(seed: number): BrowserDrillStep {
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
      },
      cardReasons: {
        [lowPlayerCard.id]: "avoided_penalty",
        [highPlayerCard.id]: "captured_penalty"
      }
    }
  };
}

function generatedKingOfHeartsVoidDiscardStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const firstDiscardSuit = choose(rng, nonHeartSuits);
  const secondDiscardSuit = firstNonMatchingSuit(firstDiscardSuit, "H");
  const leadCard = card(choose(rng, ["8", "9", "10"]), "H");
  const kingCard = card("K", "H");
  const leftWinner = card("A", "H");
  const firstDiscard = card(choose(rng, ["2", "3", "4"]), firstDiscardSuit);
  const secondDiscard = card(choose(rng, ["7", "8", "9"]), secondDiscardSuit);
  const playerHand = [firstDiscard, secondDiscard, card("Q", "S"), card("A", "C")].sort(compareCards);
  const legalCardIds = playerHand.map((card) => card.id);

  return {
    contract: "King of Hearts",
    title: "Escape while void",
    trick: {
      title: "Escape the king when you are void",
      beforeResult: `Tutor led ${leadCard.label}. Right played ${kingCard.label}. You have no hearts.`,
      afterResult: `Left wins with ${leftWinner.label} and takes the king of hearts penalty.`,
      emptyExplanation: "You are void in hearts. Any discard is legal.",
      legalCardIds,
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: leadCard },
        { seat: "Right", card: kingCard }
      ],
      tableAfterChoice: [{ seat: "Left", card: leftWinner }],
      pendingBySeat: { Left: leftWinner.label, You: "You" },
      playedExplanations: Object.fromEntries(
        playerHand.map((playerCard) => [
          playerCard.id,
          `${playerCard.label} is legal because you have no hearts. Left, not you, captures KH.`
        ])
      ),
      cardOutcomes: cardOutcomesFor(playerHand, "good"),
      cardReasons: cardReasonsFor(playerHand, () => "avoided_penalty")
    }
  };
}

function generatedNoLastTwoStep(seed: number): BrowserDrillStep {
  return seed % 2 === 0 ? generatedNoLastTwoDuckStep(seed) : generatedNoLastTwoForcedWinStep(seed);
}

function generatedNoLastTwoDuckStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const leadCard = card(choose(rng, ["6", "7", "8"]), ledSuit);
  const tutorWinner = card("J", ledSuit);
  const rightCard = card(choose(rng, ["3", "4", "5"]), ledSuit);
  const lowPlayerCard = card("2", ledSuit);
  const highPlayerCard = card("Q", ledSuit);
  const offSuitCard = card(choose(rng, ["5", "6", "7"]), firstNonMatchingSuit(ledSuit, "H"));
  const playerHand = [lowPlayerCard, highPlayerCard, offSuitCard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "No Last Two",
    title: "Duck the late trick",
    trick: {
      title: "Duck the twelfth trick",
      beforeResult: `This is trick 12. Left led ${leadCard.label}. Tutor played ${tutorWinner.label}. Right followed ${rightCard.label}.`,
      afterResult: `Tutor wins with ${tutorWinner.label} and takes this last-two penalty.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Stay below the current winner if you can.`,
      legalCardIds: [lowPlayerCard.id, highPlayerCard.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: tutorWinner },
        { seat: "Right", card: rightCard }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows ${ledSuitName} and stays below ${tutorWinner.label}.`,
        [highPlayerCard.id]: `${highPlayerCard.label} follows ${ledSuitName} but wins a last-two trick.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "good",
        [highPlayerCard.id]: "penalty"
      },
      cardReasons: {
        [lowPlayerCard.id]: "avoided_penalty",
        [highPlayerCard.id]: "captured_penalty"
      }
    }
  };
}

function generatedNoLastTwoForcedWinStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const leadCard = card(choose(rng, ["4", "5", "6"]), ledSuit);
  const tutorCard = card(choose(rng, ["7", "8", "9"]), ledSuit);
  const rightCard = card("10", ledSuit);
  const forcedWinner = card("K", ledSuit);
  const offSuitCard = card("3", firstNonMatchingSuit(ledSuit, "H"));
  const playerHand = [forcedWinner, offSuitCard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "No Last Two",
    title: "Forced late winner",
    trick: {
      title: "When your only legal card wins late",
      beforeResult: `This is trick 13. Left led ${leadCard.label}. Tutor played ${tutorCard.label}. Right followed ${rightCard.label}.`,
      afterResult: `You win with ${forcedWinner.label} and take the final-trick penalty.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Your only ${ledSuitName} card is forced.`,
      legalCardIds: [forcedWinner.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: tutorCard },
        { seat: "Right", card: rightCard }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [forcedWinner.id]: `${forcedWinner.label} is forced by the led suit and wins the final trick.`
      },
      cardOutcomes: {
        [forcedWinner.id]: "penalty"
      },
      cardReasons: {
        [forcedWinner.id]: "captured_penalty"
      }
    }
  };
}

function generatedNoTricksStep(seed: number): BrowserDrillStep {
  return seed % 2 === 0 ? generatedNoTricksDuckStep(seed) : generatedNoTricksForcedWinStep(seed);
}

function generatedNoTricksDuckStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const leadCard = card(choose(rng, ["7", "8", "9"]), ledSuit);
  const rightWinner = card("K", ledSuit);
  const leftCard = card(choose(rng, ["3", "4", "5"]), ledSuit);
  const lowPlayerCard = card("2", ledSuit);
  const highPlayerCard = card("A", ledSuit);
  const offSuitCard = card(choose(rng, ["6", "7", "8"]), firstNonMatchingSuit(ledSuit, "H"));
  const playerHand = [lowPlayerCard, highPlayerCard, offSuitCard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "No Tricks",
    title: "Duck the trick",
    trick: {
      title: "Duck every trick you can",
      beforeResult: `Tutor led ${leadCard.label}. Right followed with ${rightWinner.label}.`,
      afterResult: `Right keeps control with ${rightWinner.label} unless you overtake.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Avoid winning the trick.`,
      legalCardIds: [lowPlayerCard.id, highPlayerCard.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: leadCard },
        { seat: "Right", card: rightWinner }
      ],
      tableAfterChoice: [{ seat: "Left", card: leftCard }],
      pendingBySeat: { Left: leftCard.label, You: "You" },
      playedExplanations: {
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows ${ledSuitName} and stays below ${rightWinner.label}.`,
        [highPlayerCard.id]: `${highPlayerCard.label} follows ${ledSuitName} but wins the trick.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "good",
        [highPlayerCard.id]: "penalty"
      },
      cardReasons: {
        [lowPlayerCard.id]: "avoided_penalty",
        [highPlayerCard.id]: "captured_penalty"
      }
    }
  };
}

function generatedNoTricksForcedWinStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const leadCard = card(choose(rng, ["4", "5", "6"]), ledSuit);
  const tutorCard = card(choose(rng, ["7", "8"]), ledSuit);
  const rightCard = card("9", ledSuit);
  const forcedWinner = card("K", ledSuit);
  const offSuitCard = card("3", firstNonMatchingSuit(ledSuit, "H"));
  const playerHand = [forcedWinner, offSuitCard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "No Tricks",
    title: "Forced trick winner",
    trick: {
      title: "When the only legal card wins",
      beforeResult: `Left led ${leadCard.label}. Tutor played ${tutorCard.label}. Right followed ${rightCard.label}.`,
      afterResult: `You win with ${forcedWinner.label}. The play is legal, but the trick still counts against you.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Your only ${ledSuitName} card is forced.`,
      legalCardIds: [forcedWinner.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: tutorCard },
        { seat: "Right", card: rightCard }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [forcedWinner.id]: `${forcedWinner.label} is forced by the led suit. It wins this trick, so it scores against you.`
      },
      cardOutcomes: {
        [forcedWinner.id]: "penalty"
      },
      cardReasons: {
        [forcedWinner.id]: "captured_penalty"
      }
    }
  };
}

function cardOutcomesFor(cards: Card[], outcome: GuidedCardOutcome) {
  return Object.fromEntries(cards.map((card) => [card.id, outcome])) as Partial<Record<string, GuidedCardOutcome>>;
}

function cardReasonsFor(cards: Card[], reasonFor: (card: Card) => PracticeReason) {
  return Object.fromEntries(cards.map((card) => [card.id, reasonFor(card)])) as Partial<Record<string, PracticeReason>>;
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
