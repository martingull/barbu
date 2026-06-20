import type { GuidedLesson, GuidedTrick } from "../lessonTypes";

export const dominoGuidedTricks: GuidedTrick[] = [
  {
    title: "Build from the seven",
    beforeResult: "The spade lane is open around 7S. Unopened suits still need a seven.",
    afterResult: "You place 5S, extending the spade lane by one rank.",
    emptyExplanation:
      "Domino is not a trick. Place a seven to open a suit, or extend an existing lane by one rank.",
    legalCardIds: ["5S", "7H"],
    hand: [
      { id: "5S", rank: "5", suit: "S", label: "5S" },
      { id: "7H", rank: "7", suit: "H", label: "7H" },
      { id: "10C", rank: "10", suit: "C", label: "10C" },
      { id: "QD", rank: "Q", suit: "D", label: "QD" }
    ],
    tableBeforeChoice: [
      { seat: "Tutor", card: { id: "7S", rank: "7", suit: "S", label: "7S" } },
      { seat: "Right", card: { id: "6S", rank: "6", suit: "S", label: "6S" } },
      { seat: "Left", card: { id: "8S", rank: "8", suit: "S", label: "8S" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "You" },
    playedExplanations: {
      "5S": "5S extends the spade lane below 6S.",
      "7H": "7H opens the heart lane because unopened suits start with a seven.",
      "10C": "10C cannot open clubs because clubs need 7C first.",
      QD: "QD cannot open diamonds because diamonds need 7D first."
    },
    cardOutcomes: {
      "5S": "good",
      "7H": "good",
      "10C": "penalty",
      QD: "penalty"
    },
    cardReasons: {
      "5S": "followed_suit",
      "7H": "followed_suit",
      "10C": "off_suit",
      QD: "off_suit"
    }
  }
];

export const dominoLesson: GuidedLesson = {
  id: "barbu-domino",
  family: "Hearts",
  game: "Barbu",
  contract: "Domino",
  title: "Build the layout",
  summary: "Domino is a layout contract: open suits with sevens, then build outward.",
  tricks: dominoGuidedTricks
};
