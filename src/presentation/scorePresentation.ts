import type { Seat, CompletedHandTrick } from "../domain/types";
import { emptySeatPenalties, trickTakingSeats } from "../domain/trickTakingScore";
export type RunStanding = { seat: Seat; score: number; rank: number };
export const scoreSeats: Seat[] = ["You", "Tutor", "Left", "Right"];

export function formatSignedScore(value: number) {
  return value > 0 ? `+${value}` : String(value);
}


export function scoreSeatLabel(seat: Seat) {
  return seat === "Tutor" ? "Barbu" : seat;
}


export function scoreSeatRunLabel(seat: Seat) {
  return seat === "You" ? "Your" : scoreSeatLabel(seat);
}


export function formatOrdinal(value: number) {
  if (value === 1) {
    return "1st";
  }
  if (value === 2) {
    return "2nd";
  }
  if (value === 3) {
    return "3rd";
  }

  return `${value}th`;
}


export function formatPointCount(value: number) {
  return `${value} ${value === 1 ? "point" : "points"}`;
}


export function seatTricksWonForTricks(tricks: CompletedHandTrick[]) {
  const totals = emptySeatPenalties();

  for (const trick of tricks) {
    const seat = trickTakingSeats[trick.winnerIndex];

    if (seat) {
      totals[seat] += 1;
    }
  }

  return totals;
}
