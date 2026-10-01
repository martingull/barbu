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
      title: "Dummy has no hearts", beforeResult: "West leads a heart in 1NT. North has no hearts, but South does. Choose a legal card from North dummy.",
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
      { seat: "Left", card: card("4", "C") }
    ],
    pendingBySeat: { Tutor: "North Dummy", Right: "East", You: "South", Left: "West" },
    playedExplanations: {
      QC: "Good. The queen wins this round while you retain the ace. East could not win cheaply with the king after playing low.",
      AC: "Risky. The ace wins but spends your sure entry without trying the finesse.",
      "7C": "Risky. The seven happens to win this round, but would lose to a higher spot card in West's hand.",
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
  trick: {
    title: "Force out the ace",
    beforeResult: "You need extra tricks in 1NT. Lead the king to drive out the ace and set up dummy's diamonds.",
    afterResult: "Declarer often gives up one trick early to establish a long suit for later winners.",
    emptyExplanation: "Only the relevant cards are shown. South's KQJ faces five diamonds in dummy; start the sequence to force out the ace.",
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
      KD: "Good. The king starts the work of knocking out the ace so the suit can run later.",
      QD: "Good. The queen also forces out the ace; the touching honors are equivalent here. Leading the king makes the sequence clearest.",
      JD: "Good. The jack also forces out the ace; the touching honors are equivalent here. Leading the king makes the sequence clearest.",
      "4S": "Legal, but it ignores the long diamond source of tricks."
    },
    cardOutcomes: { KD: "good", QD: "good", JD: "good", "4S": "risky" },
    cardReasons: { KD: "won_clean_trick", QD: "won_clean_trick", JD: "won_clean_trick", "4S": "void_discard" }
  }
};
const bridgeHoldUpDrillStep: DrillStep = {
  scenarioId: "bridge-hold-up-notrump",
  contract: "Bridge",
  title: "Hold up once",
  handLabel: "South declarer: choose a card",
  referenceHand: { label: "North dummy (excerpt)", cards: [card("7", "H"), card("3", "H"), card("J", "C"), card("6", "D")] },
  trick: {
    title: "Break defender communication",
    beforeResult: "West leads a long-suit king in 1NT. Duck the first round to make the defenders spend an entry.",
    afterResult: "Holding up can cut communication between defenders in no-trump contracts.",
    emptyExplanation: "In no trump, you do not always take the first winner. Sometimes you duck to exhaust one defender's suit.",
    legalCardIds: ["4H", "AH"],
    hand: [card("A", "H"), card("4", "H"), card("Q", "C"), card("8", "S")],
    tableBeforeChoice: [
      { seat: "Left", card: card("K", "H") },
      { seat: "Tutor", card: card("7", "H") },
      { seat: "Right", card: card("2", "H") }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "South", Tutor: "North Dummy", Right: "East" },
    playedExplanations: {
      "4H": "Good. Ducking once can leave the defense without an easy way back to the long hearts.",
      AH: "Risky. Taking immediately may leave West's long hearts live if East still has an entry.",
      QC: "Illegal. Hearts were led and you still have hearts.",
      "8S": "Illegal. Hearts were led and you still have hearts."
    },
    cardOutcomes: { "4H": "good", AH: "risky" },
    cardReasons: { "4H": "followed_suit", AH: "won_clean_trick", QC: "off_suit", "8S": "off_suit" }
  }
};
const bridgeOpeningLeadDrillStep: DrillStep = {
  scenarioId: "bridge-defense-fourth-best",
  contract: "Bridge",
  title: "Lead fourth best",
  trick: {
    title: "Defend 1NT",
    beforeResult: "Against 1NT, lead from your longest useful suit. Choose the fourth-best spade.",
    afterResult: "A fourth-best lead from length is a standard no-trump defensive habit.",
    emptyExplanation: "No-trump defense often starts by building tricks in the longest suit.",
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
      KS: "Risky. The king may give declarer a clear read and spend your stopper early.",
      JS: "Risky. The jack is not the standard lead from this holding.",
      "8S": "Risky. The eight muddies partner's count and attitude read.",
      QD: "Legal, but it abandons your longest suit."
    },
    cardOutcomes: { "4S": "good", KS: "risky", JS: "risky", "8S": "risky", QD: "risky" },
    cardReasons: { "4S": "won_clean_trick", KS: "won_clean_trick", JS: "won_clean_trick", "8S": "won_clean_trick", QD: "void_discard" }
  }
};
export const bridgeDeclarerDrillPool = [bridgeFinesseDrillStep, bridgeEstablishSuitDrillStep, bridgeHoldUpDrillStep];
const bridgeThirdHandDrillStep: DrillStep = {
  scenarioId: "bridge-defense-third-hand", contract: "Bridge", title: "Third hand high",
  trick: {
    title: "Help partner's lead",
    beforeResult: "North leads a low spade against West's 1NT. East dummy plays the eight. Play high enough to make declarer spend an honor.",
    afterResult: "Third hand usually plays high when partner's low lead is not winning.",
    emptyExplanation: "North is your partner; East is dummy and West declares.",
    hand: [card("K", "S"), card("J", "S"), card("3", "S"), card("6", "D")],
    legalCardIds: ["KS", "JS", "3S"],
    tableBeforeChoice: [{ seat: "Tutor", card: card("4", "S") }, { seat: "Right", card: card("8", "S") }],
    tableAfterChoice: [{ seat: "Left", card: card("A", "S") }],
    pendingBySeat: { You: "South Defender", Tutor: "North Partner", Right: "East Dummy", Left: "West Declarer" },
    playedExplanations: {
      KS: "Good. The king forces out the ace and can establish partner's remaining spades.",
      JS: "Risky. The jack could let declarer win cheaply with the queen.",
      "3S": "Risky. Playing low leaves dummy's eight winning before declarer plays.",
      "6D": "Illegal. Spades were led and you can follow spades."
    },
    cardOutcomes: { KS: "good", JS: "risky", "3S": "risky" },
    cardReasons: { KS: "followed_suit", JS: "followed_suit", "3S": "followed_suit", "6D": "off_suit" }
  }
};
const bridgePartnerWinnerDrillStep: DrillStep = {
  scenarioId: "bridge-defense-partner-winner", contract: "Bridge", title: "Keep partner's winner",
  trick: {
    title: "Save your ace",
    beforeResult: "West leads a club, North partner plays the king, and East dummy follows low. You play last: keep the ace for another trick.",
    afterResult: "When partner already wins and you play last, there is no need to overtake without a specific plan.",
    emptyExplanation: "North is winning. Follow low and preserve your ace.",
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
    prompt: "You are South with 8 HCP and no six-card preempt. In basic natural bidding, do not open just because you like the shape.",
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
    title: "Open 1NT",
    prompt: "You are South with 16 HCP and a balanced hand. Show the range immediately.",
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
      "1S": "Good. With opening strength and five spades, open 1S."
    }
  }
];
