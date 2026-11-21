import type { BridgeAuctionCall, Card, Seat } from "./types";
import { bridgeHighCardPoints, bridgeSuitCount, parseBridgeBid } from "./bridgeBidPrimitives";
import { bridgeBiddingSystems, type BridgeBiddingSystemId } from "./bridgeSystems";
import { trickTakingSeats as seats } from "./trickTakingScore";

// Only opening notrump (or the strong-2C balanced rebid) establishes these conventions.
// Ordinary suit-opening rebids must not accidentally become Stayman/transfer auctions.
export function bridgeNotrumpContext(calls: BridgeAuctionCall[], seat: Seat, system: BridgeBiddingSystemId) {
  const profile = bridgeBiddingSystems[system];
  if (profile.staymanMinimum === null) return null;
  const partner = seats[(seats.indexOf(seat) + 2) % 4];
  const bids = calls.flatMap(call => { const bid = parseBridgeBid(call.call); return bid ? [{ ...bid, seat: call.seat }] : []; });
  const first = bids[0];
  if (!first) return null;
  const opening = first.strain === "NT" && first.level <= (profile.transfers ? 2 : 1) ? first
    : profile.transfers && first.id === "2C" && bids[1]?.id === "2D" && bids[2]?.seat === first.seat && bids[2]?.id === "2NT" ? bids[2] : null;
  if (!opening || (opening.seat !== seat && opening.seat !== partner)) return null;
  const start = calls.findIndex(call => call.seat === opening.seat && parseBridgeBid(call.call)?.id === opening.id);
  if (calls.slice(start).some(call => {
    if (call.seat === seat || call.seat === partner || /^(Pass|P)$/i.test(call.call)) return false;
    // SAYC keeps conventions on over a double, not a suit overcall.
    return !(profile.transfers && /^(Double|X)$/i.test(call.call));
  })) return null;
  const level = opening.level + 1;
  const minimum = opening === first ? opening.level === 1 ? profile.oneNt[0] : profile.twoNt[0] : 22;
  const maximum = opening === first ? opening.level === 1 ? profile.oneNt[1] : profile.twoNt[1] : 24;
  const later = bids.slice(bids.indexOf(opening) + 1);
  return { opening, opener: opening.seat === seat, minimum, maximum, level,
    responderBids: later.filter(bid => bid.seat !== opening.seat),
    openerBids: [opening, ...later.filter(bid => bid.seat === opening.seat)] };
}

export function bridgeNotrumpCall(cards: Card[], seat: Seat, calls: BridgeAuctionCall[], system: BridgeBiddingSystemId): string | null {
  const context = bridgeNotrumpContext(calls, seat, system);
  if (!context) return null;
  const profile = bridgeBiddingSystems[system];
  const { opener, level, minimum, maximum, openerBids, responderBids } = context;
  const points = bridgeHighCardPoints(cards), count = (suit: string) => bridgeSuitCount(cards, suit);
  const response = responderBids[0], reply = openerBids[1], continuation = responderBids[1];
  const invite = Math.max(0, 25 - maximum), game = Math.max(0, 25 - minimum);
  const longestMajor = count("S") >= count("H") ? "S" : "H";
  const transferSuit = response?.id === `${level}D` ? "H" : response?.id === `${level}H` ? "S" : null;

  if (opener) {
    if (!response) return null;
    if (!reply) {
      if (response.id === `${level}C`) return `${level}${count("H") >= 4 ? "H" : count("S") >= 4 ? "S" : "D"}`;
      if (profile.transfers && transferSuit) return `${level + (level === 2 && points === maximum && count(transferSuit) >= 4 ? 1 : 0)}${transferSuit}`;
      if (response.id === "2NT") return points === maximum ? "3NT" : "Pass";
      return "Pass";
    }
    if (!continuation) return "Pass";
    if (profile.transfers && transferSuit) {
      if (continuation.id === "2NT") return count(transferSuit) >= 3 ? `${points === maximum ? 4 : 3}${transferSuit}` : points === maximum ? "3NT" : "Pass";
      if (continuation.id === "3NT") return count(transferSuit) >= 3 ? `4${transferSuit}` : "Pass";
      if (continuation.id === `3${transferSuit}`) return points === maximum ? `4${transferSuit}` : "Pass";
      return "Pass";
    }
    if (response.id === `${level}C`) {
      if (continuation.strain === "NT") {
        if (reply.strain === "H" && count("S") >= 4) return `${continuation.level >= 3 || points === maximum ? 4 : 3}S`;
        return continuation.level === 2 && points === maximum ? "3NT" : "Pass";
      }
      if (["H", "S"].includes(continuation.strain)) {
        if (continuation.level >= 4) return "Pass";
        if (reply.strain === continuation.strain) return points === maximum ? `4${continuation.strain}` : "Pass";
        return count(continuation.strain) >= 3 ? `4${continuation.strain}` : "3NT";
      }
    }
    return "Pass";
  }
  if (!response) {
    const hasMajor = count("H") >= 4 || count("S") >= 4;
    const hasFive = count(longestMajor) >= 5;
    if (profile.transfers && hasFive && (level === 2 || points >= game) && !(count("H") >= 4 && count("S") >= 4 && points >= invite))
      return `${level}${longestMajor === "H" ? "D" : "H"}`;
    if (hasMajor && points >= (level === 2 ? profile.staymanMinimum! : game)) return `${level}C`;
    if (points >= game) return "3NT";
    if (level === 2 && points >= invite) return "2NT";
    if (!profile.transfers) {
      const longest = ["S", "H", "D", "C"].sort((a, b) => count(b) - count(a))[0];
      if (longest !== "C" && count(longest) >= 5) return `2${longest}`;
    }
    return "Pass";
  }
  if (!reply) return null;
  if (continuation) {
    const later = openerBids.at(-1)!;
    return response.id === `${level}C` && later.id === "3S" && count("S") >= 4 && points >= game ? "4S" : "Pass";
  }
  if (profile.transfers && transferSuit) {
    if (level === 3) return `4${transferSuit}`;
    if (reply.level === 3) return points >= invite ? `4${transferSuit}` : "Pass";
    if (points < invite) return "Pass";
    return count(transferSuit) >= 6 ? `${points >= game ? 4 : 3}${transferSuit}` : points >= game ? "3NT" : "2NT";
  }
  if (response.id === `${level}C`) {
    if (["H", "S"].includes(reply.strain) && count(reply.strain) >= 4) return `${points >= game ? 4 : 3}${reply.strain}`;
    if (points >= game && count(longestMajor) >= 5) return `3${longestMajor}`;
    return points >= game ? "3NT" : "2NT";
  }
  return "Pass";
}
