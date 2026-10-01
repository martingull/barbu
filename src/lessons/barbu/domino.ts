import type { GuidedLesson, GuidedTrick } from "../../domain/types";
import { lessonCards } from "./guidedFeedback";

export const dominoGuidedTricks: GuidedTrick[] = [
  {
    title: "Build from the seven",
    beforeResult: "The spade lane is open around 7S. Unopened suits still need a seven.",
    afterResult: "Your card opens or extends its own suit lane.",
    emptyExplanation:
      "Play 5S next to 6S, or open hearts with 7H. 10C and QD cannot open their suits: only a seven can do that.",
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
  },
  {
    title: "Extend an open lane",
    beforeResult: "Spades show 6S-7S-8S and hearts show 7H. Choose a card that fits.",
    afterResult: "Each lane grows by one rank at either end.",
    emptyExplanation: "Look at both ends of each open lane. You cannot leave a gap.",
    hand: lessonCards("5S", "6H", "9D"), legalCardIds: ["5S", "6H"],
    tableBeforeChoice: lessonCards("6S", "7S", "8S", "7H").map(card => ({ seat: "Tutor", card })),
    tableAfterChoice: [], pendingBySeat: { You: "You" },
    playedExplanations: {
      "5S": "5S fits directly below 6S and extends the spade lane.",
      "6H": "6H fits directly below 7H and extends the heart lane.",
      "9D": "Diamonds are unopened. You need 7D before building that lane."
    },
    cardOutcomes: { "5S": "good", "6H": "good" },
    cardReasons: { "5S": "followed_suit", "6H": "followed_suit" }
  },
  {
    title: "Read the layout yourself",
    beforeResult: "Choose a legal placement in this Domino position.",
    afterResult: "A legal placement joins its own suit lane without a gap.", emptyExplanation: "",
    hand: lessonCards("10C", "5D", "7H"), legalCardIds: ["5D", "7H"],
    tableBeforeChoice: lessonCards("7C", "8C", "6D", "7D", "8D").map(card => ({ seat: "Tutor", card })),
    tableAfterChoice: [], pendingBySeat: { You: "You" },
    playedExplanations: {
      "10C": "Clubs end at 8C. 9C must be played before 10C; skipping a rank is not allowed.",
      "5D": "5D joins the low end of diamonds at 6D. The whole lane remains consecutive.",
      "7H": "7H opens hearts. A seven is legal even when other suits already have longer lanes."
    },
    cardOutcomes: { "5D": "good", "7H": "good" },
    cardReasons: { "5D": "followed_suit", "7H": "followed_suit" }
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
