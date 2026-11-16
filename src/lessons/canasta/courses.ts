import type { CourseContent } from "../courseTypes";
import { canastaTopics } from "../../games/canasta";
import { canastaCards } from "./exercises";
const content = [
  { heading: "Each card has a point value.", body: "Points are the values of the cards, not the number of cards. Add them to count a proposed opening. Suits do not change a card's value.",
    points: ["4, 5, 6 and 7: 5 points each. 8, 9, 10, J, Q and K: 10 points each.", "Aces and twos: 20 points each. Jokers: 50 points each, even when used as another rank.", "Threes are special: expose and replace them, rather than counting them in an opening. A three left in hand costs 5 points; exposed threes score separately."],
    example: "Three queens: 3 x 10 = 30. Two kings and two jokers: 10 + 10 + 50 + 50 = 120. Together: 30 + 120 = 150 card points. This is not a canasta bonus or your match score.",
    cards: "0-QC 0-QD 0-QH 0-KC 0-KD 0-JR 0-JB",
    review: "Count card values first. The opening lesson then checks whether the proposed melds meet every opening rule; a point total alone does not make a legal opening." },
  { heading: "Build together, rank by rank.", body: "You and your partner share melds. Seven cards complete a canasta; suits do not matter.",
    points: ["Open with 125, 155, or 180 points according to your partnership score, including a natural or wild meld.", "Twos and jokers are wild. Sevens and natural aces must stay natural.", "After opening, reach five natural cards before adding wilds to other ranks."],
    example: "Three queens begin a natural meld. Add four more queens to complete it.", cards: "0-QC 0-QD 1-QC", review: "Your partner can add to your melds. Do not start costly ace, seven, or wild melds without a plan to finish them." },
  { heading: "Open once for the partnership.", body: "Your first groups must qualify together. Once either partner opens, both can add to the shared melds.",
    points: ["Below 3000 points, open with 125; from 3000 use 155, and from 5000 use 180.", "Include a natural or all-wild meld. A complete natural or wild canasta waives the point minimum.", "Use only cards in hand to qualify. Opening bonus cards are reserved after discarding, while stock permits, and arrive on your next turn."],
    example: "Three queens count 30; two kings and two jokers count 120. Together, 150 opens at a score below 3000.", cards: "0-QC 0-QD 0-QH 0-KC 0-KD 0-JR 0-JB",
    review: "Do not confuse the match score, the opening requirement and a canasta bonus. Count the actual cards in your proposed opening." },
  { heading: "Win the pile with a natural pair.", body: "The top discard can unlock every card beneath it, but you must qualify before taking anything.",
    points: ["Use two matching natural cards from your hand with the top discard.", "Before your team opens, satisfy the opening from cards already in hand.", "Your matching meld needs room for three cards. A five-card meld cannot take the pile."],
    example: "Two queens in hand can take a queen on the pile after your partnership has opened.", cards: "0-QC 0-QD 1-QH", review: "Do not count buried cards toward opening. Decide from your own hand and the visible top discard." },
  { heading: "A discard ends your turn.", body: "Choose a legal card without handing the opponents a useful pile.",
    points: ["Never discard a three. Expose it and draw a replacement, or keep one before opening for a straight.", "Wild discards are restricted to going out or an all-wild hand that drew another wild.", "Avoid starting an empty pile with an ace, seven, or dead rank when another legal option exists."],
    example: "With an empty pile, discard the four instead of the ace or seven.", cards: "0-AC 0-7C 0-4C", review: "Watch the opponents' exposed melds. Ranks they cannot pick up make safer discards." },
  { heading: "Two canastas, then the last discard.", body: "Going out is a partnership achievement. Your team needs two completed canastas and you need one final discard.",
    points: ["Threes score negatively with no canasta, zero with one, and positively with two or more.", "Unfinished natural aces, sevens, and wild melds bring large penalties, even with a canasta.", "A match ends when a team reaches 8500. If both do, the higher score wins."],
    example: "A natural canasta is worth 500 before card values. A mixed one is worth 300.", cards: "0-8C 0-8D 0-8H", review: "Keep track of your partnership's completed canastas, not just the cards in your own hand." },
  { heading: "Count the whole partnership.", body: "The hand score combines bonuses, meld values, threes, penalties and cards still held by both partners.",
    points: ["Add canasta bonuses and meld values with at least one canasta. Without a canasta, meld values count against you.", "Exposed threes are negative with no canasta, zero with one, and positive with at least two. Expose and replace them during play; never discard them.", "Subtract held cards and incomplete-meld penalties. Going out adds 100, but a stock-ended hand has no going-out bonus."],
    example: "Seven natural eights give 500 bonus plus 70 card points. A king still in hand costs 10: the total is 560.", cards: "0-8C 0-8D 0-8H 0-8S 1-8C 1-8D 1-8H",
    review: "Your team can lose points even after building melds. Threes and unfinished high-penalty melds make completed canastas important." }
];
export const canastaCourses: CourseContent[] = canastaTopics.map((topic, index) => {
  const copy = content[index], points = copy.points.map((text, i) => ({ marker: String(i + 1), text }));
  return { id: topic.id, game: "canasta", pathStepId: topic.id, practiceTarget: { kind: "practice", game: "canasta", action: topic.action },
    contract: "Canasta", title: topic.title, concept: { heading: copy.heading, body: copy.body, points },
    example: { heading: topic.title, body: copy.example, sequence: [{ label: "Notice", text: topic.summary }], ariaLabel: "Canasta example",
      tableCards: canastaCards(copy.cards).map(card => ({ seat: "You", card })), pendingBySeat: {} },
    review: { heading: "Bring it to the table", body: copy.review, points } };
});
