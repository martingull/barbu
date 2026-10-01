import type { GuidedLesson, GuidedTrick } from "../../domain/types";
import { lessonCards } from "./guidedFeedback";

export const noQueensGuidedTricks: GuidedTrick[] = [
  {
    title: "Do not capture a queen",
    beforeResult: "Barbu led 8D. Right followed with QD, loading the trick with a queen.",
    afterResult: "Left wins with AD and takes the queen penalty.",
    emptyExplanation:
      "Follow diamonds with 3D or KD. In this example Left will play AD next and take QD, worth 6 penalty points.",
    legalCardIds: ["3D", "KD"],
    hand: [
      { id: "3D", rank: "3", suit: "D", label: "3D" },
      { id: "KD", rank: "K", suit: "D", label: "KD" },
      { id: "9H", rank: "9", suit: "H", label: "9H" },
      { id: "JS", rank: "J", suit: "S", label: "JS" }
    ],
    tableBeforeChoice: [
      { seat: "Tutor", card: { id: "8D", rank: "8", suit: "D", label: "8D" } },
      { seat: "Right", card: { id: "QD", rank: "Q", suit: "D", label: "QD" } }
    ],
    tableAfterChoice: [{ seat: "Left", card: { id: "AD", rank: "A", suit: "D", label: "AD" } }],
    pendingBySeat: { Left: "AD", You: "You" },
    playedExplanations: {
      "3D": "3D follows diamonds and cannot win. Left's AD captures the queen, so the penalty goes to Left.",
      KD: "KD follows diamonds and beats QD, but Left still has AD waiting after you. Left will overtake and collect the queen."
    },
    cardOutcomes: {
      "3D": "good",
      KD: "good"
    },
    cardReasons: {
      "3D": "avoided_penalty",
      KD: "avoided_penalty"
    }
  },
  {
    title: "When your high card would take the queen",
    beforeResult: "Left led 5C. Barbu played QC. Right followed with 9C. You play last.",
    afterResult: "You win with KC and take the queen penalty.",
    emptyExplanation:
      "Avoiding a penalty does not let you ignore the led suit.",
    legalCardIds: ["KC"],
    hand: [
      { id: "KC", rank: "K", suit: "C", label: "KC" },
      { id: "4D", rank: "4", suit: "D", label: "4D" },
      { id: "8H", rank: "8", suit: "H", label: "8H" }
    ],
    tableBeforeChoice: [
      { seat: "Left", card: { id: "5C", rank: "5", suit: "C", label: "5C" } },
      { seat: "Tutor", card: { id: "QC", rank: "Q", suit: "C", label: "QC" } },
      { seat: "Right", card: { id: "9C", rank: "9", suit: "C", label: "9C" } }
    ],
    tableAfterChoice: [],
    pendingBySeat: { You: "You" },
    playedExplanations: {
      KC: "KC is forced because clubs were led. It wins the trick and captures QC, which is exactly the situation this contract teaches you to anticipate earlier."
    },
    cardOutcomes: {
      KC: "penalty"
    },
    cardReasons: {
      KC: "captured_penalty"
    }
  },
  {
    title: "Choose your discard",
    beforeResult: "You play last in No Queens and have no clubs. Which card would you discard?",
    afterResult: "A discarded queen scores against the trick winner.", emptyExplanation: "",
    hand: lessonCards("QD", "AS", "2D"), legalCardIds: ["QD", "AS", "2D"],
    tableBeforeChoice: [
      { seat: "Left", card: lessonCards("KC")[0] },
      { seat: "Tutor", card: lessonCards("AC")[0] },
      { seat: "Right", card: lessonCards("10C")[0] }
    ], tableAfterChoice: [], pendingBySeat: { You: "You" },
    playedExplanations: {
      QD: "You are void in clubs. QD cannot win this trick, so Barbu collects the queen's 6 points instead of you keeping the danger.",
      AS: "Legal, but QD stays in your hand. You could have discarded the queen into Barbu's winning trick.",
      "2D": "Legal, but you keep QD and lose a low diamond that could help you duck later."
    },
    cardOutcomes: { QD: "good", AS: "risky", "2D": "risky" },
    cardReasons: { QD: "void_discard", AS: "void_discard", "2D": "void_discard" }
  }
];

export const noQueensLesson: GuidedLesson = {
  id: "barbu-no-queens",
  family: "Hearts",
  game: "Barbu",
  contract: "No Queens",
  title: "Avoid capturing queens",
  summary: "Queens are penalties only when they are in a trick you win.",
  tricks: noQueensGuidedTricks
};
