import type { CourseContent } from "../courseTypes";
import { canastaTopics } from "../../games/canasta";
import { canastaCards } from "./exercises";
const content = [
  { heading: "Build together, rank by rank.", body: "You and your partner share melds. Seven cards complete a canasta; suits do not matter.",
    points: ["Open with 125, 155, or 180 points according to your partnership score, including a natural or wild meld.", "Twos and jokers are wild. Sevens and natural aces must stay natural.", "After opening, reach five natural cards before adding wilds to other ranks."],
    example: "Three queens begin a natural meld. Add four more queens to complete it.", cards: "0-QC 0-QD 1-QC", review: "Your partner can add to your melds. Do not start costly ace, seven, or wild melds without a plan to finish them." },
  { heading: "Win the pile with a natural pair.", body: "The top discard can unlock every card beneath it, but you must qualify before taking anything.",
    points: ["Use two matching natural cards from your hand with the top discard.", "Before your team opens, satisfy the opening from cards already in hand.", "Your matching meld needs room for three cards. A five-card meld cannot take the pile."],
    example: "Two queens in hand can take a queen on the pile after your partnership has opened.", cards: "0-QC 0-QD 1-QH", review: "Do not count buried cards toward opening. Decide from your own hand and the visible top discard." },
  { heading: "A discard ends your turn.", body: "Choose a legal card without handing the opponents a useful pile.",
    points: ["Never discard a three. Expose it and draw a replacement, or keep one before opening for a straight.", "Wild discards are restricted to going out or an all-wild hand that drew another wild.", "Avoid starting an empty pile with an ace, seven, or dead rank when another legal option exists."],
    example: "With an empty pile, discard the four instead of the ace or seven.", cards: "0-AC 0-7C 0-4C", review: "Watch the opponents' exposed melds. Ranks they cannot pick up make safer discards." },
  { heading: "Two canastas, then the last discard.", body: "Going out is a partnership achievement. Your team needs two completed canastas and you need one final discard.",
    points: ["Threes score negatively with no canasta, zero with one, and positively with two or more.", "Unfinished natural aces, sevens, and wild melds bring large penalties, even with a canasta.", "A match ends when a team reaches 8500. If both do, the higher score wins."],
    example: "A natural canasta is worth 500 before card values. A mixed one is worth 300.", cards: "0-8C 0-8D 0-8H", review: "Keep track of your partnership's completed canastas, not just the cards in your own hand." }
];
export const canastaCourses: CourseContent[] = canastaTopics.map((topic, index) => {
  const copy = content[index], points = copy.points.map((text, i) => ({ marker: String(i + 1), text }));
  return { id: topic.id, game: "canasta", pathStepId: topic.id, practiceTarget: { kind: "practice", game: "canasta", action: topic.action },
    contract: "Canasta", title: topic.title, concept: { heading: copy.heading, body: copy.body, points },
    example: { heading: topic.title, body: copy.example, sequence: [{ label: "Notice", text: topic.summary }], ariaLabel: "Canasta example",
      tableCards: canastaCards(copy.cards).map(card => ({ seat: "You", card })), pendingBySeat: {} },
    review: { heading: "Bring it to the table", body: copy.review, points } };
});
