import type { GuidedLesson, GuidedTrick } from "../lessonTypes";

export const heartsTrumpsGuidedTricks: GuidedTrick[] = [
  {
    title: "Trump when you are void",
    beforeResult: "Tutor led 9C. Right followed with AC. You have no clubs.",
    afterResult: "You trump with 5H and win the trick. Hearts outrank the led suit in this contract.",
    emptyExplanation:
      "Clubs were led, but you are void. In Hearts Trumps, a heart can cut the trick and take control.",
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
