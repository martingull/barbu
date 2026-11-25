import { beloteTopics } from "../../games/belote";
import { beloteCards } from "./exercises";
import type { CourseContent } from "../courseTypes";

const content = {
  values: { heading: "Winning rank and card points are different.", body: "Belote rewards the points inside tricks, not simply the number of tricks. Trump changes both the order and the value of the jack and nine.",
    points: ["Trump, high to low: J (20), 9 (14), A (11), 10 (10), K (4), Q (3), 8 (0), 7 (0).", "Other suits: A (11), 10 (10), K (4), Q (3), J (2), 9 (0), 8 (0), 7 (0).", "There are 152 card points. The last trick adds 10, making 162 in an ordinary deal."],
    cards: "JH 9H AH 10H KH QH 8H 7H", example: "With hearts trump, 9♥ beats A♥ and earns 14 points. Outside trump, 10♣ beats K♣. Keep rank and value separate.", review: "Look at the trump suit before comparing cards or counting points." },
  taking: { heading: "Take from five cards, then receive eight.", body: "Four players sit in opposite partnerships. You are South with North. Dealing, taking and play run anticlockwise: North, West, South, East.",
    points: ["After five cards each, expose an upcard. Starting right of dealer, each player may take its suit or pass.", "After four passes, choose a different suit or pass. Eight passes mean no score and the next dealer.", "The taker gets the upcard and two concealed cards; everyone else gets three. No one discards. All have eight cards."],
    cards: "JH 9H AH AC 7S", example: "With hearts offered, J♥, 9♥, A♥ and an outside ace support taking. You still do not know the final cards, so this is a judgement rather than a promise of eight tricks.", review: "Take only on visible strength. Choosing trump commits your side to more points than the defenders." },
  follow: { heading: "Follow suit before choosing tactics.", body: "A lead establishes the suit to follow. If you have that suit, you must play it, even when you could win with a trump.",
    points: ["On a plain-suit lead, any card of that suit is legal; beating it is not compulsory.", "On a trump lead, play a higher trump than the current highest if you can, even when partner is winning.", "Highest trump wins; without trump, the highest card of the led suit wins. The winner leads next."],
    cards: "7C AH 10D", example: "Clubs are led and you hold 7♣. You must follow with it rather than play A♥ as trump. A legal move may lose this trick.", review: "Read the led suit, your matching cards and whether trump was led." },
  trumping: { heading: "Being void does not always mean free choice.", body: "When you have no cards of the led suit, check who currently holds the trick. Your obligation depends on the partnership.",
    points: ["Opponent winning: play a trump if you hold one. Beat an existing trump if possible.", "If no higher trump is available, you must undertrump when an opponent is winning.", "Partner winning: you may discard any card. In this profile, that includes a lower trump even if you hold a higher one."],
    cards: "7H JH AC", example: "You are void in diamonds and an opponent has played 9♥ as trump. J♥ must overtrump. You cannot discard A♣ or undertrump with 7♥ while J♥ is available.", review: "First follow suit; only then apply the trumping and partner exceptions." },
  partner: { heading: "North's points belong to your side.", body: "A trick won by North is as valuable as one won by you. When partner is safely winning, add valuable cards rather than wasting another winner.",
    points: ["You must still follow suit if possible.", "Playing last makes the current winner certain. Earlier players must allow for the remaining opponents.", "Feed an ace or ten when legal and useful; do not assume an earlier plain-suit winner cannot be trumped."],
    cards: "AC 7D 7S", example: "Hearts are led. North's J♥ is winning and you play last with no hearts. A♣ adds 11 to your partnership's trick; discarding 7♦ adds none.", review: "Feed points to a secure partner, not merely a partner who is ahead for now." },
  bonus: { heading: "King and queen of trump earn 20 together.", body: "One player must hold both the king and queen of trump. Playing the first declares Belote; playing the second declares Rebelote.",
    points: ["Barbu announces the pair automatically as its cards are played. Either order is allowed.", "The bonus is 20, not the cards' ordinary combined value. It stays with the declaring side even if its contract fails.", "Classic Belote here has no sequence or four-of-a-kind announcements. A plain-suit king and queen do not earn a bonus."],
    cards: "KH QH KC QC", example: "Hearts are trump. K♥ and Q♥ together can earn 20. K♣ and Q♣ cannot. The pair's normal card points still go to whoever wins those cards in tricks.", review: "Keep the protected bonus separate from the card points won in tricks." },
  scoring: { heading: "Compare points, then settle the contract.", body: "At the end of eight tricks, add the captured card values, the last-trick bonus and any Belote. The takers must have more total points than the defenders.",
    points: ["Made: each side keeps its points. Set: defenders receive all 162 card points; each side keeps its own Belote.", "All eight tricks is capot: the last-trick bonus becomes 100, making 252 card points. Belote is extra.", "On a tie, defenders score now and takers' points carry to the winner of the next decided deal (litige). Exact scores, no rounding. Play to 1,000; equal match scores require another deal."],
    cards: "JH 9H AC 10D", example: "Takers capture 50 card points and have Belote. Defenders capture 102 plus the last-trick 10. Takers fail, but retain 20; defenders score 162. With a sweep, 152 + 100 = 252 before Belote.", review: "A few valuable tricks can outscore many cheap tricks. Check the actual card points and agreement." }
};
export const beloteCourses: CourseContent[] = beloteTopics.map(topic => {
  const copy = content[topic.action], points = copy.points.map((text, index) => ({ marker: String(index + 1), text }));
  return { id: topic.id, pathStepId: topic.id, game: "belote", contract: "Belote", title: topic.title,
    practiceTarget: { kind: "practice", game: "belote", action: topic.action },
    concept: { heading: copy.heading, body: copy.body, points },
    example: { heading: topic.title, body: copy.example, sequence: [{ label: "Notice", text: topic.summary }], ariaLabel: "Belote example",
      tableCards: beloteCards(copy.cards).map(card => ({ seat: "You", card })), pendingBySeat: {} },
    review: { heading: "Bring it to the table", body: copy.review, points } };
});
