import type { BridgeAuctionCall, BridgeContractState, BridgeStrain, FullHandState, Seat } from "../lessonTypes";
import { parseBridgeBid, suggestBridgeCall } from "../bridgeBidding";
import { trickTakingSeats as seats } from "./trickTakingScore";

export type BridgeBidOption = {
  id: string;
  level: number;
  strain: BridgeStrain;
  label: string;
  longLabel: string;
  target: number;
  order: number;
};

export type BridgeCallOption = "Pass" | "Double" | "Redouble" | BridgeBidOption["id"];

export type BridgeAuctionStatus = {
  complete: boolean;
  passedOut: boolean;
  currentSeat: Seat;
  lastBid?: BridgeAuctionCall;
  doubled: boolean;
  redoubled: boolean;
};

const bridgeStrainOrder: BridgeStrain[] = ["C", "D", "H", "S", "NT"];
const bridgeStrainSymbols: Record<BridgeStrain, string> = {
  C: "♣",
  D: "♦",
  H: "♥",
  S: "♠",
  NT: "NT"
};
const bridgeStrainNames: Record<BridgeStrain, string> = {
  C: "Clubs",
  D: "Diamonds",
  H: "Hearts",
  S: "Spades",
  NT: "No Trump"
};
export const bridgeBidOptions: BridgeBidOption[] = Array.from({ length: 7 }, (_, levelIndex) => {
  const level = levelIndex + 1;
  return bridgeStrainOrder.map((strain, strainIndex) => ({
    id: `${level}${strain}`,
    level,
    strain,
    label: `${level}${bridgeStrainSymbols[strain]}`,
    longLabel: `${level} ${bridgeStrainNames[strain]}`,
    target: level + 6,
    order: levelIndex * bridgeStrainOrder.length + strainIndex
  }));
}).flat();

export function bridgeBidById(id: string) {
  return bridgeBidOptions.find((bid) => bid.id === id) ?? bridgeBidOptions[4];
}

export function bridgeBidFromCall(call: string) {
  const parsed = parseBridgeBid(call);
  return bridgeBidOptions.find(bid => bid.id === parsed?.id);
}

export function bridgeSideForSeat(seat: Seat): "NS" | "EW" {
  return seats.indexOf(seat) % 2 === 0 ? "NS" : "EW";
}

export function bridgeAuctionStatus(calls: BridgeAuctionCall[], dealerIndex: number): BridgeAuctionStatus {
  const currentSeat = seats[(dealerIndex + calls.length) % 4];
  const lastBid = [...calls].reverse().find((call) => Boolean(bridgeBidFromCall(call.call)));
  const callsAfterLastBid = lastBid ? calls.slice(calls.lastIndexOf(lastBid) + 1) : calls;
  const passedOut = !lastBid && calls.length >= 4 && calls.slice(-4).every((call) => normalizeBridgeCall(call.call) === "Pass");
  const complete = passedOut || Boolean(lastBid && callsAfterLastBid.length >= 3 && callsAfterLastBid.slice(-3).every((call) => normalizeBridgeCall(call.call) === "Pass"));
  const modifier = callsAfterLastBid.map(call => normalizeBridgeCall(call.call)).filter(call => call === "Double" || call === "Redouble").at(-1);
  const doubled = modifier === "Double";
  const redoubled = modifier === "Redouble";

  return { complete, passedOut, currentSeat, lastBid, doubled, redoubled };
}

function bridgeLastBidOption(calls: BridgeAuctionCall[]) {
  return bridgeBidFromCall([...calls].reverse().find((call) => Boolean(bridgeBidFromCall(call.call)))?.call ?? "");
}

function bridgeCanBid(option: BridgeBidOption, calls: BridgeAuctionCall[]) {
  const lastBid = bridgeLastBidOption(calls);
  return !lastBid || option.order > lastBid.order;
}

function bridgeCanDouble(calls: BridgeAuctionCall[], seat: Seat, dealerIndex: number) {
  const status = bridgeAuctionStatus(calls, dealerIndex);
  if (!status.lastBid || status.doubled || status.redoubled) {
    return false;
  }

  return bridgeSideForSeat(status.lastBid.seat) !== bridgeSideForSeat(seat);
}

function bridgeCanRedouble(calls: BridgeAuctionCall[], seat: Seat, dealerIndex: number) {
  const status = bridgeAuctionStatus(calls, dealerIndex);
  if (!status.lastBid || !status.doubled || status.redoubled) {
    return false;
  }

  return bridgeSideForSeat(status.lastBid.seat) === bridgeSideForSeat(seat);
}

export function bridgeLegalCallOptions(calls: BridgeAuctionCall[], seat: Seat, dealerIndex: number): BridgeCallOption[] {
  const status = bridgeAuctionStatus(calls, dealerIndex);
  if (status.complete || status.currentSeat !== seat) return [];
  const options: BridgeCallOption[] = ["Pass"];

  if (bridgeCanDouble(calls, seat, dealerIndex)) {
    options.push("Double");
  }
  if (bridgeCanRedouble(calls, seat, dealerIndex)) {
    options.push("Redouble");
  }

  options.push(...bridgeBidOptions.filter((bid) => bridgeCanBid(bid, calls)).map((bid) => bid.id));
  return options;
}

export function bridgeCallLabel(call: BridgeCallOption) {
  call = normalizeBridgeCall(call) ?? "Pass";
  if (call === "Pass") return "Pass";
  if (call === "Double") return "X";
  if (call === "Redouble") return "XX";
  return bridgeBidById(call).label;
}

export function bridgeCallLongLabel(call: BridgeCallOption) {
  call = normalizeBridgeCall(call) ?? "Pass";
  if (call === "Pass") return "Pass";
  if (call === "Double") return "Double";
  if (call === "Redouble") return "Redouble";
  return bridgeBidById(call).longLabel;
}

export function bridgeFinalizeContract(calls: BridgeAuctionCall[], hand: FullHandState | null): BridgeContractState | null {
  const lastBidCall = [...calls].reverse().find((call) => Boolean(bridgeBidFromCall(call.call)));
  const bid = bridgeBidFromCall(lastBidCall?.call ?? "");

  if (!lastBidCall || !bid || !hand) {
    return null;
  }

  const declarerSide = bridgeSideForSeat(lastBidCall.seat);
  const firstStrainBid = calls.find((call) => bridgeSideForSeat(call.seat) === declarerSide && bridgeBidFromCall(call.call)?.strain === bid.strain);
  const declarer = firstStrainBid?.seat ?? lastBidCall.seat;
  const declarerIndex = seats.indexOf(declarer);
  const dummy = seats[(declarerIndex + 2) % 4];
  const openingLeader = seats[(declarerIndex + 1) % 4];
  const status = bridgeAuctionStatus(calls, seats.indexOf(hand.bridgeDealer ?? "You"));
  const suffix = status.redoubled ? " redoubled" : status.doubled ? " doubled" : "";

  return {
    level: bid.level,
    strain: bid.strain,
    label: `${bid.longLabel}${suffix}`,
    declarer,
    dummy,
    target: bid.target,
    vulnerability: hand.bridgeVulnerability ?? "None",
    doubled: status.doubled,
    redoubled: status.redoubled,
    declarerSide,
    dealer: hand.bridgeDealer ?? "You",
    openingLeader
  };
}


export function normalizeBridgeCall(value: unknown): BridgeCallOption | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "PASS" || normalized === "P") return "Pass";
  if (normalized === "X" || normalized === "DOUBLE") return "Double";
  if (normalized === "XX" || normalized === "REDOUBLE") return "Redouble";
  return parseBridgeBid(value)?.id ?? null;
}

export function bridgeSuggestedCallForHand(hand: FullHandState | null, calls: BridgeAuctionCall[], seat: Seat = "You"): BridgeCallOption {
  if (!hand) return "Pass";
  const legal = bridgeLegalCallOptions(calls, seat, seats.indexOf(hand.bridgeDealer ?? "You"));
  return suggestBridgeCall(hand.hands[seats.indexOf(seat)], seat, calls, legal);
}

export function bridgeAutoAdvanceAuction(calls: BridgeAuctionCall[], hand: FullHandState): BridgeAuctionCall[] {
  const next = [...calls];
  const dealer = seats.indexOf(hand.bridgeDealer ?? "You");
  while (true) {
    const status = bridgeAuctionStatus(next, dealer);
    if (status.complete || status.currentSeat === "You") return next;
    next.push({ seat: status.currentSeat, call: bridgeCallLabel(bridgeSuggestedCallForHand(hand, next, status.currentSeat)) });
  }
}
