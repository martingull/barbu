import type { GuidedLesson, GuidedTrick } from "../../domain/types";
import { lessonCards } from "./guidedFeedback";

export const noLastTwoGuidedTricks: GuidedTrick[] = [
  {
    title: "Duck the twelfth trick",
    trickNumber: 12,
    beforeResult: "This is trick 12. Left led 7S, Barbu played JS, and Right followed with 3S.",
    afterResult: "The winner of trick 12 takes 10 penalty points.",
    emptyExplanation:
      "Play 2S below JS to avoid the 10-point penalty. QS would win. Each player has two cards left at trick 12.",
    legalCardIds: ["2S", "QS"],
    hand: [
      { id: "2S", rank: "2", suit: "S", label: "2S" },
      { id: "QS", rank: "Q", suit: "S", label: "QS" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
      { seat: "Tutor", card: { id: "JS", rank: "J", suit: "S", label: "JS" } },
      { seat: "Right", card: { id: "3S", rank: "3", suit: "S", label: "3S" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "You" },
    playedExplanations: {
      "2S": "2S follows spades and stays below JS. Barbu wins the trick, so the last-two penalty avoids you.",
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
    trickNumber: 13,
    beforeResult: "This is trick 13. Left led 9C, Barbu played QC, and Right followed with 4C.",
    afterResult: "You win the final trick with AC and take the last-trick penalty.",
    emptyExplanation:
      "The final trick costs 20 points. You have only one card left; earlier decisions determine whether you can escape.",
    legalCardIds: ["AC"],
    hand: [
      { id: "AC", rank: "A", suit: "C", label: "AC" }
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
  },
  {
    title: "A different ending", trickNumber: 12,
    beforeResult: "A new ending, trick 12. You play last in No Last Two. Choose a card.",
    afterResult: "Only the trick winner takes the 10-point penalty.", emptyExplanation: "",
    hand: lessonCards("AD", "3D"), legalCardIds: ["AD", "3D"],
    tableBeforeChoice: [
      { seat: "Left", card: lessonCards("8D")[0] },
      { seat: "Tutor", card: lessonCards("4D")[0] },
      { seat: "Right", card: lessonCards("QD")[0] }
    ], tableAfterChoice: [], pendingBySeat: { You: "You" },
    playedExplanations: {
      "3D": "3D leaves QD winning, so Right takes the 10 points for trick 12. This avoids the current penalty, not a promise about the final trick.",
      AD: "AD overtakes QD and takes the 10-point penalty for trick 12. You could duck this trick with 3D."
    },
    cardOutcomes: { "3D": "good", AD: "penalty" },
    cardReasons: { "3D": "avoided_penalty", AD: "captured_penalty" }
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
