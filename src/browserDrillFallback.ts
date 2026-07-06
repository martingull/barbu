import type { Card, GuidedCardOutcome, GuidedTrick, PracticeReason, Suit } from "./lessonTypes";

type BrowserDrillStep = {
  scenarioId?: string;
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
const suitOrder: Record<Suit, number> = { C: 0, D: 1, S: 2, H: 3 };
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

const dailyDrillPoolRounds = 4;

export function generateBrowserPlayBarbuDrillSteps(seed: number): BrowserDrillStep[] {
  const steps: BrowserDrillStep[] = [];

  for (let round = 0; round < dailyDrillPoolRounds; round += 1) {
    steps.push(
      generatedNoHeartsStep(drillPoolSeed(seed, 0, round)),
      generatedNoQueensStep(drillPoolSeed(seed, 1, round)),
      generatedKingOfHeartsStep(drillPoolSeed(seed, 2, round)),
      generatedNoLastTwoStep(drillPoolSeed(seed, 3, round)),
      generatedNoTricksStep(drillPoolSeed(seed, 4, round)),
      generatedHeartsTrumpsStep(drillPoolSeed(seed, 5, round)),
      generatedDominoStep(drillPoolSeed(seed, 6, round))
    );
  }

  return steps.map((step, index) => ({
    ...step,
    scenarioId: `${index % 7}-${step.contract}-${step.trick.title}`
  }));
}

function drillPoolSeed(seed: number, contractIndex: number, round: number) {
  return seed * 97 + contractIndex + round * 7;
}

function generatedNoHeartsStep(seed: number): BrowserDrillStep {
  switch (seed % 4) {
    case 0:
      return generatedNoHeartsFollowSuitStep(seed);
    case 1:
      return generatedNoHeartsVoidDiscardStep(seed);
    case 2:
      return generatedNoHeartsVoidDumpDangerStep(seed);
    default:
      return generatedNoHeartsAceDuckStep(seed);
  }
}

function generatedNoHeartsAceDuckStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const leadCard = card(choose(rng, ["8", "9"]), "H");
  const tutorCard = card(choose(rng, ["10", "J"]), "H");
  const rightCard = card(choose(rng, ["3", "4", "5"]), "H");
  const lowPlayerCard = card("2", "H");
  const aceHeart = card("A", "H");
  const playerHand = [lowPlayerCard, aceHeart, card("Q", "S"), card("7", "C")].sort(compareCards);

  return {
    contract: "No Hearts",
    title: "Duck the ace of hearts",
    trick: {
      title: "Duck the ace of hearts",
      beforeResult: `Left led ${leadCard.label}. Barbu followed ${tutorCard.label}. Right followed ${rightCard.label}.`,
      afterResult: `The heart trick is loaded. AH wins it; 2H lets Barbu keep the points.`,
      emptyExplanation: "Hearts were led. Avoid taking the heart trick with AH.",
      legalCardIds: [lowPlayerCard.id, aceHeart.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: tutorCard },
        { seat: "Right", card: rightCard }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows hearts and stays under the current winner.`,
        [aceHeart.id]: `${aceHeart.label} follows hearts but captures the whole heart trick.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "good",
        [aceHeart.id]: "penalty"
      },
      cardReasons: {
        [lowPlayerCard.id]: "avoided_penalty",
        [aceHeart.id]: "captured_penalty"
      }
    }
  };
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
      beforeResult: `Barbu led ${leadCard.label}. Right is void in ${ledSuitName} and discarded ${heartCard.label}.`,
      afterResult: `Left wins with ${leftWinner.label} and takes 2 heart penalty points from Right's ${heartCard.label}.`,
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
      beforeResult: `Barbu led ${leadCard.label}. Right followed ${rightCard.label}. You have no ${ledSuitName}.`,
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

function generatedNoHeartsVoidDumpDangerStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const discardSuit = firstNonMatchingSuit(ledSuit, "H");
  const leadCard = card(choose(rng, ["6", "7", "8"]), ledSuit);
  const tutorCard = card(choose(rng, ["10", "J", "Q"]), ledSuit);
  const rightWinner = card("A", ledSuit);
  const aceHeart = card("A", "H");
  const queenHeart = card("Q", "H");
  const lowDiscard = card("2", discardSuit);
  const highDiscard = card("K", discardSuit);
  const playerHand = [aceHeart, queenHeart, lowDiscard, highDiscard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];
  const legalCardIds = playerHand.map((card) => card.id);

  return {
    contract: "No Hearts",
    title: "Dump hearts safely",
    trick: {
      title: "Unload danger under a locked winner",
      beforeResult: `Left led ${leadCard.label}. Barbu followed ${tutorCard.label}. Right is winning with ${rightWinner.label}. You have no ${ledSuitName}.`,
      afterResult: `Right wins with ${rightWinner.label}. Any heart you discard goes to Right, not you.`,
      emptyExplanation: `You are void in ${ledSuitName}. This is a chance to unload hearts safely.`,
      legalCardIds,
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: tutorCard },
        { seat: "Right", card: rightWinner }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: Object.fromEntries(
        playerHand.map((playerCard) => [
          playerCard.id,
          playerCard.suit === "H"
            ? `${playerCard.label} unloads a heart while Right is already winning the trick.`
            : `${playerCard.label} is legal, but it does not shed a heart penalty.`
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
  switch (seed % 4) {
    case 0:
      return generatedNoQueensCaptureStep(seed);
    case 1:
      return generatedNoQueensVoidDiscardStep(seed);
    case 2:
      return generatedNoQueensVoidDumpQueenStep(seed);
    default:
      return generatedNoQueensFollowUnderAceStep(seed);
  }
}

function generatedNoQueensFollowUnderAceStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const offSuit = firstNonMatchingSuit(ledSuit, "H");
  const leadCard = card(choose(rng, ["6", "7", "8"]), ledSuit);
  const tutorWinner = card("A", ledSuit);
  const rightCard = card(choose(rng, ["3", "4", "5"]), ledSuit);
  const lowPlayerCard = card("2", ledSuit);
  const queenCard = card("Q", ledSuit);
  const playerHand = [lowPlayerCard, queenCard, card("9", "H"), card("K", offSuit)].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "No Queens",
    title: "Shed a queen under the ace",
    trick: {
      title: "Follow with a safe queen",
      beforeResult: `Left led ${leadCard.label}. Barbu is already winning with ${tutorWinner.label}. Right followed ${rightCard.label}.`,
      afterResult: `Barbu keeps the trick with ${tutorWinner.label}. A queen played below it goes to Barbu, not you.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. A queen can be safe when the ace is already locked above it.`,
      legalCardIds: [lowPlayerCard.id, queenCard.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: tutorWinner },
        { seat: "Right", card: rightCard }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows ${ledSuitName} and leaves the trick with Barbu.`,
        [queenCard.id]: `${queenCard.label} follows ${ledSuitName} and safely sheds a queen under ${tutorWinner.label}.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "good",
        [queenCard.id]: "good"
      },
      cardReasons: {
        [lowPlayerCard.id]: "followed_suit",
        [queenCard.id]: "avoided_penalty"
      }
    }
  };
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
      beforeResult: `Left led ${leadCard.label}. Barbu played ${queenCard.label}. Right followed ${rightCard.label}.`,
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
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows ${ledSuitName} and leaves the queen with Barbu.`,
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
      beforeResult: `Barbu led ${leadCard.label}. Right played ${queenCard.label}. You are void in ${ledSuitName}.`,
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

function generatedNoQueensVoidDumpQueenStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const discardSuit = firstNonMatchingSuit(ledSuit, "H");
  const leadCard = card(choose(rng, ["6", "7", "8"]), ledSuit);
  const tutorCard = card(choose(rng, ["9", "10", "J"]), ledSuit);
  const rightWinner = card("A", ledSuit);
  const heartQueen = card("Q", "H");
  const suitQueen = card("Q", discardSuit);
  const lowDiscard = card("2", discardSuit);
  const highDiscard = card("K", discardSuit);
  const playerHand = [heartQueen, suitQueen, lowDiscard, highDiscard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];
  const legalCardIds = playerHand.map((card) => card.id);

  return {
    contract: "No Queens",
    title: "Dump a queen safely",
    trick: {
      title: "Unload a queen under a locked winner",
      beforeResult: `Left led ${leadCard.label}. Barbu followed ${tutorCard.label}. Right is winning with ${rightWinner.label}. You have no ${ledSuitName}.`,
      afterResult: `Right wins with ${rightWinner.label}. Any queen you discard goes to Right, not you.`,
      emptyExplanation: `You are void in ${ledSuitName}. This is a chance to unload a queen safely.`,
      legalCardIds,
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: tutorCard },
        { seat: "Right", card: rightWinner }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: Object.fromEntries(
        playerHand.map((playerCard) => [
          playerCard.id,
          playerCard.rank === "Q"
            ? `${playerCard.label} unloads a queen while Right is already winning the trick.`
            : `${playerCard.label} is legal, but it does not shed a queen.`
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
  switch (seed % 4) {
    case 0:
      return generatedKingOfHeartsCaptureStep(seed);
    case 1:
      return generatedKingOfHeartsVoidDiscardStep(seed);
    case 2:
      return generatedKingOfHeartsVoidDumpKingStep(seed);
    default:
      return generatedKingOfHeartsFollowUnderAceStep(seed);
  }
}

function generatedKingOfHeartsFollowUnderAceStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const leadCard = card(choose(rng, ["8", "9"]), "H");
  const tutorWinner = card("A", "H");
  const rightCard = card(choose(rng, ["3", "4", "5"]), "H");
  const lowPlayerCard = card("2", "H");
  const kingHeart = card("K", "H");
  const playerHand = [lowPlayerCard, kingHeart, card("Q", "S"), card("7", "C")].sort(compareCards);

  return {
    contract: "King of Hearts",
    title: "Shed KH under the ace",
    trick: {
      title: "Follow with KH safely",
      beforeResult: `Left led ${leadCard.label}. Barbu is already winning with ${tutorWinner.label}. Right followed ${rightCard.label}.`,
      afterResult: `Barbu keeps the trick with ${tutorWinner.label}. KH can leave your hand without coming home to you.`,
      emptyExplanation: "Hearts were led. KH is safe when AH is already locked above it.",
      legalCardIds: [lowPlayerCard.id, kingHeart.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: tutorWinner },
        { seat: "Right", card: rightCard }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows hearts and leaves the trick with Barbu.`,
        [kingHeart.id]: `${kingHeart.label} follows hearts and safely sheds Barbu under ${tutorWinner.label}.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "good",
        [kingHeart.id]: "good"
      },
      cardReasons: {
        [lowPlayerCard.id]: "followed_suit",
        [kingHeart.id]: "avoided_penalty"
      }
    }
  };
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
      beforeResult: `Barbu led ${leadCard.label}. Right played ${kingCard.label}, the contract card.`,
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
      beforeResult: `Barbu led ${leadCard.label}. Right played ${kingCard.label}. You have no hearts.`,
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

function generatedKingOfHeartsVoidDumpKingStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const discardSuit = firstNonMatchingSuit(ledSuit, "H");
  const leadCard = card(choose(rng, ["6", "7", "8"]), ledSuit);
  const tutorCard = card(choose(rng, ["9", "10", "J"]), ledSuit);
  const rightWinner = card("A", ledSuit);
  const kingHeart = card("K", "H");
  const queenHeart = card("Q", "H");
  const lowDiscard = card("2", discardSuit);
  const highDiscard = card("K", discardSuit);
  const playerHand = [kingHeart, queenHeart, lowDiscard, highDiscard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];
  const legalCardIds = playerHand.map((card) => card.id);

  return {
    contract: "King of Hearts",
    title: "Dump Barbu safely",
    trick: {
      title: "Unload KH under a locked winner",
      beforeResult: `Left led ${leadCard.label}. Barbu followed ${tutorCard.label}. Right is winning with ${rightWinner.label}. You have no ${ledSuitName}.`,
      afterResult: `Right wins with ${rightWinner.label}. KH goes to Right, not you.`,
      emptyExplanation: `You are void in ${ledSuitName}. This is a chance to unload KH safely.`,
      legalCardIds,
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: tutorCard },
        { seat: "Right", card: rightWinner }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: Object.fromEntries(
        playerHand.map((playerCard) => [
          playerCard.id,
          playerCard.id === kingHeart.id
            ? `${playerCard.label} unloads Barbu while Right is already winning the trick.`
            : `${playerCard.label} is legal, but it does not shed KH.`
        ])
      ),
      cardOutcomes: cardOutcomesFor(playerHand, "good"),
      cardReasons: cardReasonsFor(playerHand, (playerCard) =>
        playerCard.id === kingHeart.id ? "avoided_penalty" : "void_discard"
      )
    }
  };
}

function generatedNoLastTwoStep(seed: number): BrowserDrillStep {
  switch (seed % 4) {
    case 0:
      return generatedNoLastTwoDuckStep(seed);
    case 1:
      return generatedNoLastTwoForcedWinStep(seed);
    case 2:
      return generatedNoLastTwoSetupStep(seed);
    default:
      return generatedNoLastTwoEarlySetupStep(seed);
  }
}

function generatedNoLastTwoEarlySetupStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const leadCard = card(choose(rng, ["5", "6", "7"]), ledSuit);
  const tutorCard = card(choose(rng, ["8", "9"]), ledSuit);
  const rightWinner = card("J", ledSuit);
  const lowPlayerCard = card("2", ledSuit);
  const highPlayerCard = card("K", ledSuit);
  const offSuitCard = card("4", firstNonMatchingSuit(ledSuit, "H"));
  const playerHand = [lowPlayerCard, highPlayerCard, offSuitCard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "No Last Two",
    title: "Keep an exit before the finish",
    trick: {
      title: "Prepare before the last two",
      beforeResult: `This is trick 10. Left led ${leadCard.label}. Barbu played ${tutorCard.label}. Right is winning with ${rightWinner.label}.`,
      afterResult: `The trick is still clean, but taking the lead now can force awkward final tricks.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Stay out of lead before the dangerous finish.`,
      legalCardIds: [lowPlayerCard.id, highPlayerCard.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: tutorCard },
        { seat: "Right", card: rightWinner }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows ${ledSuitName} and keeps you out of lead before the finish.`,
        [highPlayerCard.id]: `${highPlayerCard.label} wins a clean trick, but leading next can be risky.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "good",
        [highPlayerCard.id]: "risky"
      },
      cardReasons: {
        [lowPlayerCard.id]: "avoided_penalty",
        [highPlayerCard.id]: "won_clean_trick"
      }
    }
  };
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
      beforeResult: `This is trick 12. Left led ${leadCard.label}. Barbu played ${tutorWinner.label}. Right followed ${rightCard.label}.`,
      afterResult: `Barbu wins with ${tutorWinner.label} and takes this last-two penalty. Losing the late trick is good here.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. In No Last Two, try to lose this late trick.`,
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
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows ${ledSuitName} and loses the late trick. That is good in No Last Two.`,
        [highPlayerCard.id]: `${highPlayerCard.label} follows ${ledSuitName} but wins a last-two trick and takes the penalty.`
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
      beforeResult: `This is trick 13. Left led ${leadCard.label}. Barbu played ${tutorCard.label}. Right followed ${rightCard.label}.`,
      afterResult: `You win with ${forcedWinner.label} and take the final-trick penalty. The earlier exits mattered.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Your only ${ledSuitName} card is forced, even though it wins.`,
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
        [forcedWinner.id]: `${forcedWinner.label} is forced by the led suit and wins the final trick. This is a forced penalty, not an illegal play.`
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

function generatedNoLastTwoSetupStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const leadCard = card(choose(rng, ["6", "7", "8"]), ledSuit);
  const tutorWinner = card("10", ledSuit);
  const rightCard = card(choose(rng, ["3", "4", "5"]), ledSuit);
  const lowPlayerCard = card("2", ledSuit);
  const highPlayerCard = card("Q", ledSuit);
  const offSuitCard = card(choose(rng, ["5", "6", "7"]), firstNonMatchingSuit(ledSuit, "H"));
  const playerHand = [lowPlayerCard, highPlayerCard, offSuitCard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "No Last Two",
    title: "Prepare for the final tricks",
    trick: {
      title: "Prepare for the final tricks",
      beforeResult: `This is trick 11. Left led ${leadCard.label}. Barbu played ${tutorWinner.label}. Right followed ${rightCard.label}.`,
      afterResult: `This trick is still clean, but winning it can put you on lead for the final two tricks.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Stay out of the lead before the last two if you can.`,
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
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows ${ledSuitName} and stays out of the lead before the final two tricks.`,
        [highPlayerCard.id]: `${highPlayerCard.label} wins a clean trick, but that is risky because you may lead into the final two.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "good",
        [highPlayerCard.id]: "risky"
      },
      cardReasons: {
        [lowPlayerCard.id]: "avoided_penalty",
        [highPlayerCard.id]: "won_clean_trick"
      }
    }
  };
}

function generatedNoTricksStep(seed: number): BrowserDrillStep {
  switch (seed % 4) {
    case 0:
      return generatedNoTricksDuckStep(seed);
    case 1:
      return generatedNoTricksForcedWinStep(seed);
    case 2:
      return generatedNoTricksVoidDiscardStep(seed);
    default:
      return generatedNoTricksLastSeatDuckStep(seed);
  }
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
      beforeResult: `Barbu led ${leadCard.label}. Right followed with ${rightWinner.label}.`,
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
      beforeResult: `Left led ${leadCard.label}. Barbu played ${tutorCard.label}. Right followed ${rightCard.label}.`,
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

function generatedNoTricksVoidDiscardStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const discardSuit = firstNonMatchingSuit(ledSuit, "H");
  const secondDiscardSuit = (["C", "D", "H", "S"] as Suit[]).find(
    (suit) => suit !== ledSuit && suit !== discardSuit
  ) ?? "H";
  const leadCard = card(choose(rng, ["6", "7", "8"]), ledSuit);
  const tutorCard = card(choose(rng, ["10", "J", "Q"]), ledSuit);
  const rightWinner = card("A", ledSuit);
  const lowDiscard = card("2", discardSuit);
  const highDiscard = card("K", discardSuit);
  const secondLow = card("4", secondDiscardSuit);
  const secondHigh = card("Q", secondDiscardSuit);
  const playerHand = [lowDiscard, highDiscard, secondLow, secondHigh].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];
  const legalCardIds = playerHand.map((card) => card.id);

  return {
    contract: "No Tricks",
    title: "Discard under control",
    trick: {
      title: "Stay clear when void",
      beforeResult: `Left led ${leadCard.label}. Barbu followed ${tutorCard.label}. Right is winning with ${rightWinner.label}. You have no ${ledSuitName}.`,
      afterResult: `Right wins with ${rightWinner.label}. Your discard cannot win the led-suit trick.`,
      emptyExplanation: `You are void in ${ledSuitName}. Any discard is legal and stays out of the trick.`,
      legalCardIds,
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Left", card: leadCard },
        { seat: "Tutor", card: tutorCard },
        { seat: "Right", card: rightWinner }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: Object.fromEntries(
        playerHand.map((playerCard) => [
          playerCard.id,
          `${playerCard.label} is safe because Right already controls the ${ledSuitName} trick.`
        ])
      ),
      cardOutcomes: cardOutcomesFor(playerHand, "good"),
      cardReasons: cardReasonsFor(playerHand, () => "avoided_penalty")
    }
  };
}

function generatedNoTricksLastSeatDuckStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const offSuit = firstNonMatchingSuit(ledSuit, "H");
  const leadCard = card(choose(rng, ["6", "7", "8"]), ledSuit);
  const tutorWinner = card("Q", ledSuit);
  const rightCard = card(choose(rng, ["3", "4", "5"]), ledSuit);
  const lowPlayerCard = card("2", ledSuit);
  const highPlayerCard = card("A", ledSuit);
  const offSuitCard = card("9", offSuit);
  const playerHand = [lowPlayerCard, highPlayerCard, offSuitCard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "No Tricks",
    title: "Duck from last seat",
    trick: {
      title: "Use last-seat information",
      beforeResult: `Left led ${leadCard.label}. Barbu is winning with ${tutorWinner.label}. Right followed ${rightCard.label}.`,
      afterResult: `You can see the whole trick. Ducking keeps Barbu on the trick; overtaking scores against you.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Choose the card that stays below ${tutorWinner.label}.`,
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
        [highPlayerCard.id]: `${highPlayerCard.label} follows ${ledSuitName} but overtakes the trick.`
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

function generatedHeartsTrumpsStep(seed: number): BrowserDrillStep {
  switch (seed % 4) {
    case 0:
      return generatedHeartsTrumpsCutStep(seed);
    case 1:
      return generatedHeartsTrumpsFollowStep(seed);
    case 2:
      return generatedHeartsTrumpsOvertrumpStep(seed);
    default:
      return generatedHeartsTrumpsFollowBeforeTrumpStep(seed);
  }
}

function generatedHeartsTrumpsCutStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const firstOffSuit = firstNonMatchingSuit(ledSuit, "H");
  const secondOffSuit = nonHeartSuits.find((suit) => suit !== ledSuit && suit !== firstOffSuit) ?? "S";
  const leadCard = card(choose(rng, ["9", "10", "J"]), ledSuit);
  const rightWinner = card("A", ledSuit);
  const leftCard = card(choose(rng, ["3", "4", "5"]), firstOffSuit);
  const heartTrump = card(choose(rng, ["4", "5", "6"]), "H");
  const highHeart = card("7", "H");
  const lowDiscard = card(choose(rng, ["2", "3"]), firstOffSuit);
  const highDiscard = card("K", secondOffSuit);
  const playerHand = [heartTrump, highHeart, lowDiscard, highDiscard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "Hearts Trumps",
    title: "Find the trump trick",
    trick: {
      title: "Trump when you are void",
      beforeResult: `Barbu led ${leadCard.label}. Right followed ${rightWinner.label}. Hearts are trumps, and you have no ${ledSuitName}.`,
      afterResult: `Because you are void in ${ledSuitName}, a heart can trump the trick.`,
      emptyExplanation: `You have no ${ledSuitName}. Any card is legal; a heart takes control.`,
      legalCardIds: playerHand.map((card) => card.id),
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: leadCard },
        { seat: "Right", card: rightWinner }
      ],
      tableAfterChoice: [{ seat: "Left", card: leftCard }],
      pendingBySeat: { Left: leftCard.label, You: "You" },
      playedExplanations: {
        [heartTrump.id]: `${heartTrump.label} is trump and wins because you are void in ${ledSuitName}.`,
        [highHeart.id]: `${highHeart.label} is trump and wins because you are void in ${ledSuitName}.`,
        [lowDiscard.id]: `${lowDiscard.label} is legal, but it does not beat ${rightWinner.label}.`,
        [highDiscard.id]: `${highDiscard.label} is legal, but it does not beat ${rightWinner.label}.`
      },
      cardOutcomes: {
        [heartTrump.id]: "good",
        [highHeart.id]: "good",
        [lowDiscard.id]: "risky",
        [highDiscard.id]: "risky"
      },
      cardReasons: {
        [heartTrump.id]: "won_clean_trick",
        [highHeart.id]: "won_clean_trick",
        [lowDiscard.id]: "void_discard",
        [highDiscard.id]: "void_discard"
      }
    }
  };
}

function generatedHeartsTrumpsFollowStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const offSuit = firstNonMatchingSuit(ledSuit, "H");
  const leadCard = card(choose(rng, ["7", "8", "9"]), ledSuit);
  const rightCard = card(choose(rng, ["J", "Q"]), ledSuit);
  const leftCard = card(choose(rng, ["3", "4", "5"]), ledSuit);
  const lowPlayerCard = card("2", ledSuit);
  const aceCard = card("A", ledSuit);
  const heartCard = card("7", "H");
  const discardCard = card("K", offSuit);
  const playerHand = [lowPlayerCard, aceCard, heartCard, discardCard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "Hearts Trumps",
    title: "Win while following suit",
    trick: {
      title: "Chase the trick in the led suit",
      beforeResult: `Barbu led ${leadCard.label}. Right followed ${rightCard.label}. You can follow ${ledSuitName} and still chase the trick.`,
      afterResult: `Hearts are trumps, but no heart has appeared. The highest ${ledSuitName} card still wins.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Follow suit and look for the winning card.`,
      legalCardIds: [lowPlayerCard.id, aceCard.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: leadCard },
        { seat: "Right", card: rightCard }
      ],
      tableAfterChoice: [{ seat: "Left", card: leftCard }],
      pendingBySeat: { Left: leftCard.label, You: "You" },
      playedExplanations: {
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows ${ledSuitName}, but it stays below ${rightCard.label}.`,
        [aceCard.id]: `${aceCard.label} follows ${ledSuitName} and wins the trick.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "risky",
        [aceCard.id]: "good"
      },
      cardReasons: {
        [lowPlayerCard.id]: "followed_suit",
        [aceCard.id]: "won_clean_trick"
      }
    }
  };
}

function generatedHeartsTrumpsOvertrumpStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const discardSuit = firstNonMatchingSuit(ledSuit, "H");
  const leadCard = card(choose(rng, ["8", "9", "10"]), ledSuit);
  const rightTrump = card(choose(rng, ["5", "6"]), "H");
  const leftCard = card(choose(rng, ["3", "4"]), ledSuit);
  const lowHeart = card("3", "H");
  const highHeart = card("Q", "H");
  const lowDiscard = card("4", discardSuit);
  const highDiscard = card("K", discardSuit);
  const playerHand = [lowHeart, highHeart, lowDiscard, highDiscard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "Hearts Trumps",
    title: "Overtrump for the trick",
    trick: {
      title: "Beat an existing trump",
      beforeResult: `Barbu led ${leadCard.label}. Right already trumped with ${rightTrump.label}. You are void in ${ledSuitName}.`,
      afterResult: `A higher heart overtrumps ${rightTrump.label}; lower hearts and plain discards miss the trick.`,
      emptyExplanation: `You have no ${ledSuitName}. Choose whether to overtrump with a higher heart.`,
      legalCardIds: playerHand.map((card) => card.id),
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: leadCard },
        { seat: "Right", card: rightTrump }
      ],
      tableAfterChoice: [{ seat: "Left", card: leftCard }],
      pendingBySeat: { Left: leftCard.label, You: "You" },
      playedExplanations: {
        [lowHeart.id]: `${lowHeart.label} is trump, but it is below ${rightTrump.label}.`,
        [highHeart.id]: `${highHeart.label} overtrumps ${rightTrump.label} and wins.`,
        [lowDiscard.id]: `${lowDiscard.label} is legal, but it cannot beat a heart trump.`,
        [highDiscard.id]: `${highDiscard.label} is legal, but it cannot beat a heart trump.`
      },
      cardOutcomes: {
        [lowHeart.id]: "risky",
        [highHeart.id]: "good",
        [lowDiscard.id]: "risky",
        [highDiscard.id]: "risky"
      },
      cardReasons: {
        [lowHeart.id]: "void_discard",
        [highHeart.id]: "won_clean_trick",
        [lowDiscard.id]: "void_discard",
        [highDiscard.id]: "void_discard"
      }
    }
  };
}

function generatedHeartsTrumpsFollowBeforeTrumpStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const ledSuit = choose(rng, nonHeartSuits);
  const offSuit = firstNonMatchingSuit(ledSuit, "H");
  const leadCard = card(choose(rng, ["7", "8", "9"]), ledSuit);
  const rightCard = card(choose(rng, ["J", "Q"]), ledSuit);
  const leftCard = card(choose(rng, ["3", "4", "5"]), ledSuit);
  const lowPlayerCard = card("2", ledSuit);
  const aceCard = card("A", ledSuit);
  const heartCard = card("6", "H");
  const discardCard = card("K", offSuit);
  const playerHand = [lowPlayerCard, aceCard, heartCard, discardCard].sort(compareCards);
  const ledSuitName = suitNames[ledSuit];

  return {
    contract: "Hearts Trumps",
    title: "Follow before trumping",
    trick: {
      title: "Respect the led suit",
      beforeResult: `Barbu led ${leadCard.label}. Right followed ${rightCard.label}. Hearts are trumps, but you still hold ${ledSuitName}.`,
      afterResult: `You must follow ${ledSuitName} before you are allowed to trump with a heart.`,
      emptyExplanation: `${capitalize(ledSuitName)} were led. Do not play a trump while you can still follow suit.`,
      legalCardIds: [lowPlayerCard.id, aceCard.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: leadCard },
        { seat: "Right", card: rightCard }
      ],
      tableAfterChoice: [{ seat: "Left", card: leftCard }],
      pendingBySeat: { Left: leftCard.label, You: "You" },
      playedExplanations: {
        [lowPlayerCard.id]: `${lowPlayerCard.label} follows ${ledSuitName}; it is legal but does not chase the trick.`,
        [aceCard.id]: `${aceCard.label} follows ${ledSuitName} and wins the trick.`
      },
      cardOutcomes: {
        [lowPlayerCard.id]: "risky",
        [aceCard.id]: "good"
      },
      cardReasons: {
        [lowPlayerCard.id]: "followed_suit",
        [aceCard.id]: "won_clean_trick"
      }
    }
  };
}

function generatedDominoStep(seed: number): BrowserDrillStep {
  switch (seed % 4) {
    case 0:
      return generatedDominoOpenOrExtendStep(seed);
    case 1:
      return generatedDominoTwoLaneChoiceStep(seed);
    case 2:
      return generatedDominoOpenNewSuitStep(seed);
    default:
      return generatedDominoAvoidGapStep(seed);
  }
}

function generatedDominoOpenOrExtendStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const lowSpade = choose(rng, ["5", "6"] as Rank[]);
  const highSpade: Rank = lowSpade === "5" ? "6" : "8";
  const legalSpade: Rank = lowSpade === "5" ? "4" : "9";
  const sevenHearts = card("7", "H");
  const legalExtension = card(legalSpade, "S");
  const clubGap = card("10", "C");
  const diamondGap = card("Q", "D");
  const sevenSpades = card("7", "S");
  const lowLayout = card(lowSpade, "S");
  const highLayout = card(highSpade, "S");
  const playerHand = [sevenHearts, legalExtension, clubGap, diamondGap].sort(compareCards);

  return {
    contract: "Domino",
    title: "Place into the layout",
    trick: {
      title: "Build from sevens",
      beforeResult: `The spade lane shows ${lowLayout.label} ${sevenSpades.label} ${highLayout.label}. Unopened suits need a seven.`,
      afterResult: `A legal Domino play either opens a suit with a seven or extends an existing suit by one rank.`,
      emptyExplanation: "Choose a card that starts a suit with a seven or extends the spade lane.",
      legalCardIds: [sevenHearts.id, legalExtension.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: sevenSpades },
        { seat: "Right", card: lowLayout },
        { seat: "Left", card: highLayout }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [sevenHearts.id]: `${sevenHearts.label} opens the heart lane.`,
        [legalExtension.id]: `${legalExtension.label} extends the current spade lane by one rank.`,
        [clubGap.id]: `${clubGap.label} cannot open clubs because unopened suits start with a seven.`,
        [diamondGap.id]: `${diamondGap.label} cannot open diamonds because unopened suits start with a seven.`
      },
      cardOutcomes: {
        [sevenHearts.id]: "good",
        [legalExtension.id]: "good",
        [clubGap.id]: "penalty",
        [diamondGap.id]: "penalty"
      },
      cardReasons: {
        [sevenHearts.id]: "followed_suit",
        [legalExtension.id]: "followed_suit",
        [clubGap.id]: "off_suit",
        [diamondGap.id]: "off_suit"
      }
    }
  };
}

function generatedDominoTwoLaneChoiceStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const lowSpade = choose(rng, ["5", "6"] as Rank[]);
  const highSpade: Rank = lowSpade === "5" ? "6" : "8";
  const legalSpade: Rank = lowSpade === "5" ? "4" : "9";
  const spadeExtension = card(legalSpade, "S");
  const lowHeart = card("6", "H");
  const highHeart = card("8", "H");
  const diamondGap = card("Q", "D");
  const sevenSpades = card("7", "S");
  const lowLayout = card(lowSpade, "S");
  const highLayout = card(highSpade, "S");
  const sevenHearts = card("7", "H");
  const playerHand = [spadeExtension, lowHeart, highHeart, diamondGap].sort(compareCards);

  return {
    contract: "Domino",
    title: "Choose between open lanes",
    trick: {
      title: "Extend an active lane",
      beforeResult: `Spades show ${lowLayout.label} ${sevenSpades.label} ${highLayout.label}. Hearts show ${sevenHearts.label}.`,
      afterResult: `A legal Domino play extends either open lane by one rank.`,
      emptyExplanation: "Choose a card adjacent to the spade lane or heart lane.",
      legalCardIds: [spadeExtension.id, lowHeart.id, highHeart.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: sevenSpades },
        { seat: "Right", card: lowLayout },
        { seat: "Left", card: highLayout },
        { seat: "Tutor", card: sevenHearts }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [spadeExtension.id]: `${spadeExtension.label} extends the spade lane.`,
        [lowHeart.id]: `${lowHeart.label} extends hearts downward from 7H.`,
        [highHeart.id]: `${highHeart.label} extends hearts upward from 7H.`,
        [diamondGap.id]: `${diamondGap.label} cannot open diamonds because unopened suits start with a seven.`
      },
      cardOutcomes: {
        [spadeExtension.id]: "good",
        [lowHeart.id]: "good",
        [highHeart.id]: "good",
        [diamondGap.id]: "penalty"
      },
      cardReasons: {
        [spadeExtension.id]: "followed_suit",
        [lowHeart.id]: "followed_suit",
        [highHeart.id]: "followed_suit",
        [diamondGap.id]: "off_suit"
      }
    }
  };
}

function generatedDominoOpenNewSuitStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const openSuit = choose(rng, ["C", "D", "H"] as Suit[]);
  const gapSuit = firstNonMatchingSuit(openSuit, "S");
  const sevenOpen = card("7", openSuit);
  const spadeExtension = card("6", "S");
  const gapCard = card("10", gapSuit);
  const highGap = card("Q", gapSuit);
  const sevenSpades = card("7", "S");
  const playerHand = [sevenOpen, spadeExtension, gapCard, highGap].sort(compareCards);

  return {
    contract: "Domino",
    title: "Open a new suit",
    trick: {
      title: "Start a lane with seven",
      beforeResult: `Only spades are open with ${sevenSpades.label}. A new suit must start with its seven.`,
      afterResult: `You can open a new suit with a seven or extend spades by one rank.`,
      emptyExplanation: "Choose a seven to open a suit, or a card adjacent to 7S.",
      legalCardIds: [sevenOpen.id, spadeExtension.id],
      hand: playerHand,
      tableBeforeChoice: [{ seat: "Tutor", card: sevenSpades }],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [sevenOpen.id]: `${sevenOpen.label} opens a new suit lane.`,
        [spadeExtension.id]: `${spadeExtension.label} extends spades downward from 7S.`,
        [gapCard.id]: `${gapCard.label} cannot open a new lane because it is not a seven.`,
        [highGap.id]: `${highGap.label} cannot open a new lane because it is not a seven.`
      },
      cardOutcomes: {
        [sevenOpen.id]: "good",
        [spadeExtension.id]: "good",
        [gapCard.id]: "penalty",
        [highGap.id]: "penalty"
      },
      cardReasons: {
        [sevenOpen.id]: "followed_suit",
        [spadeExtension.id]: "followed_suit",
        [gapCard.id]: "off_suit",
        [highGap.id]: "off_suit"
      }
    }
  };
}

function generatedDominoAvoidGapStep(seed: number): BrowserDrillStep {
  const rng = new DeterministicRng(seed);
  const openSuit = choose(rng, ["C", "D", "H"] as Suit[]);
  const gapSuit = firstNonMatchingSuit(openSuit, "S");
  const sevenOpen = card("7", openSuit);
  const eightOpen = card("8", openSuit);
  const legalOpenExtension = card("9", openSuit);
  const openGap = card("10", openSuit);
  const spadeExtension = card("6", "S");
  const gapSuitCard = card("Q", gapSuit);
  const sevenSpades = card("7", "S");
  const playerHand = [legalOpenExtension, openGap, spadeExtension, gapSuitCard].sort(compareCards);

  return {
    contract: "Domino",
    title: "Avoid jumping a lane",
    trick: {
      title: "Stay adjacent to the layout",
      beforeResult: `${sevenOpen.label} and ${eightOpen.label} are already in one lane. Spades are open with ${sevenSpades.label}.`,
      afterResult: `Domino only allows adjacent placements. You cannot jump from ${eightOpen.label} straight to ${openGap.label}.`,
      emptyExplanation: "Choose a card that touches an open lane by one rank.",
      legalCardIds: [legalOpenExtension.id, spadeExtension.id],
      hand: playerHand,
      tableBeforeChoice: [
        { seat: "Tutor", card: sevenOpen },
        { seat: "Right", card: eightOpen },
        { seat: "Left", card: sevenSpades }
      ],
      tableAfterChoice: [],
      pendingBySeat: { You: "You" },
      playedExplanations: {
        [legalOpenExtension.id]: `${legalOpenExtension.label} extends the open lane upward by one rank.`,
        [spadeExtension.id]: `${spadeExtension.label} extends spades downward from 7S.`,
        [openGap.id]: `${openGap.label} jumps over the missing 9 and is not legal yet.`,
        [gapSuitCard.id]: `${gapSuitCard.label} cannot open a new suit because unopened suits start with a seven.`
      },
      cardOutcomes: {
        [legalOpenExtension.id]: "good",
        [spadeExtension.id]: "good",
        [openGap.id]: "penalty",
        [gapSuitCard.id]: "penalty"
      },
      cardReasons: {
        [legalOpenExtension.id]: "followed_suit",
        [spadeExtension.id]: "followed_suit",
        [openGap.id]: "off_suit",
        [gapSuitCard.id]: "off_suit"
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
