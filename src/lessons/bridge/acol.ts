import type { BridgeAuctionCall } from "../../domain/types";
import type { BridgeChoiceStep } from "./learning";
import { biddingLesson, type BiddingExample } from "./biddingLesson";

export type AcolTopic = "bidding" | "responding" | "support" | "rebidding" | "stayman";
const response: BridgeAuctionCall[] = [{ seat: "Tutor", call: "1NT" }, { seat: "Right", call: "Pass" }];
const rebid: BridgeAuctionCall[] = [{ seat: "You", call: "1D" }, { seat: "Left", call: "Pass" }, { seat: "Tutor", call: "1S" }, { seat: "Right", call: "Pass" }];
const enquiry: BridgeAuctionCall[] = [{ seat: "You", call: "1NT" }, { seat: "Left", call: "Pass" }, { seat: "Tutor", call: "2C" }, { seat: "Right", call: "Pass" }];
const fit = (suit: string): BridgeAuctionCall[] => [...response, { seat: "You", call: "2C" }, { seat: "Left", call: "Pass" }, { seat: "Tutor", call: `2${suit}` }, { seat: "Right", call: "Pass" }];
const major = (suit: string): BridgeAuctionCall[] => [{ seat: "Tutor", call: `1${suit}` }, { seat: "Right", call: "Pass" }];
const low = "KS 7S 2S QH 8H 3H JD 9D 4D JC 10C 6C 2C";
const nine = "AS 8S 3S QH 7H 2H KD 9D 4D 10C 8C 6C 2C";
const ten = "KS 9S 4S AH 8H 2H QD 7D 3D JC 9C 5C 2C";
const twelve = "AS 9S 3S KH 7H 2H QD 8D 4D KC 10C 6C 2C";
const thirteen = "AS 8S 3S QH 7H 2H KD 9D 4D AC 8C 6C 2C";
const fourteen = "AS QS 3S KH 8H 2H QD JD 4D QC 9C 6C 2C";
export const acolPrinciples: Record<AcolTopic, string> = {
  bidding: "Acol Foundation opens a balanced 12-14 with 1NT. Otherwise, with 12+ HCP, choose a four-card or longer suit and plan a rebid.",
  responding: "After a weak 12-14 1NT, these balanced hands without a four-card major pass with 0-10, invite with 11-12, and bid game with 13-19 HCP.",
  support: "An Acol major opening promises four cards. These balanced raises need four-card support: two with 6-9, three with 10-12, four with 13+ HCP.",
  rebidding: "After a one-level new-suit response, balanced opener rebids 1NT with 15-16, 2NT with 17-18, or 3NT with 19 HCP, unless a major fit can be shown.",
  stayman: "After partner's 1NT, 2♣ asks for a four-card major. Here constructive Stayman needs 11+ HCP. 2♦ denies a major; 2♥ may also include four spades. No transfers."
};
const examples: Record<AcolTopic, BiddingExample[]> = {
  bidding: [
    { title: "Passing is useful", prompt: "South deals. Which opening describes this hand in Acol Foundation?", why: "This balanced hand is below the 12-point opening range. Pass.", options: ["Pass", "1C", "1NT"],
      positions: [{ hand: low, call: "Pass" }, { hand: "QS 8S 3S KH 9H 2H JD 8D 4D 10C 7C 5C 2C", call: "Pass" }] },
    { title: "The weak notrump", prompt: "South deals. Which opening shows this balanced hand?", why: "A balanced 12-14 opens 1NT in this system. It does not promise 15-17.", options: ["Pass", "1C", "1NT"],
      positions: [{ hand: thirteen, call: "1NT" }, { hand: fourteen, call: "1NT" }] },
    { title: "Four cards can be enough", prompt: "South deals with a singleton club. Choose an opening with a four-card major.", why: "With 4-4-4-1 shape and a singleton club, open 1♥ in this Acol agreement. The shape is not balanced, and a major need not contain five cards.", options: ["Pass", "1C", "1H", "1NT"],
      positions: [{ hand: "AS KS 8S 3S QH 7H 5H 2H JD 9D 6D 4D QC", call: "1H" }, { hand: "AS QS 7S 2S KH 9H 5H 3H KD 8D 6D 4D JC", call: "1H" }] }
  ],
  responding: [
    { title: "Stop below game", prompt: "North opens 1NT and East passes. Your hand has no four-card major. What now?", why: "Opposite 12-14, this hand cannot reach the usual 25-point game guide. Pass and keep the seven-trick target.", options: ["Pass", "2NT", "3NT"], positions: [{ hand: ten, call: "Pass", calls: response }, { hand: nine, call: "Pass", calls: response }] },
    { title: "Invite the maximum", prompt: "North opens a weak 1NT. Is game certain, possible, or too far away?", why: "11-12 opposite 12-14 makes game possible but not certain. Invite with 2NT; this table accepts with 14. Points do not guarantee tricks.", options: ["Pass", "2NT", "3NT"], positions: [{ hand: "AS 8S 3S QH 7H 2H KD 9D 4D QC 8C 6C 2C", call: "2NT", calls: response }, { hand: twelve, call: "2NT", calls: response }] },
    { title: "Reach the game target", prompt: "North opens 1NT. Choose the partnership target with this balanced hand.", why: "With 13 or more here, even partner's minimum reaches the usual 25-point guide. Bid 3NT, a nine-trick game target, not a promise of nine tricks.", options: ["Pass", "2NT", "3NT"], positions: [{ hand: thirteen, call: "3NT", calls: response }, { hand: fourteen, call: "3NT", calls: response }] }
  ],
  support: [
    { title: "Show four-card support", prompt: "North opens 1♥ and East passes. Choose your raise.", why: "Four promised hearts plus your four give at least eight trumps. With 6-9 HCP, raise to 2♥ without inviting game.", options: ["Pass", "2H", "3H", "4H"], positions: [{ hand: "KS 7S 2S QH 8H 5H 3H JD 9D 4D 10C 6C 2C", call: "2H", calls: major("H") }, { hand: "AS 8S 3S QH 7H 5H 2H KD 9D 4D 10C 8C 2C", call: "2H", calls: major("H") }] },
    { title: "Invite with a fit", prompt: "North opens 1♠ and East passes. How high should you raise?", why: "With four-card support and 10-12 HCP, 3♠ invites game. Neither the eight-card fit nor the points guarantee tricks.", options: ["Pass", "2S", "3S", "4S"], positions: [{ hand: "KS 9S 5S 4S AH 8H 2H QD 7D 3D JC 9C 2C", call: "3S", calls: major("S") }, { hand: "AS 9S 5S 3S KH 7H 2H QD 8D 4D KC 10C 2C", call: "3S", calls: major("S") }] },
    { title: "Bid the major game", prompt: "North opens 1♥ and East passes. Choose the ten-trick target with this fit.", why: "This hand has four-card support and 13+ HCP. Bid 4♥ to choose the major-suit game; do not confuse points with guaranteed tricks.", options: ["Pass", "2H", "3H", "4H"], positions: [{ hand: "AS 8S 3S QH 7H 5H 2H KD 9D 4D AC 8C 2C", call: "4H", calls: major("H") }, { hand: "KS 9S 4S AH 8H 5H 2H AD 7D 3D KC 9C 2C", call: "4H", calls: major("H") }] }
  ],
  rebidding: [
    { title: "A rebid is not an opening", prompt: "You opened 1♦. Partner responded 1♠; both opponents passed. Show your balanced strength without spade support.", why: "After a one-level new-suit response, 1NT rebid shows 15-16 balanced. That differs from the 12-14 opening 1NT.", options: ["Pass", "1NT", "2NT", "3NT"], positions: [{ hand: "AS QS 3S KH 8H 2H AD JD 7D 4D JC 6C 2C", call: "1NT", calls: rebid }, { hand: "AS QS 3S KH 8H 2H AD JD 7D 4D QC 6C 2C", call: "1NT", calls: rebid }] },
    { title: "Show the stronger range", prompt: "After your 1♦ and partner's 1♠, choose the balanced rebid.", why: "17-18 balanced makes a jump rebid to 2NT. Partner judges game from this new range, not the weak opening range.", options: ["Pass", "1NT", "2NT", "3NT"], positions: [{ hand: "AS QS 3S KH 8H 2H AD JD 7D 4D KC 6C 2C", call: "2NT", calls: rebid }, { hand: "AS QS 3S KH 8H 2H AD JD 7D 4D AC 6C 2C", call: "2NT", calls: rebid }] },
    { title: "Describe nineteen", prompt: "You opened 1♦ and heard 1♠. There is no four-card spade fit. What does this balanced hand rebid?", why: "With 19 balanced, jump to 3NT after the one-level response. You have not opened a weak notrump.", options: ["Pass", "1NT", "2NT", "3NT"], positions: [{ hand: "AS KS 3S KH 8H 2H AD JD 7D 4D AC 6C 2C", call: "3NT", calls: rebid }, { hand: "AS KS 4S KH 9H 3H AD JD 8D 5D AC 7C 2C", call: "3NT", calls: rebid }] }
  ],
  stayman: [
    { title: "Ask about a major", prompt: "Partner opens 1NT. With four spades and invitation strength, how can you look for a fit?", why: "2♣ is Stayman: ask about a four-card major before choosing notrump. It is not a natural club bid or a strong opening.", options: ["Pass", "2C", "2S", "3NT"], positions: [{ hand: "AS QS 8S 3S KH 7H 2H JD 9D 4D JC 8C 2C", call: "2C", calls: response }, { hand: "KS QS 8S 3S AH 7H 2H JD 9D 4D QC 8C 2C", call: "2C", calls: response }] },
    { title: "Answer the enquiry", prompt: "You opened 1NT. Partner asks 2♣. You have no four-card major: what is your reply?", why: "2♦ denies a four-card major. It does not promise diamonds. With four hearts answer 2♥; otherwise four spades answer 2♠.", options: ["Pass", "2D", "2H", "2S"], positions: [{ hand: thirteen, call: "2D", calls: enquiry }, { hand: fourteen, call: "2D", calls: enquiry }] },
    { title: "Use the answer", prompt: "North opened 1NT, you asked 2♣, and North answered 2♥. Choose the target with your heart fit.", why: "Partner's answer promises at least four hearts. Your four-card support and 13+ HCP choose 4♥, a ten-trick game target.", options: ["Pass", "2NT", "3H", "4H"], positions: [{ hand: "AS 8S 3S QH 7H 5H 2H KD 9D 4D AC 8C 2C", call: "4H", calls: fit("H") }, { hand: "KS 9S 4S AH 8H 5H 2H AD 7D 3D KC 9C 2C", call: "4H", calls: fit("H") }] }
  ]
};

export function acolChoiceSteps(topic: AcolTopic): BridgeChoiceStep[] {
  return biddingLesson(topic, "acol-foundation", acolPrinciples[topic], examples[topic]);
}
