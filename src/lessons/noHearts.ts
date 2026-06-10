import type { GuidedTrick } from "../lessonTypes";

export const noHeartsGuidedTricks: GuidedTrick[] = [
  {
    title: "Follow clubs without taking the heart",
    beforeResult: "Tutor led 9C. Left could not follow clubs and discarded 4H.",
    afterResult: "Right wins with AC and takes 1 heart penalty from Left's 4H.",
    emptyExplanation:
      "The led suit is clubs. You hold clubs, so only 2C and KC are legal. The heart belongs to Left, not Tutor.",
    legalCardIds: ["2C", "KC"],
    hand: [
      { id: "2C", rank: "2", suit: "C", label: "2C" },
      { id: "KC", rank: "K", suit: "C", label: "KC" },
      { id: "8H", rank: "8", suit: "H", label: "8H" },
      { id: "QS", rank: "Q", suit: "S", label: "QS" }
    ],
    tableBeforeChoice: [
      { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
      { seat: "Left", card: { id: "4H", rank: "4", suit: "H", label: "4H" } }
    ],
    tableAfterChoice: [{ seat: "Right", card: { id: "AC", rank: "A", suit: "C", label: "AC" } }],
    pendingBySeat: { Right: "AC", You: "You" },
    playedExplanations: {
      "2C": "2C follows clubs and keeps you clear of the trick. Right's AC still wins the heart penalty.",
      KC: "KC follows clubs and cannot beat AC, so it safely leaves your hand while Right absorbs the heart penalty."
    }
  },
  {
    title: "When the winner leads the next trick",
    beforeResult: "Right won the first trick, so Right leads 7S. Tutor and Left both follow spades.",
    afterResult: "You win this trick with QS. No hearts were played, so there is no penalty.",
    emptyExplanation:
      "Spades were led. You still have QS, so you must follow spades even though it wins this harmless trick.",
    legalCardIds: ["QS"],
    hand: [
      { id: "2C", rank: "2", suit: "C", label: "2C" },
      { id: "8H", rank: "8", suit: "H", label: "8H" },
      { id: "QS", rank: "Q", suit: "S", label: "QS" }
    ],
    tableBeforeChoice: [
      { seat: "Right", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
      { seat: "Tutor", card: { id: "JS", rank: "J", suit: "S", label: "JS" } },
      { seat: "Left", card: { id: "3S", rank: "3", suit: "S", label: "3S" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "You" },
    playedExplanations: {
      QS: "QS is the only legal card because spades were led. Winning is acceptable here because the trick contains no hearts."
    }
  }
];
