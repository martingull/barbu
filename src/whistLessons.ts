import type { GuidedTrick } from "./lessonTypes";

type DrillStep = { scenarioId?: string; contract: string; title: string; trick: GuidedTrick };

const whistFollowSuitDrillStep: DrillStep = {
  scenarioId: "whist-follow-suit-third-hand",
  contract: "Whist",
  title: "Follow suit",
  trick: {
    title: "Follow partner's led suit",
    beforeResult: "Barbu is your partner and led 8C. Right played QC. You still have clubs.",
    afterResult: "In Whist you must follow the led suit when you can.",
    emptyExplanation: "Clubs were led. Choose a club before thinking about any other suit.",
    legalCardIds: ["3C", "AC"],
    hand: [
      { id: "3C", rank: "3", suit: "C", label: "3C" },
      { id: "AC", rank: "A", suit: "C", label: "AC" },
      { id: "7H", rank: "7", suit: "H", label: "7H" }
    ],
    tableBeforeChoice: [
      { seat: "Tutor", card: { id: "8C", rank: "8", suit: "C", label: "8C" } },
      { seat: "Right", card: { id: "QC", rank: "Q", suit: "C", label: "QC" } }
    ],
    tableAfterChoice: [{ seat: "Left", card: { id: "5C", rank: "5", suit: "C", label: "5C" } }],
    pendingBySeat: { Left: "follow clubs", You: "third hand" },
    playedExplanations: {
      "3C": "3C follows suit, but it leaves Right's QC winning.",
      AC: "AC follows suit and helps your partnership take the trick.",
      "7H": "7H is illegal while you still have clubs."
    },
    cardOutcomes: {
      "3C": "risky",
      AC: "good"
    },
    cardReasons: {
      "3C": "followed_suit",
      AC: "won_clean_trick"
    }
  }
};
const whistFollowSuitLowDrillStep: DrillStep = {
  scenarioId: "whist-follow-suit-second-hand",
  contract: "Whist",
  title: "Follow suit",
  trick: {
    title: "Second hand follows low",
    beforeResult: "Right led diamonds. You are second to play and still have diamonds.",
    afterResult: "Second hand often stays low unless spending strength clearly helps.",
    emptyExplanation: "Diamonds were led. Follow diamonds.",
    legalCardIds: ["4D", "KD"],
    hand: [
      { id: "4D", rank: "4", suit: "D", label: "4D" },
      { id: "KD", rank: "K", suit: "D", label: "KD" },
      { id: "AS", rank: "A", suit: "S", label: "AS" }
    ],
    tableBeforeChoice: [{ seat: "Right", card: { id: "9D", rank: "9", suit: "D", label: "9D" } }],
    tableAfterChoice: [
      { seat: "Left", card: { id: "AD", rank: "A", suit: "D", label: "AD" } },
      { seat: "Tutor", card: { id: "QD", rank: "Q", suit: "D", label: "QD" } }
    ],
    pendingBySeat: { Left: "opponent follows", Tutor: "partner follows", You: "second hand" },
    playedExplanations: {
      "4D": "4D follows suit and keeps your king for a later trick.",
      KD: "KD follows suit, but second hand high spends strength before partner has acted.",
      AS: "AS is illegal while you still have diamonds."
    },
    cardOutcomes: {
      "4D": "good",
      KD: "risky"
    },
    cardReasons: {
      "4D": "followed_suit",
      KD: "followed_suit"
    }
  }
};
const whistFollowSuitCoverDrillStep: DrillStep = {
  scenarioId: "whist-follow-suit-cover-opponent",
  contract: "Whist",
  title: "Follow suit",
  trick: {
    title: "Cover when it wins",
    beforeResult: "Left led spades. Barbu is your partner and played 6S. Right played QS.",
    afterResult: "Following suit can still be active: cover the opponent when your card wins the trick.",
    emptyExplanation: "Spades were led. Follow spades and decide whether to beat Right.",
    legalCardIds: ["4S", "KS"],
    hand: [
      { id: "4S", rank: "4", suit: "S", label: "4S" },
      { id: "KS", rank: "K", suit: "S", label: "KS" },
      { id: "9H", rank: "9", suit: "H", label: "9H" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "8S", rank: "8", suit: "S", label: "8S" } },
      { seat: "Tutor", card: { id: "6S", rank: "6", suit: "S", label: "6S" } },
      { seat: "Right", card: { id: "QS", rank: "Q", suit: "S", label: "QS" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "last to play" },
    playedExplanations: {
      "4S": "4S follows suit, but it lets Right's queen win.",
      KS: "KS follows suit and covers Right, so your partnership wins the trick.",
      "9H": "9H is illegal while you still have spades."
    },
    cardOutcomes: {
      "4S": "risky",
      KS: "good"
    },
    cardReasons: {
      "4S": "followed_suit",
      KS: "won_clean_trick"
    }
  }
};
const whistTrumpToWinDrillStep: DrillStep = {
  scenarioId: "whist-trump-to-win",
  contract: "Whist",
  title: "Trump or discard",
  trick: {
    title: "Cut with trump",
    beforeResult: "Spades are trumps. Hearts were led, and you have no hearts.",
    afterResult: "When you are void, a trump can cut the led suit and win the trick.",
    emptyExplanation: "You are void in hearts. Decide whether to trump or discard.",
    legalCardIds: ["4S", "JS", "6D"],
    hand: [
      { id: "4S", rank: "4", suit: "S", label: "4S" },
      { id: "JS", rank: "J", suit: "S", label: "JS" },
      { id: "6D", rank: "6", suit: "D", label: "6D" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "QH", rank: "Q", suit: "H", label: "QH" } },
      { seat: "Tutor", card: { id: "3H", rank: "3", suit: "H", label: "3H" } },
      { seat: "Right", card: { id: "AH", rank: "A", suit: "H", label: "AH" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "void: trump or discard" },
    playedExplanations: {
      "4S": "4S is trump. Even a low trump beats the heart lead.",
      JS: "JS wins too, but it spends a stronger trump than needed.",
      "6D": "6D is legal because you are void, but it gives up the chance to win with trump."
    },
    cardOutcomes: {
      "4S": "good",
      JS: "risky",
      "6D": "risky"
    },
    cardReasons: {
      "4S": "won_clean_trick",
      JS: "won_clean_trick",
      "6D": "void_discard"
    }
  }
};
const whistPreserveTrumpDrillStep: DrillStep = {
  scenarioId: "whist-preserve-trump",
  contract: "Whist",
  title: "Trump or discard",
  trick: {
    title: "Discard when partner is winning",
    beforeResult: "Clubs are trumps. Diamonds were led, and partner Barbu is already winning with AD.",
    afterResult: "If partner is already winning, discarding can preserve your trump for a later trick.",
    emptyExplanation: "You are void in diamonds. Choose whether this is worth a trump.",
    legalCardIds: ["3C", "9C", "5H"],
    hand: [
      { id: "3C", rank: "3", suit: "C", label: "3C" },
      { id: "9C", rank: "9", suit: "C", label: "9C" },
      { id: "5H", rank: "5", suit: "H", label: "5H" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "8D", rank: "8", suit: "D", label: "8D" } },
      { seat: "Tutor", card: { id: "AD", rank: "A", suit: "D", label: "AD" } },
      { seat: "Right", card: { id: "JD", rank: "J", suit: "D", label: "JD" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "void: partner winning" },
    playedExplanations: {
      "3C": "3C is legal trump, but partner was already winning this trick.",
      "9C": "9C wastes an even stronger trump while partner is already winning.",
      "5H": "5H is good. You discard and preserve trumps because partner has the trick."
    },
    cardOutcomes: {
      "3C": "risky",
      "9C": "risky",
      "5H": "good"
    },
    cardReasons: {
      "3C": "won_clean_trick",
      "9C": "won_clean_trick",
      "5H": "void_discard"
    }
  }
};
const whistOvertrumpOpponentDrillStep: DrillStep = {
  scenarioId: "whist-overtrump-opponent",
  contract: "Whist",
  title: "Trump or discard",
  trick: {
    title: "Overtrump the opponent",
    beforeResult: "Hearts are trumps. Clubs were led, partner is losing, and Right has already trumped with 7H.",
    afterResult: "When the opponents cut, overtrumping can take back control for your side.",
    emptyExplanation: "You are void in clubs. Beat Right's trump if you can.",
    legalCardIds: ["9H", "QH", "5D"],
    hand: [
      { id: "9H", rank: "9", suit: "H", label: "9H" },
      { id: "QH", rank: "Q", suit: "H", label: "QH" },
      { id: "5D", rank: "5", suit: "D", label: "5D" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "KC", rank: "K", suit: "C", label: "KC" } },
      { seat: "Tutor", card: { id: "3C", rank: "3", suit: "C", label: "3C" } },
      { seat: "Right", card: { id: "7H", rank: "7", suit: "H", label: "7H" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "void: overtrump" },
    playedExplanations: {
      "9H": "9H overtrumps Right and is enough to win the trick.",
      QH: "QH also wins, but it spends a stronger trump than needed.",
      "5D": "5D is legal because you are void, but it lets Right's trump win."
    },
    cardOutcomes: {
      "9H": "good",
      QH: "risky",
      "5D": "risky"
    },
    cardReasons: {
      "9H": "won_clean_trick",
      QH: "won_clean_trick",
      "5D": "void_discard"
    }
  }
};
const whistThirdHandHighDrillStep: DrillStep = {
  scenarioId: "whist-third-hand-high-over-queen",
  contract: "Whist",
  title: "Third hand high",
  trick: {
    title: "Support partner's lead",
    beforeResult: "Barbu is your partner and led 10H. Right covered with QH. You are third hand.",
    afterResult: "Third hand high means spending strength when it helps partner's side win the trick.",
    emptyExplanation: "Hearts were led. If you can beat Right, do it for the partnership.",
    legalCardIds: ["AH", "4H"],
    hand: [
      { id: "AH", rank: "A", suit: "H", label: "AH" },
      { id: "4H", rank: "4", suit: "H", label: "4H" },
      { id: "7S", rank: "7", suit: "S", label: "7S" }
    ],
    tableBeforeChoice: [
      { seat: "Tutor", card: { id: "10H", rank: "10", suit: "H", label: "10H" } },
      { seat: "Right", card: { id: "QH", rank: "Q", suit: "H", label: "QH" } }
    ],
    tableAfterChoice: [{ seat: "Left", card: { id: "6H", rank: "6", suit: "H", label: "6H" } }],
    pendingBySeat: { Left: "last to play", You: "third hand" },
    playedExplanations: {
      AH: "AH follows suit and beats Right's queen, so your side can take the trick.",
      "4H": "4H follows suit, but it lets Right's queen hold the trick.",
      "7S": "7S is illegal while you still have hearts."
    },
    cardOutcomes: {
      AH: "good",
      "4H": "risky"
    },
    cardReasons: {
      AH: "won_clean_trick",
      "4H": "followed_suit"
    }
  }
};
const whistThirdHandSaveStrengthDrillStep: DrillStep = {
  scenarioId: "whist-third-hand-high-save-strength",
  contract: "Whist",
  title: "Third hand high",
  trick: {
    title: "Do not overpay",
    beforeResult: "Barbu led KC as your partner. Right followed with 4C. You are third hand.",
    afterResult: "Third hand high is a habit, not a command to waste the ace when partner is already ahead.",
    emptyExplanation: "Clubs were led. Partner's king is currently winning.",
    legalCardIds: ["2C", "AC"],
    hand: [
      { id: "2C", rank: "2", suit: "C", label: "2C" },
      { id: "AC", rank: "A", suit: "C", label: "AC" },
      { id: "8D", rank: "8", suit: "D", label: "8D" }
    ],
    tableBeforeChoice: [
      { seat: "Tutor", card: { id: "KC", rank: "K", suit: "C", label: "KC" } },
      { seat: "Right", card: { id: "4C", rank: "4", suit: "C", label: "4C" } }
    ],
    tableAfterChoice: [{ seat: "Left", card: { id: "9C", rank: "9", suit: "C", label: "9C" } }],
    pendingBySeat: { Left: "last to play", You: "third hand" },
    playedExplanations: {
      "2C": "2C follows suit and lets partner's king keep winning.",
      AC: "AC follows suit, but it overtakes partner and spends your ace too early.",
      "8D": "8D is illegal while you still have clubs."
    },
    cardOutcomes: {
      "2C": "good",
      AC: "risky"
    },
    cardReasons: {
      "2C": "followed_suit",
      AC: "won_clean_trick"
    }
  }
};
const whistThirdHandEnoughDrillStep: DrillStep = {
  scenarioId: "whist-third-hand-high-enough",
  contract: "Whist",
  title: "Third hand high",
  trick: {
    title: "Allow for fourth hand",
    beforeResult: "Barbu led 9D as your partner. Right covered with JD. You are third hand.",
    afterResult: "Left still has to play. With the king unaccounted for, the ace protects your side better than the queen.",
    emptyExplanation: "Diamonds were led. The king has not appeared, and Left still has a turn.",
    legalCardIds: ["QD", "AD"],
    hand: [
      { id: "QD", rank: "Q", suit: "D", label: "QD" },
      { id: "AD", rank: "A", suit: "D", label: "AD" },
      { id: "4C", rank: "4", suit: "C", label: "4C" }
    ],
    tableBeforeChoice: [
      { seat: "Tutor", card: { id: "9D", rank: "9", suit: "D", label: "9D" } },
      { seat: "Right", card: { id: "JD", rank: "J", suit: "D", label: "JD" } }
    ],
    tableAfterChoice: [{ seat: "Left", card: { id: "5D", rank: "5", suit: "D", label: "5D" } }],
    pendingBySeat: { Left: "last to play", You: "third hand" },
    playedExplanations: {
      QD: "QD beats Right's jack, but an unseen king in fourth hand could beat it. Left's actual card was not known when you chose.",
      AD: "AD protects against an unseen king in fourth hand. Play the cheaper card when it is equivalent or you are last to play.",
      "4C": "4C is illegal while you still have diamonds."
    },
    cardOutcomes: {
      QD: "risky",
      AD: "good"
    },
    cardReasons: {
      QD: "won_clean_trick",
      AD: "won_clean_trick"
    }
  }
};
const whistReturnPartnerSuitDrillStep: DrillStep = {
  scenarioId: "whist-return-partner-spades",
  contract: "Whist",
  title: "Return partner's suit",
  trick: {
    title: "Lead partner's suit back",
    beforeResult: "You won the last trick. Earlier, Barbu led spades strongly. You are now on lead.",
    afterResult: "Returning partner's suit is a simple way to invite the partnership to keep developing that suit.",
    emptyExplanation: "You can lead any suit. Look for partner's earlier invitation.",
    legalCardIds: ["8S", "KD", "5H"],
    hand: [
      { id: "8S", rank: "8", suit: "S", label: "8S" },
      { id: "KD", rank: "K", suit: "D", label: "KD" },
      { id: "5H", rank: "5", suit: "H", label: "5H" }
    ],
    tableBeforeChoice: [],
    tableAfterChoice: [
      { seat: "Left", card: { id: "QS", rank: "Q", suit: "S", label: "QS" } },
      { seat: "Tutor", card: { id: "AS", rank: "A", suit: "S", label: "AS" } },
      { seat: "Right", card: { id: "3S", rank: "3", suit: "S", label: "3S" } }
    ],
    pendingBySeat: { Left: "follows lead", Tutor: "partner", Right: "opponent", You: "on lead" },
    playedExplanations: {
      "8S": "8S returns partner's spade suit and lets Barbu's strength work.",
      KD: "KD may be strong, but it ignores partner's spade invitation.",
      "5H": "5H is legal, but it does not build the partnership's known suit."
    },
    cardOutcomes: {
      "8S": "good",
      KD: "risky",
      "5H": "risky"
    },
    cardReasons: {
      "8S": "won_clean_trick",
      KD: "off_suit",
      "5H": "off_suit"
    }
  }
};
const whistReturnPartnerSuitLowDrillStep: DrillStep = {
  scenarioId: "whist-return-partner-clubs",
  contract: "Whist",
  title: "Return partner's suit",
  trick: {
    title: "Return without overcommitting",
    beforeResult: "Barbu showed interest in clubs. You are on lead and can return clubs cheaply.",
    afterResult: "A small return can keep partner's suit moving without spending your side cards.",
    emptyExplanation: "Lead partner's suit when the hand gives you a clean return.",
    legalCardIds: ["4C", "QH", "JD"],
    hand: [
      { id: "4C", rank: "4", suit: "C", label: "4C" },
      { id: "QH", rank: "Q", suit: "H", label: "QH" },
      { id: "JD", rank: "J", suit: "D", label: "JD" }
    ],
    tableBeforeChoice: [],
    tableAfterChoice: [
      { seat: "Left", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
      { seat: "Tutor", card: { id: "KC", rank: "K", suit: "C", label: "KC" } },
      { seat: "Right", card: { id: "6C", rank: "6", suit: "C", label: "6C" } }
    ],
    pendingBySeat: { Left: "follows lead", Tutor: "partner", Right: "opponent", You: "on lead" },
    playedExplanations: {
      "4C": "4C returns partner's club suit and keeps the table simple.",
      QH: "QH starts a new suit instead of returning partner's invitation.",
      JD: "JD is legal, but it abandons the partnership signal."
    },
    cardOutcomes: {
      "4C": "good",
      QH: "risky",
      JD: "risky"
    },
    cardReasons: {
      "4C": "won_clean_trick",
      QH: "off_suit",
      JD: "off_suit"
    }
  }
};
const whistReturnAvoidTrumpDrillStep: DrillStep = {
  scenarioId: "whist-return-partner-not-trump",
  contract: "Whist",
  title: "Return partner's suit",
  trick: {
    title: "Return the plain suit",
    beforeResult: "Hearts are trumps. Barbu invited diamonds earlier, and you are now on lead.",
    afterResult: "Returning partner's plain suit can develop winners without spending trump control.",
    emptyExplanation: "You can lead anything. Partner's signal points to diamonds, not trump.",
    legalCardIds: ["7D", "AH", "10C"],
    hand: [
      { id: "7D", rank: "7", suit: "D", label: "7D" },
      { id: "AH", rank: "A", suit: "H", label: "AH" },
      { id: "10C", rank: "10", suit: "C", label: "10C" }
    ],
    tableBeforeChoice: [],
    tableAfterChoice: [
      { seat: "Left", card: { id: "QD", rank: "Q", suit: "D", label: "QD" } },
      { seat: "Tutor", card: { id: "KD", rank: "K", suit: "D", label: "KD" } },
      { seat: "Right", card: { id: "4D", rank: "4", suit: "D", label: "4D" } }
    ],
    pendingBySeat: { Left: "follows lead", Tutor: "partner", Right: "opponent", You: "on lead" },
    playedExplanations: {
      "7D": "7D returns partner's diamond suit and lets Barbu's strength work.",
      AH: "AH leads trump instead of returning partner's suit.",
      "10C": "10C starts a new suit and ignores the partnership signal."
    },
    cardOutcomes: {
      "7D": "good",
      AH: "risky",
      "10C": "risky"
    },
    cardReasons: {
      "7D": "won_clean_trick",
      AH: "off_suit",
      "10C": "off_suit"
    }
  }
};
const whistOpeningLongSuitLessonStep: DrillStep = {
  scenarioId: "whist-opening-long-suit",
  contract: "Whist",
  title: "Opening leads",
  trick: {
    title: "Lead your long suit",
    beforeResult:
      "You lead first. Hearts are trumps. From Q-10-8-5-2 of spades, consider a low lead from length.",
    afterResult:
      "5S is fourth highest from Q-10-8-5-2. It invites spades while keeping the queen to work with partner's honours.",
    emptyExplanation: "Choose fourth highest from your long spades, preserving the queen.",
    legalCardIds: ["8S", "QS", "10S", "2S", "5S", "AD", "KC", "10H"],
    hand: [
      { id: "8S", rank: "8", suit: "S", label: "8S" },
      { id: "AD", rank: "A", suit: "D", label: "AD" },
      { id: "QS", rank: "Q", suit: "S", label: "QS" },
      { id: "10S", rank: "10", suit: "S", label: "10S" },
      { id: "2S", rank: "2", suit: "S", label: "2S" },
      { id: "10H", rank: "10", suit: "H", label: "10H" },
      { id: "5S", rank: "5", suit: "S", label: "5S" },
      { id: "KC", rank: "K", suit: "C", label: "KC" }
    ],
    tableBeforeChoice: [],
    tableAfterChoice: [
      { seat: "Left", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
      { seat: "Tutor", card: { id: "AS", rank: "A", suit: "S", label: "AS" } },
      { seat: "Right", card: { id: "4S", rank: "4", suit: "S", label: "4S" } }
    ],
    pendingBySeat: { Left: "follows lead", Tutor: "partner", Right: "opponent", You: "opening lead" },
    playedExplanations: {
      "8S": "8S is third highest. Here, 5S is the conventional fourth-highest invitation.",
      QS: "The queen has no touching honour sequence. A low spade preserves it for later.",
      "10S": "Keep the ten to work with your queen; lead fourth highest here.",
      "2S": "A low lead is sensible, but 5S follows the fourth-highest convention used here.",
      "5S": "5S is fourth highest. It invites spades without spending the unsupported queen.",
      AD: "AD is powerful, but it says diamonds are the suit you want back instead of showing your spades.",
      KC: "KC shows club strength, but it hides that spades are your best suit here.",
      "10H": "10H leads trump. That can be right later, but it spends control before partner knows your shape."
    },
    cardOutcomes: {
      "8S": "risky",
      QS: "risky",
      "10S": "risky",
      "2S": "risky",
      "5S": "good",
      AD: "risky",
      KC: "risky",
      "10H": "risky"
    },
    cardReasons: {
      "8S": "won_clean_trick",
      QS: "won_clean_trick",
      "10S": "won_clean_trick",
      "2S": "won_clean_trick",
      "5S": "won_clean_trick",
      AD: "off_suit",
      KC: "off_suit",
      "10H": "off_suit"
    }
  }
};
const whistOpeningTopSequenceLessonStep: DrillStep = {
  scenarioId: "whist-opening-top-sequence",
  contract: "Whist",
  title: "Opening leads",
  trick: {
    title: "Lead from strength",
    beforeResult: "You lead first. Diamonds are trumps. Clubs have a K-Q-J honour sequence.",
    afterResult:
      "KC is the top of K-Q-J. An honour lead suggests supporting honours below it, unlike a low lead from broken length.",
    emptyExplanation: "Lead the top of your club honour sequence.",
    legalCardIds: ["KC", "QC", "JC", "AS", "7D", "9H"],
    hand: [
      { id: "KC", rank: "K", suit: "C", label: "KC" },
      { id: "7D", rank: "7", suit: "D", label: "7D" },
      { id: "QC", rank: "Q", suit: "C", label: "QC" },
      { id: "9H", rank: "9", suit: "H", label: "9H" },
      { id: "JC", rank: "J", suit: "C", label: "JC" },
      { id: "AS", rank: "A", suit: "S", label: "AS" }
    ],
    tableBeforeChoice: [],
    tableAfterChoice: [
      { seat: "Left", card: { id: "4C", rank: "4", suit: "C", label: "4C" } },
      { seat: "Tutor", card: { id: "2C", rank: "2", suit: "C", label: "2C" } },
      { seat: "Right", card: { id: "AC", rank: "A", suit: "C", label: "AC" } }
    ],
    pendingBySeat: { Left: "follows lead", Tutor: "partner", Right: "opponent", You: "opening lead" },
    playedExplanations: {
      KC: "KC leads the top of K-Q-J, showing a supported honour sequence.",
      QC: "QC shows clubs too, but it hides that KC is your highest club.",
      JC: "JC starts clubs, but it hides both the king and queen above it.",
      AS: "AS is high, but it invites spades instead of the stronger club plan.",
      "7D": "7D leads trump. That spends control instead of showing partner your club strength.",
      "9H": "9H starts another plain suit, but clubs send the stronger partnership message."
    },
    cardOutcomes: {
      KC: "good",
      QC: "risky",
      JC: "risky",
      AS: "risky",
      "7D": "risky",
      "9H": "risky"
    },
    cardReasons: {
      KC: "won_clean_trick",
      QC: "won_clean_trick",
      JC: "won_clean_trick",
      AS: "off_suit",
      "7D": "off_suit",
      "9H": "off_suit"
    }
  }
};
const whistOpeningAvoidTrumpLessonStep: DrillStep = {
  scenarioId: "whist-opening-avoid-trump",
  contract: "Whist",
  title: "Opening leads",
  trick: {
    title: "Do not open trump casually",
    beforeResult: "Spades are trumps. You can cash AC while keeping both top trumps for control.",
    afterResult:
      "AC cashes a plain-suit winner. With only two trumps, you are not committed to drawing everyone's trumps.",
    emptyExplanation: "Cash the plain-suit ace without spending trump control.",
    legalCardIds: ["9D", "8D", "AS", "KS", "AC", "5C"],
    hand: [
      { id: "9D", rank: "9", suit: "D", label: "9D" },
      { id: "AS", rank: "A", suit: "S", label: "AS" },
      { id: "8D", rank: "8", suit: "D", label: "8D" },
      { id: "KS", rank: "K", suit: "S", label: "KS" },
      { id: "AC", rank: "A", suit: "C", label: "AC" },
      { id: "5C", rank: "5", suit: "C", label: "5C" }
    ],
    tableBeforeChoice: [],
    tableAfterChoice: [
      { seat: "Left", card: { id: "4C", rank: "4", suit: "C", label: "4C" } },
      { seat: "Tutor", card: { id: "2C", rank: "2", suit: "C", label: "2C" } },
      { seat: "Right", card: { id: "8C", rank: "8", suit: "C", label: "8C" } }
    ],
    pendingBySeat: { Left: "follows lead", Tutor: "partner", Right: "opponent", You: "opening lead" },
    playedExplanations: {
      "9D": "9D says diamonds, but clubs are your strongest plain suit here.",
      "8D": "8D also says diamonds, but clubs are the stronger partnership message.",
      AS: "AS draws trump immediately. That can be a plan, but here it burns control before partner has spoken.",
      KS: "KS also spends trump early. Save it until you know drawing trump helps your side.",
      AC: "AC cashes a plain-suit winner and keeps AS and KS in reserve.",
      "5C": "5C invites clubs, but the ace is the direct cashing play in this example."
    },
    cardOutcomes: {
      "9D": "risky",
      "8D": "risky",
      AS: "risky",
      KS: "risky",
      AC: "good",
      "5C": "risky"
    },
    cardReasons: {
      "9D": "won_clean_trick",
      "8D": "won_clean_trick",
      AS: "off_suit",
      KS: "off_suit",
      AC: "won_clean_trick",
      "5C": "off_suit"
    }
  }
};
const whistOddTrickWinSeventhDrillStep: DrillStep = {
  scenarioId: "whist-odd-trick-seventh",
  contract: "Whist",
  title: "Count odd tricks",
  trick: {
    title: "Win the first odd trick",
    beforeResult: "Your side has six tricks. The next trick is the first scoring trick in Whist.",
    afterResult: "Whist scores tricks above six, so taking the seventh trick matters.",
    emptyExplanation: "Spades are trumps. You are void in hearts and can cut the trick.",
    legalCardIds: ["5S", "QS", "7D"],
    hand: [
      { id: "5S", rank: "5", suit: "S", label: "5S" },
      { id: "QS", rank: "Q", suit: "S", label: "QS" },
      { id: "7D", rank: "7", suit: "D", label: "7D" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "KH", rank: "K", suit: "H", label: "KH" } },
      { seat: "Tutor", card: { id: "3H", rank: "3", suit: "H", label: "3H" } },
      { seat: "Right", card: { id: "AH", rank: "A", suit: "H", label: "AH" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "void: first odd trick" },
    playedExplanations: {
      "5S": "5S is enough trump to win the seventh trick for your side.",
      QS: "QS wins, but it spends a larger trump than this scoring trick needs.",
      "7D": "7D is legal because you are void, but it gives away the first odd trick."
    },
    cardOutcomes: {
      "5S": "good",
      QS: "risky",
      "7D": "risky"
    },
    cardReasons: {
      "5S": "won_clean_trick",
      QS: "won_clean_trick",
      "7D": "void_discard"
    }
  }
};
const whistOddTrickNinthDrillStep: DrillStep = {
  scenarioId: "whist-odd-trick-ninth",
  contract: "Whist",
  title: "Count odd tricks",
  trick: {
    title: "Add another odd trick",
    beforeResult: "Your side has eight tricks. The next trick would be the third point for your partnership.",
    afterResult: "Nine tricks score three odd tricks: every trick above six is a point.",
    emptyExplanation: "Clubs are trumps. You are void in spades and can cut the trick.",
    legalCardIds: ["4C", "JC", "8D"],
    hand: [
      { id: "4C", rank: "4", suit: "C", label: "4C" },
      { id: "JC", rank: "J", suit: "C", label: "JC" },
      { id: "8D", rank: "8", suit: "D", label: "8D" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "QS", rank: "Q", suit: "S", label: "QS" } },
      { seat: "Tutor", card: { id: "5S", rank: "5", suit: "S", label: "5S" } },
      { seat: "Right", card: { id: "AS", rank: "A", suit: "S", label: "AS" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "void: score the ninth" },
    playedExplanations: {
      "4C": "4C is enough trump to win a third odd trick.",
      JC: "JC wins too, but the low trump already scores the point.",
      "8D": "8D is legal because you are void, but it gives away the scoring trick."
    },
    cardOutcomes: {
      "4C": "good",
      JC: "risky",
      "8D": "risky"
    },
    cardReasons: {
      "4C": "won_clean_trick",
      JC: "won_clean_trick",
      "8D": "void_discard"
    }
  }
};
const whistOddTrickPreserveWinnerDrillStep: DrillStep = {
  scenarioId: "whist-odd-trick-preserve",
  contract: "Whist",
  title: "Count odd tricks",
  trick: {
    title: "Protect the next odd trick",
    beforeResult: "Your side already has seven tricks. Partner Barbu is winning this one with AD.",
    afterResult: "Once partner has a trick under control, keep resources for the next odd trick.",
    emptyExplanation: "Clubs are trumps. You are void in diamonds, but partner is already ahead.",
    legalCardIds: ["6C", "KC", "8H"],
    hand: [
      { id: "6C", rank: "6", suit: "C", label: "6C" },
      { id: "KC", rank: "K", suit: "C", label: "KC" },
      { id: "8H", rank: "8", suit: "H", label: "8H" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "10D", rank: "10", suit: "D", label: "10D" } },
      { seat: "Tutor", card: { id: "AD", rank: "A", suit: "D", label: "AD" } },
      { seat: "Right", card: { id: "4D", rank: "4", suit: "D", label: "4D" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "void: partner winning" },
    playedExplanations: {
      "6C": "6C is legal trump, but it is not needed while partner is winning.",
      KC: "KC wastes a high trump on a trick partner already controls.",
      "8H": "8H preserves trumps for the next odd trick."
    },
    cardOutcomes: {
      "6C": "risky",
      KC: "risky",
      "8H": "good"
    },
    cardReasons: {
      "6C": "won_clean_trick",
      KC: "won_clean_trick",
      "8H": "void_discard"
    }
  }
};
export const whistFollowSuitDrillPool = [whistFollowSuitDrillStep, whistFollowSuitLowDrillStep, whistFollowSuitCoverDrillStep];
export const whistTrumpOrDiscardDrillPool = [whistTrumpToWinDrillStep, whistPreserveTrumpDrillStep, whistOvertrumpOpponentDrillStep];
export const whistThirdHandHighDrillPool = [whistThirdHandHighDrillStep, whistThirdHandSaveStrengthDrillStep, whistThirdHandEnoughDrillStep];
export const whistReturnPartnerSuitDrillPool = [
  whistReturnPartnerSuitDrillStep,
  whistReturnPartnerSuitLowDrillStep,
  whistReturnAvoidTrumpDrillStep
];
export const whistOpeningLeadLessonPool = [
  whistOpeningLongSuitLessonStep,
  whistOpeningTopSequenceLessonStep,
  whistOpeningAvoidTrumpLessonStep
];
export const whistOddTrickDrillPool = [whistOddTrickWinSeventhDrillStep, whistOddTrickPreserveWinnerDrillStep, whistOddTrickNinthDrillStep];
