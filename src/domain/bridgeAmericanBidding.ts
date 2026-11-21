import type { BridgeAuctionCall, Card, Seat } from "./types";
import { bridgeHighCardPoints, bridgeIsBalanced, bridgeSuitCount, parseBridgeBid } from "./bridgeBidPrimitives";
import { trickTakingSeats as seats } from "./trickTakingScore";

// Supported SAYC-based sequences. Returning null delegates ordinary natural judgment.
export function bridgeAmericanCall(cards: Card[], seat: Seat, calls: BridgeAuctionCall[], legal: string[]): string | null {
  const partner = seats[(seats.indexOf(seat) + 2) % 4];
  const bids = calls.flatMap(call => { const bid = parseBridgeBid(call.call); return bid ? [{ ...bid, seat: call.seat }] : []; });
  const first = bids[0];
  if (!first || (first.seat !== seat && first.seat !== partner)) return null;
  if (calls.some(call => call.seat !== seat && call.seat !== partner && !/^(Pass|P)$/i.test(call.call))) return null;
  const opener = first.seat === seat, ours = bids.filter(bid => bid.seat === seat), partners = bids.filter(bid => bid.seat === partner);
  const response = bids.find(bid => bid.seat !== first.seat), own = ours.at(-1), other = partners.at(-1);
  const points = bridgeHighCardPoints(cards), count = (suit: string) => bridgeSuitCount(cards, suit), balanced = bridgeIsBalanced(cards);
  const suits = ["S", "H", "D", "C"].sort((a, b) => count(b) - count(a));
  const longest = suits[0], major = (suit: string) => suit === "H" || suit === "S";
  const available = (...choices: string[]) => choices.find(call => legal.includes(call)) ?? "Pass";
  const previouslyPassed = calls.slice(0, calls.findIndex(call => !!parseBridgeBid(call.call))).some(call => call.seat === seat);
  if (first.id === "2C") {
    if (!opener && !own) {
      const positive = suits.find(suit => count(suit) >= 5 && points >= 8);
      return positive ? `${major(positive) ? 2 : 3}${positive}` : balanced && points >= 8 ? "2NT" : "2D";
    }
    if (opener && ours.length === 1 && response) {
      if (balanced) return available(points >= 25 ? "3NT" : "2NT", "3NT");
      return available(`${major(longest) ? 2 : 3}${longest}`, `3${longest}`, "3NT");
    }
    if (!opener && other && partners.length >= 2) {
      if (other.strain === "NT") return points >= Math.max(0, 25 - (other.id === "2NT" ? 22 : 25)) ? "3NT" : "Pass";
      if (major(other.strain) && count(other.strain) >= 3) return `4${other.strain}`;
      if (!balanced && count(longest) >= 5 && own?.strain !== longest) return available(`2${longest}`, `3${longest}`, "3NT");
      return available("3NT", `4${other.strain}`);
    }
    return null;
  }
  if (first.level === 2 && first.strain !== "NT") {
    if (!opener && !own) {
      if (points >= 15) return "2NT";
      return count(first.strain) >= 3 ? `3${first.strain}` : "Pass";
    }
    if (opener && ours.length === 1 && response?.id === "2NT") {
      if (points <= 8) return `3${first.strain}`;
      const feature = ["C", "D", "H", "S"].find(suit => suit !== first.strain && cards.some(card => card.suit === suit && (card.rank === "A" || card.rank === "K")));
      return feature ? `3${feature}` : "3NT";
    }
    if (opener && ours.length === 1 && response && response.strain !== first.strain && response.strain !== "NT")
      return major(response.strain) && count(response.strain) >= 3 ? `3${response.strain}` : available(`3${first.strain}`, "3NT");
    if (!opener && own?.id === "2NT" && other && partners.length === 2)
      return points + (other.strain === first.strain ? 5 : 9) >= 25 ? available("3NT", `4${first.strain}`) : available(`3${first.strain}`, "Pass");
    return null;
  }
  if (first.level !== 1 || first.strain === "NT") return null;
  // Jacoby 2NT is a game-forcing major raise by an unpassed responder.
  const responderPassed = calls.slice(0, calls.findIndex(call => !!parseBridgeBid(call.call))).some(call => call.seat !== first.seat && call.seat === (opener ? partner : seat));
  if (major(first.strain) && response?.id === "2NT" && !responderPassed) {
    if (opener && ours.length === 1) {
      const short = ["C", "D", "H", "S"].find(suit => suit !== first.strain && count(suit) <= 1);
      return short ? `3${short}` : points >= 18 ? `3${first.strain}` : points >= 15 ? "3NT" : `4${first.strain}`;
    }
    return `4${first.strain}`;
  }
  if (!opener && !own) {
    if (points < 6) return "Pass";
    if (major(first.strain) && count(first.strain) >= 3) {
      if (count(first.strain) >= 4 && points >= 13 && !previouslyPassed) return "2NT";
      return `${points >= 13 ? 4 : points >= 11 ? 3 : 2}${first.strain}`;
    }
    for (const suit of ["H", "S"]) if (count(suit) >= 4 && legal.includes(`1${suit}`)) return `1${suit}`;
    const second = suits.find(suit => suit !== first.strain && count(suit) >= (suit === "H" && first.strain === "S" ? 5 : 4));
    if (points >= 11 && second && legal.includes(`2${second}`)) return `2${second}`;
    if (!major(first.strain) && balanced && points >= 13) return points >= 16 ? "3NT" : "2NT";
    if (!major(first.strain) && count(first.strain) >= (first.strain === "C" ? 5 : 4)) return `${points >= 11 ? 3 : 2}${first.strain}`;
    return "1NT";
  }
  if (opener && ours.length === 1 && response && response.strain !== first.strain) {
    if (response.strain === "NT") {
      if (response.level === 2 && !major(first.strain)) return "3NT";
      if (response.level === 1 && balanced && points <= 14) return "Pass";
      return null;
    }
    if (major(response.strain) && count(response.strain) >= 4) return `${points >= 19 ? 4 : points >= 16 ? 3 : 2}${response.strain}`;
    if (balanced) {
      if (response.level === 1) {
        if (count("S") >= 4 && legal.includes("1S")) return "1S";
        return points >= 18 ? "2NT" : "1NT";
      }
      return points >= 15 ? "3NT" : "2NT";
    }
    return null;
  }
  if (!opener && ours.length === 1 && other && partners.length === 2 && other.strain === "NT") {
    const twoOverOne = own!.level === 2;
    const min = other.level === 1 || twoOverOne ? 12 : 18, max = other.level === 1 || twoOverOne ? 14 : 19;
    if (points + min >= 25) return "3NT";
    if (points + max >= 25) return available("2NT", "3NT");
    if (twoOverOne) return available(`3${own!.strain}`, "3NT");
    return count(own!.strain) >= 6 ? available(`2${own!.strain}`) : "Pass";
  }
  if (!opener && ours.length === 1 && other && partners.length === 2 && other.strain !== first.strain && major(other.strain)) {
    // Opener's second suit promises four, not the five of an opening major.
    if (count(other.strain) >= 4) return available(`${points >= 13 ? 4 : 3}${other.strain}`);
    if (balanced) return available(points >= 13 ? "3NT" : "2NT");
    return available(`3${own!.strain}`, "2NT");
  }
  if (opener && ours.length === 2 && own?.id === "1NT" && other?.id === "2NT") return points >= 14 ? "3NT" : "Pass";
  return null;
}
