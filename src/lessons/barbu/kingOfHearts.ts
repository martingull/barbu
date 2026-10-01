import type { GuidedLesson, GuidedTrick } from "../../domain/types";
import { lessonCards } from "./guidedFeedback";

export const kingOfHeartsGuidedTricks: GuidedTrick[] = [
  {
    title: "Let someone else take the king",
    beforeResult: "Barbu led 10H. Right played KH, putting the contract card into the trick.",
    afterResult: "The king of hearts is in this trick. Check the explanation to see who captured it.",
    emptyExplanation:
      "Play 2H to stay below KH. Playing AH would capture the king and cost 20 points. Left will follow with QH.",
    legalCardIds: ["2H", "AH"],
    hand: [
      { id: "2H", rank: "2", suit: "H", label: "2H" },
      { id: "AH", rank: "A", suit: "H", label: "AH" },
      { id: "7C", rank: "7", suit: "C", label: "7C" },
      { id: "QS", rank: "Q", suit: "S", label: "QS" }
    ],
    tableBeforeChoice: [
      { seat: "Tutor", card: { id: "10H", rank: "10", suit: "H", label: "10H" } },
      { seat: "Right", card: { id: "KH", rank: "K", suit: "H", label: "KH" } }
    ],
    tableAfterChoice: [{ seat: "Left", card: { id: "QH", rank: "Q", suit: "H", label: "QH" } }],
    pendingBySeat: { Left: "QH", You: "You" },
    playedExplanations: {
      "2H": "2H follows hearts and stays below KH. Right keeps the trick and takes the king.",
      AH: "AH follows hearts but wins the trick. That captures KH, which is the card you are trying to avoid."
    },
    cardOutcomes: {
      "2H": "good",
      AH: "penalty"
    },
    cardReasons: {
      "2H": "avoided_penalty",
      AH: "captured_penalty"
    }
  },
  {
    title: "Discard the king when you are void",
    beforeResult: "Left led 6S. Barbu and Right followed spades. You have no spades.",
    afterResult: "Right's AS wins. Your chosen discard determines whether KH leaves your hand.",
    emptyExplanation:
      "When you cannot follow suit, consider which card you most want out of your hand.",
    legalCardIds: ["KH", "4D", "8C"],
    hand: [
      { id: "KH", rank: "K", suit: "H", label: "KH" },
      { id: "4D", rank: "4", suit: "D", label: "4D" },
      { id: "8C", rank: "8", suit: "C", label: "8C" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "6S", rank: "6", suit: "S", label: "6S" } },
      { seat: "Tutor", card: { id: "10S", rank: "10", suit: "S", label: "10S" } },
      { seat: "Right", card: { id: "AS", rank: "A", suit: "S", label: "AS" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "You" },
    playedExplanations: {
      KH: "KH is legal because you are void in spades. Discarding it here is ideal because Right already controls the trick with AS.",
      "4D": "4D is legal, but it keeps KH in your hand for a later and possibly worse moment.",
      "8C": "8C is legal, but it misses the chance to unload the contract card while someone else is winning."
    },
    cardOutcomes: {
      KH: "good",
      "4D": "risky",
      "8C": "risky"
    },
    cardReasons: {
      KH: "void_discard",
      "4D": "void_discard",
      "8C": "void_discard"
    }
  },
  {
    title: "Choose your heart",
    beforeResult: "You play last in King of Hearts. Choose a card.",
    afterResult: "The highest heart wins the trick.", emptyExplanation: "",
    hand: lessonCards("KH", "2H", "7C"), legalCardIds: ["KH", "2H"],
    tableBeforeChoice: [
      { seat: "Left", card: lessonCards("AH")[0] },
      { seat: "Tutor", card: lessonCards("4H")[0] },
      { seat: "Right", card: lessonCards("9H")[0] }
    ], tableAfterChoice: [], pendingBySeat: { You: "You" },
    playedExplanations: {
      KH: "KH follows suit below AH. Left captures the king and its 20 penalty points; it cannot hurt you later.",
      "2H": "Legal and safe for this trick, but KH remains in your hand. This was a chance to play it under the ace.",
      "7C": "Hearts were led and you still have hearts."
    },
    cardOutcomes: { KH: "good", "2H": "risky" },
    cardReasons: { KH: "avoided_penalty", "2H": "followed_suit" }
  }
];

export const kingOfHeartsLesson: GuidedLesson = {
  id: "barbu-king-of-hearts",
  family: "Hearts",
  game: "Barbu",
  contract: "King of Hearts",
  title: "Avoid the king of hearts",
  summary: "The Barbu contract revolves around one dangerous card: KH.",
  tricks: kingOfHeartsGuidedTricks
};
