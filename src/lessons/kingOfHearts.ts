import type { GuidedLesson, GuidedTrick } from "../lessonTypes";

export const kingOfHeartsGuidedTricks: GuidedTrick[] = [
  {
    title: "Let someone else take the king",
    beforeResult: "Tutor led 10H. Right played KH, putting the contract card into the trick.",
    afterResult: "The king of hearts is in this trick. Check the explanation to see who captured it.",
    emptyExplanation:
      "Hearts were led. You have hearts, so you must follow. The goal is not to win the trick containing KH.",
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
      "2H": "best",
      AH: "penalty"
    }
  },
  {
    title: "Discard the king when you are void",
    beforeResult: "Left led 6S. Tutor and Right followed spades. You have no spades.",
    afterResult: "Right wins with AS. Your KH is safely discarded into a trick you do not win.",
    emptyExplanation:
      "You cannot follow spades, so any card is legal. This is a chance to get rid of the dangerous king.",
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
      KH: "best",
      "4D": "risky",
      "8C": "risky"
    }
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
