import type { CourseContent } from "../courseTypes";
import { ginTopics } from "../../games/ginRummy";
import { ginCards } from "./exercises";

const content = [
  { heading: "Match cards, not tricks.", body: "Build sets of equal ranks and runs within a suit. Cards outside those combinations are deadwood.",
    points: ["A set contains three or four cards of the same rank.", "A run has three or more consecutive cards of one suit. Aces are low.", "Each card belongs to one meld. Aces count 1; pictures count 10."],
    example: "The club sequence is a run. Keep it together when choosing your discard.", cards: "3C 4C 5C", review: "Keep complete melds and reduce the value of unmatched cards." },
  { heading: "Draw one, discard one.", body: "The upcard is known; the stock is a hidden draw. Keep ten cards after your turn.",
    points: ["The non-dealer may take or pass the opening upcard. The dealer gets the next choice.", "If both pass, the non-dealer must draw from the stock.", "A card taken from the discard pile cannot be discarded again on that turn."],
    example: "Holding 3C and 4C, the face-up 5C completes a run. Take it and discard a different card.", cards: "3C 4C 5C", review: "Take useful upcards, but do not give away good combinations for an unhelpful card." },
  { heading: "Know when you can finish.", body: "After choosing your discard, ten or fewer deadwood points lets you knock. Zero is gin.",
    points: ["A normal knock scores the difference after Barbu's melds and layoffs.", "If Barbu has equal or lower deadwood, Barbu undercuts and adds 10 points.", "Gin scores Barbu's deadwood plus 20. No layoffs against gin."],
    example: "These cards form a set, so they count zero deadwood. Your remaining unmatched cards decide whether you can knock.", cards: "7C 7D 7H", review: "Knocking is optional. Low deadwood helps, but a normal knock can be undercut." }
];
export const ginCourses: CourseContent[] = ginTopics.map((topic, index) => {
  const copy = content[index], points = copy.points.map((text, i) => ({ marker: String(i + 1), text }));
  return { id: topic.id, game: "gin-rummy", pathStepId: topic.id, practiceTarget: { kind: "practice", game: "gin-rummy", action: topic.action },
    contract: "Gin Rummy", title: topic.title, concept: { heading: copy.heading, body: copy.body, points },
    example: { heading: topic.title, body: copy.example, sequence: [{ label: "Notice", text: topic.summary }], ariaLabel: "Gin Rummy example",
      tableCards: ginCards(copy.cards).map(card => ({ seat: "You", card })), pendingBySeat: {} },
    review: { heading: "Bring it to the table", body: copy.review, points } };
});
