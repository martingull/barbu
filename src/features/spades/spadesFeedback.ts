import type { CompletedHandTrick, Seat } from "../../domain/types";
import type { SpadesBidState } from "../../domain/spadesBidding";
import { spadesBooksForSide, spadesOpponentSideSeats, spadesPlayerSideSeats, spadesTrickCounts } from "../../domain/spadesScoring";

// Receive only the tricks up to the one being reviewed, not later results.
export function spadesTrickFeedback(tricks: CompletedHandTrick[], bids: SpadesBidState): string {
  const trick = tricks.at(-1);
  if (!trick || trick.winner === "Unknown") return "";
  const name = (seat: Seat) => seat === "Tutor" ? "Barbu" : seat;
  const playerSide = spadesPlayerSideSeats.includes(trick.winner);
  const seats = playerSide ? spadesPlayerSideSeats : spadesOpponentSideSeats;
  const side = playerSide ? "You + Barbu" : "Left + Right";
  const { won, bid, extra: bags } = spadesBooksForSide(spadesTrickCounts(tricks), bids, seats);
  const progress = won < bid
    ? `${side}: ${won} of ${bid} bid tricks; ${bid - won} still needed.`
    : bags > 0
      ? `${side}: bid ${bid} covered, with ${bags} ${bags === 1 ? "bag" : "bags"} so far.`
      : `${side}: bid ${bid} reached. Further tricks add bags.`;
  const nilFailed = bids[trick.winner] === 0;
  const firstNilTrick = tricks.filter(t => t.winner === trick.winner).length === 1;
  const nil = nilFailed
    ? `${name(trick.winner)} ${firstNilTrick
      ? trick.winner === "You" ? "break nil" : "breaks nil"
      : trick.winner === "You" ? "have already broken nil" : "has already broken nil"}; the nil scores -100.`
    : seats.some(seat => bids[seat] === 0 && !tricks.some(t => t.winner === seat))
      ? "Nil is still intact for the other player on that side."
      : "";
  return [`${name(trick.winner)} won the trick.`, progress, nil,
    nilFailed ? "Nil tricks count as bags, not toward partner's bid." : ""].filter(Boolean).join(" ");
}
