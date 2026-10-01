import type { GuidedLesson, GuidedTrick } from "../../domain/types";
import { lessonCards } from "./guidedFeedback";

export const noHeartsGuidedTricks: GuidedTrick[] = [
  {
    title: "Follow clubs without taking the heart",
    beforeResult: "Barbu led 9C. Right could not follow clubs and discarded 4H.",
    afterResult: "Left wins with AC and takes 2 heart penalty points from Right's 4H.",
    emptyExplanation:
      "Follow clubs with 2C or KC. In this example Left will play AC next, so either club leaves the heart penalty to Left.",
    legalCardIds: ["2C", "KC"],
    hand: [
      { id: "2C", rank: "2", suit: "C", label: "2C" },
      { id: "KC", rank: "K", suit: "C", label: "KC" },
      { id: "8H", rank: "8", suit: "H", label: "8H" },
      { id: "QS", rank: "Q", suit: "S", label: "QS" }
    ],
    tableBeforeChoice: [
      { seat: "Tutor", card: { id: "9C", rank: "9", suit: "C", label: "9C" } },
      { seat: "Right", card: { id: "4H", rank: "4", suit: "H", label: "4H" } }
    ],
    tableAfterChoice: [{ seat: "Left", card: { id: "AC", rank: "A", suit: "C", label: "AC" } }],
    pendingBySeat: { Left: "AC", You: "You" },
    playedExplanations: {
      "2C": "2C follows clubs and keeps you clear of the trick. Left's AC still wins the heart penalty.",
      KC: "KC follows clubs and cannot beat AC, so it safely leaves your hand while Left absorbs the heart penalty."
    },
    cardOutcomes: {
      "2C": "good",
      KC: "good"
    },
    cardReasons: {
      "2C": "avoided_penalty",
      KC: "avoided_penalty"
    }
  },
  {
    title: "When the winner leads the next trick",
    beforeResult: "A new position: Left leads 7S. Barbu and Right both follow spades. You play last.",
    afterResult: "You win this trick with QS. No hearts were played, so there is no penalty.",
    emptyExplanation:
      "Follow the led suit. Check which cards actually score penalties in No Hearts.",
    legalCardIds: ["QS"],
    hand: [
      { id: "2C", rank: "2", suit: "C", label: "2C" },
      { id: "8H", rank: "8", suit: "H", label: "8H" },
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
      QS: "QS is the only legal card because spades were led. Winning is acceptable here because the trick contains no hearts."
    },
    cardOutcomes: {
      QS: "good"
    },
    cardReasons: {
      QS: "won_clean_trick"
    }
  },
  {
    title: "Read the penalty yourself",
    beforeResult: "You play last in No Hearts. Which card avoids the penalty?",
    afterResult: "The winner takes any heart points in this trick.", emptyExplanation: "",
    hand: lessonCards("2D", "AD", "KH"), legalCardIds: ["2D", "AD"],
    tableBeforeChoice: [
      { seat: "Left", card: lessonCards("7D")[0] },
      { seat: "Tutor", card: lessonCards("AH")[0] },
      { seat: "Right", card: lessonCards("KD")[0] }
    ], tableAfterChoice: [], pendingBySeat: { You: "You" },
    playedExplanations: {
      "2D": "2D stays below KD. Right takes the ace of hearts, worth 6 penalty points in Barbu.",
      AD: "AD wins the trick and captures AH. The ace of hearts costs 6 points, not the usual 2 for a heart.",
      KH: "You still have diamonds and must follow suit."
    },
    cardOutcomes: { "2D": "good", AD: "penalty" },
    cardReasons: { "2D": "avoided_penalty", AD: "captured_penalty" }
  }
];

export const noHeartsLesson: GuidedLesson = {
  id: "barbu-no-hearts",
  family: "Hearts",
  game: "Barbu",
  contract: "No Hearts",
  title: "Avoid heart penalties",
  summary: "Follow suit while avoiding tricks that contain hearts.",
  tricks: noHeartsGuidedTricks
};
