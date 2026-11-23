import { euchreTopics } from "../../games/euchre";
import { euchreCards } from "./exercises";
import type { CourseContent } from "../courseTypes";

const content = {
  bowers: { heading: "Two jacks lead the trump suit.", body: "Euchre counts tricks, not card points. The two highest trumps are the bowers: the jack of trump, then the other jack of the same colour.",
    points: ["Trump ranks right bower, left bower, ace, king, queen, ten, nine.", "The left bower belongs to trump for following suit and winning tricks.", "Ordinary suits rank ace, king, queen, jack, ten, nine; one jack has moved to trump."],
    cards: "JH JD AH KH 9H", example: "Hearts are trump. J♥ is the right bower; J♦ is the left bower and counts as a heart. Both outrank A♥.", review: "Read trump first. A jack's effective suit can differ from the symbol printed on it." },
  follow: { heading: "Follow the effective suit.", body: "You must follow the led suit when you can. Treat the left bower as a trump card, including when it is the opening lead.",
    points: ["If you hold only the left bower in trump, it must follow a trump lead.", "The left bower cannot follow its old printed suit.", "When void in the effective led suit, you may trump or discard. Overtrumping is not compulsory."],
    cards: "JD 9D AH AC KS", example: "Hearts are trump. On a diamond lead, 9♦ follows but J♦ does not: J♦ is a heart. On a heart lead, either J♦ or A♥ follows.", review: "Check legality before deciding whether to win, duck or trump." },
  order: { heading: "Calling promises three tricks.", body: "In round one, each player may accept the upcard's suit or pass. The caller's partnership becomes the makers and aims for three of five tricks.",
    points: ["The dealer picks up the ordered card, then discards one face down to keep five.", "The dealer's partner may order up without being forced to go alone in this North American profile.", "Bowers, trump length and outside aces support a call. Recommendations are heuristics, not guarantees."],
    cards: "JH JD AH AC 9S", example: "With hearts offered, both bowers, A♥ and an outside ace give visible control. If you are dealer, consider the upcard and the discard you would make.", review: "Base a call on your own cards and the public upcard. Keep control when discarding." },
  second: { heading: "Three suits remain available.", body: "If all four players pass the upcard, a second round begins left of dealer. Any suit except the rejected one may be named.",
    points: ["Calling stops as soon as someone names trump.", "A second-round call does not give the dealer the upcard.", "Everyone may pass again. Eight passes means no score and a new deal by the next dealer."],
    cards: "JS JC AS 9H 10D", example: "If hearts were turned down, this hand can call spades. J♠ and J♣ are its bowers. Hearts are unavailable, even if you would prefer them.", review: "Do not carry the upcard suit into round two. Compare the remaining suits or pass." },
  partner: { heading: "Your partnership takes the trick.", body: "North is your partner. A trick North wins is just as useful as one you win, so do not spend an extra winner to beat a secure partner.",
    points: ["Follow suit even when your partner is winning.", "When you play last, you can see whether a partner's winner is secure.", "Earlier in the trick, opponents still have a turn. Use played-card memory, not knowledge of hidden hands."],
    cards: "JH JD 9H AC KS", example: "If North's right bower is winning and you must follow trump, play your lowest suitable trump rather than spending the left bower.", review: "Secure the tricks your side needs; preserve useful cards for the ones still to come." },
  score: { heading: "Make three, sweep five, or get euchred.", body: "The makers score for meeting their promise. If they fail to take three tricks, the defenders earn two points instead.",
    points: ["Makers take three or four: 1 point. All five with partner: 2 points.", "Only the caller may go alone. Their partner sits out. All five alone: 4 points; three or four alone still earns only 1.", "A failed lone hand still gives defenders 2, not 4. First partnership to 10 wins after hand settlement."],
    cards: "JS JC AS KS QS", example: "A lone caller sweeping all five scores four. With a partner the same sweep scores two. A single lost trick reduces a made lone hand to one point.", review: "Count maker tricks, whether the caller went alone, and which side receives the points." }
};
export const euchreCourses: CourseContent[] = euchreTopics.map(topic => {
  const copy = content[topic.action], points = copy.points.map((text, index) => ({ marker: String(index + 1), text }));
  return { id: topic.id, pathStepId: topic.id, game: "euchre", contract: "Euchre", title: topic.title,
    practiceTarget: { kind: "practice", game: "euchre", action: topic.action },
    concept: { heading: copy.heading, body: copy.body, points },
    example: { heading: topic.title, body: copy.example, sequence: [{ label: "Notice", text: topic.summary }], ariaLabel: "Euchre example",
      tableCards: euchreCards(copy.cards).map(card => ({ seat: "You", card })), pendingBySeat: {} },
    review: { heading: "Bring it to the table", body: copy.review, points } };
});
