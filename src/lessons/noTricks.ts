import type { GuidedLesson, GuidedTrick } from "../lessonTypes";

export const noTricksGuidedTricks: GuidedTrick[] = [
  {
    title: "Duck every trick you can",
    beforeResult: "Tutor led 9C. Right followed with KC.",
    afterResult: "Right keeps control with KC unless you overtake.",
    emptyExplanation:
      "Clubs were led. In No Tricks, every trick you win scores against you, so low legal cards are valuable.",
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
    beforeResult: "Left led 4D, Tutor played 8D, and Right followed with 9D.",
    afterResult: "You win with KD. The play is legal, but the trick still counts against you.",
    emptyExplanation:
      "Diamonds were led. KD is your only diamond, so it is forced even though it wins the trick.",
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
