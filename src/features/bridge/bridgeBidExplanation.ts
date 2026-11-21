import type { BridgeAuctionCall, Seat } from "../../domain/types";
import { parseBridgeBid } from "../../domain/bridgeBidding";
import { trickTakingSeats as seats } from "../../domain/trickTakingScore";
import { bridgeBiddingSystems, defaultBridgeSystem, type BridgeBiddingSystemId } from "../../domain/bridgeSystems";
import { explainNotrumpCall } from "./bridgeNotrumpExplanation";

export function explainBridgeCall(call: string, calls: BridgeAuctionCall[], seat: Seat, system: BridgeBiddingSystemId = defaultBridgeSystem): string {
  const profile = bridgeBiddingSystems[system];
  const bid = parseBridgeBid(call);
  const partner = seats[(seats.indexOf(seat) + 2) % 4];
  const prior = calls.flatMap(call => { const bid = parseBridgeBid(call.call); return bid ? [{ ...bid, seat: call.seat }] : []; });
  const partnerBid = prior.filter(bid => bid.seat === partner).at(-1);
  const own = prior.some(bid => bid.seat === seat);
  const notrumpMeaning = explainNotrumpCall(call, calls, seat, system);
  if (notrumpMeaning) return notrumpMeaning;
  if (call === "Pass") return "No further bid proposed. Pass does not always mean a weak hand.";
  if (call === "Double") return "At a low level over a suit opening, takeout shows opening strength and support for the unbid suits. Later doubles depend on the auction.";
  if (call === "Redouble") return "Extra strength after the opponents double our contract.";
  if (!bid) return "";
  if (system !== "barbu-natural" && bid.id === "4NT") return "Slam continuations are not implemented in this teaching profile. Partner will not interpret this as Blackwood or a quantitative slam invitation.";
  if (!prior.length) {
    if (bid.id === "1NT") return `${profile.oneNt.join("-")} HCP with a balanced hand.`;
    if (bid.id === "2NT") return `${profile.twoNt.join("-")} HCP with a balanced hand.`;
    if (bid.id === "3NT" && system === "standard-american") return "25-27 HCP balanced. Natural strong notrump, not a gambling minor-suit opening.";
    if (bid.id === "2C") return `${profile.strongTwo}+ HCP; artificial and forcing. ${system === "standard-american" ? "Partner uses 2 diamonds waiting, or a positive response with 8+ HCP." : "Partner responds 2 diamonds waiting."}`;
    if (bid.level === 2) return `Weak two: ${profile.weakTwo.join("-")} HCP with a six-card suit.`;
    if (bid.level === 1) return system === "acol-foundation" ? "12+ HCP, normally four or more cards. The longest suit and a sensible rebid determine the opening."
      : ["H", "S"].includes(bid.strain) ? "Opening strength with a five-card major." : "Opening strength in the better minor; open clubs with 3-3 minors.";
    if (bid.level === 3 && bid.strain !== "NT") return "Natural preemptive opening with a long suit.";
  }
  if (system === "standard-american") {
    const first = prior[0];
    const major = first?.strain === "H" || first?.strain === "S";
    if (!own && first?.id === "2C" && partnerBid?.id === "2C") {
      if (bid.id === "2NT") return "Positive response: 8+ HCP balanced, game forcing after partner's strong 2 clubs.";
      if (bid.id !== "2D") return "Positive response to strong 2 clubs: five or more cards and 8+ HCP, forcing to game.";
    }
    if (!own && major && partnerBid?.level === 1 && bid.id === "2NT") return "Jacoby 2NT: 13+ HCP in these balanced examples, four-card major support, game forcing by an unpassed hand. This is not a natural notrump invitation.";
    if (!own && first?.level === 1 && !major && first?.strain !== "NT" && bid.strain === "NT" && bid.level >= 2)
      return `${bid.level === 2 ? "13-15 HCP, game forcing" : "16-18 HCP, to play"}, balanced response to a minor opening. Not the natural 10-12 invitation used in the earlier teaching profile.`;
    if (own && first?.seat === seat && first.level === 1 && first.strain !== "NT" && partnerBid?.id === "2NT" && major) return bid.strain === first.strain ? "After Jacoby 2NT: three of the major shows extra strength; four of the major shows a minimum, without side-suit shortage."
      : bid.id === "3NT" ? "After Jacoby 2NT: intermediate strength, no side-suit shortage." : "After Jacoby 2NT: a new suit at the three level shows a singleton or void there, not length.";
    if (own && first?.seat === seat && first.level === 1 && first.strain !== "NT" && partnerBid?.level === 1 && partnerBid.strain !== "NT" && bid.strain === "NT")
      return `${bid.level === 1 ? "12-14" : "18-19"} HCP balanced rebid after a one-level new-suit response. This is not an opening 1NT.`;
    if (!own && first?.level === 2 && first.strain !== "C" && first.strain !== "NT" && bid.id === "2NT") return "Forcing enquiry over a weak two. Opener repeats the suit with 5-8, or shows an ace/king feature with 9-11 (3NT without a feature).";
  }
  if (!own && partnerBid?.id === "2C" && bid.id === "2D") return "Artificial waiting response to strong 2 clubs; says nothing about diamonds and keeps the auction open.";
  if (own && prior[0]?.seat === seat && prior[0].id === "2C" && partnerBid?.id === "2D" && bid.id === "2NT") return `${profile.strongTwo}-24 HCP balanced after the strong 2 clubs opening. Partner may pass with a very weak hand.`;
  if (!own && partnerBid?.id === "1NT") {
    if (bid.id === "2NT") return `${25 - profile.oneNt[1]}-${24 - profile.oneNt[0]} HCP, inviting game opposite partner's ${profile.oneNt.join("-")}. Partner accepts with a maximum.`;
    if (bid.id === "3NT") return `${25 - profile.oneNt[0]}+ HCP opposite partner's ${profile.oneNt.join("-")}; enough combined strength for game.`;
    if (bid.level === 2 && ["H", "S"].includes(bid.strain)) return "Natural sign-off with five or more cards in the major. Transfers are not used at this table.";
    if (bid.id === "2D" && system === "acol-foundation") return "Natural weak takeout with at least five diamonds. Opener passes; this is not a transfer.";
  }
  if (partnerBid && bid.strain === partnerBid.strain && !own && partnerBid.level === 1 && ["H", "S"].includes(bid.strain)) return `${bid.level === 2 ? system === "standard-american" ? "6-10" : "6-9" : bid.level === 3 ? system === "standard-american" ? "11-12" : "10-12" : "13+"} HCP with at least ${profile.raiseSupport === 3 ? "three" : "four"}-card support; ${bid.level === 2 ? "simple raise" : bid.level === 3 ? "invitational raise" : "game raise"}.`;
  if (!own && partnerBid?.level === 1 && bid.strain === "NT") return bid.level === 1 ? `${system === "standard-american" ? "6-10" : "6-9"} HCP without a suitable major raise or one-level new suit. A 1NT response need not be balanced.` : bid.level === 2 ? `10-12 HCP balanced, inviting game. This is a response, not a ${profile.twoNt.join("-")} point opening.` : "13+ HCP balanced, proposing notrump game opposite partner's opening strength.";
  if (own && system === "acol-foundation" && prior[0]?.seat === seat && prior[0].level === 1 && prior[0].strain !== "NT" && partnerBid?.level === 1 && partnerBid.strain !== "NT" && bid.strain === "NT") return `${bid.level === 1 ? "15-16" : bid.level === 2 ? "17-18" : "19"} HCP balanced after a one-level new-suit response. This is a rebid, not the weak 1NT opening.`;
  if (own) return "Rebid: interpret this with the earlier calls, not the opening-bid point range. Raises show support; notrump rebids describe strength and shape.";
  if (partnerBid) return system === "standard-american"
    ? "Natural response. A new suit at the one level shows 6+ HCP and four cards; at the two level these examples use 11+ HCP. A two-over-one response is forcing for one round, not automatically to game."
    : "Natural response. A new suit at the one level shows 6+ HCP and four cards; at the two level it shows 10+ HCP and length.";
  return "Natural overcall: a new suit promises length. Notrump requires balanced strength and a stopper in the opponents' suit.";
}
