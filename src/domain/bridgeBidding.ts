import type { BridgeAuctionCall, Card, Seat, Suit } from "./types";
import { bridgeBiddingSystems, defaultBridgeSystem, type BridgeBiddingSystemId } from "./bridgeSystems";
import { bridgeHighCardPoints, bridgeIsBalanced, bridgeSuitCount, parseBridgeBid } from "./bridgeBidPrimitives";
import { bridgeNotrumpCall } from "./bridgeNotrump";
import { bridgeAmericanCall } from "./bridgeAmericanBidding";
export { bridgeHighCardPoints, bridgeIsBalanced, bridgeSuitCount, parseBridgeBid } from "./bridgeBidPrimitives";

// Named profiles share natural bidding mechanics, not a universal convention system.
// Frozen fixtures protect Barbu Natural; named profiles add explicit convention sequences.
const suits: Suit[] = ["S", "H", "D", "C"];
const seats: Seat[] = ["Tutor", "Right", "You", "Left"];
const longest = (cards: Card[]) => [...suits].sort((a, b) => bridgeSuitCount(cards, b) - bridgeSuitCount(cards, a))[0];

export function bridgeOpeningCall(cards: Card[], system: BridgeBiddingSystemId = defaultBridgeSystem): string {
  const profile = bridgeBiddingSystems[system];
  const points = bridgeHighCardPoints(cards);
  if (system === "standard-american" && bridgeIsBalanced(cards) && points >= 25 && points <= 27) return "3NT";
  if (points >= profile.strongTwo) return "2C";
  if (bridgeIsBalanced(cards) && points >= profile.twoNt[0]) return "2NT";
  if (bridgeIsBalanced(cards) && points >= profile.oneNt[0] && points <= profile.oneNt[1]) return "1NT";
  const count = (suit: string) => bridgeSuitCount(cards, suit);
  if (points >= profile.openingPoints) {
    if (system === "acol-foundation") {
      if (["C", "D", "H", "S"].every(suit => count(suit) === 4 || count(suit) === 1)) {
        return count("C") === 1 ? "1H" : count("D") === 1 ? "1C" : "1D";
      }
      const suit = longest(cards);
      return count("H") === 4 && count("S") === 4 && count(suit) === 4 ? "1H" : `1${suit}`;
    }
    if (count("S") >= 5 && count("S") >= count("H")) return "1S";
    if (count("H") >= 5) return "1H";
    return count("D") > count("C") || (count("D") === count("C") && count("D") >= 4) ? "1D" : "1C";
  }
  const suit = longest(cards);
  if (points >= profile.weakTwo[0] && points <= profile.weakTwo[1] && suit !== "C" && count(suit) >= 6) return `2${suit}`;
  return "Pass";
}

export function suggestBridgeCall(cards: Card[], seat: Seat, calls: BridgeAuctionCall[], legal: string[], system: BridgeBiddingSystemId = defaultBridgeSystem): string {
  const profile = bridgeBiddingSystems[system];
  const points = bridgeHighCardPoints(cards);
  const count = (suit: string) => bridgeSuitCount(cards, suit);
  const balanced = bridgeIsBalanced(cards);
  const suit = longest(cards);
  const partner = seats[(seats.indexOf(seat) + 2) % 4];
  const bids = calls.flatMap(call => { const bid = parseBridgeBid(call.call); return bid ? [{ ...bid, seat: call.seat }] : []; });
  const ours = bids.filter(bid => bid.seat === seat);
  const partners = bids.filter(bid => bid.seat === partner);
  const opponents = bids.filter(bid => bid.seat !== seat && bid.seat !== partner);
  const uncontested = !calls.some(call => call.seat !== seat && call.seat !== partner && call.call.trim().toUpperCase() !== "PASS");
  const last = bids.at(-1);
  const own = ours.at(-1);
  const partnerBid = partners.at(-1);
  const choose = (...choices: string[]) => choices.find(call => legal.includes(call)) ?? "Pass";
  const game = (strain: string) => strain === "NT" ? 3 : ["H", "S"].includes(strain) ? 4 : 5;
  const stopped = opponents.every(bid => cards.some(card => card.suit === bid.strain && (card.rank === "A" || (card.rank === "K" && count(bid.strain) >= 2) || (card.rank === "Q" && count(bid.strain) >= 3))));

  if (!last) return choose(bridgeOpeningCall(cards, system));
  if (!legal.length) return "Pass";
  const notrumpCall = bridgeNotrumpCall(cards, seat, calls, system);
  if (notrumpCall !== null) return choose(notrumpCall);
  if (system === "standard-american") {
    const call = bridgeAmericanCall(cards, seat, calls, legal);
    if (call !== null) return choose(call);
  }
  const partnerAction = [...calls].reverse().find(call => call.seat === partner && call.call !== "Pass");
  if (!own && !partnerBid && ["X", "Double"].includes(partnerAction?.call ?? "") && last.level <= 2) {
    const unbid = [...suits].filter(suit => !opponents.some(bid => bid.strain === suit)).sort((a, b) => count(b) - count(a));
    for (const suit of unbid) {
      const response = legal.find(call => { const bid = parseBridgeBid(call); return bid?.strain === suit && bid.level <= 3; });
      if (response) return response;
    }
  }

  // First response. Artificial 2C must never be treated as club support.
  if (!own && partnerBid) {
    if (partners[0].id === "2C") return choose("2D");
    if (partnerBid.strain === "NT") {
      if (partnerBid.level >= 3) return "Pass";
      const openingNotrump = bids[0] === partnerBid;
      const base = partnerBid.level === 1 ? openingNotrump ? profile.oneNt[0] : 15 : profile.twoNt[0];
      const maximum = openingNotrump ? profile.oneNt[1] : 17;
      const major = ["S", "H"].find(major => count(major) >= 6);
      if (major && points + base >= 25) return choose(`4${major}`);
      if (points + base >= 25 && stopped) return choose("3NT");
      if (partnerBid.level === 1 && points >= 25 - maximum && stopped) return choose("2NT");
      if (partnerBid.level === 1 && count(suit) >= 5 && (system === "acol-foundation" ? suit !== "C" : ["S", "H"].includes(suit))) return choose(`2${suit}`);
      return "Pass";
    }
    if (partnerBid.level === 2) {
      return count(partnerBid.strain) >= 3 && points >= 15 ? choose(`${game(partnerBid.strain)}${partnerBid.strain}`) : "Pass";
    }
    if (partnerBid.level !== 1 || points < 6) return "Pass";
    if (["H", "S"].includes(partnerBid.strain) && count(partnerBid.strain) >= profile.raiseSupport) {
      return choose(`${points >= 13 ? 4 : points >= 10 ? 3 : 2}${partnerBid.strain}`);
    }
    // Show a four-card major at the one level before raising a minor.
    const majors = count("S") >= 5 && count("S") >= count("H") ? ["S", "H"] : ["H", "S"];
    for (const major of majors) if (count(major) >= 4 && legal.includes(`1${major}`)) return `1${major}`;
    if (points >= 10 && count(suit) >= 5 && suit !== partnerBid.strain && legal.includes(`2${suit}`)) return `2${suit}`;
    if (points >= 13 && balanced && stopped) return choose("3NT");
    if (points >= 10 && balanced && stopped) return choose("2NT");
    if (count(partnerBid.strain) >= 5) return choose(`${points >= 10 ? 3 : 2}${partnerBid.strain}`);
    return stopped ? choose("1NT") : "Pass";
  }

  if (own && partnerBid && bids.indexOf(partnerBid) > bids.indexOf(own)) {
    const opened = bids[0].seat === seat;
    if (opened && ours.length === 1 && own.id === "2C" && partnerBid.id === "2D") {
      return balanced ? choose(points >= 25 ? "3NT" : "2NT") : choose(`${["H", "S"].includes(suit) ? 2 : 3}${suit}`);
    }
    if (!opened && partners[0].id === "2C") {
      if (partnerBid.strain === "NT") return points >= 3 ? choose("3NT") : "Pass";
      if (count(partnerBid.strain) >= 3) return choose(`${game(partnerBid.strain)}${partnerBid.strain}`);
      return choose("3NT");
    }
    if (partnerBid.level >= game(partnerBid.strain)) return "Pass";
    if (system === "acol-foundation" && opened && ours.length === 1 && own.level === 1 && own.strain !== "NT" && partnerBid.level <= 2 && partnerBid.strain !== "NT" && partnerBid.strain !== own.strain && balanced) {
      if (["H", "S"].includes(partnerBid.strain) && count(partnerBid.strain) >= 4) return choose(`${points >= 19 ? 4 : points >= 17 ? 3 : 2}${partnerBid.strain}`);
      const level = partnerBid.level === 1 ? points >= 19 ? 3 : points >= 17 ? 2 : 1 : points >= 17 ? 3 : 2;
      return choose(`${level}NT`);
    }
    // A suit opening followed by notrump describes a different range from opening 1NT.
    const suitOpening = bids[0].level === 1 && bids[0].strain !== "NT";
    if (system === "acol-foundation" && suitOpening && uncontested) {
      if (!opened && ours.length === 1 && own.level === 1 && partners.length === 2 && partnerBid.strain === "NT") {
        const minimum = partnerBid.level === 1 ? 15 : 17;
        if (count(own.strain) >= 5 && ["H", "S"].includes(own.strain) && points + minimum >= 25) return choose(`${count(own.strain) >= 6 ? 4 : 3}${own.strain}`);
        if (points + minimum >= 25) return choose("3NT");
        if (partnerBid.level === 1 && points + 16 >= 25) return choose("2NT");
        return count(own.strain) >= 6 ? choose(`2${own.strain}`) : "Pass";
      }
      if (opened && ours.length === 2 && own.strain === "NT") {
        if (partnerBid.id === "2NT") return points >= 16 ? choose("3NT") : "Pass";
        if (partnerBid.level === 3 && ["H", "S"].includes(partnerBid.strain)) return choose(count(partnerBid.strain) >= 3 ? `4${partnerBid.strain}` : "3NT");
      }
    }
    if (own.strain === "NT" && partnerBid.id === "2NT") return points >= (opened ? profile.oneNt[1] : 12) ? choose("3NT") : "Pass";
    if (own.strain === partnerBid.strain) {
      const needed = opened ? (partnerBid.level === 2 ? 19 : 15) : 13;
      return points >= needed ? choose(`${game(own.strain)}${own.strain}`) : "Pass";
    }
    if (own.strain === "NT") return "Pass";
    if (opened && partnerBid.id === "2NT") return points >= 15 ? choose("3NT") : "Pass";
    if (["H", "S"].includes(partnerBid.strain) && count(partnerBid.strain) >= (opened ? 4 : profile.raiseSupport)) {
      const level = points >= (opened ? 19 : 13) ? 4 : points >= (opened ? 17 : 10) ? 3 : 2;
      return choose(`${level}${partnerBid.strain}`);
    }
    if (balanced && stopped) return opened ? choose(points >= 18 ? "2NT" : "1NT", `2${own.strain}`) : choose(points >= 13 ? "3NT" : points >= 11 ? "2NT" : "Pass");
    if (count(own.strain) >= 6) return choose(`2${own.strain}`);
    if (opened) {
      for (const second of suits) if (second !== own.strain && count(second) >= 4) {
        const bid = legal.find(call => { const b = parseBridgeBid(call); return b?.strain === second && b.level <= 2; });
        if (bid && (parseBridgeBid(bid)!.level === 1 || suits.indexOf(second) > suits.indexOf(own.strain as Suit) || points >= 17)) return bid;
      }
      return choose(`2${own.strain}`);
    }
    return "Pass";
  }

  // An overcall promises a real suit; a takeout double promises support for unbid suits.
  if (!own && !partnerBid && opponents.length) {
    if (last.strain !== "NT" && last.level <= 2 && points >= 12 && count(last.strain) <= 2 && suits.filter(suit => suit !== last.strain).every(suit => count(suit) >= 3) && legal.includes("Double")) return "Double";
    if (balanced && points >= 15 && points <= 18 && stopped && legal.includes("1NT")) return "1NT";
    if (count(suit) >= 5 && points >= 10) {
      return choose(...legal.filter(call => { const bid = parseBridgeBid(call); return bid?.strain === suit && (bid.level === 1 || (bid.level === 2 && points >= 13)); }));
    }
  }
  return "Pass";
}
