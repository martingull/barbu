import type { BridgeVulnerability, Seat, Card, Suit } from "../../domain/types";

import { bridgeBidById, type BridgeCallOption } from "../../domain/bridgeAuction";
import type { DrillStep } from "../drillDecision";

const card = (rank: string, suit: Suit): Card => ({ id: rank + suit, rank, suit, label: rank + suit });

export const bridgeContractSteps = [
  { bid: "1H", title: "A partnership target", hint: "The first six tricks are the base. Add the level: 6 + 1 = 7. Hearts are trump.", options: ["1", "7", "13"] },
  { bid: "3NT", title: "No trump", hint: "Add the level to six. NT means no suit is trump.", options: ["3", "6", "9"] },
  { bid: "4S", title: "Read your contract", hint: "", options: ["4", "9", "10"] }
].map(step => ({ ...step, contract: bridgeBidById(step.bid) }));

export const bridgeDummyDrillPool: DrillStep[] = [
  {
    scenarioId: "bridge-dummy-follow", contract: "Bridge", title: "Play from North",
    playingSeat: "Tutor", handLabel: "North dummy: choose a card",
    referenceHand: { label: "South declarer", cards: [card("5", "H"), card("7", "C"), card("8", "D")] },
    trick: {
      title: "Dummy follows suit", beforeResult: "South declares 1NT. West leads a heart. North dummy plays next: choose a heart from North's cards.",
      emptyExplanation: "These are reduced hands. South controls dummy, but cannot substitute a card from South's own hand.",
      afterResult: "North followed hearts from its own hand.",
      hand: [card("A", "H"), card("2", "H"), card("4", "C")], legalCardIds: ["AH", "2H"],
      tableBeforeChoice: [{ seat: "Left", card: card("K", "H") }],
      tableAfterChoice: [{ seat: "Right", card: card("3", "H") }, { seat: "You", card: card("5", "H") }],
      pendingBySeat: { Tutor: "North Dummy", You: "South Declarer", Left: "West Defender", Right: "East Defender" },
      playedExplanations: { AH: "Good. North follows with its own heart. Declarer chose it for dummy.", "2H": "Good. North follows with its own heart. Both hearts obey the rule; this decision is about the active hand.", "4C": "Illegal. North has hearts, so dummy must follow hearts." },
      cardOutcomes: { AH: "good", "2H": "good" }
    }
  },
  {
    scenarioId: "bridge-dummy-void", contract: "Bridge", title: "Separate hands",
    playingSeat: "Tutor", handLabel: "North dummy: choose a card",
    referenceHand: { label: "South declarer", cards: [card("A", "H"), card("3", "C"), card("4", "S")] },
    trick: {
      title: "Separate hands", beforeResult: "West leads a heart in 1NT. Choose a legal card from North dummy, using the two hands shown.",
      emptyExplanation: "Follow-suit applies to the hand playing, not to the combined cards of the partnership.",
      afterResult: "North can discard; South must still follow hearts on South's turn.",
      hand: [card("2", "C"), card("4", "D"), card("5", "S")], legalCardIds: ["2C", "4D", "5S"],
      tableBeforeChoice: [{ seat: "Left", card: card("7", "H") }],
      tableAfterChoice: [{ seat: "Right", card: card("Q", "H") }, { seat: "You", card: card("A", "H") }],
      pendingBySeat: { Tutor: "North Dummy", You: "South Declarer", Left: "West Defender", Right: "East Defender" },
      playedExplanations: Object.fromEntries(["2C", "4D", "5S"].map(id => [id, "Good. North is void in hearts and may discard any of these cards. South's ace does not change North's obligation."])),
      cardOutcomes: { "2C": "good", "4D": "good", "5S": "good" },
      cardReasons: { "2C": "void_discard", "4D": "void_discard", "5S": "void_discard" }
    }
  },
  {
    scenarioId: "bridge-declarer-turn", contract: "Bridge", title: "South's turn",
    playingSeat: "You", handLabel: "South declarer: choose a card",
    referenceHand: { label: "North dummy", cards: [card("4", "C"), card("6", "S")] },
    trick: {
      title: "Win from the active hand", beforeResult: "In 1NT, North has led a diamond and East played the king. It is South's turn. Which card secures this trick?",
      emptyExplanation: "", afterResult: "The turn has moved from dummy to South after East's play.",
      hand: [card("A", "D"), card("2", "D"), card("8", "C")], legalCardIds: ["AD", "2D"],
      tableBeforeChoice: [{ seat: "Tutor", card: card("3", "D") }, { seat: "Right", card: card("K", "D") }],
      tableAfterChoice: [{ seat: "Left", card: card("4", "D") }],
      pendingBySeat: { Tutor: "North Dummy", You: "South Declarer", Left: "West Defender", Right: "East Defender" },
      playedExplanations: { AD: "Good. South's ace beats the king in no trump. It is played from South, not from North dummy.", "2D": "Legal, but East's king keeps the trick. South's ace could win it.", "8C": "Illegal. South has diamonds and must follow suit." },
      cardOutcomes: { AD: "good", "2D": "risky" }, cardReasons: { AD: "won_clean_trick", "2D": "followed_suit" }
    }
  }
];

const bridgeFinesseDrillStep: DrillStep = {
  scenarioId: "bridge-finesse-low-toward-honor",
  contract: "Bridge",
  title: "Try the queen",
  handLabel: "South declarer: choose a card",
  referenceHand: { label: "North dummy (excerpt)", cards: [card("3", "C"), card("6", "C"), card("8", "C"), card("2", "D")] },
  trick: {
    title: "Try the finesse",
    beforeResult: "In 1NT, North dummy leads a small club and East follows low. Try your queen, keeping the ace, to finesse against East's possible king.",
    afterResult: "A low lead toward honors is the basic finesse shape in declarer play.",
    emptyExplanation: "A finesse risks the queen to keep the ace for another trick. It succeeds when East holds the king.",
    legalCardIds: ["AC", "QC", "7C"],
    hand: [card("A", "C"), card("Q", "C"), card("7", "C"), card("7", "D")],
    tableBeforeChoice: [{ seat: "Tutor", card: card("3", "C") }, { seat: "Right", card: card("5", "C") }],
    tableAfterChoice: [
      { seat: "Left", card: card("J", "C") }
    ],
    pendingBySeat: { Tutor: "North Dummy", Right: "East", You: "South", Left: "West" },
    playedExplanations: {
      QC: "Good. West plays the jack, so the queen wins and the ace remains. This finesse would lose if West held the king; it is a chance for an extra trick, not a guarantee.",
      AC: "Legal and it wins, but you spend the ace without testing whether the queen can win a separate trick.",
      "7C": "Risky. West's jack beats the seven. Trying the queen would win this trick while keeping the ace for later.",
      "7D": "Illegal. Clubs were led and you can follow clubs."
    },
    cardOutcomes: { QC: "good", AC: "risky", "7C": "risky" },
    cardReasons: { QC: "won_clean_trick", AC: "won_clean_trick", "7C": "followed_suit", "7D": "off_suit" }
  }
};
const bridgeEstablishSuitDrillStep: DrillStep = {
  scenarioId: "bridge-establish-long-suit",
  contract: "Bridge",
  title: "Establish the long suit",
  handLabel: "South declarer: choose a card",
  referenceHand: { label: "North dummy (excerpt)", cards: [card("10", "D"), card("9", "D"), card("8", "D"), card("6", "D"), card("3", "D")] },
  tableAfterByCard: {
    "4S": [{ seat: "Left", card: card("A", "S") }, { seat: "Tutor", card: card("2", "S") }, { seat: "Right", card: card("3", "S") }]
  },
  trick: {
    title: "Force out the ace",
    beforeResult: "You need extra tricks in 1NT. Diamonds have not been played. Which lead starts developing dummy's long suit?",
    afterResult: "Declarer often gives up one trick early to establish a long suit for later winners.",
    emptyExplanation: "These are excerpts. Look for a suit with length in dummy and touching honors in South. You may need to concede a trick before collecting winners.",
    legalCardIds: ["KD", "QD", "JD", "4S"],
    hand: [card("K", "D"), card("Q", "D"), card("J", "D"), card("4", "S")],
    tableBeforeChoice: [],
    tableAfterChoice: [
      { seat: "Left", card: card("A", "D") },
      { seat: "Tutor", card: card("3", "D") },
      { seat: "Right", card: card("7", "D") }
    ],
    pendingBySeat: { You: "South", Left: "West", Tutor: "North Dummy", Right: "East" },
    playedExplanations: {
      KD: "Good. West takes the ace in this line, promoting your remaining diamonds. Losing this trick develops later winners; keep a way to reach dummy's long suit.",
      QD: "Good. West takes the ace in this line. The king, queen and jack are touching honors, so any starts developing diamonds. A defender could instead delay taking the ace.",
      JD: "Good. West takes the ace in this line. The touching honors do the same job: start developing diamonds. A defender could instead delay taking the ace.",
      "4S": "Legal, but West wins with the spade ace and the diamond ace is still outstanding. A diamond honor would start developing your long suit."
    },
    cardOutcomes: { KD: "good", QD: "good", JD: "good", "4S": "risky" },
    cardReasons: { KD: "followed_suit", QD: "followed_suit", JD: "followed_suit", "4S": "followed_suit" }
  }
};
const bridgeUnblockDrillStep: DrillStep = {
  scenarioId: "bridge-unblock-dummy",
  contract: "Bridge",
  title: "Reach the remaining winners",
  handLabel: "South declarer: choose a card",
  referenceHand: { label: "North dummy (all remaining cards)", cards: [card("A", "H"), card("Q", "H"), card("3", "H")] },
  trick: {
    title: "Plan the last three tricks",
    beforeResult: "In 3NT, you have six tricks and three remain. Hearts J through 6 are gone; South's diamond is a loser. North leads the ace. Which card keeps all three tricks available?",
    afterResult: "A high card can block access to winners in the other hand.",
    emptyExplanation: "",
    legalCardIds: ["KH", "2H"],
    hand: [card("K", "H"), card("2", "H"), card("4", "D")],
    tableBeforeChoice: [
      { seat: "Tutor", card: card("A", "H") },
      { seat: "Right", card: card("4", "H") }
    ],
    tableAfterChoice: [{ seat: "Left", card: card("5", "H") }],
    pendingBySeat: { You: "South Declarer", Tutor: "North Dummy", Right: "East Defender", Left: "West Defender" },
    playedExplanations: {
      KH: "Good. Let the king go under the ace. Next, play South's two under North's queen. North then leads the three, now a winner. That is three tricks for 3NT.",
      "2H": "Legal, but the king is now South's only heart. It must overtake North's queen next, leaving South on lead with a losing diamond and no way to reach North's three.",
      "4D": "Illegal. South has hearts and must follow suit."
    },
    cardOutcomes: { KH: "good", "2H": "risky" },
    cardReasons: { KH: "followed_suit", "2H": "followed_suit", "4D": "off_suit" }
  }
};
const bridgeOpeningLeadDrillStep: DrillStep = {
  scenarioId: "bridge-defense-fourth-best",
  contract: "Bridge",
  title: "Lead fourth best",
  handLabel: "South defender: choose a card",
  tableAfterByCard: {
    QD: [{ seat: "Left", card: card("2", "D") }, { seat: "Tutor", card: card("A", "D") }, { seat: "Right", card: card("3", "D") }]
  },
  trick: {
    title: "Defend 1NT",
    beforeResult: "East declares 1NT. Your partnership leads fourth best from a long suit without a top sequence. From K-J-8-4 of spades, lead the four.",
    afterResult: "Lead agreements help partner interpret the card, but depend on the holding and auction.",
    emptyExplanation: "Only relevant cards are shown; spades are your longest suit. Dummy is not exposed until after your opening lead.",
    legalCardIds: ["KS", "JS", "8S", "4S", "QD"],
    hand: [card("K", "S"), card("J", "S"), card("8", "S"), card("4", "S"), card("Q", "D")],
    tableBeforeChoice: [],
    tableAfterChoice: [
      { seat: "Left", card: card("2", "S") },
      { seat: "Tutor", card: card("A", "S") },
      { seat: "Right", card: card("6", "S") }
    ],
    pendingBySeat: { You: "South Defender", Tutor: "North Partner", Right: "East Declarer", Left: "West Dummy" },
    playedExplanations: {
      "4S": "Good. Fourth best starts your long suit without spending the king.",
      KS: "Legal, but partner's ace wins over your king. The agreed low lead preserves your honor for later.",
      JS: "Legal, but partner's ace wins over your jack. The four follows your fourth-best agreement without spending an honor.",
      "8S": "Legal, but the eight is third best here. The four communicates the agreed lead from length.",
      QD: "Legal. Partner wins with the diamond ace in this line, but you have spent the queen without starting your long spades."
    },
    cardOutcomes: { "4S": "good", KS: "risky", JS: "risky", "8S": "risky", QD: "risky" },
    cardReasons: { "4S": "followed_suit", KS: "followed_suit", JS: "followed_suit", "8S": "followed_suit", QD: "followed_suit" }
  }
};
export const bridgeDeclarerDrillPool = [bridgeFinesseDrillStep, bridgeEstablishSuitDrillStep, bridgeUnblockDrillStep];
const bridgeThirdHandDrillStep: DrillStep = {
  scenarioId: "bridge-defense-third-hand", contract: "Bridge", title: "Third hand high",
  handLabel: "South defender: choose a card",
  referenceHand: { label: "East dummy (excerpt)", cards: [card("8", "S"), card("6", "S"), card("2", "D")] },
  tableAfterByCard: {
    JS: [{ seat: "Left", card: card("Q", "S") }],
    "3S": [{ seat: "Left", card: card("2", "S") }]
  },
  trick: {
    title: "Help partner's lead",
    beforeResult: "North leads a low spade against West's 1NT. East dummy plays the eight. Which card best supports partner's lead?",
    afterResult: "Third hand usually plays high when partner's low lead is not winning.",
    emptyExplanation: "Partner's low card is not winning. Consider how cheaply declarer could beat each of your cards.",
    hand: [card("K", "S"), card("J", "S"), card("3", "S"), card("6", "D")],
    legalCardIds: ["KS", "JS", "3S"],
    tableBeforeChoice: [{ seat: "Tutor", card: card("4", "S") }, { seat: "Right", card: card("8", "S") }],
    tableAfterChoice: [{ seat: "Left", card: card("A", "S") }],
    pendingBySeat: { You: "South Defender", Tutor: "North Partner", Right: "East Dummy", Left: "West Declarer" },
    playedExplanations: {
      KS: "Good. The king forces out the ace and can establish partner's remaining spades.",
      JS: "Risky. West takes your jack with the queen and keeps the ace. The king would make West spend the ace instead.",
      "3S": "Risky. West follows low and dummy's eight wins. The king would make declarer spend an honor to win this trick.",
      "6D": "Illegal. Spades were led and you can follow spades."
    },
    cardOutcomes: { KS: "good", JS: "risky", "3S": "risky" },
    cardReasons: { KS: "followed_suit", JS: "followed_suit", "3S": "followed_suit", "6D": "off_suit" }
  }
};
const bridgePartnerWinnerDrillStep: DrillStep = {
  scenarioId: "bridge-defense-partner-winner", contract: "Bridge", title: "Keep partner's winner",
  handLabel: "South defender: choose a card",
  referenceHand: { label: "East dummy (excerpt)", cards: [card("4", "C"), card("6", "C"), card("7", "D")] },
  trick: {
    title: "Save your ace",
    beforeResult: "Against West's 1NT, North plays the king on West's club lead and East follows low. You play last. Which card keeps the most partnership winners?",
    afterResult: "When partner already wins and you play last, there is no need to overtake without a specific plan.",
    emptyExplanation: "",
    hand: [card("A", "C"), card("2", "C"), card("9", "D")], legalCardIds: ["AC", "2C"],
    tableBeforeChoice: [{ seat: "Left", card: card("3", "C") }, { seat: "Tutor", card: card("K", "C") }, { seat: "Right", card: card("4", "C") }],
    tableAfterChoice: [],
    pendingBySeat: { You: "South Defender", Tutor: "North Partner", Right: "East Dummy", Left: "West Declarer" },
    playedExplanations: { "2C": "Good. Partner wins this trick and your ace remains available.", AC: "Risky. Overtaking spends two partnership winners on one trick.", "9D": "Illegal. Clubs were led and you can follow clubs." },
    cardOutcomes: { "2C": "good", AC: "risky" },
    cardReasons: { "2C": "followed_suit", AC: "won_clean_trick", "9D": "off_suit" }
  }
};
export const bridgeDefenseDrillPool = [bridgeOpeningLeadDrillStep, bridgeThirdHandDrillStep, bridgePartnerWinnerDrillStep];

type BridgeBiddingPracticeStep = {
  id: string;
  title: string;
  prompt: string;
  hint: string;
  hand: Card[];
  dealer: Seat;
  vulnerability: BridgeVulnerability;
  options: BridgeCallOption[];
  correctCall: BridgeCallOption;
  explanations: Partial<Record<BridgeCallOption, string>>;
};

export const bridgeBiddingPracticeSteps: BridgeBiddingPracticeStep[] = [
  {
    id: "bridge-bid-pass-light-balanced",
    title: "Pass a light hand",
    prompt: "You are South, the dealer, with 8 HCP and no long suit. Pass this hand: it is below opening strength in basic natural bidding.",
    hint: "Count A = 4, K = 3, Q = 2, J = 1. The ace and two queens total eight points.",
    hand: [
      card("3", "C"),
      card("5", "C"),
      card("10", "C"),
      card("Q", "C"),
      card("5", "D"),
      card("7", "D"),
      card("Q", "D"),
      card("A", "D"),
      card("7", "S"),
      card("9", "S"),
      card("2", "H"),
      card("3", "H"),
      card("10", "H")
    ],
    dealer: "You",
    vulnerability: "NS",
    options: ["Pass", "1C", "1D", "1NT"],
    correctCall: "Pass",
    explanations: {
      Pass: "Good. 8 HCP balanced is below opening strength, so pass.",
      "1C": "Risky. Better-minor openings still need opening strength.",
      "1D": "Risky. Four diamonds does not make this an opening bid.",
      "1NT": "1NT shows 15-17 balanced, not 8."
    }
  },
  {
    id: "bridge-bid-one-notrump",
    title: "Describe strength and shape",
    prompt: "You are South, the dealer. Which opening describes this hand's strength and shape?",
    hint: "A 4-3-3-3 hand is balanced. Compare the point total with the 15-17 range for 1NT.",
    hand: [
      card("A", "C"),
      card("Q", "C"),
      card("4", "C"),
      card("K", "D"),
      card("8", "D"),
      card("3", "D"),
      card("Q", "H"),
      card("9", "H"),
      card("5", "H"),
      card("A", "S"),
      card("J", "S"),
      card("6", "S"),
      card("2", "S")
    ],
    dealer: "You",
    vulnerability: "None",
    options: ["Pass", "1C", "1S", "1NT"],
    correctCall: "1NT",
    explanations: {
      Pass: "Too cautious. 16 HCP balanced is a normal opening hand.",
      "1C": "Legal shape, but 1NT describes 15-17 balanced much better.",
      "1S": "Do not open a four-card major in this system.",
      "1NT": "Good. 15-17 balanced opens 1NT."
    }
  },
  {
    id: "bridge-bid-five-card-major",
    title: "Your opening decision",
    prompt: "You are South and the dealer. Which opening describes your strength and shape in basic natural bidding?",
    hint: "",
    hand: [
      card("A", "S"),
      card("K", "S"),
      card("Q", "S"),
      card("3", "S"),
      card("2", "S"),
      card("A", "H"),
      card("4", "H"),
      card("7", "D"),
      card("6", "D"),
      card("5", "D"),
      card("8", "C"),
      card("6", "C"),
      card("2", "C")
    ],
    dealer: "You",
    vulnerability: "EW",
    options: ["Pass", "1C", "1NT", "1S"],
    correctCall: "1S",
    explanations: {
      Pass: "Too cautious. 13 HCP with a five-card major opens.",
      "1C": "The club suit is not the message. Show the five-card major first.",
      "1NT": "1NT needs a balanced 15-17 HCP hand.",
      "1S": "Good. A-K-Q of spades and the heart ace total 13 HCP. With opening strength and five spades, open 1S."
    }
  }
];
