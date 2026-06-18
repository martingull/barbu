import type { GuidedLesson, GuidedTrick } from "../lessonTypes";

export const noLastTwoGuidedTricks: GuidedTrick[] = [
  {
    title: "Duck the twelfth trick",
    beforeResult: "This is trick 12. Left led 7S, Tutor played JS, and Right followed with 3S.",
    afterResult: "Tutor wins with JS and takes this last-two penalty.",
    emptyExplanation:
      "Spades were led. In the final two tricks, winning the trick is the danger, so stay below the current winner when you can.",
    legalCardIds: ["2S", "QS"],
    hand: [
      { id: "2S", rank: "2", suit: "S", label: "2S" },
      { id: "QS", rank: "Q", suit: "S", label: "QS" },
      { id: "5H", rank: "5", suit: "H", label: "5H" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
      { seat: "Tutor", card: { id: "JS", rank: "J", suit: "S", label: "JS" } },
      { seat: "Right", card: { id: "3S", rank: "3", suit: "S", label: "3S" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "You" },
    playedExplanations: {
      "2S": "2S follows spades and stays below JS. Tutor wins the trick, so the last-two penalty avoids you.",
      QS: "QS follows spades but overtakes JS. That wins trick 12, which is exactly what this contract punishes."
    },
    cardOutcomes: {
      "2S": "good",
      QS: "penalty"
    },
    cardReasons: {
      "2S": "avoided_penalty",
      QS: "captured_penalty"
    }
  },
  {
    title: "Forced into the final trick",
    beforeResult: "This is trick 13. Left led 9C, Tutor played QC, and Right followed with 4C.",
    afterResult: "You win the final trick with AC and take the last-trick penalty.",
    emptyExplanation:
      "Clubs were led. AC is your only club, so the penalty is forced. Earlier exits matter in No Last Two.",
    legalCardIds: ["AC"],
    hand: [
      { id: "AC", rank: "A", suit: "C", label: "AC" },
      { id: "6D", rank: "6", suit: "D", label: "6D" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
      { seat: "Tutor", card: { id: "QC", rank: "Q", suit: "C", label: "QC" } },
      { seat: "Right", card: { id: "4C", rank: "4", suit: "C", label: "4C" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "You" },
    playedExplanations: {
      AC: "AC is forced because clubs were led. It wins the final trick, so the penalty is unavoidable now."
    },
    cardOutcomes: {
      AC: "penalty"
    },
    cardReasons: {
      AC: "captured_penalty"
    }
  }
];

export const noLastTwoLesson: GuidedLesson = {
  id: "barbu-no-last-two",
  family: "Hearts",
  game: "Barbu",
  contract: "No Last Two",
  title: "Avoid the final tricks",
  summary: "The last two tricks are the danger; prepare to duck late.",
  tricks: noLastTwoGuidedTricks
};
