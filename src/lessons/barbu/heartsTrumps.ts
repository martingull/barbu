import type { GuidedLesson, GuidedTrick } from "../../domain/types";
import { lessonCards } from "./guidedFeedback";

export const heartsTrumpsGuidedTricks: GuidedTrick[] = [
  {
    title: "Trump when you are void",
    beforeResult: "Barbu led 9C. Right followed with AC. You have no clubs.",
    afterResult: "A heart can beat the led clubs when you are void.",
    emptyExplanation:
      "You have no clubs. Play 5H or 7H to trump AC and win 5 points. Left will discard 4D; a plain-suit discard cannot win.",
    legalCardIds: ["5H", "7H", "2D", "KS"],
    hand: [
      { id: "2D", rank: "2", suit: "D", label: "2D" },
      { id: "5H", rank: "5", suit: "H", label: "5H" },
      { id: "7H", rank: "7", suit: "H", label: "7H" },
      { id: "KS", rank: "K", suit: "S", label: "KS" }
    ],
    tableBeforeChoice: [
      { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
      { seat: "Right", card: { id: "AC", rank: "A", suit: "C", label: "AC" } }
    ],
    tableAfterChoice: [{ seat: "Left", card: { id: "4D", rank: "4", suit: "D", label: "4D" } }],
    pendingBySeat: { Left: "4D", You: "You" },
    playedExplanations: {
      "5H": "5H is trump and wins because you are void in clubs.",
      "7H": "7H is trump and wins because you are void in clubs.",
      "2D": "2D is legal because you are void, but it does not win the trick.",
      KS: "KS is legal because you are void, but it does not win the trick."
    },
    cardOutcomes: {
      "5H": "good",
      "7H": "good",
      "2D": "risky",
      KS: "risky"
    },
    cardReasons: {
      "5H": "won_clean_trick",
      "7H": "won_clean_trick",
      "2D": "void_discard",
      KS: "void_discard"
    }
  },
  {
    title: "Follow before trumping",
    beforeResult: "Clubs were led. You play last in Hearts Trumps. Try to win this trick.",
    afterResult: "Having trumps does not remove the obligation to follow suit.",
    emptyExplanation: "Check whether you hold the led suit before considering a trump.",
    hand: lessonCards("AC", "2C", "KH"), legalCardIds: ["AC", "2C"],
    tableBeforeChoice: [
      { seat: "Left", card: lessonCards("4C")[0] },
      { seat: "Tutor", card: lessonCards("QC")[0] },
      { seat: "Right", card: lessonCards("KC")[0] }
    ], tableAfterChoice: [], pendingBySeat: { You: "You" },
    playedExplanations: {
      AC: "AC follows clubs and wins 5 points. You do not need to trump to win a trick.",
      "2C": "Legal, but KC keeps the trick and Right gets the 5 points. Your ace could win it.",
      KH: "You have clubs, so KH cannot be played yet. Follow suit before using a trump."
    },
    cardOutcomes: { AC: "good", "2C": "risky" },
    cardReasons: { AC: "won_clean_trick", "2C": "followed_suit" }
  },
  {
    title: "Read the winner",
    beforeResult: "You play last in Hearts Trumps. Which card wins this trick?",
    afterResult: "The highest trump beats every card in the led suit.", emptyExplanation: "",
    hand: lessonCards("5H", "JH", "8C"), legalCardIds: ["5H", "JH", "8C"],
    tableBeforeChoice: [
      { seat: "Left", card: lessonCards("AS")[0] },
      { seat: "Tutor", card: lessonCards("7H")[0] },
      { seat: "Right", card: lessonCards("3S")[0] }
    ], tableAfterChoice: [], pendingBySeat: { You: "You" },
    playedExplanations: {
      JH: "JH beats Barbu's 7H and wins 5 points. A trump was already winning, so you needed a higher trump.",
      "5H": "5H is legal but lower than 7H. Barbu keeps the trick; spending a trump is not enough to win it.",
      "8C": "8C is legal because you have no spades, but cannot beat the trump. JH could win this trick."
    },
    cardOutcomes: { JH: "good", "5H": "risky", "8C": "risky" },
    cardReasons: { JH: "won_clean_trick", "5H": "void_discard", "8C": "void_discard" }
  }
];

export const heartsTrumpsLesson: GuidedLesson = {
  id: "barbu-hearts-trumps",
  family: "Hearts",
  game: "Barbu",
  contract: "Hearts Trumps",
  title: "Use the trump suit",
  summary: "When hearts are trumps, a heart can win after you are void in the led suit.",
  tricks: heartsTrumpsGuidedTricks
};
