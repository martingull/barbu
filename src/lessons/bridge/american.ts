import type { BridgeAuctionCall } from "../../domain/types";
import { biddingLesson, type BiddingExample } from "./biddingLesson";

export const americanPrinciples = {
  bidding: "Open five-card majors or the better minor with opening strength. Balanced 15-17 opens 1NT; 20-21 opens 2NT. These are Standard American foundations based on SAYC, not 2/1 game forcing.",
  responding: "Opposite a 15-17 1NT, these balanced hands without a four-card major pass with 0-7, invite with 8-9, and bid 3NT with 10+. Shape may suggest Stayman or a transfer instead.",
  support: "A five-card major plus three-card support makes eight trumps. In these balanced examples, raise with 6-10, invite with 11-12, or bid game with 13+ HCP. Four-card support and 13+ uses Jacoby 2NT.",
  rebidding: "A 1NT opening shows 15-17. After opening a suit and hearing a one-level response, a 1NT rebid shows 12-14 and a jump to 2NT shows 18-19, unless a major fit can be shown.",
  stayman: "After 1NT, use 2♣ Stayman with 8+ HCP and a four-card major. Opener replies 2♦ without a major, 2♥ with hearts (possibly spades too), otherwise 2♠. Then invite or bid game with a fit.",
  transfers: "After 1NT, 2♦ asks partner to bid hearts and 2♥ asks for spades. A transfer promises five cards in the destination suit, not points. After partner accepts, pass weak hands, invite with 8-9, or choose game with 10+."
};
export type AmericanTopic = keyof typeof americanPrinciples;
type AdditionalTopic = "rebidding" | "stayman" | "transfers";
const history = (calls: string[], dealer = 0): BridgeAuctionCall[] => calls.map((call, i) => ({ seat: (["Tutor", "Right", "You", "Left"] as const)[(dealer + i) % 4], call }));
const response = history(["1NT", "Pass"]);
const rebid = history(["1D", "Pass", "1S", "Pass"], 2);
const examples: Record<AdditionalTopic, BiddingExample[]> = {
  rebidding: [
    { title: "An opening and a rebid differ", prompt: "You opened 1♦ and North responded 1♠. Both opponents passed. Describe your balanced hand without four spades.", why: "1NT is now a rebid showing 12-14 balanced, not the 15-17 opening range.", options: ["Pass", "1NT", "2NT", "3NT"], positions: [
      { hand: "AS 9S 3S KH 7H 2H QD JD 8D 4D KC 6C 2C", call: "1NT", calls: rebid },
      { hand: "AS 8S 2S QH 7H 3H AD JD 9D 4D QC 6C 2C", call: "1NT", calls: rebid }] },
    { title: "Show extra strength", prompt: "After opening 1♦ and hearing 1♠, how do you describe this stronger balanced hand?", why: "A jump rebid to 2NT shows 18-19 balanced. Partner evaluates game using that range, not 15-17 or Acol's rebid ranges.", options: ["Pass", "1NT", "2NT", "3NT"], positions: [
      { hand: "AS QS 3S KH 8H 2H AD JD 7D 4D AC 6C 2C", call: "2NT", calls: rebid },
      { hand: "AS KS 3S KH 8H 2H AD JD 7D 4D AC 6C 2C", call: "2NT", calls: rebid }] },
    { title: "Use partner's new range", prompt: "North opened 1♦. You responded 1♥; North rebid 1NT. Both opponents passed. Is game justified?", why: "North's rebid shows 12-14, not an opening 15-17. This hand cannot reach the usual 25-point game guide, so pass.", options: ["Pass", "2NT", "3NT"], positions: [
      { hand: "KS 7S 2S QH 8H 5H 3H JD 9D 4D JC 10C 2C", call: "Pass", calls: history(["1D", "Pass", "1H", "Pass", "1NT", "Pass"]) },
      { hand: "QS 8S 3S KH 9H 5H 2H JD 8D 4D 10C 7C 2C", call: "Pass", calls: history(["1D", "Pass", "1H", "Pass", "1NT", "Pass"]) }] }
  ],
  stayman: [
    { title: "Ask about a major", prompt: "Partner opens 1NT. With four spades and invitation strength, choose your enquiry.", why: "2♣ asks about a four-card major. This hand has 8+ HCP, so it can continue if no major fit is found. It does not promise clubs.", options: ["Pass", "2C", "2H", "3NT"], positions: [
      { hand: "KS QS 8S 3S QH 7H 2H JD 9D 4D 10C 6C 2C", call: "2C", calls: response },
      { hand: "AS JS 8S 3S QH 7H 2H JD 9D 4D 10C 6C 2C", call: "2C", calls: response }] },
    { title: "Hearts before spades", prompt: "You opened 1NT and partner asked 2♣. Which major should you show with four of each?", why: "Reply 2♥ with four hearts even when you also have four spades. A 2♠ reply would deny four hearts.", options: ["Pass", "2D", "2H", "2S"], positions: [
      { hand: "AS QS 8S 3S KH QH 5H 2H JD 9D 4D KC 8C", call: "2H", calls: history(["1NT", "Pass", "2C", "Pass"], 2) },
      { hand: "KS QS JS 3S AH QH 5H 2H KD 9D 4D QC 8C", call: "2H", calls: history(["1NT", "Pass", "2C", "Pass"], 2) }] },
    { title: "Choose game with the fit", prompt: "North opened 1NT, you asked 2♣, and North replied 2♥. Choose your contract target.", why: "Partner has four hearts and this hand has four-card support and game values. Choose 4♥, requiring ten tricks.", options: ["Pass", "2NT", "3H", "4H"], positions: [
      { hand: "KS 9S 4S AH 8H 5H 2H QD 7D 3D JC 9C 2C", call: "4H", calls: history(["1NT", "Pass", "2C", "Pass", "2H", "Pass"]) },
      { hand: "AS 9S 4S KH 8H 5H 2H QD 7D 3D JC 9C 2C", call: "4H", calls: history(["1NT", "Pass", "2C", "Pass", "2H", "Pass"]) }] }
  ],
  transfers: [
    { title: "Show hearts indirectly", prompt: "Partner opens 1NT. You have five hearts and a weak hand. Which call asks partner to bid hearts?", why: "2♦ transfers to hearts. Partner will bid hearts, then you can pass this weak hand. A direct 2♥ would instead transfer to spades.", options: ["Pass", "2D", "2H", "2NT"], positions: [
      { hand: "QS 8S 3S KH 9H 7H 5H 2H JD 8D 4D 6C 2C", call: "2D", calls: response },
      { hand: "KS 8S 3S QH 10H 7H 5H 2H JD 8D 4D 6C 2C", call: "2D", calls: response }] },
    { title: "Accept the transfer", prompt: "You opened 1NT. Partner responded 2♥. What are they asking you to do?", why: "2♥ is a transfer to spades, not a heart sign-off. Bid 2♠ even with only two spades; responder has at least five.", options: ["Pass", "2S", "2NT", "3H"], positions: [
      { hand: "AS 3S KH QH 8H AD JD 7D 4D QC 9C 6C 2C", call: "2S", calls: history(["1NT", "Pass", "2H", "Pass"], 2) },
      { hand: "KS 3S AH QH 8H AD JD 7D 4D KC 9C 6C 2C", call: "2S", calls: history(["1NT", "Pass", "2H", "Pass"], 2) }] },
    { title: "Invite after transferring", prompt: "North opened 1NT. Your 2♦ transferred to hearts and North accepted with 2♥. What now with five hearts?", why: "Transfer first, then invite with 2NT on 8-9 HCP and exactly five hearts. Opener can choose notrump or hearts using their strength and support. Do not pass an invitational hand.", options: ["Pass", "2NT", "3NT", "4H"], positions: [
      { hand: "KS 8S 3S QH JH 7H 5H 2H QD 8D 4D 6C 2C", call: "2NT", calls: history(["1NT", "Pass", "2D", "Pass", "2H", "Pass"]) },
      { hand: "AS 8S 3S QH JH 7H 5H 2H QD 8D 4D 6C 2C", call: "2NT", calls: history(["1NT", "Pass", "2D", "Pass", "2H", "Pass"]) }] }
  ]
};
export const americanConventionSteps = (topic: AdditionalTopic) => biddingLesson(topic, "standard-american", americanPrinciples[topic], examples[topic]);
