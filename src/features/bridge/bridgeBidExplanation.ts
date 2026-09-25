import type { BridgeAuctionCall, Seat } from "../../domain/types";
import { parseBridgeBid } from "../../domain/bridgeBidding";
import { trickTakingSeats as seats } from "../../domain/trickTakingScore";

export function explainBridgeCall(call: string, calls: BridgeAuctionCall[], seat: Seat): string {
  const bid = parseBridgeBid(call);
  const partner = seats[(seats.indexOf(seat) + 2) % 4];
  const prior = calls.flatMap(call => { const bid = parseBridgeBid(call.call); return bid ? [{ ...bid, seat: call.seat }] : []; });
  const partnerBid = prior.filter(bid => bid.seat === partner).at(-1);
  const own = prior.some(bid => bid.seat === seat);
  if (call === "Pass") return "No further bid proposed. Pass does not always mean a weak hand.";
  if (call === "Double") return "At a low level over a suit opening, takeout shows opening strength and support for the unbid suits. Later doubles depend on the auction.";
  if (call === "Redouble") return "Extra strength after the opponents double our contract.";
  if (!bid) return "";
  if (!prior.length) {
    if (bid.id === "1NT") return "15-17 HCP with a balanced hand.";
    if (bid.id === "2NT") return "20-21 HCP with a balanced hand.";
    if (bid.id === "2C") return "22+ HCP; artificial and forcing. Partner responds 2 diamonds waiting.";
    if (bid.level === 2) return "Weak two: 5-11 HCP with a six-card suit.";
    if (bid.level === 1) return ["H", "S"].includes(bid.strain) ? "Opening strength with a five-card major." : "Opening strength in the better minor; open clubs with 3-3 minors.";
    if (bid.level === 3 && bid.strain !== "NT") return "Natural preemptive opening with a long suit.";
  }
  if (!own && partnerBid?.id === "2C" && bid.id === "2D") return "Artificial waiting response to strong 2 clubs; says nothing about diamonds and keeps the auction open.";
  if (own && prior[0]?.seat === seat && prior[0].id === "2C" && partnerBid?.id === "2D" && bid.id === "2NT") return "22-24 HCP balanced after the strong 2 clubs opening. Partner may pass with a very weak hand.";
  if (!own && partnerBid?.id === "1NT") {
    if (bid.id === "2NT") return "8-9 HCP, inviting game opposite partner's 15-17. Partner accepts with a maximum.";
    if (bid.id === "3NT") return "10+ HCP opposite partner's 15-17; enough combined strength for game.";
    if (bid.level === 2 && ["H", "S"].includes(bid.strain)) return "Natural sign-off with five or more cards in the major. Transfers are not used at this table.";
  }
  if (partnerBid && bid.strain === partnerBid.strain && !own && partnerBid.level === 1 && ["H", "S"].includes(bid.strain)) return `${bid.level === 2 ? "6-9" : bid.level === 3 ? "10-12" : "13+"} HCP with at least three-card support; ${bid.level === 2 ? "simple raise" : bid.level === 3 ? "invitational raise" : "game raise"}.`;
  if (!own && partnerBid?.level === 1 && bid.strain === "NT") return bid.level === 1 ? "6-9 HCP without a suitable major raise or one-level new suit. A 1NT response need not be balanced." : bid.level === 2 ? "10-12 HCP balanced, inviting game. This is a response, not a 20-21 point opening." : "13+ HCP balanced, proposing notrump game opposite partner's opening strength.";
  if (own) return "Rebid: interpret this with the earlier calls, not the opening-bid point range. Raises show support; notrump rebids describe strength and shape.";
  if (partnerBid) return "Natural response. A new suit at the one level shows 6+ HCP and four cards; at the two level it shows 10+ HCP and length.";
  return "Natural overcall: a new suit promises length. Notrump requires balanced strength and a stopper in the opponents' suit.";
}
