import type { GuidedLesson, GuidedTrick } from "../../domain/types";
import { lessonCards } from "./guidedFeedback";

export const noTricksGuidedTricks: GuidedTrick[] = [
  {
    title: "Duck every trick you can",
    beforeResult: "Barbu led 9C. Right followed with KC.",
    afterResult: "Right keeps control with KC unless you overtake.",
    emptyExplanation:
      "Play 2C below KC. Taking the trick with AC costs 2 points even without hearts or queens. Left will follow with 5C.",
    legalCardIds: ["2C", "AC"],
    hand: [
      { id: "2C", rank: "2", suit: "C", label: "2C" },
      { id: "AC", rank: "A", suit: "C", label: "AC" },
      { id: "7H", rank: "7", suit: "H", label: "7H" }
    ],
    tableBeforeChoice: [
      { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
      { seat: "Right", card: { id: "KC", rank: "K", suit: "C", label: "KC" } }
    ],
    tableAfterChoice: [{ seat: "Left", card: { id: "5C", rank: "5", suit: "C", label: "5C" } }],
    pendingBySeat: { Left: "5C", You: "You" },
    playedExplanations: {
      "2C": "2C follows clubs and stays below KC. Right wins the trick, so you avoid this trick penalty.",
      AC: "AC follows clubs but wins the trick. In No Tricks, winning any trick is a penalty."
    },
    cardOutcomes: {
      "2C": "good",
      AC: "penalty"
    },
    cardReasons: {
      "2C": "avoided_penalty",
      AC: "captured_penalty"
    }
  },
  {
    title: "When the only legal card wins",
    beforeResult: "Left led 4D, Barbu played 8D, and Right followed with 9D.",
    afterResult: "You win with KD. The play is legal, but the trick still counts against you.",
    emptyExplanation:
      "You must follow suit even when every legal choice has a cost.",
    legalCardIds: ["KD"],
    hand: [
      { id: "KD", rank: "K", suit: "D", label: "KD" },
      { id: "3H", rank: "3", suit: "H", label: "3H" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "4D", rank: "4", suit: "D", label: "4D" } },
      { seat: "Tutor", card: { id: "8D", rank: "8", suit: "D", label: "8D" } },
      { seat: "Right", card: { id: "9D", rank: "9", suit: "D", label: "9D" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "You" },
    playedExplanations: {
      KD: "KD is forced by the led suit. It wins this trick, so the penalty is unavoidable at this point."
    },
    cardOutcomes: {
      KD: "penalty"
    },
    cardReasons: {
      KD: "captured_penalty"
    }
  },
  {
    title: "Choose a card yourself",
    beforeResult: "You play last in No Tricks. Choose a card.",
    afterResult: "Every trick won costs 2 points.", emptyExplanation: "",
    hand: lessonCards("4H", "QH", "AC"), legalCardIds: ["4H", "QH"],
    tableBeforeChoice: [
      { seat: "Left", card: lessonCards("5H")[0] },
      { seat: "Tutor", card: lessonCards("JH")[0] },
      { seat: "Right", card: lessonCards("9H")[0] }
    ], tableAfterChoice: [], pendingBySeat: { You: "You" },
    playedExplanations: {
      "4H": "4H stays below JH. Barbu wins and takes the 2-point trick penalty. Hearts do not add extra penalties in No Tricks.",
      QH: "QH wins the trick and costs 2 points. Its rank and suit do not add further penalties in this contract.",
      AC: "Hearts were led and you must follow hearts."
    },
    cardOutcomes: { "4H": "good", QH: "penalty" },
    cardReasons: { "4H": "avoided_penalty", QH: "captured_penalty" }
  }
];

export const noTricksLesson: GuidedLesson = {
  id: "barbu-no-tricks",
  family: "Hearts",
  game: "Barbu",
  contract: "No Tricks",
  title: "Avoid every trick",
  summary: "Every trick you win is a penalty, so duck whenever the suit allows it.",
  tricks: noTricksGuidedTricks
};
