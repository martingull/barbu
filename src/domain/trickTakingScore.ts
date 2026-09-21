import type { CompletedHandTrick, Seat } from "../lessonTypes";

export const trickTakingSeats: Seat[] = ["Tutor", "Right", "You", "Left"];
export type SeatScores = Record<Seat, number>;
export const emptySeatPenalties = (): SeatScores => ({ Tutor: 0, Right: 0, You: 0, Left: 0 });

export function addSeatPenalties(left: SeatScores, right: SeatScores): SeatScores {
  return { Tutor: left.Tutor + right.Tutor, Right: left.Right + right.Right,
    You: left.You + right.You, Left: left.Left + right.Left };
}

export function seatPenaltiesForTricks(tricks: CompletedHandTrick[]): SeatScores {
  const totals = emptySeatPenalties();
  for (const trick of tricks) {
    const seat = trickTakingSeats[trick.winnerIndex];
    if (seat) totals[seat] += trick.penalty;
  }
  return totals;
}
