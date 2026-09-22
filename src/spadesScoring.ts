import type { FullHandState, Seat } from "./lessonTypes";
import type { SpadesBidState } from "./domain/spadesBidding";
import { trickTakingSeats } from "./domain/trickTakingScore";
export type SpadesScoreState = {
  playerSide: number;
  opponentSide: number;
};

export type SpadesHandResult = {
  handNumber: number;
  playerSideBid: number;
  opponentSideBid: number;
  playerSideTricks: number;
  opponentSideTricks: number;
  playerSideScore: number;
  opponentSideScore: number;
  playerSideBags: number;
  opponentSideBags: number;
  playerSideBagPenalty: number;
  opponentSideBagPenalty: number;
  nilResults: Array<{ seat: Seat; bid: number; tricks: number; score: number }>;
};


export const spadesPlayerSideSeats: Seat[] = ["You", "Tutor"];
export const spadesOpponentSideSeats: Seat[] = ["Left", "Right"];
export function spadesSideBid(bids: SpadesBidState, seats: Seat[]) {
  return seats.reduce((total, seat) => total + (bids[seat] > 0 ? bids[seat] : 0), 0);
}

export function spadesSideTricks(tricks: Record<Seat, number>, seats: Seat[]) {
  return seats.reduce((total, seat) => total + tricks[seat], 0);
}

export function spadesNilResultsForSide(tricks: Record<Seat, number>, bids: SpadesBidState, seats: Seat[]) {
  return seats
    .filter((seat) => bids[seat] === 0)
    .map((seat) => {
      const seatTricks = tricks[seat];
      return {
        seat,
        bid: bids[seat],
        tricks: seatTricks,
        score: seatTricks === 0 ? 100 : -100
      };
    });
}

export function spadesScoreForSide(
  tricks: Record<Seat, number>,
  bids: SpadesBidState,
  seats: Seat[],
  currentBags: number
) {
  const bid = spadesSideBid(bids, seats);
  const sideTricks = spadesSideTricks(tricks, seats);
  const nilResults = spadesNilResultsForSide(tricks, bids, seats);
  const nilScore = nilResults.reduce((total, result) => total + result.score, 0);

  if (sideTricks < bid) {
    return { score: -10 * bid + nilScore, bags: 0, bagPenalty: 0, nilResults };
  }

  const handBags = Math.max(0, sideTricks - bid);
  const totalBags = currentBags + handBags;
  const bagPenalty = Math.floor(totalBags / 10) * 100;
  const remainingBags = totalBags % 10;

  return {
    score: bid * 10 + handBags + nilScore - bagPenalty,
    bags: remainingBags - currentBags,
    bagPenalty,
    nilResults
  };
}

export function spadesHandResultFor(hand: FullHandState, handNumber: number, bids: SpadesBidState, bags: SpadesScoreState): SpadesHandResult {
  const partnershipTricks = { playerSide: hand.completedTricks.filter(trick => trick.winnerIndex % 2 === 0).length, opponentSide: hand.completedTricks.filter(trick => trick.winnerIndex % 2 === 1).length };
  const seatTricks = Object.fromEntries(trickTakingSeats.map(seat => [seat, hand.completedTricks.filter(trick => trick.winner === seat).length])) as Record<Seat, number>;
  const playerSide = spadesScoreForSide(seatTricks, bids, spadesPlayerSideSeats, bags.playerSide);
  const opponentSide = spadesScoreForSide(seatTricks, bids, spadesOpponentSideSeats, bags.opponentSide);

  return {
    handNumber,
    playerSideBid: spadesSideBid(bids, spadesPlayerSideSeats),
    opponentSideBid: spadesSideBid(bids, spadesOpponentSideSeats),
    playerSideTricks: partnershipTricks.playerSide,
    opponentSideTricks: partnershipTricks.opponentSide,
    playerSideScore: playerSide.score,
    opponentSideScore: opponentSide.score,
    playerSideBags: playerSide.bags,
    opponentSideBags: opponentSide.bags,
    playerSideBagPenalty: playerSide.bagPenalty,
    opponentSideBagPenalty: opponentSide.bagPenalty,
    nilResults: [...playerSide.nilResults, ...opponentSide.nilResults]
  };
}

export function addSpadesMatchResult(
  scores: SpadesScoreState,
  bags: SpadesScoreState,
  result: SpadesHandResult
) {
  return {
    scores: {
      playerSide: scores.playerSide + result.playerSideScore,
      opponentSide: scores.opponentSide + result.opponentSideScore
    },
    bags: {
      playerSide: bags.playerSide + result.playerSideBags,
      opponentSide: bags.opponentSide + result.opponentSideBags
    }
  };
}


export const spadesMatchTarget = 500;

export function spadesMatchComplete(scores: { playerSide: number; opponentSide: number }) {
  return Math.max(scores.playerSide, scores.opponentSide) >= spadesMatchTarget
    && scores.playerSide !== scores.opponentSide;
}
