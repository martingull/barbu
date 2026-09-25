import type { GuidedTrick } from "../../domain/types";

type DrillStep = { scenarioId?: string; contract: string; title: string; trick: GuidedTrick };

const spadesFollowSuitDrillStep: DrillStep = {
  scenarioId: "spades-follow-suit-clubs",
  contract: "Spades",
  title: "Follow suit",
  trick: {
    title: "Follow before trump",
    beforeResult: "Left led clubs. You still have clubs, even though you also hold spades.",
    afterResult: "In Spades, fixed trump does not override the follow-suit rule.",
    emptyExplanation: "Clubs were led. Choose a legal club before thinking about trump.",
    legalCardIds: ["3C", "AC"],
    hand: [
      { id: "3C", rank: "3", suit: "C", label: "3C" },
      { id: "AC", rank: "A", suit: "C", label: "AC" },
      { id: "8S", rank: "8", suit: "S", label: "8S" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
      { seat: "Tutor", card: { id: "KC", rank: "K", suit: "C", label: "KC" } }
    ],
    tableAfterChoice: [{ seat: "Right", card: { id: "5C", rank: "5", suit: "C", label: "5C" } }],
    pendingBySeat: { You: "follow clubs", Right: "follows" },
    playedExplanations: {
      "3C": "3C is good. You follow clubs and avoid spending a spade illegally.",
      AC: "AC follows suit and wins, but first notice that clubs are the legal suit.",
      "8S": "8S is illegal while you still have clubs."
    },
    cardOutcomes: {
      "3C": "good",
      AC: "risky"
    },
    cardReasons: {
      "3C": "followed_suit",
      AC: "won_clean_trick"
    }
  }
};
const spadesFollowSuitDuckDrillStep: DrillStep = {
  scenarioId: "spades-follow-suit-duck",
  contract: "Spades",
  title: "Follow suit",
  trick: {
    title: "Follow low when partner is safe",
    beforeResult: "Barbu is your partner and is winning with KD. Diamonds were led, and you have diamonds.",
    afterResult: "Following suit can still preserve strength when partner already controls the trick.",
    emptyExplanation: "Diamonds were led. Follow diamonds without overtaking partner.",
    legalCardIds: ["4D", "AD"],
    hand: [
      { id: "4D", rank: "4", suit: "D", label: "4D" },
      { id: "AD", rank: "A", suit: "D", label: "AD" },
      { id: "QS", rank: "Q", suit: "S", label: "QS" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "9D", rank: "9", suit: "D", label: "9D" } },
      { seat: "Tutor", card: { id: "KD", rank: "K", suit: "D", label: "KD" } }
    ],
    tableAfterChoice: [{ seat: "Right", card: { id: "7D", rank: "7", suit: "D", label: "7D" } }],
    pendingBySeat: { You: "follow diamonds", Right: "follows" },
    playedExplanations: {
      "4D": "4D is good. You follow suit and let partner keep the trick.",
      AD: "AD is legal, but it overtakes Barbu and spends a winner your side may need later.",
      QS: "QS is illegal while you still have diamonds."
    },
    cardOutcomes: {
      "4D": "good",
      AD: "risky"
    },
    cardReasons: {
      "4D": "followed_suit",
      AD: "won_clean_trick"
    }
  }
};
const spadesFollowSuitCoverDrillStep: DrillStep = {
  scenarioId: "spades-follow-suit-cover",
  contract: "Spades",
  title: "Follow suit",
  trick: {
    title: "Cover the opponent",
    beforeResult: "Hearts were led. Right is winning with QH, and you can follow hearts.",
    afterResult: "A follow-suit card can still win a needed book when it beats the opponent.",
    emptyExplanation: "Hearts were led. Follow hearts and decide whether your side needs to win.",
    legalCardIds: ["4H", "KH"],
    hand: [
      { id: "4H", rank: "4", suit: "H", label: "4H" },
      { id: "KH", rank: "K", suit: "H", label: "KH" },
      { id: "6S", rank: "6", suit: "S", label: "6S" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "9H", rank: "9", suit: "H", label: "9H" } },
      { seat: "Tutor", card: { id: "3H", rank: "3", suit: "H", label: "3H" } },
      { seat: "Right", card: { id: "QH", rank: "Q", suit: "H", label: "QH" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "last to play" },
    playedExplanations: {
      "4H": "4H follows suit, but it lets Right win the book.",
      KH: "KH follows suit and covers Right, taking the book for your side.",
      "6S": "6S is illegal while you still have hearts."
    },
    cardOutcomes: {
      "4H": "risky",
      KH: "good"
    },
    cardReasons: {
      "4H": "followed_suit",
      KH: "won_clean_trick"
    }
  }
};
const spadesTrumpCutDrillStep: DrillStep = {
  scenarioId: "spades-trump-cut",
  contract: "Spades",
  title: "Trump or discard",
  trick: {
    title: "Cut with the low spade",
    beforeResult: "Hearts were led. You are void in hearts, and Right is winning with AH.",
    afterResult: "Any spade beats a plain-suit card. Use the lowest spade that wins.",
    emptyExplanation: "You are void in hearts. Choose whether to cut the trick.",
    legalCardIds: ["4S", "QS", "7D"],
    hand: [
      { id: "4S", rank: "4", suit: "S", label: "4S" },
      { id: "QS", rank: "Q", suit: "S", label: "QS" },
      { id: "7D", rank: "7", suit: "D", label: "7D" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "9H", rank: "9", suit: "H", label: "9H" } },
      { seat: "Tutor", card: { id: "3H", rank: "3", suit: "H", label: "3H" } },
      { seat: "Right", card: { id: "AH", rank: "A", suit: "H", label: "AH" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "void: cut or discard" },
    playedExplanations: {
      "4S": "4S is good. The low spade cuts the heart trick and saves QS.",
      QS: "QS wins too, but it spends a higher spade than needed.",
      "7D": "7D is legal, but it gives up a book your side can win."
    },
    cardOutcomes: {
      "4S": "good",
      QS: "risky",
      "7D": "risky"
    },
    cardReasons: {
      "4S": "won_clean_trick",
      QS: "won_clean_trick",
      "7D": "void_discard"
    }
  }
};
const spadesTrumpPreserveDrillStep: DrillStep = {
  scenarioId: "spades-trump-preserve",
  contract: "Spades",
  title: "Trump or discard",
  trick: {
    title: "Discard when partner is winning",
    beforeResult: "Clubs were led. You are void in clubs, and Barbu is already winning with AC.",
    afterResult: "When partner has the book, throwing a side card can preserve spade control.",
    emptyExplanation: "You are void in clubs. Decide whether this trick needs a spade.",
    legalCardIds: ["5S", "JS", "8D"],
    hand: [
      { id: "5S", rank: "5", suit: "S", label: "5S" },
      { id: "JS", rank: "J", suit: "S", label: "JS" },
      { id: "8D", rank: "8", suit: "D", label: "8D" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "KC", rank: "K", suit: "C", label: "KC" } },
      { seat: "Tutor", card: { id: "AC", rank: "A", suit: "C", label: "AC" } },
      { seat: "Right", card: { id: "6C", rank: "6", suit: "C", label: "6C" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "void: partner winning" },
    playedExplanations: {
      "5S": "5S is legal, but it steals a trick partner already had.",
      JS: "JS is an even more expensive spade while partner is already winning.",
      "8D": "8D is good. You discard and keep spades for a later fight."
    },
    cardOutcomes: {
      "5S": "risky",
      JS: "risky",
      "8D": "good"
    },
    cardReasons: {
      "5S": "won_clean_trick",
      JS: "won_clean_trick",
      "8D": "void_discard"
    }
  }
};
const spadesTrumpOvertrumpDrillStep: DrillStep = {
  scenarioId: "spades-trump-overtrump",
  contract: "Spades",
  title: "Trump or discard",
  trick: {
    title: "Overtrump the opponent",
    beforeResult: "Diamonds were led. You are void, and Right has cut with 7S.",
    afterResult: "If an opponent has already trumped, a higher spade can win the book back.",
    emptyExplanation: "Beat Right's spade if taking this book helps your bid.",
    legalCardIds: ["9S", "KS", "5H"],
    hand: [
      { id: "9S", rank: "9", suit: "S", label: "9S" },
      { id: "KS", rank: "K", suit: "S", label: "KS" },
      { id: "5H", rank: "5", suit: "H", label: "5H" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "QD", rank: "Q", suit: "D", label: "QD" } },
      { seat: "Tutor", card: { id: "4D", rank: "4", suit: "D", label: "4D" } },
      { seat: "Right", card: { id: "7S", rank: "7", suit: "S", label: "7S" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "void: overtrump" },
    playedExplanations: {
      "9S": "9S is good. It overtrumps Right and is enough to win.",
      KS: "KS wins, but 9S already did the job.",
      "5H": "5H is legal, but it lets Right's spade win."
    },
    cardOutcomes: {
      "9S": "good",
      KS: "risky",
      "5H": "risky"
    },
    cardReasons: {
      "9S": "won_clean_trick",
      KS: "won_clean_trick",
      "5H": "void_discard"
    }
  }
};
const spadesBidAceDrillStep: DrillStep = {
  scenarioId: "spades-bid-count-ace",
  contract: "Spades",
  title: "Bid books",
  trick: {
    title: "Count a likely winner",
    beforeResult: "Before bidding, identify the card that most clearly belongs in your book estimate.",
    afterResult: "Aces are the first cards to count when estimating a Spades bid.",
    emptyExplanation: "Choose the card you should count most confidently as a book.",
    legalCardIds: ["AS", "7D", "4C"],
    hand: [
      { id: "AS", rank: "A", suit: "S", label: "AS" },
      { id: "7D", rank: "7", suit: "D", label: "7D" },
      { id: "4C", rank: "4", suit: "C", label: "4C" }
    ],
    tableBeforeChoice: [],
    tableAfterChoice: [],
    pendingBySeat: { You: "estimate bid" },
    playedExplanations: {
      AS: "AS is good. A high spade is a strong likely book.",
      "7D": "7D is not a card you should count as a likely book.",
      "4C": "4C is useful as a low exit, not as a bid winner."
    },
    cardOutcomes: {
      AS: "good",
      "7D": "risky",
      "4C": "risky"
    },
    cardReasons: {
      AS: "won_clean_trick",
      "7D": "off_suit",
      "4C": "off_suit"
    }
  }
};
const spadesBidProtectedKingDrillStep: DrillStep = {
  scenarioId: "spades-bid-protected-king",
  contract: "Spades",
  title: "Bid books",
  trick: {
    title: "Prefer protected strength",
    beforeResult: "Before bidding, compare the kings. One has small cards behind it; one is lonely.",
    afterResult: "A protected king is safer to count than a singleton king.",
    emptyExplanation: "Choose the card that deserves more credit in the bid estimate.",
    legalCardIds: ["KH", "KC", "5H"],
    hand: [
      { id: "KH", rank: "K", suit: "H", label: "KH" },
      { id: "5H", rank: "5", suit: "H", label: "5H" },
      { id: "KC", rank: "K", suit: "C", label: "KC" }
    ],
    tableBeforeChoice: [],
    tableAfterChoice: [],
    pendingBySeat: { You: "estimate bid" },
    playedExplanations: {
      KH: "KH is good. The small heart means this king is protected by suit length.",
      KC: "KC is a king, but as a lonely club it is easier to lose or be forced out.",
      "5H": "5H helps protect KH, but the king is the card you count."
    },
    cardOutcomes: {
      KH: "good",
      KC: "risky",
      "5H": "risky"
    },
    cardReasons: {
      KH: "won_clean_trick",
      KC: "off_suit",
      "5H": "off_suit"
    }
  }
};
const spadesBidNilDrillStep: DrillStep = {
  scenarioId: "spades-bid-nil-danger",
  contract: "Spades",
  title: "Bid books",
  trick: {
    title: "Do not call nil with a clear winner",
    beforeResult: "You are checking whether nil is realistic. One card makes nil dangerous.",
    afterResult: "Nil means you must win zero tricks, so obvious winners argue against nil.",
    emptyExplanation: "Choose the card that makes a nil bid unsafe.",
    legalCardIds: ["QS", "3C", "6D"],
    hand: [
      { id: "QS", rank: "Q", suit: "S", label: "QS" },
      { id: "3C", rank: "3", suit: "C", label: "3C" },
      { id: "6D", rank: "6", suit: "D", label: "6D" }
    ],
    tableBeforeChoice: [],
    tableAfterChoice: [],
    pendingBySeat: { You: "nil check" },
    playedExplanations: {
      QS: "QS is good. A high spade can be hard to duck, so nil is risky.",
      "3C": "3C is the kind of low card that helps a nil plan.",
      "6D": "6D is not the main nil danger here."
    },
    cardOutcomes: {
      QS: "good",
      "3C": "risky",
      "6D": "risky"
    },
    cardReasons: {
      QS: "won_clean_trick",
      "3C": "off_suit",
      "6D": "off_suit"
    }
  }
};
const spadesBagsDuckDrillStep: DrillStep = {
  scenarioId: "spades-bags-duck-after-bid",
  contract: "Spades",
  title: "Avoid bags",
  trick: {
    title: "Duck after making the bid",
    beforeResult: "Your side bid five and already has five books. Clubs were led, and Right is winning.",
    afterResult: "After making the bid, another unnecessary book becomes a bag.",
    emptyExplanation: "Follow clubs without creating an extra bag if you can.",
    legalCardIds: ["4C", "AC"],
    hand: [
      { id: "4C", rank: "4", suit: "C", label: "4C" },
      { id: "AC", rank: "A", suit: "C", label: "AC" },
      { id: "8S", rank: "8", suit: "S", label: "8S" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
      { seat: "Tutor", card: { id: "2C", rank: "2", suit: "C", label: "2C" } },
      { seat: "Right", card: { id: "KC", rank: "K", suit: "C", label: "KC" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "avoid bag" },
    playedExplanations: {
      "4C": "4C is good. You follow suit and let Right keep the trick.",
      AC: "AC wins an extra book after your side has made the bid. That is a bag.",
      "8S": "8S is illegal while you still have clubs."
    },
    cardOutcomes: {
      "4C": "good",
      AC: "risky"
    },
    cardReasons: {
      "4C": "followed_suit",
      AC: "won_clean_trick"
    }
  }
};
const spadesBagsDiscardDrillStep: DrillStep = {
  scenarioId: "spades-bags-discard",
  contract: "Spades",
  title: "Avoid bags",
  trick: {
    title: "Throw away instead of trumping",
    beforeResult: "Your side has made its bid. You are void in diamonds, and Left is winning.",
    afterResult: "When the contract is safe, discarding can avoid another bag.",
    emptyExplanation: "You are void in diamonds. Avoid taking an extra book.",
    legalCardIds: ["6S", "JS", "4H"],
    hand: [
      { id: "6S", rank: "6", suit: "S", label: "6S" },
      { id: "JS", rank: "J", suit: "S", label: "JS" },
      { id: "4H", rank: "4", suit: "H", label: "4H" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "AD", rank: "A", suit: "D", label: "AD" } },
      { seat: "Tutor", card: { id: "3D", rank: "3", suit: "D", label: "3D" } },
      { seat: "Right", card: { id: "9D", rank: "9", suit: "D", label: "9D" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "void: avoid bag" },
    playedExplanations: {
      "6S": "6S wins an extra book your side does not need.",
      JS: "JS wins the same unnecessary bag and spends a stronger spade.",
      "4H": "4H is good. You discard and avoid taking another book."
    },
    cardOutcomes: {
      "6S": "risky",
      JS: "risky",
      "4H": "good"
    },
    cardReasons: {
      "6S": "won_clean_trick",
      JS: "won_clean_trick",
      "4H": "void_discard"
    }
  }
};
const spadesBagsProtectNilDrillStep: DrillStep = {
  scenarioId: "spades-bags-protect-nil",
  contract: "Spades",
  title: "Avoid bags",
  trick: {
    title: "Bag pressure versus nil protection",
    beforeResult: "Barbu bid nil and is currently winning with 9H. You can overtake in hearts.",
    afterResult: "Sometimes you accept a possible extra book to protect partner's nil bonus.",
    emptyExplanation: "Hearts were led. Protect Barbu's nil if you can.",
    legalCardIds: ["KH", "4H"],
    hand: [
      { id: "KH", rank: "K", suit: "H", label: "KH" },
      { id: "4H", rank: "4", suit: "H", label: "4H" },
      { id: "7S", rank: "7", suit: "S", label: "7S" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "6H", rank: "6", suit: "H", label: "6H" } },
      { seat: "Tutor", card: { id: "9H", rank: "9", suit: "H", label: "9H" } },
      { seat: "Right", card: { id: "8H", rank: "8", suit: "H", label: "8H" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "protect nil" },
    playedExplanations: {
      KH: "KH is good. You take the trick away from Barbu and protect the nil.",
      "4H": "4H avoids a possible bag, but Barbu would win a trick and miss nil.",
      "7S": "7S is illegal while you still have hearts."
    },
    cardOutcomes: {
      KH: "good",
      "4H": "penalty"
    },
    cardReasons: {
      KH: "won_clean_trick",
      "4H": "followed_suit"
    }
  }
};
export const spadesFollowSuitDrillPool = [spadesFollowSuitDrillStep, spadesFollowSuitDuckDrillStep, spadesFollowSuitCoverDrillStep];
export const spadesTrumpOrDiscardDrillPool = [spadesTrumpCutDrillStep, spadesTrumpPreserveDrillStep, spadesTrumpOvertrumpDrillStep];
export const spadesBidBooksDrillPool = [spadesBidAceDrillStep, spadesBidProtectedKingDrillStep, spadesBidNilDrillStep];
export const spadesAvoidBagsDrillPool = [spadesBagsDuckDrillStep, spadesBagsDiscardDrillStep, spadesBagsProtectNilDrillStep];
