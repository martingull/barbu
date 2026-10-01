import type { CourseContent } from "../courseTypes";
import { ginTopics } from "../../games/ginRummy";
import { ginCards } from "./exercises";

const content = {
  melds: { heading: "Match cards, not tricks.", body: "Build sets of equal ranks and runs within a suit. Cards outside those combinations are deadwood.",
    points: ["A set contains three or four cards of the same rank.", "A run has three or more consecutive cards of one suit. Aces are low.", "Each card belongs to one meld. Aces count 1; pictures count 10."],
    example: "The club sequence is a run. Keep it together when choosing your discard.", cards: "3C 4C 5C", review: "Keep complete melds and reduce the value of unmatched cards." },
  deadwood: { heading: "Only unmatched cards count.", body: "First set aside complete sets and runs. Add the values of the cards left over: that total is your deadwood.",
    points: ["A meld needs at least three cards. Two consecutive cards do not count as a run.", "Aces count 1; number cards their face value; jacks, queens and kings count 10.", "Each card can belong to only one meld."],
    example: "In this four-card fragment, the three sevens form a set worth zero. The unmatched 2D adds two deadwood points.", cards: "7C 7D 7H 2D", review: "Find the melds first, then count only the unmatched cards." },
  draw: { heading: "Draw one, discard one.", body: "The upcard is known; the stock is a hidden draw. Keep ten cards after your turn.",
    points: ["The non-dealer may take or pass the opening upcard. The dealer gets the next choice.", "If both pass, the non-dealer must draw from the stock.", "A card taken from the discard pile cannot be discarded again on that turn."],
    example: "Holding 3C and 4C, the face-up 5C completes a run. Take it and discard a different card.", cards: "3C 4C 5C", review: "Take useful upcards, but do not give away good combinations for an unhelpful card." },
  knock: { heading: "A knock ends the hand.", body: "Choose your discard, then count the ten cards you would keep. With ten or fewer unmatched points you may knock instead of continuing.",
    points: ["More than 10: keep playing. Exactly 10 is allowed.", "From 1 to 10: you may knock. Zero is the special finish called gin.", "Knocking is optional, and it does not guarantee that you win the hand."],
    example: "This fragment has a set and an unmatched 2D. If the other six cards in your hand also form melds, you have two deadwood points: a knock is allowed, but gin is not.", cards: "7C 7D 7H 2D", review: "Count after your proposed discard. A legal knock can still be beaten if Barbu finishes with equal or fewer unmatched points." },
  gin: { heading: "Every remaining card belongs.", body: "Go gin by discarding your eleventh card and leaving all ten remaining cards in sets or runs. There must be zero deadwood.",
    points: ["A run may be longer than three cards. Four cards can belong to one run.", "Even a single unmatched ace means one point: that is not gin.", "In this table's classic scoring, gin earns Barbu's deadwood plus 20, with no layoffs."],
    example: "All four clubs belong to one run, so this fragment adds zero deadwood. A complete gin hand also needs every other remaining card to belong to a meld.", cards: "AC 2C 3C 4C", review: "Gin is about every card, not just having several good melds. Choose the final discard without breaking a combination." }
};
export const ginCourses: CourseContent[] = ginTopics.map(topic => {
  const copy = content[topic.action], points = copy.points.map((text, i) => ({ marker: String(i + 1), text }));
  return { id: topic.id, game: "gin-rummy", pathStepId: topic.id, practiceTarget: { kind: "practice", game: "gin-rummy", action: topic.action },
    contract: "Gin Rummy", title: topic.title, concept: { heading: copy.heading, body: copy.body, points },
    example: { heading: topic.title, body: copy.example, sequence: [{ label: "Notice", text: topic.summary }], ariaLabel: "Gin Rummy example",
      tableCards: ginCards(copy.cards).map(card => ({ seat: "You", card })), pendingBySeat: {} },
    review: { heading: "Bring it to the table", body: copy.review, points } };
});
