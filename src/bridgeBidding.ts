import type { BridgeAuctionCall, Card, Seat, Suit } from "./lessonTypes";

// Barbu Natural: five-card majors, strong notrump, natural responses, 2D waiting.
// Keep the decision order aligned with bridge_suggest_call and its shared fixtures.
const suits: Suit[] = ["S", "H", "D", "C"];
const seats: Seat[] = ["Tutor", "Right", "You", "Left"];
export const bridgeHighCardPoints = (cards: Card[]) => cards.reduce((n, card) => n + ({ A: 4, K: 3, Q: 2, J: 1 }[card.rank] ?? 0), 0);
export const bridgeSuitCount = (cards: Card[], suit: string) => cards.filter(card => card.suit === suit).length;
export const bridgeIsBalanced = (cards: Card[]) => ["3-3-3-4", "2-3-4-4", "2-3-3-5"].includes(suits.map(suit => bridgeSuitCount(cards, suit)).sort().join("-"));
const longest = (cards: Card[]) => [...suits].sort((a, b) => bridgeSuitCount(cards, b) - bridgeSuitCount(cards, a))[0];

export function parseBridgeBid(call: string) {
  const normalized = call.replace(/[♣♦♥♠]/g, suit => ({ "♣": "C", "♦": "D", "♥": "H", "♠": "S" }[suit]!)).replace(/\s+/g, "");
  const match = /^([1-7])(C|D|H|S|NT)$/.exec(normalized);
  return match ? { level: Number(match[1]), strain: match[2], id: normalized } : null;
}

export function bridgeOpeningCall(cards: Card[]): string {
  const points = bridgeHighCardPoints(cards);
  if (points >= 22) return "2C";
  if (bridgeIsBalanced(cards) && points >= 20) return "2NT";
  if (bridgeIsBalanced(cards) && points >= 15 && points <= 17) return "1NT";
  const count = (suit: string) => bridgeSuitCount(cards, suit);
  if (points >= 13) {
    if (count("S") >= 5 && count("S") >= count("H")) return "1S";
    if (count("H") >= 5) return "1H";
    return count("D") > count("C") || (count("D") === count("C") && count("D") >= 4) ? "1D" : "1C";
  }
  const suit = longest(cards);
  if (points >= 5 && points <= 11 && suit !== "C" && count(suit) >= 6) return `2${suit}`;
  return "Pass";
}

export function suggestBridgeCall(cards: Card[], seat: Seat, calls: BridgeAuctionCall[], legal: string[]): string {
  const points = bridgeHighCardPoints(cards);
  const count = (suit: string) => bridgeSuitCount(cards, suit);
  const balanced = bridgeIsBalanced(cards);
  const suit = longest(cards);
  const partner = seats[(seats.indexOf(seat) + 2) % 4];
  const bids = calls.flatMap(call => { const bid = parseBridgeBid(call.call); return bid ? [{ ...bid, seat: call.seat }] : []; });
  const ours = bids.filter(bid => bid.seat === seat);
  const partners = bids.filter(bid => bid.seat === partner);
  const opponents = bids.filter(bid => bid.seat !== seat && bid.seat !== partner);
  const last = bids.at(-1);
  const own = ours.at(-1);
  const partnerBid = partners.at(-1);
  const choose = (...choices: string[]) => choices.find(call => legal.includes(call)) ?? "Pass";
  const game = (strain: string) => strain === "NT" ? 3 : ["H", "S"].includes(strain) ? 4 : 5;
  const stopped = opponents.every(bid => cards.some(card => card.suit === bid.strain && (card.rank === "A" || (card.rank === "K" && count(bid.strain) >= 2) || (card.rank === "Q" && count(bid.strain) >= 3))));

  if (!last) return choose(bridgeOpeningCall(cards));
  if (!legal.length) return "Pass";
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
      const base = partnerBid.level === 1 ? 15 : 20;
      const major = ["S", "H"].find(major => count(major) >= 6);
      if (major && points + base >= 25) return choose(`4${major}`);
      if (points + base >= 25 && stopped) return choose("3NT");
      if (partnerBid.level === 1 && points >= 8 && stopped) return choose("2NT");
      if (partnerBid.level === 1 && count(suit) >= 5 && ["S", "H"].includes(suit)) return choose(`2${suit}`);
      return "Pass";
    }
    if (partnerBid.level === 2) {
      return count(partnerBid.strain) >= 3 && points >= 15 ? choose(`${game(partnerBid.strain)}${partnerBid.strain}`) : "Pass";
    }
    if (partnerBid.level !== 1 || points < 6) return "Pass";
    if (["H", "S"].includes(partnerBid.strain) && count(partnerBid.strain) >= 3) {
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
    if (own.strain === "NT" && partnerBid.id === "2NT") return points >= (opened ? 17 : 12) ? choose("3NT") : "Pass";
    if (own.strain === partnerBid.strain) {
      const needed = opened ? (partnerBid.level === 2 ? 19 : 15) : 13;
      return points >= needed ? choose(`${game(own.strain)}${own.strain}`) : "Pass";
    }
    if (own.strain === "NT") return "Pass";
    if (opened && partnerBid.id === "2NT") return points >= 15 ? choose("3NT") : "Pass";
    if (["H", "S"].includes(partnerBid.strain) && count(partnerBid.strain) >= (opened ? 4 : 3)) {
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
